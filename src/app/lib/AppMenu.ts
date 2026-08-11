import {
  app,
  ipcMain,
  Menu,
  type BrowserWindow,
  type IpcMainEvent,
  type MenuItemConstructorOptions,
} from 'electron';
import type { BridgeProviders } from '../interfaces/Providers';
import { AppStorage } from './AppStorage';
import { AppSession } from './AppSession';
import type { LayoutVisibility } from '../interfaces/Session';
import {
  menuModel,
  type MenuGroup,
  type MenuItem,
  type MenuAction,
} from './menuModel';

/**
 * AppMenu
 *
 * Builds the Electron application menu from the shared `menuModel`.
 *
 * On macOS the menu lives on the system menu bar and is visible there.
 * On Windows and Linux the in-window `<TitleBar>` (added in P2) renders
 * the same model — but we still install the Electron application menu
 * so global accelerators (Ctrl+S, Ctrl+O, etc.) keep working. The menu
 * bar itself is suppressed by the BrowserWindow being frameless plus
 * `autoHideMenuBar: true` / `setMenuBarVisibility(false)` in `main.ts`,
 * so the menu is functional-but-invisible and the user only ever sees
 * the renderer-drawn `<TitleBar>` strip.
 */
export class AppMenu {
  /** The browser window */
  private context: BrowserWindow;

  /** Providers to provide functions to the menu */
  private providers: BridgeProviders = {
    bridge: null,
    logger: null,
  };

  private layoutState: LayoutVisibility = {
    toolbar: true,
    tabBar: true,
    sidebar: true,
    editor: true,
    preview: true,
    statusBar: true,
    assistant: false,
  };

  /**
   * Create a new app menu handler to manage the app menu.
   *
   * @param context - the browser window
   * @param register - register all menu items immediately
   * @returns
   */
  constructor(context: BrowserWindow, register = false) {
    this.context = context;

    if (register) {
      this.register();
    }
  }

  /**
   * Provide access to a provider.
   *
   * @param provider - the provider to access
   * @param instance - the associated provider instance
   * @returns
   */
  provide<T>(provider: string, instance: T) {
    this.providers[provider] = instance;
  }

  /**
   * Build the Electron menu template from `menuModel` and install it
   * on all platforms.
   *
   * On macOS this populates the system menu bar (the visible UI).
   * On Windows / Linux the menu bar is suppressed (frameless window +
   * `setMenuBarVisibility(false)` in `main.ts`), but the menu itself
   * is still registered so Electron's accelerator dispatcher fires
   * the click handlers when the user presses Ctrl+S / Ctrl+O / etc.
   * Without this the in-window `<TitleBar>` would show keybindings
   * that don't actually do anything.
   */
  register() {
    const session = AppSession.load();
    if (session?.layout) {
      this.layoutState = this.normalizeLayoutState(session.layout);
    } else if (session) {
      this.layoutState.sidebar = session.sidebarOpen ?? true;
      this.layoutState.assistant = session.assistant?.sidebarOpen ?? false;
    }
    const template: MenuItemConstructorOptions[] = menuModel.map((group) =>
      this.buildGroup(group),
    );
    app.applicationMenu = Menu.buildFromTemplate(template);
  }

  private normalizeLayoutState(state: LayoutVisibility): LayoutVisibility {
    if (state.editor || state.preview) return { ...state };
    return { ...state, editor: true, preview: true };
  }

  private buildGroup(group: MenuGroup): MenuItemConstructorOptions {
    return { label: group.label, submenu: this.buildItems(group.items) };
  }

  private buildItems(items: MenuItem[]): MenuItemConstructorOptions[] {
    const submenu: MenuItemConstructorOptions[] = [];
    for (const item of items) {
      if (item.separatorBefore) {
        submenu.push({ type: 'separator' });
      }
      submenu.push(this.buildItem(item));
    }
    return submenu;
  }

  private buildItem(item: MenuItem): MenuItemConstructorOptions {
    if (item.items) {
      return {
        id: item.id,
        label: item.label,
        submenu: this.buildItems(item.items),
      };
    }
    if (!item.action) {
      return {
        id: item.id,
        label: item.label,
        accelerator: this.resolveAccelerator(item),
      };
    }
    return this.applyAction(item, item.action);
  }

  /** macOS takes the `darwinAccelerator` override when present; everything
   *  else uses the default `accelerator`. Resolved here at runtime so the
   *  model itself stays platform-agnostic — webpack would otherwise bake
   *  the wrong platform into the renderer bundle. */
  private resolveAccelerator(item: MenuItem): string | undefined {
    if (process.platform === 'darwin' && item.darwinAccelerator) {
      return item.darwinAccelerator;
    }
    return item.accelerator;
  }

  private applyAction(
    item: MenuItem,
    action: MenuAction,
  ): MenuItemConstructorOptions {
    const accelerator = this.resolveAccelerator(item);
    switch (action.kind) {
      case 'role':
        // Intentionally omit `label` — Electron picks the OS default
        // (e.g. "Exit" instead of "Quit" on Windows).
        return {
          role: action.role as MenuItemConstructorOptions['role'],
          accelerator,
        };
      case 'channel': {
        const { channel, payload } = action;
        if (item.layoutPart) {
          return {
            id: item.id,
            type: 'checkbox',
            label: item.label,
            accelerator,
            checked: this.layoutState[item.layoutPart],
            click: (menuItem) => {
              this.context.webContents.send(channel, {
                part: item.layoutPart,
                visible: menuItem.checked,
              });
            },
          };
        }
        return {
          id: item.id,
          label: item.label,
          accelerator,
          click: () => this.context.webContents.send(channel, payload),
        };
      }
      case 'command':
        return {
          id: item.id,
          label: item.label,
          accelerator,
          click: () => this.runCommand(action.commandId),
        };
    }
  }

  /**
   * Dispatch table for `{ kind: 'command' }` menu actions. Public so the
   * renderer-side in-window TitleBar menu can reach the same handlers via
   * `to:command:run` — see `wireRendererCommandBridge()` below.
   *
   * Adding a new command means adding an entry here; both the native
   * macOS menu and the in-window menu pick it up for free.
   */
  public runCommand(commandId: string): void {
    // Bail if the window we'd dispatch onto has been destroyed (the
    // listener cleanup in `wireRendererCommandBridge` covers the
    // ordinary path, but late-firing events between `closed` and
    // `removeListener` can still arrive here).
    if (this.context.isDestroyed()) return;
    switch (commandId) {
      case 'open-log': {
        const logpath = this.providers.logger?.logpath;
        if (logpath) AppStorage.openPath(this.context, logpath);
        return;
      }
      case 'toggle-devtools':
        this.context.webContents.toggleDevTools();
        return;
      default:
        // Unknown commandId — drop silently rather than throw; the model
        // is the contract and an unknown id is a coding error caught in
        // dev, not a user-visible failure.
        return;
    }
  }

  /** Track the `to:command:run` handler so we can detach it on close. */
  private commandBridgeHandler:
    | ((event: IpcMainEvent, commandId: string) => void)
    | null = null;
  private layoutBridgeHandler:
    | ((event: IpcMainEvent, state: LayoutVisibility) => void)
    | null = null;

  /**
   * Register the `to:command:run` IPC listener so the renderer's
   * in-window TitleBar menu can fire main-process commands through the
   * same dispatch table the native macOS menu uses. Called from
   * `main.ts` once per BrowserWindow.
   *
   * The handler is sender-scoped (ignores IPC from any other
   * BrowserWindow's webContents) and torn down when this window
   * closes — both guards matter on macOS where the window can be
   * recreated via `app.on('activate')` and a stale handler would
   * otherwise dispatch commands onto the wrong / destroyed context.
   */
  wireRendererCommandBridge() {
    const handler = (event: IpcMainEvent, commandId: string) => {
      if (event.sender.id !== this.context.webContents.id) return;
      this.runCommand(commandId);
    };
    ipcMain.on('to:command:run', handler);
    this.commandBridgeHandler = handler;
    const layoutHandler = (event: IpcMainEvent, state: LayoutVisibility) => {
      if (event.sender.id !== this.context.webContents.id) return;
      this.layoutState = this.normalizeLayoutState(state);
      for (const group of menuModel) {
        this.syncLayoutItems(group.items, this.layoutState);
      }
    };
    ipcMain.on('to:layout:state', layoutHandler);
    this.layoutBridgeHandler = layoutHandler;
    this.context.once('closed', () => {
      if (this.commandBridgeHandler) {
        ipcMain.removeListener('to:command:run', this.commandBridgeHandler);
        this.commandBridgeHandler = null;
      }
      if (this.layoutBridgeHandler) {
        ipcMain.removeListener('to:layout:state', this.layoutBridgeHandler);
        this.layoutBridgeHandler = null;
      }
    });
  }

  private syncLayoutItems(items: MenuItem[], state: LayoutVisibility): void {
    for (const item of items) {
      if (item.layoutPart) {
        const nativeItem = app.applicationMenu?.getMenuItemById(item.id);
        if (nativeItem) nativeItem.checked = state[item.layoutPart];
      }
      if (item.items) this.syncLayoutItems(item.items, state);
    }
  }

  /**
   * Build the context menu for the system tray.
   *
   * @param context - the browser window
   * @returns
   */
  buildTrayContextMenu(context: BrowserWindow) {
    return Menu.buildFromTemplate([
      {
        label: 'Show Window',
        click: () => {
          app.focus();
          context.maximize();
        },
      },
      {
        // Fires the same `from:assistant:toggle` channel the
        // application menu's View → Toggle Assistant Sidebar uses,
        // which routes through BridgeListeners → UIStateContext
        // `toggleRightSidebarExternal`.
        label: 'Toggle Assistant',
        click: () => {
          if (!context.isDestroyed()) {
            context.webContents.send('from:assistant:toggle');
          }
        },
      },
      {
        label: 'Open Recent',
        role: 'recentDocuments',
        submenu: [
          {
            label: 'Clear Recent',
            role: 'clearRecentDocuments',
          },
        ],
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit(),
      },
    ]);
  }
}
