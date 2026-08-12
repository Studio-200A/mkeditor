import * as React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';

import { PreviewPane } from '../../src/browser/react/components/PreviewPane';
import {
  renderWithProviders,
  fakeDispatcher,
  fakeFileManager,
  fakeFileTreeManager,
} from '../utils/render';

// Stub the markdown renderer + ScrollSync helper so we exercise the
// dispatch-→-innerHTML wiring without depending on markdown-it / KaTeX
// /highlight.js being available in jsdom. PreviewPane dynamic-imports
// Markdown (so its bundle ends up in a separate webpack chunk); the
// mock is hooked under the same module path that the dynamic import
// resolves to.
jest.mock('../../src/browser/core/Markdown', () => ({
  Markdown: {
    render: jest.fn((src: string) => `<rendered>${src}</rendered>`),
  },
}));

jest.mock('../../src/browser/extensions/editor/ScrollSync', () => ({
  ScrollSync: jest.fn(),
  refreshLines: jest.fn(),
}));

// Helper: create a fake file manager with at least one tab so the
// preview pane renders (the empty-state guard skips when tabs=[]).
function fm(opts: Parameters<typeof fakeFileManager>[0] = {}) {
  return fakeFileManager({
    tabs: [{ path: 'test.md', name: 'test.md' }],
    ...opts,
  });
}

describe('<PreviewPane>', () => {
  it('reapplies persisted preview presentation after its DOM mounts', () => {
    const snapshot = {
      scrollbarVisibility: 'auto',
      previewTextFontFamily: 'serif',
      previewCodeFontFamily: 'monospace',
      previewTextFontSize: 19,
      previewCodeFontSize: 15,
      previewZoom: 110,
      previewTextWidth: 72,
    };
    const settingsProvider = {
      subscribe: jest.fn(() => () => {}),
      getSnapshot: jest.fn(() => snapshot),
      applyPreviewFonts: jest.fn(),
      applyPreviewFontSizes: jest.fn(),
      applyPreviewZoom: jest.fn(),
    };

    renderWithProviders(<PreviewPane />, {
      managers: {
        providers: { settings: settingsProvider as any },
      },
    });

    expect(settingsProvider.applyPreviewFonts).toHaveBeenCalled();
    expect(settingsProvider.applyPreviewFontSizes).toHaveBeenCalled();
    expect(settingsProvider.applyPreviewZoom).toHaveBeenCalled();
    expect(document.querySelector('.preview-text-width-layer')).toHaveStyle({
      '--mk-preview-text-width': '72%',
    });
  });

  it('auto-hides the preview scrollbar 1 second after scrolling stops', () => {
    jest.useFakeTimers();
    try {
      const { container } = renderWithProviders(<PreviewPane />);
      const preview = container.querySelector('#preview') as HTMLElement;

      expect(preview.dataset.scrollbarVisibility).toBe('auto');
      fireEvent.scroll(preview);
      expect(preview).toHaveClass('scrollbar-scrolling');
      act(() => jest.advanceTimersByTime(999));
      expect(preview).toHaveClass('scrollbar-scrolling');
      act(() => jest.advanceTimersByTime(1));
      expect(preview).not.toHaveClass('scrollbar-scrolling');
    } finally {
      jest.useRealTimers();
    }
  });

  it('reveals the auto-hidden scrollbar when the pointer reaches its track', () => {
    renderWithProviders(<PreviewPane />);
    const preview = document.getElementById('preview')!;
    jest.spyOn(preview, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 500,
      bottom: 600,
      width: 500,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.mouseMove(preview, { clientX: 496, clientY: 300 });
    expect(preview).toHaveClass('scrollbar-hover');

    fireEvent.mouseMove(preview, { clientX: 250, clientY: 300 });
    expect(preview).not.toHaveClass('scrollbar-hover');
  });

  it('renders the initial markdown after the lazy Markdown chunk loads', async () => {
    const dispatcher = fakeDispatcher();
    const editorManager = {
      getValue: jest.fn(() => '# Hello'),
      getMkEditor: jest.fn(),
      layout: jest.fn(),
      resetContent: jest.fn(),
      providers: {} as any,
    };

    const { container } = renderWithProviders(<PreviewPane />, {
      managers: {
        dispatcher: dispatcher as any,
        editorManager: editorManager as any,
      },
    });

    const content = container.querySelector('#preview-content');

    // The dynamic `import()` in PreviewPane resolves on a microtask;
    // wait for the first render to land.
    await waitFor(() => {
      expect(content?.innerHTML).toBe('<rendered># Hello</rendered>');
    });
  });

  it('rewrites a relative <img> src to a file:// URL rooted at the active file directory (desktop)', async () => {
    const { Markdown } = require('../../src/browser/core/Markdown');
    (Markdown.render as jest.Mock).mockReturnValueOnce(
      '<p><img src="collector.png" alt="c"></p>',
    );
    const dispatcher = fakeDispatcher();
    const editorManager = {
      getValue: jest.fn(() => '![c](collector.png)'),
      getMkEditor: jest.fn(),
      layout: jest.fn(),
      resetContent: jest.fn(),
      providers: {} as any,
    };
    const { container } = renderWithProviders(<PreviewPane />, {
      managers: {
        mode: 'desktop',
        dispatcher: dispatcher as any,
        editorManager: editorManager as any,
        fileManager: fm({
          activeFile: 'C:/Users/chris/workspace/foo/readme.md',
        }) as any,
        fileTreeManager: fakeFileTreeManager({
          nodes: [],
          treeRoot: 'C:/Users/chris/workspace/foo',
        }) as any,
      },
    });
    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img).not.toBeNull();
      expect(img!.getAttribute('src')).toBe(
        'file:///C:/Users/chris/workspace/foo/collector.png',
      );
    });
  });

  it('falls back to the workspace tree root when there is no active file (desktop)', async () => {
    const { Markdown } = require('../../src/browser/core/Markdown');
    (Markdown.render as jest.Mock).mockReturnValueOnce(
      '<p><img src="cover.png"></p>',
    );
    const dispatcher = fakeDispatcher();
    const editorManager = {
      getValue: jest.fn(() => '![](cover.png)'),
      getMkEditor: jest.fn(),
      layout: jest.fn(),
      resetContent: jest.fn(),
      providers: {} as any,
    };
    const { container } = renderWithProviders(<PreviewPane />, {
      managers: {
        mode: 'desktop',
        dispatcher: dispatcher as any,
        editorManager: editorManager as any,
        fileManager: fm({ activeFile: null }) as any,
        fileTreeManager: fakeFileTreeManager({
          nodes: [],
          treeRoot: '/home/chris/notes',
        }) as any,
      },
    });
    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img!.getAttribute('src')).toBe(
        'file:///home/chris/notes/cover.png',
      );
    });
  });

  it('does not rewrite an http(s) <img> src', async () => {
    const { Markdown } = require('../../src/browser/core/Markdown');
    (Markdown.render as jest.Mock).mockReturnValueOnce(
      '<p><img src="https://example.com/foo.png"></p>',
    );
    const dispatcher = fakeDispatcher();
    const editorManager = {
      getValue: jest.fn(() => '![](https://example.com/foo.png)'),
      getMkEditor: jest.fn(),
      layout: jest.fn(),
      resetContent: jest.fn(),
      providers: {} as any,
    };
    const { container } = renderWithProviders(<PreviewPane />, {
      managers: {
        mode: 'desktop',
        dispatcher: dispatcher as any,
        editorManager: editorManager as any,
        fileManager: fm({
          activeFile: 'C:/work/readme.md',
        }) as any,
      },
    });
    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img!.getAttribute('src')).toBe('https://example.com/foo.png');
    });
  });

  it('strips a relative <img> src on the first render before session restore propagates (avoids bundle-dir 404)', async () => {
    // Regression for the console error users saw on relaunch with a
    // saved tab open: PreviewPane's first paint runs after the
    // markdown chunk lands but before the restored activeFile makes
    // it through FilesContext, so the resolver has no baseDir to
    // work with. Leaving the relative src in place lets the browser
    // fetch `dist/collector.png` and 404. Blanking the src suppresses
    // the bad fetch; the next render (triggered by activeFile / tree
    // root effect) restores the proper file:// URL.
    const { Markdown } = require('../../src/browser/core/Markdown');
    (Markdown.render as jest.Mock).mockReturnValueOnce(
      '<p><img src="collector.png"></p>',
    );
    const dispatcher = fakeDispatcher();
    const editorManager = {
      getValue: jest.fn(() => '![](collector.png)'),
      getMkEditor: jest.fn(),
      layout: jest.fn(),
      resetContent: jest.fn(),
      providers: {} as any,
    };
    const { container } = renderWithProviders(<PreviewPane />, {
      managers: {
        mode: 'desktop',
        dispatcher: dispatcher as any,
        editorManager: editorManager as any,
        // No active file and no tree root — the transitional state.
        fileManager: fm({ activeFile: null }) as any,
        fileTreeManager: fakeFileTreeManager({
          nodes: [],
          treeRoot: null,
        }) as any,
      },
    });
    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img).not.toBeNull();
      // The img element renders but with no src — no fetch issued.
      expect(img!.hasAttribute('src')).toBe(false);
    });
  });

  it('uses the last editable file path when the active tab is a diff:// overlay (desktop)', async () => {
    // Regression: when a tool-call inline diff is the active tab,
    // `FileManager.activeFile` holds a synthetic `diff://<toolCallId>`
    // id. Previously PreviewPane fed that straight into the asset
    // resolver as `baseDir`, producing `diff:/...` paths that
    // `isFilesystemPath` rejects, leaving the relative `<img src>`
    // intact and 404-ing against the bundle. Routing through
    // `getActiveEditablePath()` recovers the most-recent real file
    // and the preview keeps resolving images against it.
    const { Markdown } = require('../../src/browser/core/Markdown');
    (Markdown.render as jest.Mock).mockReturnValueOnce(
      '<p><img src="collector.png"></p>',
    );
    const dispatcher = fakeDispatcher();
    const editorManager = {
      getValue: jest.fn(() => '![](collector.png)'),
      getMkEditor: jest.fn(),
      layout: jest.fn(),
      resetContent: jest.fn(),
      providers: {} as any,
    };
    const { container } = renderWithProviders(<PreviewPane />, {
      managers: {
        mode: 'desktop',
        dispatcher: dispatcher as any,
        editorManager: editorManager as any,
        fileManager: fm({
          // Active tab is the diff overlay …
          activeFile: 'diff://tc-1',
          // … but the underlying real file is the editable path the
          // preview should resolve images against.
          activeEditablePath: 'C:/Users/chris/workspace/foo/readme.md',
        }) as any,
        fileTreeManager: fakeFileTreeManager({
          nodes: [],
          treeRoot: 'C:/Users/chris/workspace/foo',
        }) as any,
      },
    });
    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img).not.toBeNull();
      expect(img!.getAttribute('src')).toBe(
        'file:///C:/Users/chris/workspace/foo/collector.png',
      );
    });
  });

  it('strips an out-of-workspace <img src="file:///..."> URL (workspace-containment guarantee)', async () => {
    // Preview HTML must not be able to reach arbitrary on-disk files
    // via an explicit `file://` URL. The resolver returns null on
    // policy reject; the caller strips the attribute so the browser
    // never issues the fetch.
    const { Markdown } = require('../../src/browser/core/Markdown');
    (Markdown.render as jest.Mock).mockReturnValueOnce(
      '<p><img src="file:///C:/Users/victim/Pictures/secret.png"></p>',
    );
    const dispatcher = fakeDispatcher();
    const editorManager = {
      getValue: jest.fn(
        () => '![](file:///C:/Users/victim/Pictures/secret.png)',
      ),
      getMkEditor: jest.fn(),
      layout: jest.fn(),
      resetContent: jest.fn(),
      providers: {} as any,
    };
    const { container } = renderWithProviders(<PreviewPane />, {
      managers: {
        mode: 'desktop',
        dispatcher: dispatcher as any,
        editorManager: editorManager as any,
        fileManager: fm({
          activeFile: 'C:/Users/chris/workspace/foo/readme.md',
        }) as any,
        fileTreeManager: fakeFileTreeManager({
          nodes: [],
          treeRoot: 'C:/Users/chris/workspace/foo',
        }) as any,
      },
    });
    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img).not.toBeNull();
      expect(img!.hasAttribute('src')).toBe(false);
    });
  });

  it('rewrites an in-workspace <img src="file:///..."> URL through the resolver', async () => {
    const { Markdown } = require('../../src/browser/core/Markdown');
    (Markdown.render as jest.Mock).mockReturnValueOnce(
      '<p><img src="file:///C:/Users/chris/workspace/foo/cover.png"></p>',
    );
    const dispatcher = fakeDispatcher();
    const editorManager = {
      getValue: jest.fn(() => ''),
      getMkEditor: jest.fn(),
      layout: jest.fn(),
      resetContent: jest.fn(),
      providers: {} as any,
    };
    const { container } = renderWithProviders(<PreviewPane />, {
      managers: {
        mode: 'desktop',
        dispatcher: dispatcher as any,
        editorManager: editorManager as any,
        fileManager: fm({
          activeFile: 'C:/Users/chris/workspace/foo/readme.md',
        }) as any,
        fileTreeManager: fakeFileTreeManager({
          nodes: [],
          treeRoot: 'C:/Users/chris/workspace/foo',
        }) as any,
      },
    });
    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img!.getAttribute('src')).toBe(
        'file:///C:/Users/chris/workspace/foo/cover.png',
      );
    });
  });

  it('strips an out-of-workspace <a href="file:///..."> link (no shell.openExternal escape)', async () => {
    const { Markdown } = require('../../src/browser/core/Markdown');
    (Markdown.render as jest.Mock).mockReturnValueOnce(
      '<p><a href="file:///C:/Users/victim/secret.pdf">link</a></p>',
    );
    const dispatcher = fakeDispatcher();
    const editorManager = {
      getValue: jest.fn(() => ''),
      getMkEditor: jest.fn(),
      layout: jest.fn(),
      resetContent: jest.fn(),
      providers: {} as any,
    };
    const { container } = renderWithProviders(<PreviewPane />, {
      managers: {
        mode: 'desktop',
        dispatcher: dispatcher as any,
        editorManager: editorManager as any,
        fileManager: fm({
          activeFile: 'C:/Users/chris/workspace/foo/readme.md',
        }) as any,
        fileTreeManager: fakeFileTreeManager({
          nodes: [],
          treeRoot: 'C:/Users/chris/workspace/foo',
        }) as any,
      },
    });
    await waitFor(() => {
      const a = container.querySelector('a');
      expect(a).not.toBeNull();
      expect(a!.hasAttribute('href')).toBe(false);
    });
  });

  it('does not rewrite anything in web mode (separate blob-URL workstream)', async () => {
    const { Markdown } = require('../../src/browser/core/Markdown');
    (Markdown.render as jest.Mock).mockReturnValueOnce(
      '<p><img src="cover.png"></p>',
    );
    const dispatcher = fakeDispatcher();
    const editorManager = {
      getValue: jest.fn(() => '![](cover.png)'),
      getMkEditor: jest.fn(),
      layout: jest.fn(),
      resetContent: jest.fn(),
      providers: {} as any,
    };
    const { container } = renderWithProviders(<PreviewPane />, {
      managers: {
        mode: 'web',
        dispatcher: dispatcher as any,
        editorManager: editorManager as any,
        fileManager: fm({
          activeFile: '/workspace/readme.md',
        }) as any,
      },
    });
    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img!.getAttribute('src')).toBe('cover.png');
    });
  });

  it('re-renders the preview when the dispatcher fires editor:render', async () => {
    const dispatcher = fakeDispatcher();
    let value = '# v1';
    const editorManager = {
      getValue: jest.fn(() => value),
      getMkEditor: jest.fn(),
      layout: jest.fn(),
      resetContent: jest.fn(),
      providers: {} as any,
    };

    const { container } = renderWithProviders(<PreviewPane />, {
      managers: {
        dispatcher: dispatcher as any,
        editorManager: editorManager as any,
      },
    });

    const content = container.querySelector('#preview-content');
    await waitFor(() => {
      expect(content?.innerHTML).toBe('<rendered># v1</rendered>');
    });

    // Mutate the value the manager returns and dispatch — the pane
    // should re-render with the new content.
    value = '# v2';
    act(() => {
      dispatcher.render();
    });

    expect(content?.innerHTML).toBe('<rendered># v2</rendered>');
  });
});
