export function shouldDisableUpdater(
  version: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.MKEDITOR_DISABLE_UPDATER === '1') return true;
  const customBuild = version.toLowerCase().includes('custom');
  return customBuild && env.MKEDITOR_ENABLE_UPDATER !== '1';
}
