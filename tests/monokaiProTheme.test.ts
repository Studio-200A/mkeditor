import { editor } from 'monaco-editor';
import {
  MONOKAI_PRO_THEME_NAME,
  monokaiProTheme,
  registerMonokaiProTheme,
} from '../src/browser/themes/monokaiPro';

describe('Monokai Pro Monaco theme', () => {
  it('registers once with canonical palette roles', () => {
    registerMonokaiProTheme(editor);
    registerMonokaiProTheme(editor);

    expect(editor.defineTheme).toHaveBeenCalledTimes(1);
    expect(editor.defineTheme).toHaveBeenCalledWith(
      MONOKAI_PRO_THEME_NAME,
      monokaiProTheme,
    );
    expect(monokaiProTheme.colors).toMatchObject({
      'editor.background': '#2d2a2e',
      'editor.foreground': '#fcfcfa',
      focusBorder: '#ab9df2',
    });
    expect(monokaiProTheme.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ token: 'keyword', foreground: 'FF6188' }),
        expect.objectContaining({ token: 'string', foreground: 'A9DC76' }),
        expect.objectContaining({ token: 'comment', foreground: '727072' }),
      ]),
    );
  });
});
