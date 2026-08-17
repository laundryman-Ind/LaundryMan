// True inside the Capacitor Android APK — Capacitor injects window.Capacitor
// into the native WebView. The plain web build never loads the Capacitor
// runtime, so this stays false and APK-only behaviors stay off in the browser.
export const isNativeApp = () =>
  typeof window !== 'undefined' &&
  typeof window.Capacitor !== 'undefined' &&
  typeof window.Capacitor.isNativePlatform === 'function' &&
  window.Capacitor.isNativePlatform()
