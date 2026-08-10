import * as React from 'react';
import {
  Group,
  Panel,
  Separator,
  type GroupImperativeHandle,
} from 'react-resizable-panels';

import { useManagers } from '../contexts/ManagersContext';
import { useFiles } from '../contexts/FilesContext';
import { useTranslation } from '../hooks/useTranslation';
import { Button } from './ui/button';
import { Icon } from './Icon';
import { EditorHost } from './EditorHost';
import { EditorPaneDiffOverlay } from './EditorPaneDiffOverlay';
import { PreviewPane } from './PreviewPane';

interface WorkspaceProps {
  /** Shared ref owned by <App>; <EditorToolbar>'s split-reset button calls
   * `groupRef.current.setLayout({...})` directly via the same ref. */
  groupRef: React.Ref<GroupImperativeHandle | null>;
  onEditorReady?: () => void;
}

/**
 * The editor/preview split. Using `react-resizable-panels` v4
 * (Group + Panel + Separator). Panel.onResize fires
 * `editorManager.layout()` so Monaco reflows on every drag tick.
 *
 * React `<EditorToolbar>` owns the split-reset button and calls
 * `groupRef.current.setLayout(...)` directly through the ref that <App>
 * passes here.
 */
export const Workspace: React.FC<WorkspaceProps> = ({
  groupRef,
  onEditorReady,
}) => {
  const { editorManager, bridgeManager } = useManagers();
  const { tabs } = useFiles();
  const { t } = useTranslation();

  const createNewFile = React.useCallback(() => {
    if (bridgeManager) {
      bridgeManager.menuFileNew();
    }
  }, [bridgeManager]);

  return (
    <Group orientation="horizontal" id="editor-preview" groupRef={groupRef}>
      <Panel
        id="editor-pane"
        onResize={() => editorManager?.layout()}
        // `react-resizable-panels` v4 puts an inner `<div>` with inline
        // `overflow: auto` around the panel children. Monaco owns its own
        // scrollbars, so leaving that div scrollable lets the two compete:
        // on smaller viewports the pane jumps as both fight to keep the
        // cursor in view. Forcing `overflow: hidden` cedes scrolling to
        // Monaco entirely.
        style={{ overflow: 'hidden' }}
      >
        {/* `position: relative` anchor for the diff overlay below.
            The overlay absolute-fills this wrapper when the active
            tab is a popped-out diff; otherwise it returns null and
            Monaco renders unobstructed. */}
        <div className="relative h-full w-full">
          <EditorHost onReady={onEditorReady} />
          <EditorPaneDiffOverlay />
          {tabs.length === 0 && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-popover text-muted-foreground">
              <p className="text-lg font-semibold">{t('app:no_open_tabs')}</p>
              <Button variant="outline" size="sm" onClick={createNewFile}>
                <Icon name="plus" />
                <span>{t('app:new_file')}</span>
              </Button>
            </div>
          )}
        </div>
      </Panel>
      <Separator className="gutter gutter-horizontal" />
      <Panel id="preview-pane">
        <PreviewPane />
      </Panel>
    </Group>
  );
};
