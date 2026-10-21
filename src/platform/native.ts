import { Channel, invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { DownloadEvent, Platform } from '../app/types';
export function createNativePlatform(): Platform {
  const appWindow = getCurrentWindow();
  return {
    invoke,
    setTitle(title) {
      document.title = title;
      void appWindow
        .setTitle(title === 'Worktree' ? title : title + ' — Worktree')
        .catch(console.error);
    },
    control(action) {
      return action === 'minimize'
        ? appWindow.minimize()
        : action === 'maximize'
          ? appWindow.toggleMaximize()
          : action === 'close'
            ? appWindow.close()
            : appWindow.startDragging();
    },
    async onResize(callback) {
      callback(await appWindow.isMaximized());
      return appWindow.onResized(async () => callback(await appWindow.isMaximized()));
    },
    channel(handler) {
      const channel = new Channel<DownloadEvent>();
      channel.onmessage = handler;
      return channel;
    },
  };
}
