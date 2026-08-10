# CHANGELOG

### 2026-08-10 — v4.2.0-custom (shawn/custom fork)

#### Added

- **Custom font settings**: Three font-family text inputs (Editor, Preview text, Preview code) and matching font-size number inputs in Settings → General → Fonts. Editor font family applied via Monaco `updateOptions({ fontFamily })`; preview fonts use CSS custom properties set on a `.preview-zoom-layer` wrapper that sits between `#preview` and `#preview-content`, so exports are never polluted.
- **Zoom controls**: Three independent zoom dropdowns (UI Zoom, Editor Zoom, Preview Zoom) in Settings → General → Appearance. UI Zoom uses `webContents.setZoomFactor()`; editor and preview areas counter-compensate the global Electron factor so each zoom control acts independently. Allowed values: 75–200%;
- **Line number width**: Dropdown (1–10 chars) in Settings → General → Editing. Controls Monaco's `lineNumbersMinChars` with `lineDecorationsWidth: 0` for a clean gutter.
- **Portable Linux build**: `scripts/build-portable-linux.mjs` produces an unpacked Electron app (`--linux dir`) deployed to `~/.local/opt/MKEditor/mkeditor-<version>-custom/` with a `current` symlink. No `sudo`, no system directories, no shell config modifications. The build script emits a wrapper-script template that permanently disables auto-update.
- **Auto-updater guard**: `MKEDITOR_DISABLE_UPDATER=1` environment variable disables all `electron-updater` activity — no update checks, no download prompts. The portable build script advises this variable on every launch.
- **Session persistence for sidebar and window state**: Session v3 saves left file-tree sidebar visibility (`sidebarOpen`) and window state (`isMaximized`). Window bounds (x, y, width, height) are persisted in `~/.mkeditor/window-state.json` with debounced saves on resize/move/unmaximize. Relaunch restores the exact window geometry.
- **Empty-state overlay**: When no tabs are open, the editor shows a "No open tabs" / "New File" overlay instead of auto-creating an Untitled tab. Users must explicitly create a new file.
- **Version bump**: `4.2.0-custom`.
- **UI layout reorganized**: Toolbar (formatting/export buttons + sidebar toggle) now sits below the menu bar; status bar (file path, character/word counts, settings, shortcuts, AI toggle, dark mode, version) at the bottom. Cleaner editor-layout convention.
- **About page credit**: "Modified by Shawn @ Studio 200A" with GitHub link added below the original author credit.

#### Changed

- **Preview font-size cascade**: `syncPreviewToExportSettings()` now writes `--mk-export-font-size` as a CSS custom property instead of an inline `font-size` style, allowing the live-preview-only `--mk-preview-text-font-size` (set on `.preview-zoom-layer`) to take precedence in the live preview while keeping exports governed solely by ExportSettings.
- **"Follow system" language option**: The language selector now defaults to "Follow system" instead of baking in the OS language at init time. When selected, the app resolves the OS/browser language dynamically on every launch. `AppBridge.mked:get-locale` resolves `'system'` to the actual OS locale.

#### Fixed

- **Untitled tab close counter**: Closing the last tab no longer advances the untitled counter (`untitled-1` closes → `untitled-1` reopens, not `untitled-2`). The counter only advances on user-initiated File → New.
- **Settings modal overflow**: Content now constrained to `max-h-[calc(100vh-10rem)]` with `overflow-y-auto` so the expanded Fonts + Zoom sections are reachable.
- **Welcome text on relaunch**: When session restore is disabled, the fallback now seeds an empty untitled buffer rather than the welcome guide — the welcome text only appears on genuine first launches.
- **AppSettings stale migration state**: `this.applied` is no longer overwritten with unmigrated data after a `deepMerge` upgrade of old settings.json.
- **Preview `kbd` font**: Added missing `font-family: var(--mk-preview-code-font-family, ...)` to `<kbd>` elements.
- **Window state on relaunch**: Window bounds (position + size) are now persisted and restored, so the app opens at the same size and location. Previously only maximized state was remembered, and windowed mode always fell back to Electron's default dimensions.
- **Ghost-style toolbar buttons; splash screen removed; bottom padding (old fixed toolbar leftover) removed.**

---

### 2026-05-21 - v4.1.0

#### Added

- **Inline tool confirmation**: AI Assistant write-class tools (`write_file`, `edit_file`, `replace_in_file`, `insert_at_line`, `create_file`) now confirm inline within the chat bubble — a Monaco diff (or insertion preview) renders directly inside the tool card with Accept / Reject. A pop-out button lifts the diff into a full editor tab when you want more screen space. Long previews collapse behind a "Show more" toggle, and `edit_file` shows the change in situ with ±3 lines of context.
- **File explorer filter bar**: A search box + funnel dropdown above the file tree. Search narrows by case-insensitive filename substring, auto-expanding matching subdirectories; the funnel toggles which file types are visible across a curated allowlist (Markdown, common images, HTML/PDF/TXT). Defaults to `.md`-only so the existing experience is preserved; filter state persists across launches. Translated across all 13 supported locales.
- **Workspace-relative image previews**: The preview pane now resolves relative image and link paths (`![](collector.png)`, `[manual](doc.pdf)`) against the active markdown file's directory, so embedded images display correctly. Resolved paths — including explicit `file://` URLs — are rejected unless they sit inside the open workspace, so preview HTML can't be used to reach arbitrary on-disk files.

#### Changed

- **Sidebar file-type surface**: The directory listing now also includes common image and document types (PNG, JPG, JPEG, GIF, SVG, WEBP, HTML, PDF, TXT) in addition to `.md`. Non-markdown files render dimmed and stay hidden by default until enabled via the new filter funnel.
- **Active editable path**: Save, the assistant's active-file chip, the preview's asset base directory, and Monaco's `mked://` link resolver now all route through a single `getActiveEditablePath()` accessor, so they stay correct when a diff overlay tab is the active surface instead of pointing at a `diff://...` id.

#### Fixed

- **Mid-stream word splits around tool calls**: The assistant's text no longer splits mid-word ("two new v" + tool card + "erses!") when a tool call arrives during paced reveal. The chunk buffer drains before the tool-call segment is recorded, so prose and tool cards arrive in clean order.
- **Inline confirmation overflow**: The pending-confirm card's file path wraps inside the yellow box when the sidebar is dragged narrow, instead of overflowing past the edge.
- **Preview image 404 on relaunch**: Fixed a console `net::ERR_FILE_NOT_FOUND` on session restore where the preview's first paint fired before the active file propagated through React context. Relative image srcs are now suppressed during that single-frame window rather than fetched against the bundle directory; the next render restores the proper URL.

---

### 2026-05-19 - v4.0.0

#### Added

- **AI Assistant**: In-editor agent (Anthropic / OpenAI / Ollama) in a right-hand sidebar with per-provider chat tabs, persisted conversations, streaming responses, and a workspace-scoped read/write tool catalog. Write tools confirm by default; `@`-mentions, active-file chip and selection sharing keep the agent grounded in workspace context. Translated across all 13 supported locales. Desktop-only.

#### Changed

- **Secure key transport**: AI provider API keys are RSA-OAEP-encrypted in the renderer before crossing IPC — plaintext never traverses the renderer↔main bridge. On-disk storage continues to use Electron `safeStorage`.
- **Workspace-scoped file IPC**: All assistant file operations resolve against the open workspace root (canonical paths, symlink escapes rejected); calls outside the workspace or without a workspace open are denied.

#### Fixed

- **Tab unsaved-indicator**: Saving via the menu or `Ctrl+S` now clears the tab's unsaved-changes dot (previously only the toolbar Save button did).
- **Menu accelerators on Windows/Linux**: `Ctrl+S`, `Ctrl+O` and other keybindings shown in the in-window title bar now actually fire, with the native menu bar still hidden.

---

### 2026-05-17 - v3.8.1

#### Fixed

- Fixed issue with react-resizable-panels fighting monaco editor and causing overflow issues.
- Fixed issue with splash screen hanging on web due to electron logger no-op

---

### 2026-05-17 - v3.8.0

#### Added

- **Workspace session persistence**: Open tabs, the active tab, and per-tab cursor/scroll position are restored across launches on both desktop and web.
- **Web file explorer**: The sidebar now supports opening, browsing, and editing local folders in Chromium-based browsers via the File System Access API; workspace handle persists across refresh via IndexedDB.
- **Code block styling**: Preview code blocks now render with a header bar showing the language and a copy button; shell/bash blocks render in a terminal style.

---

### 2026-05-16 - v3.7.0

#### Added

- **UI Migration** Migrated from direct-DOM based structure to React UI.
- **UI Libraries** Replaced bootstrap with Tailwind CSS.
- **Live Preview Styling** Implemented a custom preview styling similar to Github's rendered markdown preview.

---

### 2025-09-02 - v3.6.0

#### Added

- **Localization**: Languages now supported: German, Spanish, Italian, Dutch, Portuguese, Turkish, Russian, Ukrainian, Korean, Japanese and Chinese (Simplified).
- **Web**: For the web browser version, user's changes are now stored in local storage, if the user reloads they'll be able to resume editing from where they left off.

#### Fixed

- Fixed bug when attempting to open an .md file directly (from the OS, either by double-clicking or open with...) when the editor is already open.

---

### 2025-08-28 - v3.5.1

#### Added

- **Live Preview Styling**: The preview styling now updates live in response to changes to users' HTML/PDF file export settings.

---

### 2025-08-25 - v3.5.0

#### Added

- **Configurable export styling**: Added more comprehensive options for users to configure the styling of their HTML/PDF exports, settings persist to the user's settings file.

#### Fixed

- Fixed a bug with non-links rendering as links, for example "markdown.md" (without the protocol) was being rendered as a link.

---

### 2025-08-23 - v3.4.0

#### Added

- **File explorer context menu**: Added a context menu to the file explorer with options to open files and folders, rename, delete etc (only for desktop).

---

### 2025-08-22 - v3.3.1

#### Changed

- **Markdown optimizations**: Optimized exports

---

### 2025-08-22 - v3.3.0

#### Added

- **Automatic updates**: Application now checks for and downloads updates automatically on launch. App checks Github releases and will install the update after the user exits.
- **App logging**: Introduced electron-log for app logging, user log is located at `~/.mkeditor/main.log`.

---

### 2025-08-16 - v3.2.0

#### Added

- **LaTeX support**: Added support for writing expressions in LaTeX.

#### Changed

- **Bridge modularity**: Refactored out the bridge into a more modular structure.

---

### 2025-08-14 - v3.1.0

#### Added

- **Filetab reordering**: Added the ability to reorder open file tabs in the editor.

#### Changed

- **Filetree & DOM optimizations**: Various fixes and improvements to filetree and DOM rendering efficiency.

---

### 2025-08-12 - v3.0.1

#### Fixed

- **Large images layout bug**: Fixed an issue with large images causing a bug in the preview, images are now responsively resized.
- **User save prompt appearing incorrectly**: Fixed an issue with the user save prompt appearing when attempting to open a new file in a new tab. Prompt now only appears when you try to close the file without saving.

---

### 2025-08-11 - v3.0.0

#### Added

- **Filetree explorer and support for workspaces**: Added support for file tree explorer and editing multiple files.
