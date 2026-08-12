import { homedir } from 'os';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { normalize } from 'path';
import type {
  SessionPayload,
  SessionRestoreEnvelope,
  SessionTab,
} from '../interfaces/Session';

/**
 * AppSession
 *
 * Persists the renderer's open-tab / cursor / scroll session to
 * `~/.mkeditor/session.json` and reads it back at boot.
 *
 * The write is atomic: `session.json.tmp` is written first, then
 * `renameSync` swaps it into place. A power loss during the write
 * leaves either the prior canonical file intact or the new one, never
 * a truncated mix.
 *
 * Sibling to `AppSettings` but intentionally simpler — there's no
 * defaulting, no deep-merge, no notification side effects. The
 * renderer is the source of truth for shape; main only stewards
 * the JSON.
 */
export class AppSession {
  /** Application config dir (shared with AppSettings). */
  private static readonly appPath = normalize(homedir() + '/.mkeditor/');

  /** Canonical session file path. */
  private static readonly filePath = AppSession.appPath + 'session.json';

  /** Tmp path used by the atomic write. */
  private static readonly tmpPath = AppSession.filePath + '.tmp';

  /** Keep "Clear saved session" effective through the final quit flush. */
  private static tabsClearedForProcess = false;

  /**
   * Current canonical schema version. Writes always stamp this.
   * The loader additionally accepts older versions in
   * `SUPPORTED_VERSIONS` so a freshly-bumped app can read a session
   * file written by the previous version without nuking the user's
   * tabs.
   *
   * v1 → v2: added the optional `assistant` right-sidebar
   * view-state block.
   *
   * v2 → v3: added optional `sidebarOpen` (left file-tree sidebar)
   * and `isMaximized` (window state) fields.
   *
   * v3 → v4: added the complete `layout` visibility snapshot.
   */
  private static readonly SCHEMA_VERSION = 4;

  /**
   * Versions the loader is willing to read. Anything outside this set
   * falls back to "no session" (the safer half of forward-compat).
   */
  private static readonly SUPPORTED_VERSIONS: ReadonlyArray<number> = [
    1, 2, 3, 4,
  ];

  /**
   * Read and validate the persisted session. Returns null if:
   *   - the file is absent
   *   - the JSON fails to parse
   *   - the parsed payload doesn't match `SessionPayload` shape
   *   - the schema version is outside the supported v1-v4 range
   *
   * Never throws. Callers should treat null as "no prior session".
   */
  static load(): SessionPayload | null {
    if (!existsSync(AppSession.filePath)) return null;

    let raw: string;
    try {
      raw = readFileSync(AppSession.filePath, { encoding: 'utf-8' });
    } catch {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }

    if (!AppSession.isValidPayload(parsed)) return null;
    return parsed;
  }

  /**
   * Persist the session payload to disk atomically.
   *
   * Strategy: write to `session.json.tmp`, then `renameSync` into the
   * canonical path. POSIX rename is atomic; Windows NTFS rename is
   * atomic enough for our purposes (same volume).
   *
   * Synchronous so the `before-quit` flush can complete before the
   * process exits. Catches and swallows all errors — a failed session
   * write must never block app quit.
   */
  static save(payload: SessionPayload): void {
    try {
      if (!existsSync(AppSession.appPath)) {
        mkdirSync(AppSession.appPath, { recursive: true });
      }

      // Stamp the schema version on every write, even if the caller
      // supplied a different value — the canonical file is always at
      // the loader's known version.
      const canonical = AppSession.tabsClearedForProcess
        ? {
            ...payload,
            tabs: [],
            activeFile: null,
            workspaceRoot: null,
          }
        : payload;
      const versioned = {
        ...canonical,
        version: AppSession.SCHEMA_VERSION,
      };
      if (!AppSession.isValidPayload(versioned)) return;
      const serialised = JSON.stringify(versioned, null, 2);

      writeFileSync(AppSession.tmpPath, serialised, { encoding: 'utf-8' });
      renameSync(AppSession.tmpPath, AppSession.filePath);
    } catch {
      // Best-effort cleanup of a leftover tmp; ignore any failure.
      try {
        if (existsSync(AppSession.tmpPath)) unlinkSync(AppSession.tmpPath);
      } catch {
        // ignore
      }
    }
  }

  /** Merge window geometry into the canonical session without losing tabs. */
  static saveWindowState(
    isMaximized: boolean,
    bounds: { x: number; y: number; width: number; height: number },
  ): void {
    const current = AppSession.load();
    AppSession.save({
      version: 4,
      tabs: [],
      activeFile: null,
      workspaceRoot: null,
      ...current,
      isMaximized,
      bounds,
    });
  }

  /** Persist renderer-owned session data without clobbering window state. */
  static saveRendererSession(payload: SessionPayload): void {
    const current = AppSession.load();
    const merged = { ...payload };
    if (current?.isMaximized !== undefined) {
      merged.isMaximized = current.isMaximized;
    } else {
      delete merged.isMaximized;
    }
    if (current?.bounds) merged.bounds = current.bounds;
    else delete merged.bounds;
    AppSession.save(merged);
  }

  /**
   * Remove the persisted session file (and any leftover tmp from a
   * crashed write). Used by the renderer's "Clear saved session"
   * action. Never throws — a missing file is a successful no-op.
   */
  static clear(): void {
    AppSession.tabsClearedForProcess = true;
    try {
      if (existsSync(AppSession.filePath)) unlinkSync(AppSession.filePath);
    } catch {
      // best-effort
    }
    try {
      if (existsSync(AppSession.tmpPath)) unlinkSync(AppSession.tmpPath);
    } catch {
      // best-effort
    }
  }

  /**
   * Build a restore envelope ready to ship over IPC. Validates real-file
   * paths against the filesystem (untitled paths are left alone), drops
   * missing entries from `tabs`, lists them in `missing`, and reads
   * surviving file contents into `contents` so the renderer can hydrate
   * tabs synchronously. If the session's `activeFile` points at a
   * now-missing path, it's nulled out.
   *
   * Safe to call when `load()` returned null — produces an envelope
   * with `session: null`, empty missing/contents.
   */
  static buildRestoreEnvelope(
    payload: SessionPayload | null,
  ): SessionRestoreEnvelope {
    if (!payload) return { session: null, missing: [], contents: {} };

    const missing: string[] = [];
    const kept: SessionTab[] = [];
    const contents: Record<string, string> = {};

    for (const tab of payload.tabs) {
      // Untitled tabs carry their content inline; nothing to check on disk.
      if (tab.path.startsWith('untitled-')) {
        kept.push(tab);
        continue;
      }
      if (!existsSync(tab.path)) {
        missing.push(tab.path);
        continue;
      }
      try {
        contents[tab.path] = readFileSync(tab.path, { encoding: 'utf-8' });
        kept.push(tab);
      } catch {
        // Treat unreadable files (permissions, race) as missing.
        missing.push(tab.path);
      }
    }

    const activeStillPresent =
      payload.activeFile !== null &&
      kept.some((t) => t.path === payload.activeFile);

    const keptRoot =
      payload.workspaceRoot && existsSync(payload.workspaceRoot)
        ? payload.workspaceRoot
        : null;

    return {
      session: {
        version: payload.version,
        tabs: kept,
        activeFile: activeStillPresent ? payload.activeFile : null,
        workspaceRoot: keptRoot,
        // Assistant right-sidebar view state passes through verbatim
        // (optional). Filtering wouldn't make sense — it's a pure UI
        // snapshot with no main-side validation to perform.
        assistant: payload.assistant,
        // v3 fields — pass through verbatim.
        sidebarOpen: payload.sidebarOpen,
        isMaximized: payload.isMaximized,
        bounds: payload.bounds,
        layout: payload.layout,
      },
      missing,
      contents,
    };
  }

  /**
   * Shape-check a parsed payload. Conservative: anything that doesn't
   * match exactly falls back to "no session". Better to start fresh
   * than to crash on a forward-incompatible file.
   */
  private static isValidPayload(value: unknown): value is SessionPayload {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Partial<SessionPayload> & {
      workspaceRoot?: unknown;
      assistant?: unknown;
      sidebarOpen?: unknown;
      isMaximized?: unknown;
      bounds?: unknown;
      layout?: unknown;
    };
    if (
      typeof candidate.version !== 'number' ||
      !AppSession.SUPPORTED_VERSIONS.includes(candidate.version)
    ) {
      return false;
    }
    if (!Array.isArray(candidate.tabs)) return false;
    if (
      candidate.activeFile !== null &&
      typeof candidate.activeFile !== 'string'
    ) {
      return false;
    }
    // workspaceRoot was added after version 1 shipped. Accept missing
    // (treat as null) for back-compat; otherwise require null-or-string.
    if (
      'workspaceRoot' in candidate &&
      candidate.workspaceRoot !== null &&
      candidate.workspaceRoot !== undefined &&
      typeof candidate.workspaceRoot !== 'string'
    ) {
      return false;
    }
    // `assistant` arrived in v2. Optional in both v1 and v2 payloads —
    // UIStateContext supplies defaults when absent. When present it
    // must shape-match `AssistantViewState`.
    if ('assistant' in candidate && candidate.assistant !== undefined) {
      if (!AppSession.isValidAssistantState(candidate.assistant)) return false;
    }
    // `sidebarOpen` and `isMaximized` arrived in v3. Both optional
    // for backward compatibility; when present they must be booleans.
    if (
      'sidebarOpen' in candidate &&
      candidate.sidebarOpen !== undefined &&
      typeof candidate.sidebarOpen !== 'boolean'
    ) {
      return false;
    }
    if (
      'isMaximized' in candidate &&
      candidate.isMaximized !== undefined &&
      typeof candidate.isMaximized !== 'boolean'
    ) {
      return false;
    }
    if (
      'bounds' in candidate &&
      candidate.bounds !== undefined &&
      !AppSession.isValidBounds(candidate.bounds)
    ) {
      return false;
    }
    if (
      'layout' in candidate &&
      candidate.layout !== undefined &&
      !AppSession.isValidLayout(candidate.layout)
    ) {
      return false;
    }
    for (const tab of candidate.tabs) {
      if (!AppSession.isValidTab(tab)) return false;
    }
    return true;
  }

  private static isValidAssistantState(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false;
    const a = value as { sidebarOpen?: unknown; size?: unknown };
    if (typeof a.sidebarOpen !== 'boolean') return false;
    if (typeof a.size !== 'number' || !Number.isFinite(a.size)) return false;
    return true;
  }

  private static isValidTab(value: unknown): value is SessionTab {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Partial<SessionTab>;
    if (typeof candidate.path !== 'string') return false;
    if (typeof candidate.name !== 'string') return false;
    if (
      'untitledContent' in candidate &&
      typeof candidate.untitledContent !== 'string'
    ) {
      return false;
    }
    return true;
  }

  private static isValidLayout(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false;
    const layout = value as Record<string, unknown>;
    return [
      'toolbar',
      'tabBar',
      'sidebar',
      'editor',
      'preview',
      'statusBar',
      'assistant',
    ].every((key) => typeof layout[key] === 'boolean');
  }

  private static isValidBounds(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false;
    const b = value as Record<string, unknown>;
    return (
      typeof b.x === 'number' &&
      Number.isFinite(b.x) &&
      typeof b.y === 'number' &&
      Number.isFinite(b.y) &&
      typeof b.width === 'number' &&
      Number.isFinite(b.width) &&
      b.width > 0 &&
      typeof b.height === 'number' &&
      Number.isFinite(b.height) &&
      b.height > 0
    );
  }
}
