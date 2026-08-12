let BridgeManager: any;
let EditorManager: any;
let EditorDispatcher: any;
let SettingsProvider: any;
let CompletionProvider: any;

import { editor as monacoEditor } from 'monaco-editor';
import { minimapOptions } from '../src/browser/config';
import { MONOKAI_PRO_THEME_NAME } from '../src/browser/themes/monokaiPro';

jest.mock('../src/browser/assets/intro', () => ({
  welcomeMarkdown: '# Welcome',
}));

beforeEach(async () => {
  document.body.innerHTML = `
    <div id="editor"></div>
    <div id="preview"><div id="preview-content" class="container-fluid"></div></div>
  `;
  ({ EditorManager } = await import('../src/browser/core/EditorManager'));
  ({ EditorDispatcher } =
    await import('../src/browser/events/EditorDispatcher'));
  ({ SettingsProvider } =
    await import('../src/browser/core/providers/SettingsProvider'));
  ({ CompletionProvider } =
    await import('../src/browser/core/providers/CompletionProvider'));
  ({ BridgeManager } = await import('../src/browser/core/BridgeManager'));
});

describe('Providers', () => {
  it('initialize and attach to mkeditor', () => {
    const dispatcher = new EditorDispatcher();
    const mkeditor = new EditorManager({
      dispatcher,
      init: true,
      watch: false,
    });
    const model = mkeditor.getMkEditor();
    expect(model).not.toBeNull();

    const settings = new SettingsProvider('web', model!);
    const completion = new CompletionProvider(model!, dispatcher);
    mkeditor.provide('settings', settings);
    mkeditor.provide('completion', completion);

    const api = { send: jest.fn(), receive: jest.fn() };
    const bridge = new BridgeManager(api as any, model!, dispatcher);
    bridge.provide('settings', settings);
    bridge.provide('completion', completion);
    mkeditor.provide('bridge', bridge);

    expect(mkeditor.providers.settings).toBe(settings);
    expect(mkeditor.providers.completion).toBe(completion);
    expect(mkeditor.providers.bridge).toBe(bridge);
    expect(bridge.providers.settings).toBe(settings);
    expect(bridge.providers.completion).toBe(completion);
  });
});

describe('minimapOptions', () => {
  it.each([
    [80, 1, 80],
    [180, 2, 90],
    [260, 3, 87],
  ])(
    'maps %i px to Monaco scale %i and max column %i',
    (width, scale, maxColumn) => {
      expect(minimapOptions(true, width)).toEqual({
        enabled: true,
        scale,
        maxColumn,
      });
    },
  );
});

describe('SettingsProvider.loadSettingsFromLocalStorage (web)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('fills in missing keys from defaults and persists the upgraded shape', () => {
    // Simulate a pre-v3.8 stored settings blob with no sessionRestore.
    localStorage.setItem(
      'mkeditor-settings',
      JSON.stringify({
        autoindent: true,
        darkmode: false,
        wordwrap: false,
        whitespace: true,
        minimap: false,
        systemtheme: false,
        scrollsync: true,
        locale: 'en',
      }),
    );

    const dispatcher = new EditorDispatcher();
    const mkeditor = new EditorManager({
      dispatcher,
      init: true,
      watch: false,
    });
    const provider = new SettingsProvider('web', mkeditor.getMkEditor()!);

    // The user's explicit choices win, but `sessionRestore` falls back
    // to its default (true) instead of being undefined.
    expect(provider.getSetting('autoindent')).toBe(true);
    expect(provider.getSetting('wordwrap')).toBe(false);
    expect(provider.getSetting('sessionRestore')).toBe(true);
    // `fileExplorer` is a newer field — pre-existing settings get the
    // markdown-only default rather than `undefined`, so the React
    // filter bar doesn't crash trying to read `extensions` off undef.
    expect(provider.getSetting('fileExplorer')).toEqual({
      extensions: ['md'],
    });
    // `pasteImages` (4.2.0) — same upgrade story. Pre-existing
    // settings get the `./assets` default so PasteImageHandler can
    // read `pasteImages.directory` without crashing.
    expect(provider.getSetting('pasteImages')).toEqual({
      directory: './assets',
    });

    // New font / zoom fields (4.2.0 custom) — same upgrade story.
    expect(provider.getSetting('editorFontFamily')).toBe(
      "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
    );
    expect(provider.getSetting('uiFontFamily')).toBe(
      "'Nunito Sans', 'Open Sans', 'Lato', sans-serif",
    );
    expect(provider.getSetting('uiZoom')).toBe(100);
    expect(provider.getSetting('editorZoom')).toBe(100);
    expect(provider.getSetting('previewZoom')).toBe(100);
    expect(provider.getSetting('editorFontSize')).toBe(14);
    expect(provider.getSetting('previewTextFontSize')).toBe(16);
    expect(provider.getSetting('previewCodeFontSize')).toBe(14);
    expect(provider.getSetting('lineNumbersMinChars')).toBe(5);
    expect(provider.getSetting('minimapMaxColumn')).toBe(120);
    expect(provider.getSetting('scrollbarVisibility')).toBe('auto');

    // The merged shape was persisted back so subsequent loads are
    // consistent (sessionRestore now present in storage).
    const upgraded = JSON.parse(
      localStorage.getItem('mkeditor-settings') as string,
    );
    expect(upgraded.sessionRestore).toBe(true);
    expect(upgraded.autoindent).toBe(true);
    expect(upgraded.fileExplorer).toEqual({ extensions: ['md'] });
    expect(upgraded.pasteImages).toEqual({ directory: './assets' });
    expect(upgraded.scrollbarVisibility).toBe('auto');
  });

  it('applies minimap width changes to Monaco', () => {
    const dispatcher = new EditorDispatcher();
    const mkeditor = new EditorManager({
      dispatcher,
      init: true,
      watch: false,
    });
    const model = mkeditor.getMkEditor()!;
    const provider = new SettingsProvider('web', model);
    (model.updateOptions as jest.Mock).mockClear();

    provider.updateSetting('minimapMaxColumn', 180);

    expect(model.updateOptions).toHaveBeenCalledWith({
      minimap: { enabled: true, scale: 2, maxColumn: 90 },
    });
  });

  it('clamps legacy line-number gutter widths to the supported minimum of 3', () => {
    localStorage.setItem(
      'mkeditor-settings',
      JSON.stringify({ lineNumbersMinChars: 1 }),
    );
    const dispatcher = new EditorDispatcher();
    const mkeditor = new EditorManager({
      dispatcher,
      init: true,
      watch: false,
    });
    const model = mkeditor.getMkEditor()!;
    const provider = new SettingsProvider('web', model);

    expect(provider.getSetting('lineNumbersMinChars')).toBe(3);
    expect(model.updateOptions).toHaveBeenCalledWith({
      lineNumbersMinChars: 3,
      lineDecorationsWidth: 0,
    });
    expect(
      JSON.parse(localStorage.getItem('mkeditor-settings') as string)
        .lineNumbersMinChars,
    ).toBe(3);
  });

  it('normalizes malformed persisted font sizes at the provider boundary', () => {
    localStorage.setItem(
      'mkeditor-settings',
      JSON.stringify({
        editorFontSize: -10,
        previewTextFontSize: 500,
        previewCodeFontSize: 'invalid',
      }),
    );
    const dispatcher = new EditorDispatcher();
    const mkeditor = new EditorManager({
      dispatcher,
      init: true,
      watch: false,
    });
    const provider = new SettingsProvider('web', mkeditor.getMkEditor()!);

    expect(provider.getSetting('editorFontSize')).toBe(9);
    expect(provider.getSetting('previewTextFontSize')).toBe(72);
    expect(provider.getSetting('previewCodeFontSize')).toBe(14);
    expect(
      JSON.parse(localStorage.getItem('mkeditor-settings') as string),
    ).toMatchObject({
      editorFontSize: 9,
      previewTextFontSize: 72,
      previewCodeFontSize: 14,
    });
  });

  it('skips re-persisting when stored already has every key', () => {
    const full = {
      autoindent: false,
      darkmode: false,
      wordwrap: true,
      whitespace: false,
      minimap: true,
      minimapMaxColumn: 120,
      scrollbarVisibility: 'auto',
      systemtheme: false,
      scrollsync: true,
      sessionRestore: false,
      locale: 'en',
      fileExplorer: { extensions: ['md'] },
      pasteImages: { directory: './assets' },
      uiFontFamily: "'Nunito Sans', 'Open Sans', 'Lato', sans-serif",
      editorFontFamily:
        "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
      previewTextFontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
      previewCodeFontFamily:
        "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
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
    localStorage.setItem('mkeditor-settings', JSON.stringify(full));

    const dispatcher = new EditorDispatcher();
    const mkeditor = new EditorManager({
      dispatcher,
      init: true,
      watch: false,
    });
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    new SettingsProvider('web', mkeditor.getMkEditor()!);

    // No upgrade-persist write should have fired.
    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it('clamps content widths and debounces slider persistence', () => {
    jest.useFakeTimers();
    try {
      const dispatcher = new EditorDispatcher();
      const mkeditor = new EditorManager({
        dispatcher,
        init: true,
        watch: false,
      });
      const provider = new SettingsProvider('web', mkeditor.getMkEditor()!);
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

      provider.updateSetting('editorTextWidth', 20);
      provider.updateSetting('editorTextWidth', 75);

      expect(provider.getSetting('editorTextWidth')).toBe(75);
      expect(setItemSpy).not.toHaveBeenCalled();
      jest.advanceTimersByTime(250);
      expect(setItemSpy).toHaveBeenCalledTimes(1);
      expect(
        JSON.parse(localStorage.getItem('mkeditor-settings') as string)
          .editorTextWidth,
      ).toBe(75);
      setItemSpy.mockRestore();
    } finally {
      jest.useRealTimers();
    }
  });

  it('applies scrollbar visibility and keeps auto scrollbars visible for 1 second', () => {
    jest.useFakeTimers();
    try {
      const dispatcher = new EditorDispatcher();
      const mkeditor = new EditorManager({
        dispatcher,
        init: true,
        watch: false,
      });
      const model = mkeditor.getMkEditor()!;
      const provider = new SettingsProvider('web', model);
      const node = model.getDomNode()!;
      (model.updateOptions as jest.Mock).mockClear();

      provider.updateSetting('scrollbarVisibility', 'hidden');
      expect(model.updateOptions).toHaveBeenCalledWith({
        scrollbar: {
          vertical: 'hidden',
          horizontal: 'hidden',
          verticalScrollbarSize: 0,
          verticalSliderSize: 0,
          horizontalScrollbarSize: 0,
          horizontalSliderSize: 0,
        },
        overviewRulerLanes: 0,
        overviewRulerBorder: false,
      });
      expect(node.dataset.scrollbarVisibility).toBe('hidden');

      provider.updateSetting('scrollbarVisibility', 'auto');
      expect(model.updateOptions).toHaveBeenLastCalledWith({
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible',
          verticalScrollbarSize: 14,
          verticalSliderSize: 14,
          horizontalScrollbarSize: 12,
          horizontalSliderSize: 12,
        },
        overviewRulerLanes: 3,
        overviewRulerBorder: true,
      });
      const onScroll = (model.onDidScrollChange as jest.Mock).mock.calls.at(
        -1,
      )[0];
      onScroll();
      expect(node).toHaveClass('scrollbar-scrolling');
      jest.advanceTimersByTime(999);
      expect(node).toHaveClass('scrollbar-scrolling');
      jest.advanceTimersByTime(1);
      expect(node).not.toHaveClass('scrollbar-scrolling');
    } finally {
      jest.useRealTimers();
    }
  });

  it('applies the UI font family to the document root', () => {
    const dispatcher = new EditorDispatcher();
    const mkeditor = new EditorManager({
      dispatcher,
      init: true,
      watch: false,
    });
    const provider = new SettingsProvider('web', mkeditor.getMkEditor()!);

    provider.updateSetting('uiFontFamily', "Inter, 'Noto Sans', sans-serif");

    expect(
      document.documentElement.style.getPropertyValue('--mk-ui-font-family'),
    ).toBe("Inter, 'Noto Sans', sans-serif");
  });

  it('falls back to defaults on corrupted stored value', () => {
    localStorage.setItem('mkeditor-settings', '"just a string"');

    const dispatcher = new EditorDispatcher();
    const mkeditor = new EditorManager({
      dispatcher,
      init: true,
      watch: false,
    });
    const provider = new SettingsProvider('web', mkeditor.getMkEditor()!);

    expect(provider.getSetting('sessionRestore')).toBe(true);
    expect(provider.getSetting('wordwrap')).toBe(true);
  });
});

describe('SettingsProvider system-theme tracking', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads OS darkmode separately from the stored manual preference', () => {
    // User's manual preference (would normally be applied when
    // systemtheme is off). Stored on disk; should never be touched by
    // OS-theme pushes.
    localStorage.setItem(
      'mkeditor-settings',
      JSON.stringify({
        autoindent: false,
        darkmode: true,
        wordwrap: true,
        whitespace: false,
        minimap: true,
        systemtheme: true,
        scrollsync: true,
        sessionRestore: true,
        locale: 'en',
      }),
    );
    const dispatcher = new EditorDispatcher();
    const mkeditor = new EditorManager({
      dispatcher,
      init: true,
      watch: false,
    });
    const provider = new SettingsProvider('web', mkeditor.getMkEditor()!);

    // Stored preference reads as `true` (dark).
    expect(provider.getSetting('darkmode')).toBe(true);
    // OS hasn't reported yet.
    expect(provider.getOsDarkmode()).toBeNull();

    // OS reports light. Should NOT clobber the stored preference.
    provider.setOsDarkmode(false);
    expect(provider.getOsDarkmode()).toBe(false);
    expect(provider.getSetting('darkmode')).toBe(true);

    // Document body reflects effective (OS) theme, not stored.
    expect(document.body.getAttribute('data-theme')).toBe('light');
  });

  it('falls back to stored darkmode when systemtheme is off', () => {
    localStorage.setItem(
      'mkeditor-settings',
      JSON.stringify({
        autoindent: false,
        darkmode: true,
        wordwrap: true,
        whitespace: false,
        minimap: true,
        systemtheme: false,
        scrollsync: true,
        sessionRestore: true,
        locale: 'en',
      }),
    );
    const dispatcher = new EditorDispatcher();
    const mkeditor = new EditorManager({
      dispatcher,
      init: true,
      watch: false,
    });
    const provider = new SettingsProvider('web', mkeditor.getMkEditor()!);

    // OS push lands but systemtheme is off — stored preference wins.
    provider.setOsDarkmode(false);
    expect(document.body.getAttribute('data-theme')).toBe('dark');
    expect(provider.getSetting('darkmode')).toBe(true);
    expect(monacoEditor.setTheme).toHaveBeenLastCalledWith(
      MONOKAI_PRO_THEME_NAME,
    );
  });

  it('flips the rendered theme when systemtheme is toggled, preserving stored darkmode', () => {
    // Regression for the launch bug: stored darkmode=true, OS is
    // light. The user toggles systemtheme on while the app is open —
    // the rendered theme must follow the OS without overwriting the
    // stored preference.
    localStorage.setItem(
      'mkeditor-settings',
      JSON.stringify({
        autoindent: false,
        darkmode: true,
        wordwrap: true,
        whitespace: false,
        minimap: true,
        systemtheme: false,
        scrollsync: true,
        sessionRestore: true,
        locale: 'en',
      }),
    );
    const dispatcher = new EditorDispatcher();
    const mkeditor = new EditorManager({
      dispatcher,
      init: true,
      watch: false,
    });
    const provider = new SettingsProvider('web', mkeditor.getMkEditor()!);

    // OS push lands first (boot order).
    provider.setOsDarkmode(false);
    // systemtheme off → stored wins → dark.
    expect(document.body.getAttribute('data-theme')).toBe('dark');

    // Toggle systemtheme on — rendered theme flips to OS (light).
    provider.updateSetting('systemtheme', true);
    expect(document.body.getAttribute('data-theme')).toBe('light');

    // Stored darkmode preserved.
    expect(provider.getSetting('darkmode')).toBe(true);

    // Toggle systemtheme back off — rendered theme restores to stored
    // (dark). This is the "preserve manual preference" semantic.
    provider.updateSetting('systemtheme', false);
    expect(document.body.getAttribute('data-theme')).toBe('dark');
  });

  it('setOsDarkmode is a silent cache when systemtheme is off (no emit)', () => {
    const dispatcher = new EditorDispatcher();
    const mkeditor = new EditorManager({
      dispatcher,
      init: true,
      watch: false,
    });
    const provider = new SettingsProvider('web', mkeditor.getMkEditor()!);
    // default systemtheme is true — flip to false so emit shouldn't fire.
    provider.updateSetting('systemtheme', false);

    const listener = jest.fn();
    provider.subscribe(listener);

    // OS push with systemtheme off: cache updates silently, no emit.
    provider.setOsDarkmode(true);
    expect(provider.getOsDarkmode()).toBe(true);
    expect(listener).not.toHaveBeenCalled();
  });

  it('setOsDarkmode emits when systemtheme is on (so React subscribers re-render)', () => {
    const dispatcher = new EditorDispatcher();
    const mkeditor = new EditorManager({
      dispatcher,
      init: true,
      watch: false,
    });
    const provider = new SettingsProvider('web', mkeditor.getMkEditor()!);
    // systemtheme is true by default.

    const listener = jest.fn();
    provider.subscribe(listener);

    provider.setOsDarkmode(true);
    expect(listener).toHaveBeenCalled();
  });

  it('snapshot exposes effectiveDarkmode for UI consumers that visualise the rendered theme', () => {
    // The bottom-toolbar moon icon needs to show the rendered theme
    // (which may differ from `settings.darkmode` while systemtheme is
    // on and the OS doesn't match the stored preference). The
    // snapshot carries `effectiveDarkmode` so consumers don't need to
    // re-derive it.
    localStorage.setItem(
      'mkeditor-settings',
      JSON.stringify({
        autoindent: false,
        darkmode: true,
        wordwrap: true,
        whitespace: false,
        minimap: true,
        systemtheme: true,
        scrollsync: true,
        sessionRestore: true,
        locale: 'en',
      }),
    );
    const dispatcher = new EditorDispatcher();
    const mkeditor = new EditorManager({
      dispatcher,
      init: true,
      watch: false,
    });
    const provider = new SettingsProvider('web', mkeditor.getMkEditor()!);
    // Stored is dark; OS hasn't reported → fallback to stored.
    expect(provider.getSnapshot().darkmode).toBe(true);
    expect(provider.getSnapshot().effectiveDarkmode).toBe(true);

    // OS reports light. Stored stays dark; effective flips.
    provider.setOsDarkmode(false);
    expect(provider.getSnapshot().darkmode).toBe(true);
    expect(provider.getSnapshot().effectiveDarkmode).toBe(false);
  });
});

describe('SettingsProvider locale switching', () => {
  it('resolves system from the OS instead of the previously stored locale', () => {
    const dispatcher = new EditorDispatcher();
    const mkeditor = new EditorManager({
      dispatcher,
      init: true,
      watch: false,
    });
    const getSystemLocale = jest.fn(() => 'zh-CN');
    window.mked = {
      getSystemLocale,
    } as unknown as typeof window.mked;
    window.setLanguage = jest.fn();
    const provider = new SettingsProvider('desktop', mkeditor.getMkEditor()!);

    provider.updateSetting('locale', 'ja');
    provider.updateSetting('locale', 'system');

    expect(getSystemLocale).toHaveBeenCalledTimes(1);
    expect(window.setLanguage).toHaveBeenLastCalledWith('zh');
    delete window.mked;
  });
});
