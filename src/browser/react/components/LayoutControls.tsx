import * as React from 'react';

import { useUIState } from '../contexts/UIStateContext';
import { useTranslation } from '../hooks/useTranslation';
import { cn } from '../lib/utils';
import { Icon } from './Icon';

export const LayoutControls: React.FC<{ className?: string }> = ({
  className,
}) => {
  const {
    sidebarOpen,
    editorVisible,
    previewVisible,
    setLayoutPart,
    resetEditorPreviewSplit,
  } = useUIState();
  const { t } = useTranslation();

  return (
    <div className={cn('flex items-center gap-px', className)}>
      <LayoutButton
        label={t('menus-titlebar:view.layout.sidebar', {
          defaultValue: 'Show Explorer Sidebar',
        })}
        pressed={sidebarOpen}
        onClick={() => setLayoutPart('sidebar', !sidebarOpen)}
        icon="bars"
      />
      <LayoutButton
        label={t('menus-titlebar:view.layout.editor', {
          defaultValue: 'Show Editor',
        })}
        pressed={editorVisible}
        disabled={editorVisible && !previewVisible}
        onClick={() => setLayoutPart('editor', !editorVisible)}
        icon="code"
      />
      <LayoutButton
        label={t('menus-titlebar:view.layout.preview', {
          defaultValue: 'Show Preview',
        })}
        pressed={previewVisible}
        disabled={previewVisible && !editorVisible}
        onClick={() => setLayoutPart('preview', !previewVisible)}
        icon="eye"
      />
      <LayoutButton
        label={t('menus-titlebar:view.layout.resetSplit', {
          defaultValue: 'Reset Editor / Preview Split',
        })}
        onClick={resetEditorPreviewSplit}
        icon="table-columns"
      />
    </div>
  );
};

const LayoutButton: React.FC<{
  label: string;
  icon: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
}> = ({ label, icon, pressed, disabled, onClick }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={pressed}
    disabled={disabled}
    onClick={onClick}
    data-titlebar-no-drag
    className={cn(
      'flex h-6 w-7 items-center justify-center rounded-sm text-muted-foreground',
      'hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      'aria-pressed:bg-accent aria-pressed:text-foreground disabled:pointer-events-none disabled:opacity-40',
    )}
    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
  >
    <Icon name={icon} />
  </button>
);
