import * as React from 'react';
import { act, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SettingsModal } from '../../src/browser/react/components/modals/SettingsModal';
import { useModals } from '../../src/browser/react/contexts/ModalsContext';
import type { EditorSettings } from '../../src/browser/interfaces/Editor';
import { renderWithProviders } from '../utils/render';

// i18next is not initialised in the test environment; the real
// `t(key)` would return undefined. Replace the module with a stub
// that returns the key itself so we can use it as an accessible name.
// `getAvailableLocales` is stubbed to a fixed list to keep the test
// deterministic.
jest.mock('../../src/browser/i18n', () => ({
  t: (key: string) => key,
  normalizeLanguage: (lng: string) => lng,
  getAvailableLocales: jest.fn(async () => [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'fr', name: 'French', native: 'Français' },
  ]),
}));

beforeAll(() => {
  Element.prototype.hasPointerCapture = jest.fn(() => false) as never;
  Element.prototype.scrollIntoView = jest.fn() as never;
});

/**
 * Builds a fake SettingsProvider that satisfies the
 * `subscribe`/`getSnapshot`/`updateSetting` contract SettingsContext
 * consumes via `useSyncExternalStore`.
 */
function fakeSettingsProvider(initial: Partial<EditorSettings> = {}) {
  let state: EditorSettings = {
    autoindent: false,
    darkmode: false,
    wordwrap: true,
    whitespace: false,
    minimap: true,
    minimapMaxColumn: 120,
    scrollbarVisibility: 'auto',
    systemtheme: false,
    scrollsync: true,
    sessionRestore: true,
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
    ...initial,
  };
  let snapshot: EditorSettings = { ...state };
  const listeners = new Set<() => void>();

  return {
    subscribe: jest.fn((listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }),
    getSnapshot: jest.fn(() => snapshot),
    updateSetting: jest.fn(
      <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
        state = { ...state, [key]: value };
        snapshot = { ...state };
        listeners.forEach((l) => l());
      },
    ),
    getSettings: jest.fn(() => state),
  };
}

/** Convenience helper to open the Settings modal before assertions. */
const OpenSettings: React.FC = () => {
  const { openModal } = useModals();
  React.useEffect(() => {
    openModal('settings');
  }, [openModal]);
  return null;
};

describe('<SettingsModal>', () => {
  it('reflects the initial SettingsContext snapshot and updates on toggle', async () => {
    const settingsProvider = fakeSettingsProvider({ autoindent: false });

    renderWithProviders(
      <>
        <OpenSettings />
        <SettingsModal />
      </>,
      {
        managers: {
          providers: {
            bridge: null,
            commands: null,
            completion: null,
            settings: settingsProvider as any,
            exportSettings: null,
          },
        },
      },
    );

    // Wait for the locale list to populate (the modal renders even before).
    await screen.findByRole('dialog');

    const dialog = screen.getByRole('dialog');
    const navigation = within(dialog).getByRole('navigation');
    expect(
      within(navigation).getByText('modals-settings:tab_general'),
    ).toHaveClass('text-base', 'font-bold');
    expect(
      within(navigation).getByRole('button', {
        name: 'modals-settings:session',
      }),
    ).toHaveClass('text-sm');
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'modals-settings:formatting',
      }),
    );

    // The autoindent checkbox starts unchecked (radix checkbox uses
    // data-state=unchecked when not checked).
    const autoindent = within(dialog).getByRole('checkbox', {
      name: /autoindent/i,
    });
    expect(autoindent.getAttribute('data-state')).toBe('unchecked');

    fireEvent.click(autoindent);

    expect(settingsProvider.updateSetting).toHaveBeenCalledWith(
      'autoindent',
      true,
    );
    // After the click the snapshot updated; the control flips checked.
    expect(autoindent.getAttribute('data-state')).toBe('checked');
  });

  it('hides the AI settings section entirely when mode is web', async () => {
    // Regression: web AI was dropped (no localStorage keys). The
    // AI Providers tab trigger AND content must NOT render in web
    // mode, AND any externally-requested `payload.tab: 'assistant'`
    // falls back to general (we can't open a tab that doesn't exist).
    const settingsProvider = fakeSettingsProvider({});
    const OpenAssistantTab: React.FC = () => {
      const { openModal } = useModals();
      React.useEffect(() => {
        openModal('settings', { tab: 'assistant' });
      }, [openModal]);
      return null;
    };
    renderWithProviders(
      <>
        <OpenAssistantTab />
        <SettingsModal />
      </>,
      {
        managers: {
          mode: 'web',
          providers: {
            bridge: null,
            commands: null,
            completion: null,
            settings: settingsProvider as any,
            exportSettings: null,
          },
        },
      },
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).queryByRole('button', {
        name: 'modals-settings:tab_assistant',
      }),
    ).toBeNull();
    expect(
      within(dialog).getByRole('button', {
        name: 'modals-settings:session',
      }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(dialog).getByRole('heading', {
        name: 'modals-settings:session',
      }),
    ).toBeInTheDocument();
  });

  it('opens on AI Providers when payload.tab is "assistant"', async () => {
    const settingsProvider = fakeSettingsProvider({});
    const OpenOnAssistantTab: React.FC = () => {
      const { openModal } = useModals();
      React.useEffect(() => {
        openModal('settings', { tab: 'assistant' });
      }, [openModal]);
      return null;
    };

    renderWithProviders(
      <>
        <OpenOnAssistantTab />
        <SettingsModal />
      </>,
      {
        managers: {
          // P7: AI Assistant is desktop-only — the modal's assistant
          // tab is hidden in web mode. Override the default ('web')
          // so this test still drives the AI Providers path.
          mode: 'desktop',
          providers: {
            bridge: null,
            commands: null,
            completion: null,
            settings: settingsProvider as any,
            exportSettings: null,
          },
        },
      },
    );

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('heading', {
        name: 'modals-settings:title',
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', {
        name: 'modals-settings:tab_assistant',
      }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(dialog).getByRole('heading', {
        name: 'modals-settings:tab_assistant',
      }),
    ).toBeInTheDocument();
  });

  it('updateSetting fires when the wordwrap checkbox is toggled off', async () => {
    const settingsProvider = fakeSettingsProvider({ wordwrap: true });

    renderWithProviders(
      <>
        <OpenSettings />
        <SettingsModal />
      </>,
      {
        managers: {
          providers: {
            bridge: null,
            commands: null,
            completion: null,
            settings: settingsProvider as any,
            exportSettings: null,
          },
        },
      },
    );

    // Await the dialog so the `getAvailableLocales` promise resolves
    // inside act(...); otherwise its setLocales fires after the test
    // returns and React emits an act() warning.
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'modals-settings:formatting',
      }),
    );
    const wordwrap = within(dialog).getByRole('checkbox', {
      name: /wordwrap/i,
    });
    expect(wordwrap.getAttribute('data-state')).toBe('checked');
    fireEvent.click(wordwrap);
    expect(settingsProvider.updateSetting).toHaveBeenCalledWith(
      'wordwrap',
      false,
    );
  });

  it('updates the UI font from the Appearance section', async () => {
    const settingsProvider = fakeSettingsProvider({});
    renderWithProviders(
      <>
        <OpenSettings />
        <SettingsModal />
      </>,
      {
        managers: {
          providers: {
            bridge: null,
            commands: null,
            completion: null,
            settings: settingsProvider as any,
            exportSettings: null,
          },
        },
      },
    );

    const dialog = await screen.findByRole('dialog');
    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole('button', {
          name: 'modals-settings:appearance',
        }),
      );
    });
    fireEvent.change(within(dialog).getByTestId('ui-font-family-input'), {
      target: { value: "Inter, 'Noto Sans', sans-serif" },
    });
    expect(settingsProvider.updateSetting).toHaveBeenCalledWith(
      'uiFontFamily',
      "Inter, 'Noto Sans', sans-serif",
    );
  });

  it('updates minimap and scrollbar display settings', async () => {
    const user = userEvent.setup();
    const settingsProvider = fakeSettingsProvider({
      minimap: true,
      minimapMaxColumn: 120,
    });

    renderWithProviders(
      <>
        <OpenSettings />
        <SettingsModal />
      </>,
      {
        managers: {
          providers: {
            bridge: null,
            commands: null,
            completion: null,
            settings: settingsProvider as any,
            exportSettings: null,
          },
        },
      },
    );

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'modals-settings:editor_ui',
      }),
    );
    const width = within(dialog).getByLabelText(
      'modals-settings:minimap_width_label',
    );
    expect(width).toHaveValue(120);

    fireEvent.change(width, { target: { value: '1' } });
    expect(width).toHaveValue(1);
    expect(settingsProvider.updateSetting).not.toHaveBeenCalled();

    fireEvent.change(width, { target: { value: '10' } });
    expect(width).toHaveValue(10);
    expect(settingsProvider.updateSetting).not.toHaveBeenCalled();

    fireEvent.change(width, { target: { value: '100' } });
    expect(width).toHaveValue(100);
    expect(settingsProvider.updateSetting).toHaveBeenCalledWith(
      'minimapMaxColumn',
      100,
    );

    settingsProvider.updateSetting.mockClear();
    fireEvent.change(width, { target: { value: '10' } });
    fireEvent.blur(width);
    expect(width).toHaveValue(20);
    expect(settingsProvider.updateSetting).toHaveBeenCalledWith(
      'minimapMaxColumn',
      20,
    );

    fireEvent.click(
      within(dialog).getByRole('checkbox', {
        name: /modals-settings:minimap_label/,
      }),
    );
    expect(width).toBeDisabled();

    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'modals-settings:scrollbars',
      }),
    );
    await user.click(
      within(dialog).getByRole('combobox', {
        name: 'modals-settings:scrollbar_visibility_label',
      }),
    );
    await user.click(
      await screen.findByRole('option', {
        name: 'modals-settings:scrollbar_visibility_hidden',
      }),
    );
    expect(settingsProvider.updateSetting).toHaveBeenCalledWith(
      'scrollbarVisibility',
      'hidden',
    );
  });
});
