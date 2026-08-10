import type { EditorSettings, ExportSettings } from './interfaces/Editor';

export const config = {};

const DEFAULT_EDITOR_FONT_FAMILY =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

const DEFAULT_PREVIEW_TEXT_FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";

const DEFAULT_PREVIEW_CODE_FONT_FAMILY =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

export {
  DEFAULT_EDITOR_FONT_FAMILY,
  DEFAULT_PREVIEW_TEXT_FONT_FAMILY,
  DEFAULT_PREVIEW_CODE_FONT_FAMILY,
};

export const settings: EditorSettings = {
  autoindent: false,
  darkmode: false,
  wordwrap: true,
  whitespace: false,
  minimap: true,
  systemtheme: true,
  scrollsync: true,
  sessionRestore: true,
  locale: 'system',
  fileExplorer: { extensions: ['md'] },
  pasteImages: { directory: './assets' },
  editorFontFamily: DEFAULT_EDITOR_FONT_FAMILY,
  previewTextFontFamily: DEFAULT_PREVIEW_TEXT_FONT_FAMILY,
  previewCodeFontFamily: DEFAULT_PREVIEW_CODE_FONT_FAMILY,
  editorFontSize: 14,
  previewTextFontSize: 16,
  previewCodeFontSize: 14,
  lineNumbersMinChars: 5,
  uiZoom: 100,
  editorZoom: 100,
  previewZoom: 100,
};

export const exportSettings: ExportSettings = {
  withStyles: true,
  container: 'container-fluid',
  fontSize: 16,
  lineSpacing: 1.5,
  background: '#ffffff',
  fontColor: '#212529',
};
