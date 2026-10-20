import { JSDOM } from 'jsdom';
export const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
});
for (const name of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLDialogElement',
  'HTMLSelectElement',
  'HTMLInputElement',
  'HTMLTextAreaElement',
  'Element',
  'Node',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'MutationObserver',
  'Storage',
] as const)
  Object.defineProperty(globalThis, name, {
    value: dom.window[name],
    configurable: true,
    writable: true,
  });
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { value: true, configurable: true });
Object.defineProperty(globalThis, 'requestAnimationFrame', {
  value: (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0),
  configurable: true,
});
Object.defineProperty(globalThis, 'cancelAnimationFrame', {
  value: clearTimeout,
  configurable: true,
});
Object.assign(dom.window.HTMLDialogElement.prototype, {
  show(this: HTMLDialogElement) {
    this.open = true;
  },
  showModal(this: HTMLDialogElement) {
    this.open = true;
    this.dataset.modal = 'true';
  },
  close(this: HTMLDialogElement) {
    this.open = false;
    delete this.dataset.modal;
    this.dispatchEvent(new dom.window.Event('close'));
  },
});
Object.assign(dom.window.HTMLElement.prototype, {
  setPointerCapture() {},
  hasPointerCapture() {
    return false;
  },
  releasePointerCapture() {},
});
