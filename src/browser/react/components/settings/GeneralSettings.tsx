import * as React from 'react';

import type { EditorSettingsSnapshot } from '../../../interfaces/Editor';
import {
  getAvailableLocales,
  normalizeLanguage,
  type LocaleInfo,
} from '../../../i18n';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Icon } from '../Icon';
import { CheckboxRow, SettingsPageLayout, SwitchRow } from './SettingsControls';
import type { SettingsPage, UpdateEditorSetting } from './types';

const ZOOM_OPTIONS = [75, 80, 90, 100, 110, 125, 150, 175, 200];

export const GeneralSettings: React.FC<{
  page: Extract<SettingsPage, `general.${string}`>;
  mode: 'web' | 'desktop';
  settings: EditorSettingsSnapshot;
  updateSetting: UpdateEditorSetting;
  onClearSession: () => void;
}> = ({ page, mode, settings, updateSetting, onClearSession }) => {
  const { t } = useTranslation();
  const [locales, setLocales] = React.useState<LocaleInfo[]>([]);

  React.useEffect(() => {
    if (page !== 'general.appearance') return;
    let cancelled = false;
    getAvailableLocales()
      .then((list) => {
        if (cancelled) return;
        list.sort(
          (a, b) =>
            a.native.localeCompare(b.native) || a.code.localeCompare(b.code),
        );
        setLocales(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [page]);

  if (page === 'general.session') {
    return (
      <SettingsPageLayout title={t('modals-settings:session')}>
        <SwitchRow
          id="session-restore-setting"
          label={t('modals-settings:session_restore_label')}
          help={t('modals-settings:session_restore_help')}
          checked={settings.sessionRestore}
          onChange={(value) => updateSetting('sessionRestore', value)}
        />
        <div className="flex flex-col items-start gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClearSession}
          >
            <Icon name="trash" />
            <span>{t('modals-settings:clear_session_button')}</span>
          </Button>
          <small className="text-muted-foreground">
            {t('modals-settings:clear_session_help')}
          </small>
        </div>
      </SettingsPageLayout>
    );
  }

  if (page === 'general.images') {
    return (
      <SettingsPageLayout title={t('modals-settings:paste_images')}>
        <div className="flex max-w-xl flex-col gap-2">
          <Label htmlFor="paste-images-directory-setting">
            {t('modals-settings:paste_images_directory_label')}
          </Label>
          <Input
            id="paste-images-directory-setting"
            type="text"
            value={settings.pasteImages?.directory ?? './assets'}
            onChange={(event) =>
              updateSetting('pasteImages', { directory: event.target.value })
            }
            placeholder="./assets"
            className="font-mono text-xs"
            data-testid="paste-images-directory-input"
          />
          <small className="text-muted-foreground">
            {t('modals-settings:paste_images_directory_help')}
          </small>
        </div>
      </SettingsPageLayout>
    );
  }

  if (page === 'general.appearance') {
    return (
      <SettingsPageLayout title={t('modals-settings:appearance')}>
        {mode === 'desktop' && (
          <SwitchRow
            id="systemtheme-setting"
            label={t('modals-settings:systemtheme_label')}
            help={t('modals-settings:systemtheme_help')}
            checked={settings.systemtheme}
            onChange={(value) => updateSetting('systemtheme', value)}
          />
        )}
        <div className="flex max-w-xl flex-col gap-2">
          <Label htmlFor="ui-font-family-setting">
            {t('modals-settings:ui_font_label')}
          </Label>
          <Input
            id="ui-font-family-setting"
            type="text"
            value={settings.uiFontFamily ?? ''}
            onChange={(event) =>
              updateSetting('uiFontFamily', event.target.value)
            }
            className="font-mono text-xs"
            data-testid="ui-font-family-input"
          />
          <small className="text-muted-foreground">
            {t('modals-settings:ui_font_help')}
          </small>
        </div>
        <div className="flex max-w-md flex-col gap-2">
          <Label htmlFor="locale-setting">
            {t('modals-settings:language_label')}
          </Label>
          <Select
            value={
              settings.locale === 'system'
                ? 'system'
                : normalizeLanguage(settings.locale || 'en')
            }
            onValueChange={(value) => updateSetting('locale', value)}
          >
            <SelectTrigger id="locale-setting">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">
                {t('modals-settings:language_system')}
              </SelectItem>
              {locales.map((locale) => (
                <SelectItem key={locale.code} value={locale.code}>
                  {locale.native} ({locale.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <small className="text-muted-foreground">
            {t('modals-settings:language_help')}
          </small>
        </div>
      </SettingsPageLayout>
    );
  }

  if (page === 'general.scrollbars') {
    return (
      <SettingsPageLayout title={t('modals-settings:scrollbars')}>
        <div className="flex max-w-md flex-col gap-2">
          <Label htmlFor="scrollbar-visibility-setting">
            {t('modals-settings:scrollbar_visibility_label')}
          </Label>
          <Select
            value={settings.scrollbarVisibility}
            onValueChange={(value) =>
              updateSetting(
                'scrollbarVisibility',
                value as typeof settings.scrollbarVisibility,
              )
            }
          >
            <SelectTrigger id="scrollbar-visibility-setting">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="visible">
                {t('modals-settings:scrollbar_visibility_visible')}
              </SelectItem>
              <SelectItem value="auto">
                {t('modals-settings:scrollbar_visibility_auto')}
              </SelectItem>
              <SelectItem value="hidden">
                {t('modals-settings:scrollbar_visibility_hidden')}
              </SelectItem>
            </SelectContent>
          </Select>
          <small className="text-muted-foreground">
            {t('modals-settings:scrollbar_visibility_help')}
          </small>
        </div>
        <CheckboxRow
          id="scrollsync-setting"
          label={t('modals-settings:scrollsync_label')}
          help={t('modals-settings:scrollsync_help')}
          checked={settings.scrollsync}
          onChange={(value) => updateSetting('scrollsync', value)}
        />
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout title={t('modals-settings:zoom')}>
      {mode === 'desktop' && (
        <ZoomField
          id="ui-zoom-setting"
          label={t('modals-settings:ui_zoom_label')}
          help={t('modals-settings:ui_zoom_help')}
          value={settings.uiZoom ?? 100}
          onChange={(value) => updateSetting('uiZoom', value)}
        />
      )}
      <ZoomField
        id="editor-zoom-setting"
        label={t('modals-settings:editor_zoom_label')}
        help={t('modals-settings:editor_zoom_help')}
        value={settings.editorZoom ?? 100}
        onChange={(value) => updateSetting('editorZoom', value)}
      />
      <ZoomField
        id="preview-zoom-setting"
        label={t('modals-settings:preview_zoom_label')}
        help={t('modals-settings:preview_zoom_help')}
        value={settings.previewZoom ?? 100}
        onChange={(value) => updateSetting('previewZoom', value)}
      />
    </SettingsPageLayout>
  );
};

const ZoomField: React.FC<{
  id: string;
  label: string;
  help: string;
  value: number;
  onChange: (value: number) => void;
}> = ({ id, label, help, value, onChange }) => (
  <div className="flex max-w-md flex-col gap-2">
    <Label htmlFor={id}>{label}</Label>
    <Select
      value={String(value)}
      onValueChange={(next) => onChange(Number(next))}
    >
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ZOOM_OPTIONS.map((zoom) => (
          <SelectItem key={zoom} value={String(zoom)}>
            {zoom}%
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <small className="text-muted-foreground">{help}</small>
  </div>
);
