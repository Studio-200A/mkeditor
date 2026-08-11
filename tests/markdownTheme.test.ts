import { exportSettings } from '../src/browser/config';
import { HTMLExporter } from '../src/browser/core/HTMLExporter';
import { markdownStylesheet } from '../src/browser/markdownStyles';

describe('Monokai Pro markdown theme', () => {
  it('defines all six dark heading colors and highlight.js token roles', () => {
    expect(markdownStylesheet).toContain('--md-h1: #ff6188');
    expect(markdownStylesheet).toContain('--md-h2: #ffd866');
    expect(markdownStylesheet).toContain('--md-h3: #a9dc76');
    expect(markdownStylesheet).toContain('--md-h4: #78dce8');
    expect(markdownStylesheet).toContain('--md-h5: #ab9df2');
    expect(markdownStylesheet).toContain('--md-h6: #fc9867');
    expect(markdownStylesheet).toContain('.hljs-keyword');
    expect(markdownStylesheet).toContain('.hljs-string');
    expect(markdownStylesheet).toContain('.hljs-comment');
    expect(markdownStylesheet).toContain('.markdown-alert-title');
    expect(markdownStylesheet).toContain('--md-alert-note: #4493f8');
  });

  it('inlines syntax colors in styled HTML without a highlight theme CDN', () => {
    const html = HTMLExporter.generateHTML(
      '<div id="preview-content"><pre><code class="hljs-keyword">const</code></pre></div>',
      exportSettings,
    );

    expect(html).toContain('.hljs-keyword');
    expect(html).toContain('--md-h6');
    expect(html).not.toContain('highlightjs-themes');
  });
});
