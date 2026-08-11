import LinkifyIt from 'linkify-it';
import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import MarkdownItTaskLists from 'markdown-it-task-lists';

const extendedLinkify = new LinkifyIt().set({
  fuzzyLink: true,
  fuzzyEmail: true,
  fuzzyIP: false,
});

const disallowedTag =
  /<(\/?)(title|textarea|style|xmp|iframe|noembed|noframes|script|plaintext)(?=[\s/>])/gi;

const alertMarker = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\n|$)/;

/** GitHub Flavored Markdown extensions not supplied by markdown-it core. */
export default function Gfm(md: MarkdownIt): void {
  md.enable(['table', 'strikethrough']);
  md.use(MarkdownItTaskLists, { enabled: false, label: false });

  md.core.ruler.after('linkify', 'gfm_extended_autolinks', (state) => {
    for (const blockToken of state.tokens) {
      if (blockToken.type !== 'inline' || !blockToken.children) continue;
      let linkDepth = 0;
      const next: Token[] = [];
      for (const child of blockToken.children) {
        if (child.type === 'link_open') linkDepth += 1;
        if (child.type === 'link_close') linkDepth -= 1;
        if (child.type === 'text' && linkDepth === 0) {
          next.push(...linkifyText(state.Token, child));
        } else {
          next.push(child);
        }
      }
      blockToken.children = next;
    }
  });

  md.core.ruler.after('gfm_extended_autolinks', 'github_alerts', (state) => {
    renderAlerts(state.tokens, state.Token);
  });

  md.core.ruler.after('github_alerts', 'gfm_tagfilter', (state) => {
    for (const token of state.tokens) {
      if (token.type === 'html_block')
        token.content = filterHtml(token.content);
      if (!token.children) continue;
      for (const child of token.children) {
        if (child.type === 'html_inline')
          child.content = filterHtml(child.content);
      }
    }
  });
}

function renderAlerts(tokens: Token[], TokenCtor: typeof Token): void {
  for (let i = 0; i < tokens.length - 3; i += 1) {
    const opening = tokens[i];
    const paragraph = tokens[i + 1];
    const inline = tokens[i + 2];
    if (
      opening.type !== 'blockquote_open' ||
      paragraph.type !== 'paragraph_open' ||
      inline.type !== 'inline'
    ) {
      continue;
    }

    const marker = alertMarker.exec(inline.content);
    if (!marker) continue;
    const kind = marker[1].toLowerCase();
    opening.attrJoin('class', `markdown-alert markdown-alert-${kind}`);

    const title = new TokenCtor('html_block', '', 0);
    title.content = `<p class="markdown-alert-title">${alertIcon(kind)}<span>${marker[1]}</span></p>\n`;

    inline.content = inline.content.slice(marker[0].length);
    removeAlertMarker(inline.children ?? []);
    if (inline.content.length === 0) {
      tokens.splice(i + 1, 3, title);
    } else {
      tokens.splice(i + 1, 0, title);
    }
  }
}

function removeAlertMarker(children: Token[]): void {
  const first = children[0];
  if (!first || first.type !== 'text') return;
  first.content = first.content.replace(alertMarker, '');
  if (first.content.length === 0) children.shift();
  if (children[0]?.type === 'softbreak') children.shift();
}

function alertIcon(kind: string): string {
  const shape =
    kind === 'tip'
      ? '<path d="M8 1.5a5 5 0 0 0-3 9v2h6v-2a5 5 0 0 0-3-9ZM6 14.5h4"/>'
      : kind === 'warning'
        ? '<path d="M8 1.5 14.5 14h-13L8 1.5Zm0 4v4m0 2.5v.5"/>'
        : kind === 'caution'
          ? '<path d="m5 1.5-3.5 3.5v6L5 14.5h6l3.5-3.5V5L11 1.5H5ZM8 5v4m0 2.5v.5"/>'
          : kind === 'important'
            ? '<path d="M8 1.5a6.5 6.5 0 0 0-3.25 12.13V15l2-1.1A6.5 6.5 0 1 0 8 1.5Zm0 3v4m0 2.5v.5"/>'
            : '<circle cx="8" cy="8" r="6.5"/><path d="M8 7v4m0-7v.5"/>';
  return `<svg class="markdown-alert-icon" viewBox="0 0 16 16" aria-hidden="true">${shape}</svg>`;
}

function linkifyText(TokenCtor: typeof Token, token: Token): Token[] {
  const matches = (extendedLinkify.match(token.content) ?? []).filter(
    (match) => match.schema === 'mailto:' || /^www\./i.test(match.raw),
  );
  if (matches.length === 0) return [token];

  const result: Token[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.index > cursor) {
      result.push(
        textToken(TokenCtor, token.content.slice(cursor, match.index)),
      );
    }
    const open = new TokenCtor('link_open', 'a', 1);
    open.attrSet('href', match.url);
    open.markup = 'linkify';
    open.info = 'auto';
    result.push(open, textToken(TokenCtor, match.raw));
    const close = new TokenCtor('link_close', 'a', -1);
    close.markup = 'linkify';
    close.info = 'auto';
    result.push(close);
    cursor = match.lastIndex;
  }
  if (cursor < token.content.length) {
    result.push(textToken(TokenCtor, token.content.slice(cursor)));
  }
  return result;
}

function textToken(TokenCtor: typeof Token, content: string): Token {
  const token = new TokenCtor('text', '', 0);
  token.content = content;
  return token;
}

function filterHtml(content: string): string {
  return content.replace(disallowedTag, '&lt;$1$2');
}
