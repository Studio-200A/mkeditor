import * as React from 'react';

import type { EditorSettingsSnapshot } from '../../../interfaces/Editor';
import { useTranslation } from '../../hooks/useTranslation';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { CheckboxRow, SettingsPageLayout } from './SettingsControls';
import type { SettingsPage, UpdateEditorSetting } from './types';

const LINE_NUMBER_WIDTH_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10];

export const EditorSettings: React.FC<{
  page: Extract<SettingsPage, `editor.${string}`>;
  settings: EditorSettingsSnapshot;
  updateSetting: UpdateEditorSetting;
}> = ({ page, settings, updateSetting }) => {
  const { t } = useTranslation();
  const [minimapWidthDraft, setMinimapWidthDraft] = React.useState(
    String(settings.minimapMaxColumn),
  );

  React.useEffect(() => {
    setMinimapWidthDraft(String(settings.minimapMaxColumn));
  }, [settings.minimapMaxColumn]);

  const commitMinimapWidth = () => {
    const parsed = Number(minimapWidthDraft);
    const next = Number.isFinite(parsed)
      ? Math.min(300, Math.max(20, Math.round(parsed)))
      : settings.minimapMaxColumn;
    setMinimapWidthDraft(String(next));
    if (next !== settings.minimapMaxColumn) {
      updateSetting('minimapMaxColumn', next);
    }
  };

  if (page === 'editor.formatting') {
    return (
      <SettingsPageLayout title={t('modals-settings:formatting')}>
        <CheckboxRow
          id="autoindent-setting"
          label={t('modals-settings:autoindent_label')}
          help={t('modals-settings:autoindent_help')}
          checked={settings.autoindent}
          onChange={(value) => updateSetting('autoindent', value)}
        />
        <CheckboxRow
          id="wordwrap-setting"
          label={t('modals-settings:wordwrap_label')}
          help={t('modals-settings:wordwrap_help')}
          checked={settings.wordwrap}
          onChange={(value) => updateSetting('wordwrap', value)}
        />
      </SettingsPageLayout>
    );
  }

  if (page === 'editor.editing') {
    return (
      <SettingsPageLayout title={t('modals-settings:editing')}>
        <CheckboxRow
          id="whitespace-setting"
          label={t('modals-settings:whitespace_label')}
          help={t('modals-settings:whitespace_help')}
          checked={settings.whitespace}
          onChange={(value) => updateSetting('whitespace', value)}
        />
        <div className="flex max-w-md flex-col gap-2">
          <Label htmlFor="line-numbers-min-chars-setting">
            {t('modals-settings:line_numbers_min_chars_label')}
          </Label>
          <Select
            value={String(settings.lineNumbersMinChars ?? 5)}
            onValueChange={(value) =>
              updateSetting('lineNumbersMinChars', Number(value))
            }
          >
            <SelectTrigger id="line-numbers-min-chars-setting">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LINE_NUMBER_WIDTH_OPTIONS.map((width) => (
                <SelectItem key={width} value={String(width)}>
                  {width}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <small className="text-muted-foreground">
            {t('modals-settings:line_numbers_min_chars_help')}
          </small>
        </div>
        <CheckboxRow
          id="minimap-setting"
          label={t('modals-settings:minimap_label')}
          help={t('modals-settings:minimap_help')}
          checked={settings.minimap}
          onChange={(value) => updateSetting('minimap', value)}
        />
        <div className="flex max-w-md flex-col gap-2">
          <Label htmlFor="minimap-max-column-setting">
            {t('modals-settings:minimap_width_label')}
          </Label>
          <Input
            id="minimap-max-column-setting"
            type="number"
            min={20}
            max={300}
            value={minimapWidthDraft}
            disabled={!settings.minimap}
            onChange={(event) => {
              const draft = event.target.value;
              setMinimapWidthDraft(draft);
              const next = Number(draft);
              if (Number.isInteger(next) && next >= 20 && next <= 300) {
                updateSetting('minimapMaxColumn', next);
              }
            }}
            onBlur={commitMinimapWidth}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            className="w-32 text-xs"
            data-testid="minimap-width-input"
          />
          <small className="text-muted-foreground">
            {t('modals-settings:minimap_width_help')}
          </small>
        </div>
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout title={t('modals-settings:fonts')}>
      <FontField
        title={t('modals-settings:editor_font_section')}
        familyId="editor-font-family-setting"
        familyLabel={t('modals-settings:editor_font_label')}
        familyHelp={t('modals-settings:editor_font_help')}
        family={settings.editorFontFamily ?? ''}
        onFamilyChange={(value) => updateSetting('editorFontFamily', value)}
        sizeId="editor-font-size-setting"
        sizeLabel={t('modals-settings:editor_font_size_label')}
        size={settings.editorFontSize ?? 14}
        onSizeChange={(value) => updateSetting('editorFontSize', value)}
        familyTestId="editor-font-family-input"
        sizeTestId="editor-font-size-input"
      />
      <FontField
        title={t('modals-settings:preview_font_section')}
        familyId="preview-text-font-family-setting"
        familyLabel={t('modals-settings:preview_text_font_label')}
        familyHelp={t('modals-settings:preview_text_font_help')}
        family={settings.previewTextFontFamily ?? ''}
        onFamilyChange={(value) =>
          updateSetting('previewTextFontFamily', value)
        }
        sizeId="preview-text-font-size-setting"
        sizeLabel={t('modals-settings:preview_text_font_size_label')}
        size={settings.previewTextFontSize ?? 16}
        onSizeChange={(value) => updateSetting('previewTextFontSize', value)}
        familyTestId="preview-text-font-family-input"
        sizeTestId="preview-text-font-size-input"
      />
      <FontField
        title={t('modals-settings:preview_code_font_label')}
        familyId="preview-code-font-family-setting"
        familyLabel={t('modals-settings:preview_code_font_label')}
        familyHelp={t('modals-settings:preview_code_font_help')}
        family={settings.previewCodeFontFamily ?? ''}
        onFamilyChange={(value) =>
          updateSetting('previewCodeFontFamily', value)
        }
        sizeId="preview-code-font-size-setting"
        sizeLabel={t('modals-settings:preview_code_font_size_label')}
        size={settings.previewCodeFontSize ?? 14}
        onSizeChange={(value) => updateSetting('previewCodeFontSize', value)}
        familyTestId="preview-code-font-family-input"
        sizeTestId="preview-code-font-size-input"
      />
    </SettingsPageLayout>
  );
};

const FontField: React.FC<{
  title: string;
  familyId: string;
  familyLabel: string;
  familyHelp: string;
  family: string;
  onFamilyChange: (value: string) => void;
  sizeId: string;
  sizeLabel: string;
  size: number;
  onSizeChange: (value: number) => void;
  familyTestId: string;
  sizeTestId: string;
}> = ({
  title,
  familyId,
  familyLabel,
  familyHelp,
  family,
  onFamilyChange,
  sizeId,
  sizeLabel,
  size,
  onSizeChange,
  familyTestId,
  sizeTestId,
}) => (
  <div className="border-b border-border pb-6 last:border-b-0">
    <h3 className="mb-3 font-semibold text-foreground">{title}</h3>
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
      <div className="flex flex-col gap-2">
        <Label htmlFor={familyId}>{familyLabel}</Label>
        <Input
          id={familyId}
          type="text"
          value={family}
          onChange={(event) => onFamilyChange(event.target.value)}
          className="font-mono text-xs"
          data-testid={familyTestId}
        />
        <small className="text-muted-foreground">{familyHelp}</small>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={sizeId}>{sizeLabel}</Label>
        <Input
          id={sizeId}
          type="number"
          min={9}
          max={72}
          value={size}
          onChange={(event) => onSizeChange(Number(event.target.value) || 14)}
          className="font-mono text-xs"
          data-testid={sizeTestId}
        />
      </div>
    </div>
  </div>
);
