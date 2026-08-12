import * as React from 'react';

import type { MenuGroup, MenuItem } from '../../../app/lib/menuModel';
import { dispatchMenuActionExternal } from '../../menuDispatch';
import { useTranslation } from '../hooks/useTranslation';
import { useUIState } from '../contexts/UIStateContext';
import { cn } from '../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface TitleBarMenuProps {
  group: MenuGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTriggerPointerEnter: () => void;
}

/** Look up `menus-titlebar:<id>` and fall back to the model's English
 *  `label` (which is always set). Lets components stay readable without
 *  threading a `t` everywhere. */
function useMenuLabel(): (id: string, fallback: string) => string {
  const { t } = useTranslation();
  return React.useCallback(
    (id, fallback) => t(`menus-titlebar:${id}`, { defaultValue: fallback }),
    [t],
  );
}

/**
 * One File / Edit / View / Help dropdown. The trigger renders the group
 * label as a small text button; the content lists items from the model
 * (separator handled via `separatorBefore`), with the accelerator label
 * pinned to the right.
 *
 * Click → `dispatchMenuActionExternal(item.action)` does the right
 * effect (channel send / Monaco role / main-process command). The whole
 * row is keyboard-navigable via Radix's built-in arrow-key handling.
 */
export const TitleBarMenu: React.FC<TitleBarMenuProps> = ({
  group,
  open,
  onOpenChange,
  onTriggerPointerEnter,
}) => {
  const label = useMenuLabel();
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange} modal={false}>
      <DropdownMenuTrigger
        data-titlebar-menu={group.id}
        data-titlebar-no-drag
        className={cn(
          'rounded-sm px-2 py-1 text-xs text-foreground',
          'hover:bg-accent hover:text-accent-foreground',
          'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        )}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        onPointerEnter={onTriggerPointerEnter}
      >
        {label(group.id, group.label)}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[14rem]"
        // Stop Radix from returning focus to the trigger button after
        // selection — the dispatcher needs focus to land on Monaco so
        // editor-scoped actions (command palette, clipboard ops) work.
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {group.items.map((item, idx) => (
          <MenuRow key={item.id} item={item} first={idx === 0} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const MenuRow: React.FC<{ item: MenuItem; first: boolean }> = ({
  item,
  first,
}) => {
  const label = useMenuLabel();
  const layout = useUIState();
  const accelerator = item.accelerator
    ? formatAccelerator(item.accelerator)
    : '';
  const isLayoutReset =
    item.action?.kind === 'channel' &&
    (item.action.channel === 'from:layout:reset' ||
      item.action.channel === 'from:layout:reset-editor-preview-split');
  return (
    <>
      {item.separatorBefore && !first && <DropdownMenuSeparator />}
      {item.items ? (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-xs">
            {label(item.id, item.label)}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {item.items.map((child, idx) => (
              <MenuRow key={child.id} item={child} first={idx === 0} />
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      ) : item.layoutPart ? (
        <DropdownMenuCheckboxItem
          checked={layoutPartVisible(item.layoutPart, layout)}
          onClick={() =>
            layout.setLayoutPart(
              item.layoutPart!,
              !layoutPartVisible(item.layoutPart!, layout),
            )
          }
          className="flex items-center justify-between gap-6 text-xs"
        >
          <span>{label(item.id, item.label)}</span>
          {accelerator && (
            <span className="text-[10px] text-muted-foreground">
              {accelerator}
            </span>
          )}
        </DropdownMenuCheckboxItem>
      ) : (
        <DropdownMenuItem
          inset={isLayoutReset}
          disabled={!item.action}
          onSelect={() => {
            if (
              item.action?.kind === 'channel' &&
              item.action.channel === 'from:layout:reset'
            ) {
              layout.resetLayout();
            } else if (
              item.action?.kind === 'channel' &&
              item.action.channel === 'from:layout:reset-editor-preview-split'
            ) {
              layout.resetEditorPreviewSplit();
            } else if (item.action) {
              dispatchMenuActionExternal(item.action);
            }
          }}
          className="flex items-center justify-between gap-6 text-xs"
        >
          <span>{label(item.id, item.label)}</span>
          {accelerator && (
            <span className="text-[10px] text-muted-foreground">
              {accelerator}
            </span>
          )}
        </DropdownMenuItem>
      )}
    </>
  );
};

function layoutPartVisible(
  part: NonNullable<MenuItem['layoutPart']>,
  state: ReturnType<typeof useUIState>,
): boolean {
  switch (part) {
    case 'toolbar':
      return state.toolbarVisible;
    case 'tabBar':
      return state.tabBarVisible;
    case 'sidebar':
      return state.sidebarOpen;
    case 'editor':
      return state.editorVisible;
    case 'preview':
      return state.previewVisible;
    case 'statusBar':
      return state.statusBarVisible;
    case 'assistant':
      return state.rightSidebarOpen;
  }
}

/**
 * Translate Electron's accelerator string into the form to display.
 * `CmdOrCtrl+N` → `Ctrl+N` (the in-window menu only shows on Windows/Linux
 * and web, where Ctrl is correct). macOS uses the native menu and never
 * reaches this code path.
 */
function formatAccelerator(accel: string): string {
  return accel.replace(/CmdOrCtrl/g, 'Ctrl').replace(/Cmd/g, '⌘');
}
