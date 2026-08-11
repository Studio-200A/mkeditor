/**
 * Stylesheet for rendered markdown — used by both the live preview pane
 * and the HTML export. Single source of truth so the live preview always
 * matches what the user gets when they export.
 *
 * Architecture notes:
 *  - All rules are scoped to `#preview-content` (the wrapper that holds
 *    the markdown-it output in both contexts).
 *  - Text colour, font-size, and line-height are `inherit` so the body
 *    can drive them. In the live preview the body picks up Tailwind's
 *    `--foreground` token; in the export `ExportSettingsProvider` writes
 *    inline `style="font-size; line-height; color; background"` onto the
 *    body via the user's ExportSettings.
 *  - A small set of CSS custom properties (`--md-*`) controls secondary
 *    colours (borders, muted text, code/table backgrounds, link colour).
 *    They flip with darkmode via `[data-theme='dark']` for the live
 *    preview; the export keeps the light defaults because the user's
 *    `background` and `fontColor` are the source of truth there.
 *  - Custom `:::` alert blocks use a modern flat design: soft tinted
 *    background, coloured left border, and a small uppercase label
 *    rendered via `::before`. No icon font dependency.
 *  - Text and code font families use CSS custom properties
 *    (`--mk-preview-text-font-family`, `--mk-preview-code-font-family`)
 *    with fallbacks matching the upstream defaults. The live preview's
 *    `.preview-zoom-layer` sets these properties at runtime so the user
 *    can customise preview fonts without polluting the export output.
 *
 * The constant is consumed in two places:
 *   - `src/browser/index.ts` injects it into a `<style id="md-styles">`
 *     element appended to `document.head` at boot.
 *   - `src/browser/core/HTMLExporter.ts` inlines the same string into
 *     the exported document's `<head>` when `withStyles` is on.
 */
export const markdownStylesheet = `
:root {
  --md-border: #d1d9e0;
  --md-muted-fg: #59636e;
  --md-muted-bg: #f6f8fa;
  --md-code-bg: rgba(175, 184, 193, 0.2);
  --md-link: #0969da;
  --md-alert-note: #0969da;
  --md-alert-tip: #1a7f37;
  --md-alert-important: #8250df;
  --md-alert-warning: #9a6700;
  --md-alert-caution: #cf222e;
  --md-h1: #d40045;
  --md-h2: #ff7f00;
  --md-h3: #66b82b;
  --md-h4: #093f86;
  --md-h5: #340c81;
  --md-h6: #373530;
  --hljs-foreground: #24292f;
  --hljs-comment: #6e7781;
  --hljs-red: #cf222e;
  --hljs-purple: #8250df;
  --hljs-blue: #0550ae;
  --hljs-green: #116329;
  --hljs-orange: #953800;
  --hljs-cyan: #0a3069;
}

[data-theme='dark'] {
  --md-border: #5b595c;
  --md-muted-fg: #b8b6b8;
  --md-muted-bg: #403e41;
  --md-code-bg: rgba(91, 89, 92, 0.45);
  --md-link: #78dce8;
  --md-alert-note: #4493f8;
  --md-alert-tip: #3fb950;
  --md-alert-important: #ab7df8;
  --md-alert-warning: #d29922;
  --md-alert-caution: #f85149;
  --md-h1: #ff6188;
  --md-h2: #ffd866;
  --md-h3: #a9dc76;
  --md-h4: #78dce8;
  --md-h5: #ab9df2;
  --md-h6: #fc9867;
  --hljs-foreground: #fcfcfa;
  --hljs-comment: #727072;
  --hljs-red: #ff6188;
  --hljs-purple: #ab9df2;
  --hljs-blue: #78dce8;
  --hljs-green: #a9dc76;
  --hljs-orange: #fc9867;
  --hljs-cyan: #78dce8;
}

/* ===== Base ===== */

#preview-content {
  font-family: var(
    --mk-preview-text-font-family,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    'Noto Sans',
    Helvetica,
    Arial,
    sans-serif,
    'Apple Color Emoji',
    'Segoe UI Emoji'
  );
  /* --mk-preview-text-font-size (live-preview-only, set on .preview-zoom-layer)
     takes priority over --mk-export-font-size (from ExportSettings); the export
     document has no .preview-zoom-layer so the export value wins there. */
  font-size: var(
    --mk-preview-text-font-size,
    var(--mk-export-font-size, inherit)
  );
  line-height: inherit;
  color: inherit;
  word-wrap: break-word;
}

#preview-content > *:first-child { margin-top: 0; }
#preview-content > *:last-child  { margin-bottom: 0; }

#preview-content p,
#preview-content blockquote,
#preview-content ul,
#preview-content ol,
#preview-content dl,
#preview-content table,
#preview-content pre {
  margin: 0 0 16px 0;
}

/* ===== Headings ===== */

#preview-content h1,
#preview-content h2,
#preview-content h3,
#preview-content h4,
#preview-content h5,
#preview-content h6 {
  margin: 24px 0 16px;
  font-weight: 600;
  line-height: 1.25;
}

#preview-content h1,
#preview-content h2 {
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--md-border);
}

#preview-content h1 { font-size: 2em; color: var(--md-h1); }
#preview-content h2 { font-size: 1.5em; color: var(--md-h2); }
#preview-content h3 { font-size: 1.25em; color: var(--md-h3); }
#preview-content h4 { font-size: 1em; color: var(--md-h4); }
#preview-content h5 { font-size: 0.875em; color: var(--md-h5); }
#preview-content h6 { font-size: 0.85em; color: var(--md-h6); }

/* ===== Lists =====
 * Tailwind's base layer resets list-style on ul/ol, so we re-assert the
 * GitHub-style nested bullets and numerals here.
 */

#preview-content ul,
#preview-content ol { padding-left: 2em; }

#preview-content ul { list-style: disc; }
#preview-content ul ul { list-style: circle; }
#preview-content ul ul ul { list-style: square; }

#preview-content ol { list-style: decimal; }
#preview-content ol ol { list-style: lower-alpha; }
#preview-content ol ol ol { list-style: lower-roman; }

#preview-content ul ul, #preview-content ul ol,
#preview-content ol ul, #preview-content ol ol { margin: 0; }

#preview-content li + li { margin-top: 0.25em; }
#preview-content li > p  { margin-top: 16px; }

/* Task list rows (markdown-it stamps an <input type=checkbox> at the
 * start of the li). Drop the bullet so the checkbox sits cleanly at
 * the start of the row. */
#preview-content li.task-list-item,
#preview-content li:has(> input[type='checkbox']) {
  list-style: none;
  margin-left: -1.5em;
}
#preview-content li.task-list-item > input[type='checkbox'],
#preview-content li > input[type='checkbox'] {
  margin-right: 0.5em;
}

/* ===== Blockquote ===== */

#preview-content blockquote {
  padding: 0 1em;
  color: var(--md-muted-fg);
  border-left: 0.25em solid var(--md-border);
  margin: 0 0 16px;
}

#preview-content blockquote > :first-child { margin-top: 0; }
#preview-content blockquote > :last-child  { margin-bottom: 0; }

/* ===== GitHub alerts ===== */

#preview-content blockquote.markdown-alert {
  color: inherit;
  border-left-color: var(--md-alert-color);
}

#preview-content .markdown-alert-note { --md-alert-color: var(--md-alert-note); }
#preview-content .markdown-alert-tip { --md-alert-color: var(--md-alert-tip); }
#preview-content .markdown-alert-important { --md-alert-color: var(--md-alert-important); }
#preview-content .markdown-alert-warning { --md-alert-color: var(--md-alert-warning); }
#preview-content .markdown-alert-caution { --md-alert-color: var(--md-alert-caution); }

#preview-content .markdown-alert-title {
  display: flex;
  align-items: center;
  gap: 0.45em;
  margin: 0 0 0.5em;
  color: var(--md-alert-color);
  font-weight: 600;
}

#preview-content .markdown-alert-icon {
  width: 1em;
  height: 1em;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}

/* ===== Code ===== */

#preview-content code,
#preview-content tt {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: var(--mk-preview-code-font-size, 12px);
  white-space: break-spaces;
  background: var(--md-code-bg);
  border-radius: 6px;
  font-family: var(
    --mk-preview-code-font-family,
    ui-monospace,
    SFMono-Regular,
    'SF Mono',
    Menlo,
    Consolas,
    'Liberation Mono',
    monospace
  );
}

#preview-content pre {
  padding: 16px;
  overflow: auto;
  font-size: var(--mk-preview-code-font-size, 12px);
  line-height: 1.45;
  background: var(--md-muted-bg);
  border-radius: 6px;
}

#preview-content pre > code {
  padding: 0;
  margin: 0;
  white-space: pre;
  word-break: normal;
  background: transparent;
  border: 0;
  font-size: 100%;
}

/* highlight.js token roles. Markdown.ts emits .hljs-* classes, while the
 * supplied Monokai reference targets Prism's incompatible .token-* names.
 * Keeping this mapping in the shared stylesheet themes live preview,
 * assistant markdown, and styled HTML exports from one source. */
.hljs { color: var(--hljs-foreground); background: transparent; }
.hljs-comment,
.hljs-code,
.hljs-formula { color: var(--hljs-comment); font-style: italic; }
.hljs-doctag,
.hljs-keyword,
.hljs-template-tag,
.hljs-type,
.hljs-tag { color: var(--hljs-red); }
.hljs-literal,
.hljs-number,
.hljs-constant { color: var(--hljs-purple); }
.hljs-attr,
.hljs-attribute,
.hljs-link,
.hljs-operator,
.hljs-params,
.hljs-property,
.hljs-punctuation { color: var(--hljs-blue); }
.hljs-addition,
.hljs-name,
.hljs-quote,
.hljs-regexp,
.hljs-selector-attr,
.hljs-selector-class,
.hljs-selector-id,
.hljs-selector-pseudo,
.hljs-selector-tag,
.hljs-string { color: var(--hljs-green); }
.hljs-built_in,
.hljs-bullet,
.hljs-meta,
.hljs-symbol,
.hljs-variable { color: var(--hljs-orange); }
.hljs-class .hljs-title,
.hljs-function .hljs-title,
.hljs-title,
.hljs-title.class_,
.hljs-title.function_ { color: var(--md-h2); }
.hljs-deletion { color: var(--hljs-red); }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: 700; }

/* ===== Fenced code block wrapper =====
 * The Markdown.ts renderer wraps every fenced block (and indented block
 * with a recognised language) with a header bar carrying the language
 * label and a copy button. The wrapper supplies the rounded corners +
 * border + background; the inner <pre> drops its own to sit flush.
 */

#preview-content .md-codeblock {
  margin: 0 0 16px 0;
  background: var(--md-muted-bg);
  border: 1px solid var(--md-border);
  border-radius: 6px;
  overflow: hidden;
  font-size: 85%;
}

#preview-content .md-codeblock-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  color: var(--md-muted-fg);
  background: var(--md-muted-bg);
  border-bottom: 1px solid var(--md-border);
  line-height: 1;
}

#preview-content .md-codeblock-lang {
  font-family: var(
    --mk-preview-code-font-family,
    ui-monospace,
    SFMono-Regular,
    'SF Mono',
    Menlo,
    Consolas,
    'Liberation Mono',
    monospace
  );
  font-weight: 600;
  letter-spacing: 0.02em;
}

#preview-content .md-codeblock-copy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.7em;
  height: 1.7em;
  padding: 0;
  margin-left: auto;
  color: inherit;
  background: transparent;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease, transform 120ms ease;
}

#preview-content .md-codeblock-copy:hover {
  background: rgba(127, 127, 127, 0.18);
  color: var(--foreground, inherit);
}

#preview-content .md-codeblock-copy:active {
  transform: scale(0.94);
}

#preview-content .md-codeblock-copy svg {
  width: 1em;
  height: 1em;
}

#preview-content .md-codeblock > pre {
  margin: 0;
  padding: 12px 16px;
  background: transparent;
  border-radius: 0;
  font-size: 100%;
}

/* Terminal-style variant: dark macOS-style chrome with traffic lights. */

#preview-content .md-codeblock--terminal {
  background: #2d2a2e;
  border-color: #221f22;
  color: #fcfcfa;
}

#preview-content .md-codeblock--terminal .md-codeblock-header {
  background: #403e41;
  color: #b8b6b8;
  border-bottom-color: #221f22;
}

#preview-content .md-codeblock--terminal .md-codeblock-copy:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fcfcfa;
}

#preview-content .md-codeblock--terminal > pre,
#preview-content .md-codeblock--terminal > pre > code {
  background: transparent;
  color: #fcfcfa;
}

#preview-content .md-codeblock-dots {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

#preview-content .md-codeblock-dots i {
  display: inline-block;
  width: 11px;
  height: 11px;
  border-radius: 50%;
}

#preview-content .md-codeblock-dots i:nth-child(1) { background: #ff5f56; }
#preview-content .md-codeblock-dots i:nth-child(2) { background: #ffbd2e; }
#preview-content .md-codeblock-dots i:nth-child(3) { background: #27c93f; }

/* ===== Tables ===== */

#preview-content table {
  display: block;
  width: max-content;
  max-width: 100%;
  overflow: auto;
  border-spacing: 0;
  border-collapse: collapse;
}

#preview-content table th,
#preview-content table td {
  padding: 6px 13px;
  border: 1px solid var(--md-border);
}

#preview-content table th {
  font-weight: 600;
  background: var(--md-muted-bg);
}

#preview-content table tr:nth-child(2n) { background: var(--md-muted-bg); }

/* ===== Images ===== */

#preview-content img {
  max-width: 100%;
  height: auto;
}

/* ===== Horizontal rule ===== */

#preview-content hr {
  height: 2px;
  padding: 0;
  margin: 24px 0;
  background: var(--md-border);
  border: 0;
}

/* ===== Links ===== */

#preview-content a {
  color: var(--md-link);
  text-decoration: none;
}

#preview-content a:hover { text-decoration: underline; }

/* ===== Keyboard ===== */

#preview-content kbd {
  display: inline-block;
  padding: 3px 5px;
  font-size: 11px;
  line-height: 10px;
  vertical-align: middle;
  background: var(--md-muted-bg);
  border: solid 1px var(--md-border);
  border-radius: 6px;
  box-shadow: inset 0 -1px 0 var(--md-border);
  font-family: var(
    --mk-preview-code-font-family,
    ui-monospace,
    SFMono-Regular,
    'SF Mono',
    Menlo,
    Consolas,
    'Liberation Mono',
    monospace
  );
}

/* ===== Container width (ExportSettings.container) ===== */

#preview-content.container {
  max-width: 960px;
  margin-left: auto;
  margin-right: auto;
  padding: 0 16px;
}

#preview-content.container-fluid {
  max-width: 100%;
  padding: 0 16px;
}

/* ===== Custom alert blocks ===== */
/* Modern flat design: soft tinted background, coloured left border,
 * uppercase label rendered via ::before. No icon-font dependency.
 * Matches the eight types AlertBlock.ts emits.
 */

#preview-content .alert {
  padding: 12px 16px;
  margin: 16px 0;
  border-radius: 6px;
  border-left: 4px solid;
}

#preview-content .alert > *:first-child { margin-top: 0; }
#preview-content .alert > *:last-child  { margin-bottom: 0; }

#preview-content .alert::before {
  display: block;
  margin-bottom: 6px;
  font-weight: 700;
  font-size: 0.75em;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

#preview-content .alert a.alert-link { font-weight: 600; }

#preview-content .alert-info {
  background: rgba(9, 105, 218, 0.08);
  border-color: #0969da;
}
#preview-content .alert-info::before { content: 'Info'; color: #0969da; }
#preview-content .alert-info a.alert-link { color: #0969da; }

#preview-content .alert-success {
  background: rgba(31, 136, 61, 0.08);
  border-color: #1f883d;
}
#preview-content .alert-success::before { content: 'Success'; color: #1f883d; }
#preview-content .alert-success a.alert-link { color: #1f883d; }

#preview-content .alert-warning {
  background: rgba(154, 103, 0, 0.08);
  border-color: #9a6700;
}
#preview-content .alert-warning::before { content: 'Warning'; color: #9a6700; }
#preview-content .alert-warning a.alert-link { color: #9a6700; }

#preview-content .alert-danger {
  background: rgba(207, 34, 46, 0.08);
  border-color: #cf222e;
}
#preview-content .alert-danger::before { content: 'Danger'; color: #cf222e; }
#preview-content .alert-danger a.alert-link { color: #cf222e; }

#preview-content .alert-primary {
  background: rgba(81, 144, 136, 0.10);
  border-color: #519088;
}
#preview-content .alert-primary::before { content: 'Note'; color: #519088; }
#preview-content .alert-primary a.alert-link { color: #519088; }

#preview-content .alert-secondary {
  background: rgba(89, 99, 110, 0.10);
  border-color: #59636e;
}
#preview-content .alert-secondary::before { content: 'Aside'; color: #59636e; }
#preview-content .alert-secondary a.alert-link { color: #59636e; }

#preview-content .alert-light {
  background: rgba(208, 215, 222, 0.30);
  border-color: #d0d7de;
}
#preview-content .alert-light::before { content: 'Tip'; color: #59636e; }

#preview-content .alert-dark {
  background: rgba(31, 35, 40, 0.10);
  border-color: #1f2328;
}
#preview-content .alert-dark::before { content: 'Important'; color: #1f2328; }
#preview-content .alert-dark a.alert-link { color: #1f2328; }

/* Monokai Pro alert roles in dark mode. */
[data-theme='dark'] #preview-content .alert-info { background: rgba(120, 220, 232, 0.12); border-color: #78dce8; }
[data-theme='dark'] #preview-content .alert-info::before,
[data-theme='dark'] #preview-content .alert-info a.alert-link { color: #78dce8; }
[data-theme='dark'] #preview-content .alert-success { background: rgba(169, 220, 118, 0.12); border-color: #a9dc76; }
[data-theme='dark'] #preview-content .alert-success::before,
[data-theme='dark'] #preview-content .alert-success a.alert-link { color: #a9dc76; }
[data-theme='dark'] #preview-content .alert-warning { background: rgba(255, 216, 102, 0.12); border-color: #ffd866; }
[data-theme='dark'] #preview-content .alert-warning::before,
[data-theme='dark'] #preview-content .alert-warning a.alert-link { color: #ffd866; }
[data-theme='dark'] #preview-content .alert-danger { background: rgba(255, 97, 136, 0.12); border-color: #ff6188; }
[data-theme='dark'] #preview-content .alert-danger::before,
[data-theme='dark'] #preview-content .alert-danger a.alert-link { color: #ff6188; }
[data-theme='dark'] #preview-content .alert-primary { background: rgba(171, 157, 242, 0.14); border-color: #ab9df2; }
[data-theme='dark'] #preview-content .alert-primary::before,
[data-theme='dark'] #preview-content .alert-primary a.alert-link { color: #ab9df2; }
[data-theme='dark'] #preview-content .alert-secondary { background: rgba(252, 152, 103, 0.12); border-color: #fc9867; }
[data-theme='dark'] #preview-content .alert-secondary::before,
[data-theme='dark'] #preview-content .alert-secondary a.alert-link { color: #fc9867; }
[data-theme='dark'] #preview-content .alert-light { background: rgba(184, 182, 184, 0.10); border-color: #b8b6b8; }
[data-theme='dark'] #preview-content .alert-light::before { color: #b8b6b8; }
[data-theme='dark'] #preview-content .alert-dark { background: rgba(252, 252, 250, 0.08); border-color: #fcfcfa; }
[data-theme='dark'] #preview-content .alert-dark::before,
[data-theme='dark'] #preview-content .alert-dark a.alert-link { color: #fcfcfa; }

/* ===== Print ===== */

@media print {
  #preview-content {
    color: #000;
  }
  #preview-content a { color: #000; text-decoration: underline; }
  #preview-content pre,
  #preview-content code,
  #preview-content kbd {
    background: #f6f8fa !important;
  }
  #preview-content .md-codeblock,
  #preview-content .md-codeblock--terminal {
    background: #f6f8fa !important;
    color: #000 !important;
    border-color: #d1d9e0 !important;
  }
  #preview-content .md-codeblock-header {
    background: #f6f8fa !important;
    color: #59636e !important;
    border-bottom-color: #d1d9e0 !important;
  }
  #preview-content .md-codeblock--terminal > pre,
  #preview-content .md-codeblock--terminal > pre > code {
    color: #000 !important;
  }
  #preview-content .md-codeblock-copy,
  #preview-content .md-codeblock-dots {
    display: none !important;
  }
}
`;
