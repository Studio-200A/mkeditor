import * as React from 'react';
import type { AssistantViewState } from '../../interfaces/Session';
import type { LayoutVisibility } from '../../interfaces/Session';
import {
  _setRestoreHandler,
  _syncMirror,
  _notifyAssistantStateChange,
  applyRestoredAssistantState,
  clearAssistantStateChangeListener,
  getCurrentAssistantState,
  registerAssistantStateChangeListener,
  registerToggleRightSidebar,
  toggleRightSidebarExternal,
  _setRestoreSidebarHandler,
  _notifySidebarStateChange,
} from '../../assistantUiState';
import {
  DEFAULT_LAYOUT_VISIBILITY,
  _notifyLayoutStateChange,
  _setLayoutPartHandler,
  _setLayoutResetHandler,
  _setLayoutRestoreHandler,
  _syncLayoutMirror,
  applyRestoredLayoutState,
  getCurrentLayoutState,
  resetLayoutExternal,
  setLayoutPartExternal,
  type LayoutPart,
} from '../../layoutUiState';

// Re-export the public seam surface so existing React-side / test
// imports keep working. The seam itself lives at
// `src/browser/assistantUiState.ts` (outside `react/`) so managers
// can use it without importing React — see the comment at the top
// of that file.
export {
  applyRestoredAssistantState,
  clearAssistantStateChangeListener,
  getCurrentAssistantState,
  registerAssistantStateChangeListener,
  registerToggleRightSidebar,
  toggleRightSidebarExternal,
};

interface UIState {
  /** Left (file-tree) sidebar visibility. */
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  /** Right (AI Assistant) sidebar visibility. */
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (open: boolean) => void;
  toggleRightSidebar: () => void;
  toolbarVisible: boolean;
  tabBarVisible: boolean;
  editorVisible: boolean;
  previewVisible: boolean;
  statusBarVisible: boolean;
  layoutResetKey: number;
  setLayoutPart: (part: LayoutPart, visible: boolean) => void;
  resetLayout: () => void;
  /**
   * Right-sidebar size as a percentage of the outer Group, matching
   * `react-resizable-panels`. Updated by the Panel's onResize handler
   * and persisted through the session payload via the
   * `getCurrentAssistantState` getter the composition root wires.
   */
  rightSidebarSize: number;
  setRightSidebarSize: (size: number) => void;
}

const UIStateContext = React.createContext<UIState | null>(null);

export {
  applyRestoredLayoutState,
  getCurrentLayoutState,
  resetLayoutExternal,
  setLayoutPartExternal,
};

interface UIStateProviderProps {
  initialSidebarOpen: boolean;
  /**
   * Initial AI Assistant right-sidebar state. The composition root
   * supplies the renderer default (`{ sidebarOpen: false, size: 20 }`)
   * for first launch; on subsequent launches a session-restored value
   * lands via `applyRestoredAssistantState` after `from:session:restore`.
   */
  initialRightSidebarOpen?: boolean;
  initialRightSidebarSize?: number;
  children: React.ReactNode;
}

export const UIStateProvider: React.FC<UIStateProviderProps> = ({
  initialSidebarOpen,
  initialRightSidebarOpen = false,
  initialRightSidebarSize = 20,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(initialSidebarOpen);
  const [rightSidebarOpen, setRightSidebarOpenState] = React.useState(
    initialRightSidebarOpen,
  );
  const [rightSidebarSize, setRightSidebarSizeState] = React.useState(
    initialRightSidebarSize,
  );
  const [toolbarVisible, setToolbarVisible] = React.useState(true);
  const [tabBarVisible, setTabBarVisible] = React.useState(true);
  const [editorVisible, setEditorVisible] = React.useState(true);
  const [previewVisible, setPreviewVisible] = React.useState(true);
  const [statusBarVisible, setStatusBarVisible] = React.useState(true);
  const [layoutResetKey, setLayoutResetKey] = React.useState(0);

  const layoutState: LayoutVisibility = {
    toolbar: toolbarVisible,
    tabBar: tabBarVisible,
    sidebar: sidebarOpen,
    editor: editorVisible,
    preview: previewVisible,
    statusBar: statusBarVisible,
    assistant: rightSidebarOpen,
  };

  React.useEffect(() => {
    _syncLayoutMirror(layoutState);
  }, [
    toolbarVisible,
    tabBarVisible,
    sidebarOpen,
    editorVisible,
    previewVisible,
    statusBarVisible,
    rightSidebarOpen,
  ]);

  // Keep the seam's mirror in sync so non-React callers
  // (FileManager.serializeSession) read a fresh value without
  // having to subscribe to React state.
  React.useEffect(() => {
    _syncMirror({ sidebarOpen: rightSidebarOpen, size: rightSidebarSize });
  }, [rightSidebarOpen, rightSidebarSize]);

  // Same mirror sync for the left (file-tree) sidebar.
  // Hand the restore-side setter up to the seam so BridgeListeners
  // can apply a session-restored state on `from:session:restore`.
  // The setter is paired with both pieces of state — restore
  // overwrites both in a single React batch.
  React.useEffect(() => {
    _setRestoreHandler((state) => {
      _syncMirror(state);
      _syncLayoutMirror({
        ...getCurrentLayoutState(),
        assistant: state.sidebarOpen,
      });
      setRightSidebarOpenState(state.sidebarOpen);
      setRightSidebarSizeState(state.size);
    });
    return () => {
      _setRestoreHandler(null);
    };
  }, []);

  // Hand the restore-side setter for the left sidebar.
  React.useEffect(() => {
    _setRestoreSidebarHandler((open) => {
      _syncLayoutMirror({ ...getCurrentLayoutState(), sidebar: open });
      setSidebarOpen(open);
    });
    return () => {
      _setRestoreSidebarHandler(null);
    };
  }, []);

  const toggleSidebar = React.useCallback(() => {
    const next = { ...layoutState, sidebar: !sidebarOpen };
    setSidebarOpen(next.sidebar);
    _notifySidebarStateChange();
    _notifyLayoutStateChange(next);
  }, [layoutState, sidebarOpen]);

  const setSidebarOpenWrapper = React.useCallback(
    (open: boolean) => {
      const next = { ...layoutState, sidebar: open };
      setSidebarOpen(open);
      _notifySidebarStateChange();
      _notifyLayoutStateChange(next);
    },
    [layoutState],
  );

  const setRightSidebarOpen = React.useCallback(
    (open: boolean) => {
      const next = { ...layoutState, assistant: open };
      setRightSidebarOpenState(open);
      _notifyAssistantStateChange();
      _notifyLayoutStateChange(next);
    },
    [layoutState],
  );

  const toggleRightSidebar = React.useCallback(() => {
    const next = { ...layoutState, assistant: !rightSidebarOpen };
    setRightSidebarOpenState(next.assistant);
    _notifyAssistantStateChange();
    _notifyLayoutStateChange(next);
  }, [layoutState, rightSidebarOpen]);

  // Register the toggle with the seam used by the
  // application menu (View → Toggle Assistant Sidebar, Cmd/Ctrl+Shift+A)
  // and the system tray entry. Effect-registered so the latest
  // closure wins after a re-render.
  React.useEffect(() => {
    registerToggleRightSidebar(toggleRightSidebar);
    return () => registerToggleRightSidebar(() => {});
  }, [toggleRightSidebar]);

  const setRightSidebarSize = React.useCallback(
    (size: number) => {
      setRightSidebarSizeState(size);
      _syncMirror({ sidebarOpen: layoutState.assistant, size });
      _notifyAssistantStateChange();
    },
    [layoutState.assistant],
  );

  const setLayoutPart = React.useCallback(
    (part: LayoutPart, visible: boolean) => {
      if (part === 'editor' && !visible && !previewVisible) return;
      if (part === 'preview' && !visible && !editorVisible) return;
      const next = { ...layoutState, [part]: visible };
      switch (part) {
        case 'toolbar':
          setToolbarVisible(visible);
          break;
        case 'tabBar':
          setTabBarVisible(visible);
          break;
        case 'sidebar':
          setSidebarOpen(visible);
          _notifySidebarStateChange();
          break;
        case 'editor':
          setEditorVisible(visible);
          break;
        case 'preview':
          setPreviewVisible(visible);
          break;
        case 'statusBar':
          setStatusBarVisible(visible);
          break;
        case 'assistant':
          setRightSidebarOpenState(visible);
          _notifyAssistantStateChange();
          break;
      }
      _notifyLayoutStateChange(next);
    },
    [editorVisible, layoutState, previewVisible],
  );

  const resetLayout = React.useCallback(() => {
    setToolbarVisible(DEFAULT_LAYOUT_VISIBILITY.toolbar);
    setTabBarVisible(DEFAULT_LAYOUT_VISIBILITY.tabBar);
    setSidebarOpen(DEFAULT_LAYOUT_VISIBILITY.sidebar);
    setEditorVisible(DEFAULT_LAYOUT_VISIBILITY.editor);
    setPreviewVisible(DEFAULT_LAYOUT_VISIBILITY.preview);
    setStatusBarVisible(DEFAULT_LAYOUT_VISIBILITY.statusBar);
    setRightSidebarOpenState(DEFAULT_LAYOUT_VISIBILITY.assistant);
    setLayoutResetKey((key) => key + 1);
    _notifySidebarStateChange();
    _notifyAssistantStateChange();
    _notifyLayoutStateChange(DEFAULT_LAYOUT_VISIBILITY);
  }, []);

  React.useEffect(() => {
    _setLayoutRestoreHandler((state) => {
      const restored = {
        ...state,
        editor: state.editor || !state.preview,
        preview: state.preview || !state.editor,
      };
      _syncLayoutMirror(restored);
      setToolbarVisible(state.toolbar);
      setTabBarVisible(state.tabBar);
      setSidebarOpen(state.sidebar);
      setEditorVisible(restored.editor);
      setPreviewVisible(restored.preview);
      setStatusBarVisible(state.statusBar);
      setRightSidebarOpenState(state.assistant);
    });
    return () => _setLayoutRestoreHandler(null);
  }, []);

  React.useEffect(() => {
    _setLayoutPartHandler(setLayoutPart);
    _setLayoutResetHandler(resetLayout);
    return () => {
      _setLayoutPartHandler(null);
      _setLayoutResetHandler(null);
    };
  }, [resetLayout, setLayoutPart]);

  const value = React.useMemo(
    () => ({
      sidebarOpen,
      setSidebarOpen: setSidebarOpenWrapper,
      toggleSidebar,
      rightSidebarOpen,
      setRightSidebarOpen,
      toggleRightSidebar,
      toolbarVisible,
      tabBarVisible,
      editorVisible,
      previewVisible,
      statusBarVisible,
      layoutResetKey,
      setLayoutPart,
      resetLayout,
      rightSidebarSize,
      setRightSidebarSize,
    }),
    [
      sidebarOpen,
      toggleSidebar,
      rightSidebarOpen,
      setRightSidebarOpen,
      toggleRightSidebar,
      toolbarVisible,
      tabBarVisible,
      editorVisible,
      previewVisible,
      statusBarVisible,
      layoutResetKey,
      setLayoutPart,
      resetLayout,
      rightSidebarSize,
      setRightSidebarSize,
    ],
  );
  return (
    <UIStateContext.Provider value={value}>{children}</UIStateContext.Provider>
  );
};

export function useUIState(): UIState {
  const ctx = React.useContext(UIStateContext);
  if (!ctx) {
    throw new Error(
      'useUIState() called outside <UIStateProvider>. Wrap the consumer in <App>, which sets up the provider.',
    );
  }
  return ctx;
}
