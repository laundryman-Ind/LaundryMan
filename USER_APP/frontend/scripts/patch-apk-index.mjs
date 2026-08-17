// Apply the APK packaging settings to the index.html that gets packaged into
// the Android app, reproducing the old working APK (LaundryMan_1.apk):
//   - viewport `width=480`: the app's CSS is designed for a ~480px-wide
//     mobile container, so the layout is laid out at 480 CSS px and scaled to
//     fill the phone screen exactly like the old APK. (device-width scaled the
//     design down and made it look "too wide" / zoomed out on the phone.)
//   - It injects the same "apk-native-only" style from the old APK: disables
//     text selection, the tap-highlight flash and the touch callout for a
//     native feel, while keeping selection working inside inputs.
// Run AFTER `cap sync android` so only the packaged copy is tuned.
import { readFileSync, writeFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) {
  console.error('usage: node scripts/patch-apk-index.mjs <path-to-index.html>')
  process.exit(1)
}

const NATIVE_STYLE = `  <style id="apk-native-only">\n` +
  `  *{ -webkit-user-select:none; user-select:none; -webkit-touch-callout:none; -webkit-tap-highlight-color:transparent; }\n` +
  `  input,textarea,[contenteditable]{ -webkit-user-select:text; user-select:text; -webkit-touch-callout:default; }\n` +
  `  ::selection{ background:transparent; }\n` +
  `</style>`

let html = readFileSync(file, 'utf8')

// 1) Viewport: replace whatever Vite/Capacitor emitted with the old APK's width=480.
const viewportRe = /<meta\s+name="viewport"\s+content="[^"]*"\s*\/?>/i
if (viewportRe.test(html)) {
  html = html.replace(viewportRe, '<meta name="viewport" content="width=480" />')
  console.log(`patched ${file}: viewport set to width=480 (old-APK reference)`)
} else {
  console.warn(`WARNING: no viewport meta found in ${file}`)
}

// 2) Inject the native-only style exactly as the old APK had it.
if (!html.includes('apk-native-only')) {
  html = html.replace('</head>', `${NATIVE_STYLE}</head>`)
  console.log(`patched ${file}: apk-native-only style injected`)
}

writeFileSync(file, html)
