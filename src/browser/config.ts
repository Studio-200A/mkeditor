import type {
  EditorSettings,
  ExportSettings,
  ScrollbarVisibility,
} from './interfaces/Editor';

export const config = {};

const DEFAULT_EDITOR_FONT_FAMILY =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

const DEFAULT_UI_FONT_FAMILY = "'Nunito Sans', 'Open Sans', 'Lato', sans-serif";

const DEFAULT_PREVIEW_TEXT_FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";

const DEFAULT_PREVIEW_CODE_FONT_FAMILY =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

export {
  DEFAULT_EDITOR_FONT_FAMILY,
  DEFAULT_UI_FONT_FAMILY,
  DEFAULT_PREVIEW_TEXT_FONT_FAMILY,
  DEFAULT_PREVIEW_CODE_FONT_FAMILY,
};

export const settings: EditorSettings = {
  autoindent: false,
  darkmode: false,
  wordwrap: true,
  whitespace: false,
  minimap: true,
  minimapMaxColumn: 120,
  scrollbarVisibility: 'auto',
  systemtheme: true,
  scrollsync: true,
  sessionRestore: true,
  locale: 'system',
  fileExplorer: { extensions: ['md'] },
  pasteImages: { directory: './assets' },
  uiFontFamily: DEFAULT_UI_FONT_FAMILY,
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
  editorTextWidth: 100,
  previewTextWidth: 100,
};

/**
 * Monaco exposes a column cap rather than a pixel-width option. Pairing the
 * cap with its supported 1-3 scale produces a predictable CSS-pixel width.
 */
export function minimapOptions(enabled: boolean, width: number) {
  const clampedWidth = Math.min(300, Math.max(20, width));
  const scale = clampedWidth <= 100 ? 1 : clampedWidth <= 200 ? 2 : 3;
  return {
    enabled,
    scale,
    maxColumn: Math.ceil(clampedWidth / scale),
  };
}

export function monacoScrollbarOptions(visibility: ScrollbarVisibility) {
  const hidden = visibility === 'hidden';
  const monacoVisibility = visibility === 'auto' ? 'visible' : visibility;
  return {
    scrollbar: {
      vertical: monacoVisibility,
      horizontal: monacoVisibility,
      verticalScrollbarSize: hidden ? 0 : 14,
      verticalSliderSize: hidden ? 0 : 14,
      horizontalScrollbarSize: hidden ? 0 : 12,
      horizontalSliderSize: hidden ? 0 : 12,
    },
    overviewRulerLanes: hidden ? 0 : 3,
    overviewRulerBorder: !hidden,
  };
}

export const exportSettings: ExportSettings = {
  withStyles: true,
  container: 'container-fluid',
  fontSize: 16,
  lineSpacing: 1.5,
  background: '#ffffff',
  fontColor: '#212529',
};
