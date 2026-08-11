declare module 'markdown-it-task-lists' {
  const plugin: import('markdown-it').PluginWithOptions<{
    enabled?: boolean;
    label?: boolean;
    labelAfter?: boolean;
  }>;
  export default plugin;
}

declare module 'monaco-editor/esm/vs/basic-languages/markdown/markdown.js' {
  export const language: import('monaco-editor').languages.IMonarchLanguage;
}
