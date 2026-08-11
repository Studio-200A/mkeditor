import * as React from 'react';

import { useFiles } from '../contexts/FilesContext';
import { useModals } from '../contexts/ModalsContext';
import { useUIState } from '../contexts/UIStateContext';
import { useManagers } from '../contexts/ManagersContext';
import { useSettings } from '../contexts/SettingsContext';
import { sonnerToast } from '../../notify';
import { useCounts } from '../hooks/useCounts';
import { useTranslation } from '../hooks/useTranslation';
import { APP_VERSION } from '../../version';
import { Icon } from './Icon';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

/**
 * Bottom status bar: file path, counts, settings/shortcuts/AI toggle,
 * dark mode switch, version.
 */
export const Navbar: React.FC = () => {
  const { toggleRightSidebar, rightSidebarOpen } = useUIState();
  const { openModal } = useModals();
  const { mode } = useManagers();
  const { settings, updateSetting } = useSettings();
  const { t } = useTranslation();
  const { activeFile, tabs } = useFiles();

  const showAssistantToggle = mode !== 'web';
  const counts = useCounts();

  const isUntitled = !activeFile || activeFile.startsWith('untitled');
  const activeFileLabel = React.useMemo(() => {
    if (!activeFile) return null;
    if (isUntitled) {
      return tabs.find((tab) => tab.path === activeFile)?.name ?? null;
    }
    return activeFile;
  }, [activeFile, tabs, isUntitled]);

  const handleCopyPath = React.useCallback(() => {
    if (!activeFile || isUntitled) return;
    void navigator.clipboard
      .writeText(activeFile)
      .then(() => sonnerToast('success', t('navbar:path_copied')));
  }, [activeFile, isUntitled, t]);

  return (
    <TooltipProvider delayDuration={200}>
      <nav className="flex items-center justify-between border-t border-border bg-background h-7">
        <div className="flex items-center gap-2 pl-2">
          <span
            id="active-file"
            className="truncate text-xs text-muted-foreground"
            title={activeFileLabel ?? undefined}
          >
            {activeFileLabel ?? t('app:brand_name')}
          </span>
          {!isUntitled && activeFile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleCopyPath}
                  className="h-5 w-5 text-muted-foreground hover:text-foreground text-xs"
                  aria-label={t('navbar:copy_path_tooltip')}
                >
                  <Icon name="copy" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('navbar:copy_path_tooltip')}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-3 pr-2">
          <div className="text-xs text-muted-foreground">
            <span>{t('navbar:character_count')}</span>{' '}
            <span id="character-count">{counts.characters}</span>
            <span className="mx-1 opacity-50">|</span>
            <span>{t('navbar:word_count')}</span>{' '}
            <span id="word-count">{counts.words}</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                className="text-muted-foreground hover:text-foreground"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  openModal('settings');
                }}
              >
                <Icon name="cogs" />
              </a>
            </TooltipTrigger>
            <TooltipContent>{t('navbar:settings_tooltip')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                className="text-muted-foreground hover:text-foreground"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  openModal('shortcuts');
                }}
              >
                <Icon name="question-circle" />
              </a>
            </TooltipTrigger>
            <TooltipContent>{t('navbar:shortcuts_tooltip')}</TooltipContent>
          </Tooltip>
          {showAssistantToggle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  id="assistant-toggle"
                  size="icon"
                  variant="ghost"
                  type="button"
                  aria-pressed={rightSidebarOpen}
                  onClick={toggleRightSidebar}
                  className="h-5 w-5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Icon name="comments" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t('navbar:toggle_assistant_tooltip')}
              </TooltipContent>
            </Tooltip>
          )}
          {/* Dark mode toggle */}
          <div className="flex items-center gap-1">
            <Icon
              name="moon"
              className={settings.effectiveDarkmode ? 'text-warning' : ''}
            />
            <Switch
              id="darkmode-setting"
              checked={settings.darkmode}
              onCheckedChange={(v) => updateSetting('darkmode', v)}
              disabled={mode === 'desktop' && settings.systemtheme}
            />
          </div>
          {/* Version */}
          <span
            className="cursor-pointer text-xs text-muted-foreground hover:text-foreground select-none"
            onClick={() => openModal('about')}
            title={t('navbar:version_tooltip')}
          >
            v{APP_VERSION}
          </span>
        </div>
      </nav>
    </TooltipProvider>
  );
};
