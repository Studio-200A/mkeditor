import * as React from 'react';

import { useManagers } from '../../contexts/ManagersContext';
import { useModals } from '../../contexts/ModalsContext';
import { confirmExternal } from '../../contexts/PromptsContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useTranslation } from '../../hooks/useTranslation';
import { AssistantSettings } from '../assistant/AssistantSettings';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { EditorSettings } from '../settings/EditorSettings';
import { GeneralSettings } from '../settings/GeneralSettings';
import { SettingsPageLayout } from '../settings/SettingsControls';
import { SettingsNavigation } from '../settings/SettingsNavigation';
import type { SettingsPage } from '../settings/types';
import { Icon } from '../Icon';

/** VS Code-inspired settings shell with explicit MKEditor setting pages. */
export const SettingsModal: React.FC = () => {
  const { mode, bridgeManager, providers } = useManagers();
  const { open, payload, closeModal } = useModals();
  const { settings, updateSetting } = useSettings();
  const { t } = useTranslation();
  const showAssistant = mode !== 'web';
  const [page, setPage] = React.useState<SettingsPage>('general.session');

  React.useEffect(() => {
    if (open !== 'settings') return;
    const requested = payload && 'tab' in payload ? payload.tab : undefined;
    setPage(
      requested === 'assistant' && showAssistant
        ? 'assistant.providers'
        : 'general.session',
    );
  }, [open, payload, showAssistant]);

  const handleClearSession = async () => {
    if (!bridgeManager) return;
    const confirmed = await confirmExternal({
      title: t('modals-settings:clear_session_confirm_title'),
      description: t('modals-settings:clear_session_confirm_text'),
      confirmLabel: t('modals-settings:clear_session_confirm_button'),
      cancelLabel: t('modals-settings:clear_session_cancel_button'),
      destructive: true,
    });
    if (confirmed) bridgeManager.bridge.send('to:session:clear', null);
  };

  const handleSave = () => {
    if (
      mode === 'desktop' &&
      bridgeManager &&
      providers.settings &&
      providers.exportSettings
    ) {
      bridgeManager.saveSettingsToFile({
        ...providers.settings.getSettings(),
        exportSettings: providers.exportSettings.getSettings(),
      });
    }
    closeModal();
  };

  let content: React.ReactNode;
  if (page.startsWith('general.')) {
    content = (
      <GeneralSettings
        page={page as Extract<SettingsPage, `general.${string}`>}
        mode={mode}
        settings={settings}
        updateSetting={updateSetting}
        onClearSession={() => void handleClearSession()}
      />
    );
  } else if (page.startsWith('editor.')) {
    content = (
      <EditorSettings
        page={page as Extract<SettingsPage, `editor.${string}`>}
        settings={settings}
        updateSetting={updateSetting}
      />
    );
  } else {
    content = (
      <SettingsPageLayout title={t('modals-settings:tab_assistant')}>
        <AssistantSettings />
      </SettingsPageLayout>
    );
  }

  return (
    <Dialog
      open={open === 'settings'}
      onOpenChange={(next) => !next && closeModal()}
    >
      <DialogContent
        aria-describedby={undefined}
        className="flex h-[min(760px,calc(100vh-2rem))] max-h-none w-[min(1100px,calc(100vw-2rem))] max-w-none flex-col overflow-hidden"
      >
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <DialogTitle>{t('modals-settings:title')}</DialogTitle>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {t('modals-settings:intro')}
            </p>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <SettingsNavigation
            page={page}
            showAssistant={showAssistant}
            onPageChange={setPage}
          />
          <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7 md:px-9">
            {content}
          </main>
        </div>

        <footer className="flex shrink-0 items-center justify-between border-t border-border bg-popover px-5 py-3">
          {mode === 'desktop' ? (
            <span className="truncate font-mono text-xs text-muted-foreground">
              {page === 'assistant.providers'
                ? '~/.mkeditor/assistant.json'
                : '~/.mkeditor/settings.json'}
            </span>
          ) : (
            <span />
          )}
          <Button type="button" size="sm" onClick={handleSave}>
            <Icon name="save" />
            <span>{t('modals-settings:save_settings')}</span>
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
};
