import { BackHandler } from 'react-native';
import { router } from 'expo-router';

let modalCloseCallback: (() => boolean) | null = null;

export function registerModalClose(cb: () => boolean) {
  modalCloseCallback = cb;
}

export function clearModalClose() {
  modalCloseCallback = null;
}

export function handleHardwareBack(): boolean {
  if (modalCloseCallback) {
    const handled = modalCloseCallback();
    if (handled) return true;
  }
  if (router.canGoBack()) {
    router.back();
    return true;
  }
  BackHandler.exitApp();
  return true;
}
