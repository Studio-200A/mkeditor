import { shouldDisableUpdater } from '../src/app/lib/updaterPolicy';

describe('shouldDisableUpdater', () => {
  it('disables upstream updates for custom builds by default', () => {
    expect(shouldDisableUpdater('4.2.0-custom', {})).toBe(true);
  });

  it('allows an explicit custom-build opt-in', () => {
    expect(
      shouldDisableUpdater('4.2.0-custom', {
        MKEDITOR_ENABLE_UPDATER: '1',
      }),
    ).toBe(false);
  });

  it('honors the disable flag for official builds', () => {
    expect(
      shouldDisableUpdater('4.2.0', { MKEDITOR_DISABLE_UPDATER: '1' }),
    ).toBe(true);
    expect(shouldDisableUpdater('4.2.0', {})).toBe(false);
  });
});
