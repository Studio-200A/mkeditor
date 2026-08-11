import type { EditorSettings } from '../../../interfaces/Editor';

export type SettingsPage =
  | 'general.session'
  | 'general.images'
  | 'general.appearance'
  | 'general.scrollbars'
  | 'general.zoom'
  | 'editor.formatting'
  | 'editor.editing'
  | 'editor.fonts'
  | 'assistant.providers';

export type UpdateEditorSetting = <K extends keyof EditorSettings>(
  key: K,
  value: EditorSettings[K],
) => void;
