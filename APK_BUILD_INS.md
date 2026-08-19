# 🚨 ABSOLUTE APK BUILD RULES

These rules have the highest priority for every APK build.

## 1. APK OUTPUT LOCATION

EVERY APK MUST ALWAYS BE CREATED AND COPIED TO:

I:\LaundryMan\LAUNDRYMAN_APP\APK_BUILD

Do not place the final APK anywhere else.

The final APK file must exist inside:

I:\LaundryMan\LAUNDRYMAN_APP\APK_BUILD

When I provide an APK filename, for example:

test_size.apk

the final file must be:

I:\LaundryMan\LAUNDRYMAN_APP\APK_BUILD\test_size.apk

If the directory does not exist, create it automatically.

Always verify that the APK actually exists at this exact location after the build finishes.

---

## 2. FOLLOW THE APK BUILD INSTRUCTIONS FIRST

Before modifying, optimizing, debugging, or changing anything related to the application, follow the complete APK build system defined in this document.

The APK build system is NOT optional.

Do not invent a different APK build process.

Do not skip the APK viewport patch.

Do not skip the Capacitor sync.

Do not skip the clean Gradle build.

Do not use a different viewport strategy.

Do not replace the proven 480px WebView configuration.

The proven APK architecture is:

React production build
        ↓
Trim pdfmake fonts
        ↓
Capacitor sync
        ↓
Patch packaged index.html
        ↓
Apply APK-only native CSS
        ↓
Verify viewport width=480
        ↓
Gradle clean
        ↓
assembleDebug
        ↓
Copy final APK
        ↓
I:\LaundryMan\LAUNDRYMAN_APP\APK_BUILD

---

## 3. FINAL APK VERIFICATION

After every APK build, verify all of the following:

- APK build completed successfully
- APK file exists
- APK is copied to:
  I:\LaundryMan\LAUNDRYMAN_APP\APK_BUILD
- Requested APK filename is correct
- Packaged index.html contains:
  <meta name="viewport" content="width=480">
- APK uses the existing native-feel CSS injection
- APK is portrait locked
- Android physical back button follows the existing web navigation behavior
- No horizontal overflow
- No unexpected UI scaling
- No overlapping grid/cards
- No clipped content

Only report the APK as successfully built after these checks pass.

---

## 4. DO NOT ASK FOR PRODUCTION SERVICES

This project is currently in BETA.

Do not stop APK development because of:

- OTP provider
- SMS provider
- Twilio
- MSG91
- Firebase SMS
- Payment provider
- Razorpay
- Cashfree
- Subscription
- Production hosting
- Play Store
- Production domain
- Release keystore
- FCM
- Any other paid/production service

Use beta/test implementations where necessary.

The current goal is to build and test the application, not launch it commercially.