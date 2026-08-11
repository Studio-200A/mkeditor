import type { LayoutVisibility } from './interfaces/Session';

export type LayoutPart = keyof LayoutVisibility;

export const DEFAULT_LAYOUT_VISIBILITY: LayoutVisibility = {
  toolbar: true,
  tabBar: true,
  sidebar: true,
  editor: true,
  preview: true,
  statusBar: true,
  assistant: false,
};

let currentMirror: LayoutVisibility = { ...DEFAULT_LAYOUT_VISIBILITY };
let restoreHandler: ((state: LayoutVisibility) => void) | null = null;
let setPartHandler: ((part: LayoutPart, visible: boolean) => void) | null =
  null;
let resetHandler: (() => void) | null = null;
let changeListener: (() => void) | null = null;

export function getCurrentLayoutState(): LayoutVisibility {
  return { ...currentMirror };
}

export function applyRestoredLayoutState(state: LayoutVisibility): void {
  restoreHandler?.(state);
}

export function setLayoutPartExternal(
  part: LayoutPart,
  visible: boolean,
): void {
  setPartHandler?.(part, visible);
}

export function resetLayoutExternal(): void {
  resetHandler?.();
}

export function registerLayoutStateChangeListener(fn: () => void): void {
  changeListener = fn;
}

export function clearLayoutStateChangeListener(): void {
  changeListener = null;
}

export function _setLayoutRestoreHandler(
  fn: ((state: LayoutVisibility) => void) | null,
): void {
  restoreHandler = fn;
}

export function _setLayoutPartHandler(
  fn: ((part: LayoutPart, visible: boolean) => void) | null,
): void {
  setPartHandler = fn;
}

export function _setLayoutResetHandler(fn: (() => void) | null): void {
  resetHandler = fn;
}

export function _syncLayoutMirror(state: LayoutVisibility): void {
  currentMirror = { ...state };
}

export function _notifyLayoutStateChange(state?: LayoutVisibility): void {
  if (state) currentMirror = { ...state };
  changeListener?.();
}
