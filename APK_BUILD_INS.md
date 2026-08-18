You are responsible for building a production-ready Android APK from this React web application.



The most important requirement is:



\*\*The UI must have the correct visual size on real Android phones.\*\*



Do not treat the APK as a normal browser page. This project uses a React frontend packaged with Capacitor, and the UI is designed around a \*\*480px CSS-wide mobile canvas\*\*.



\## 1. Core UI sizing rule



The application's mobile UI is designed for:



```text

480 CSS px wide

```



The main container already follows:



```css

.container {

&nbsp; width: min(100%, 480px);

}

```



The APK must therefore force the packaged WebView viewport to:



```html

<meta name="viewport" content="width=480">

```



Do NOT replace this with:



```html

width=device-width

```



for the APK build.



The source web application may continue using:



```html

<meta name="viewport" content="width=device-width, initial-scale=1.0">

```



but the \*\*packaged APK index.html must be patched after `cap sync`\*\* to use:



```html

<meta name="viewport" content="width=480">

```



This is intentional.



The purpose is to make the WebView render the application using the same 480px design coordinate system used by the CSS, then let Android scale that viewport naturally to the physical device.



\## 2. Required APK build pipeline



Every APK build must follow this exact order:



```text

React production build

&nbsp;       ↓

Trim pdfmake fonts

&nbsp;       ↓

Capacitor sync

&nbsp;       ↓

Patch packaged index.html

&nbsp;       ↓

Clean Android build

&nbsp;       ↓

assembleDebug

&nbsp;       ↓

Copy APK to requested output name

```



Do not skip steps.



\### Build sequence



Use the project's existing build scripts when available.



Conceptually:



```bash

npm run build

node make-vfs-lite.mjs

npx cap sync android

node patch-apk-index.mjs

cd android

gradlew clean

gradlew assembleDebug

```



Then copy the generated APK to the requested filename.



For example:



```text

test\_size.apk

```



\## 3. APK index.html patch



After:



```bash

npx cap sync android

```



the generated Android web assets must be patched.



The packaged APK `index.html` must contain:



```html

<meta name="viewport" content="width=480">

```



Do not modify the source React `index.html` just to achieve this APK behavior.



The APK patch should happen after Capacitor copies the web build.



\## 4. Native-feel CSS injection



The packaged APK should inject this CSS:



```html

<style id="apk-native-only">

&nbsp; \* {

&nbsp;   -webkit-user-select: none;

&nbsp;   user-select: none;

&nbsp;   -webkit-touch-callout: none;

&nbsp;   -webkit-tap-highlight-color: transparent;

&nbsp; }



&nbsp; input,

&nbsp; textarea,

&nbsp; \[contenteditable] {

&nbsp;   -webkit-user-select: text;

&nbsp;   user-select: text;

&nbsp; }



&nbsp; ::selection {

&nbsp;   background: transparent;

&nbsp; }

</style>

```



This is APK-only behavior.



It should:



\* prevent accidental text selection

\* remove tap highlight

\* prevent long-press browser callouts

\* still allow typing and selection inside inputs



Do not break text selection inside form fields.



\## 5. DO NOT use artificial scaling



Never solve mobile sizing problems using:



```css

transform: scale(...)

```



```css

zoom: ...

```



or:



```css

transform: scale(0.8)

```



Do not globally shrink the application to compensate for an incorrect WebView viewport.



Do not randomly reduce all font sizes.



Do not randomly reduce all padding.



Do not create a second mobile design just for the APK.



The correct approach is:



```text

480px design

&nbsp;     ↓

480px WebView viewport

&nbsp;     ↓

Android naturally scales it to device

```



\## 6. Preserve the existing responsive CSS



The existing CSS is already designed around the 480px mobile canvas.



Preserve these principles:



```text

≤ 479px

→ narrow-phone adjustments



480px–759px

→ tablet/fill behavior



≥ 760px

→ desktop layout

```



The APK viewport is intentionally forced to 480px, so the normal mobile layout should be used.



Do not rewrite the responsive system unless there is a genuine bug.



\## 7. Prevent actual layout overflow



The application must not contain accidental horizontal overflow.



Use:



```css

\*,

\*::before,

\*::after {

&nbsp; box-sizing: border-box;

}

```



and:



```css

html,

body,

\#root {

&nbsp; width: 100%;

&nbsp; max-width: 100%;

&nbsp; margin: 0;

}

```



Use:



```css

overflow-x: hidden;

```



only as a safety measure.



Do not use it to hide an actual oversized component.



Investigate the component if its width exceeds the intended 480px layout.



\## 8. Preserve the 480px container



The primary mobile container should remain conceptually:



```css

.container {

&nbsp; width: min(100%, 480px);

&nbsp; margin-inline: auto;

}

```



Avoid unnecessary:



```css

width: 100vw;

```



especially when combined with padding.



Prefer:



```css

width: 100%;

max-width: 480px;

```



when appropriate.



\## 9. Safe-area support



Keep Android safe-area handling.



Use:



```css

env(safe-area-inset-top)

env(safe-area-inset-bottom)

env(safe-area-inset-left)

env(safe-area-inset-right)

```



where required for:



\* bottom navigation

\* CTA bars

\* toast notifications

\* bottom sheets

\* full-screen layouts



Do not hardcode device-specific notch values.



\## 10. The UI must remain visually proportional



Before building the APK, inspect the actual React UI.



Do not make the following mistake:



```text

Something looks large

&nbsp;       ↓

Shrink the font

&nbsp;       ↓

Shrink the button

&nbsp;       ↓

Shrink the image

&nbsp;       ↓

Shrink everything

```



Instead determine whether the problem comes from:



```text

wrong viewport

wrong container width

wrong breakpoint

wrong CSS width

wrong min-width

wrong grid sizing

wrong overflow

```



The APK viewport is 480px, so the UI should be designed and evaluated inside that coordinate system.



\## 11. Bento/grid layouts



The application contains grid/bento-style UI.



The grid must not overlap or create thick/collapsed blocks because the viewport is incorrectly sized.



At the intended 480px layout width:



\* cards must fit within the container

\* columns must have their intended widths

\* gaps must remain consistent

\* text must wrap naturally

\* images must remain contained

\* no card should overlap another card



If a grid breaks, fix the grid CSS.



Do NOT compensate by changing the APK viewport away from 480px.



\## 12. Login screen



The login screen must preserve its intended proportions:



```text

Illustration

&nbsp;    ↓

Brand

&nbsp;    ↓

Heading

&nbsp;    ↓

Phone input

&nbsp;    ↓

Continue button

&nbsp;    ↓

Terms / Privacy

```



Everything must fit naturally within the 480px design canvas.



Do not independently scale the login screen.



\## 13. Verify before final APK



Before delivering the APK, verify:



\### Web build



The normal browser version must still work.



\### APK build



The packaged APK must use:



```html

<meta name="viewport" content="width=480">

```



\### Layout



Verify:



```text

No horizontal overflow

No overlapping cards

No clipped buttons

No clipped images

No unexpected giant UI

No unexpected tiny UI

No broken typography

No desktop layout inside the APK

```



\### Critical comparison



Check the same screen in:



```text

React browser

vs

Capacitor APK

```



The APK should preserve the same intended 480px design proportions.



\## 14. Build cleanly



Before the final APK:



```bash

cd android

gradlew clean

gradlew assembleDebug

```



Do not rely on stale Gradle output.



Then copy the resulting APK to the requested filename.



Example:



```text

test\_size.apk

```



\## 15. Versioning



Increment the Android version code when producing a new APK so Android recognizes it as a newer build when installing/updating.



Do not break the existing version name/versioning scheme.



\## 16. Output



When I ask:



```text

Build the APK

```



you should:



1\. Inspect the existing project.

2\. Build the React production bundle.

3\. Trim pdfmake fonts if the project uses the existing font-trimming system.

4\. Run Capacitor sync.

5\. Patch the packaged `index.html`.

6\. Confirm the viewport is:



```html

<meta name="viewport" content="width=480">

```



7\. Inject the APK-only native-feel CSS.

8\. Clean the Android project.

9\. Build with Gradle.

10\. Copy the APK to the exact requested filename.

11\. Report the final APK path.



\## 17. Most important rule



\*\*Do not change the proven APK sizing system unless there is clear evidence that it is broken.\*\*



The known-good architecture is:



```text

React UI

&nbsp;  ↓

480px mobile design

&nbsp;  ↓

production build

&nbsp;  ↓

Capacitor sync

&nbsp;  ↓

patch packaged index.html

&nbsp;  ↓

viewport width=480

&nbsp;  ↓

Android WebView

&nbsp;  ↓

APK

```



This is the project's standard APK build architecture.



Use this system consistently for every future APK build.



