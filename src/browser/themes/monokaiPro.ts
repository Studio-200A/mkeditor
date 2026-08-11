import type { editor } from 'monaco-editor';

export const MONOKAI_PRO_THEME_NAME = 'mkeditor-monokai-pro';

/** Canonical Monokai Pro palette adapted to Monaco token scopes. */
export const monokaiProTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'FCFCFA', background: '2D2A2E' },
    { token: 'comment', foreground: '727072', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'FF6188' },
    { token: 'tag', foreground: 'FF6188' },
    { token: 'delimiter', foreground: 'FCFCFA' },
    { token: 'delimiter.html', foreground: 'FCFCFA' },
    { token: 'number', foreground: 'AB9DF2' },
    { token: 'number.hex', foreground: 'AB9DF2' },
    { token: 'type', foreground: 'FFD866' },
    { token: 'type.identifier', foreground: 'FFD866' },
    { token: 'identifier', foreground: 'FCFCFA' },
    { token: 'function', foreground: 'FFD866' },
    { token: 'string', foreground: 'A9DC76' },
    { token: 'string.escape', foreground: 'FC9867' },
    { token: 'attribute.name', foreground: '78DCE8' },
    { token: 'attribute.value', foreground: 'A9DC76' },
    { token: 'operator', foreground: '78DCE8' },
    { token: 'variable', foreground: 'FC9867' },
    { token: 'variable.predefined', foreground: 'FC9867' },
    { token: 'constant', foreground: 'AB9DF2' },
    { token: 'regexp', foreground: 'FC9867' },
    { token: 'metatag', foreground: 'FF6188' },
    { token: 'annotation', foreground: 'AB9DF2' },
    { token: 'meta.task-list', foreground: 'A9DC76', fontStyle: 'bold' },
    {
      token: 'markup.strikethrough',
      foreground: '727072',
      fontStyle: 'strikethrough',
    },
    { token: 'string.link', foreground: '78DCE8', fontStyle: 'underline' },
  ],
  colors: {
    'editor.background': '#2d2a2e',
    'editor.foreground': '#fcfcfa',
    'editorCursor.foreground': '#fcfcfa',
    'editorLineNumber.foreground': '#727072',
    'editorLineNumber.activeForeground': '#fcfcfa',
    'editor.selectionBackground': '#5b595c',
    'editor.inactiveSelectionBackground': '#403e41',
    'editor.lineHighlightBackground': '#403e41',
    'editor.lineHighlightBorder': '#5b595c',
    'editorWhitespace.foreground': '#5b595c',
    'editorIndentGuide.background1': '#403e41',
    'editorIndentGuide.activeBackground1': '#727072',
    'editorWidget.background': '#403e41',
    'editorWidget.foreground': '#fcfcfa',
    'editorWidget.border': '#5b595c',
    'editorSuggestWidget.background': '#403e41',
    'editorSuggestWidget.border': '#5b595c',
    'editorSuggestWidget.foreground': '#fcfcfa',
    'editorSuggestWidget.highlightForeground': '#78dce8',
    'editorSuggestWidget.selectedBackground': '#5b595c',
    'editorHoverWidget.background': '#403e41',
    'editorHoverWidget.border': '#5b595c',
    'editorGutter.background': '#2d2a2e',
    'editorOverviewRuler.border': '#5b595c',
    'scrollbarSlider.background': '#5b595c88',
    'scrollbarSlider.hoverBackground': '#727072aa',
    'scrollbarSlider.activeBackground': '#ab9df2aa',
    focusBorder: '#ab9df2',
  },
};

let registered = false;

export function registerMonokaiProTheme(monacoEditor: typeof editor): void {
  if (registered) return;
  monacoEditor.defineTheme(MONOKAI_PRO_THEME_NAME, monokaiProTheme);
  registered = true;
}
