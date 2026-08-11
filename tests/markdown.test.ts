import {
  Markdown,
  renderAssistantMarkdown,
} from '../src/browser/core/Markdown';

describe('renderAssistantMarkdown (AI Assistant P4)', () => {
  it('escapes raw <script> tags from untrusted assistant content', () => {
    const out = renderAssistantMarkdown(
      'Look: <script>alert("xss")</script> and **bold**.',
    );
    // Tag escaped, not emitted as live HTML.
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;script&gt;');
    // Markdown formatting still works inside the same call.
    expect(out).toContain('<strong>bold</strong>');
  });

  it('escapes raw inline HTML (img / iframe / onerror payloads)', () => {
    const out = renderAssistantMarkdown(
      '<img src=x onerror="alert(1)"> <iframe src="evil"></iframe>',
    );
    expect(out).not.toMatch(/<img\s/);
    expect(out).not.toMatch(/<iframe\s/);
    expect(out).toContain('&lt;img');
    expect(out).toContain('&lt;iframe');
  });

  it('restores the preview-side `html: true` after returning (no global mutation leak)', () => {
    expect(Markdown.options.html).toBe(true);
    renderAssistantMarkdown('<b>bold</b>');
    // After the assistant render the singleton's option is back to the
    // preview default; otherwise a subsequent PreviewPane render would
    // unexpectedly strip user-authored raw HTML.
    expect(Markdown.options.html).toBe(true);
  });

  it('still renders normal markdown features (lists, code fences)', () => {
    const out = renderAssistantMarkdown(
      '- item one\n- item two\n\n```ts\nconst x = 1;\n```',
    );
    expect(out).toContain('<ul>');
    // LineNumber extension annotates list items with class+data
    // attributes, so match content-only here rather than the exact tag.
    expect(out).toMatch(/<li[^>]*>item one<\/li>/);
    expect(out).toContain('hljs');
  });
});

describe('Markdown', () => {
  it('initializes with extensions', () => {
    const output = Markdown.render(
      `::: info\n[test](http://example.com)\n:::\n\n![alt](img.png)\n\n|a|b|\n|-|-|\n|1|2|\n`,
    );
    expect(output).toContain('alert alert-info');
    expect(output).toContain('target="_blank"');
    expect(output).toContain('class="img-fluid"');
    expect(output).toContain(
      'class="table table-sm table-bordered table-striped"',
    );
  });

  it('adds line number data', () => {
    const output = Markdown.render('line1\n\nline2');
    expect(output).toContain('has-line-data');
  });

  it('renders latex expressions', () => {
    const output = Markdown.render('The area is $A = \\pi r^2$');
    expect(output).toContain('katex');
  });

  it('only auto-links explicit URLs', () => {
    const urlOutput = Markdown.render('http://example.com');
    expect(urlOutput).toContain('<a href="http://example.com"');

    const fileOutput = Markdown.render('hello.py');
    expect(fileOutput).not.toContain('<a');
  });

  it('renders GFM task lists and strikethrough', () => {
    const output = Markdown.render('- [ ] todo\n- [x] done\n\n~~removed~~');

    expect(output).toContain('class="contains-task-list"');
    expect(output).toContain(
      'class="task-list-item-checkbox" disabled="" type="checkbox"',
    );
    expect(output).toContain(
      'class="task-list-item-checkbox" checked="" disabled="" type="checkbox"',
    );
    expect(output).toContain('<s>removed</s>');
  });

  it('auto-links GFM www and email text without linking file names', () => {
    const output = Markdown.render(
      'Visit www.example.com or email person@example.com, not notes.md.',
    );

    expect(output).toContain('href="http://www.example.com"');
    expect(output).toContain('href="mailto:person@example.com"');
    expect(output).toContain('not notes.md');
    expect(output).not.toContain('href="http://notes.md"');
  });

  it('filters GFM-disallowed raw HTML tags but preserves allowed HTML', () => {
    const output = Markdown.render(
      '<script>alert(1)</script>\n\n<details>allowed</details>',
    );

    expect(output).not.toContain('<script>');
    expect(output).toContain('&lt;script>alert(1)&lt;/script>');
    expect(output).toContain('<details>allowed</details>');
  });

  it.each(['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'])(
    'renders a GitHub %s alert without exposing its marker',
    (type) => {
      const output = Markdown.render(
        `> [!${type}]\n> Alert content for ${type.toLowerCase()}.`,
      );

      expect(output).toContain(
        `class="markdown-alert markdown-alert-${type.toLowerCase()}"`,
      );
      expect(output).toContain('class="markdown-alert-title"');
      expect(output).toContain(`<span>${type}</span>`);
      expect(output).toContain(`Alert content for ${type.toLowerCase()}.`);
      expect(output).not.toContain(`[!${type}]`);
    },
  );

  it('keeps ordinary blockquotes unchanged', () => {
    const output = Markdown.render('> Ordinary quote');

    expect(output).toContain('<blockquote>');
    expect(output).not.toContain('markdown-alert');
  });
});
