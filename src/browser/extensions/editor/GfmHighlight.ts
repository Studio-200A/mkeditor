import { languages } from 'monaco-editor';
import { language as markdownLanguage } from 'monaco-editor/esm/vs/basic-languages/markdown/markdown.js';

let registered = false;

/** Extend Monaco's built-in Markdown tokenizer with GFM inline roles. */
export function registerGfmMarkdownHighlighting(): void {
  if (registered) return;
  registered = true;
  languages.onLanguage('markdown', () => {
    const tokenizer = markdownLanguage.tokenizer as Record<
      string,
      languages.IMonarchLanguageRule[]
    >;
    languages.setMonarchTokensProvider('markdown', {
      ...markdownLanguage,
      tokenizer: {
        ...tokenizer,
        root: [
          [
            /^(\s*(?:[*+-]|\d+[.)])\s+)(\[[ xX]\])(?=\s)/,
            ['keyword', 'meta.task-list'],
          ],
          ...tokenizer.root,
        ],
        linecontent: [
          [/~~(?=\S)(?:[^~]|~(?!~))+?\S~~/, 'markup.strikethrough'],
          [/\bwww\.[^\s<]+/, 'string.link'],
          [/[\w.!#$%&'*+/=?^_`{|}~-]+@[\w-]+(?:\.[\w-]+)+/, 'string.link'],
          ...tokenizer.linecontent,
        ],
      },
    });
  });
}
