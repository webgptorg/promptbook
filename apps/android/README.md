# Promptbook for Android

The Android preview is a single APK for ARM64 devices with Android 9 or newer. It includes the tagged Reborn engine, Node.js, Git, and Gemini CLI. It runs one local project and shows the shared project dashboard in a native WebView.

1. Download `Promptbook-<version>-android-arm64.apk` or `Promptbook-<version>-android-arm64-preview.apk` from [GitHub Releases](https://github.com/webgptorg/promptbook/releases). Open it and allow your download app to install it if Android prompts you.
2. Open Promptbook and tap **Start engine**. You can inspect the dashboard and Git history without model credentials. To try model work, enter a Gemini API key before starting. The app keeps the key for that engine session only.
3. The engine starts paused. Use **Resume** in the dashboard to authorize the initial task and later scheduled work. Returning to the home screen leaves the service running. Use **Stop engine** in the app or **Stop** in its notification to end the session.

Android can suspend or stop the service, including when the device is idle or the app is force-stopped. Open the app and start the engine again after a shutdown or reboot. The Git project and Book files are kept in the app's private storage. The preview is limited to the built-in Gemini harness and one local project. Desktop browser automation, native Wallet unlock, Codex voice, and importing existing projects are outside this preview.

## Build and publish

On Linux with Node.js 24, JDK 17, and the Android SDK installed:

```sh
sdkmanager --install 'platforms;android-36' 'build-tools;36.0.0' 'ndk;28.2.13676358'
npm ci
bash apps/android/build-apk.sh "$PWD/apps/android/release/Promptbook-android-preview.apk"
```

The build takes the native runtime packages and their hashes from the signed Termux package index. The APK includes the package provenance, license notices and Git source in `assets/runtime.zip` under `licenses/`. The Gemini CLI package is pinned and integrity-checked. Android installs the native executables in its immutable native library directory. The WebView authenticates to the engine's ephemeral loopback server with a new app credential each time the engine starts.

The publish workflow builds and verifies the APK from the same tag as the desktop installers and attaches it and its SHA-256 checksum to that release. Android updates require the same signing key. Configure these GitHub Actions secrets for a persistent release signing identity:

- `PTBK_ANDROID_KEYSTORE_BASE64` for the Base64-encoded PKCS#12 keystore.
- `PTBK_ANDROID_STORE_PASSWORD` for its password.
- `PTBK_ANDROID_KEY_ALIAS` for the signing alias.
- `PTBK_ANDROID_KEY_PASSWORD` when the key password differs from the store password.

Without a configured keystore, the workflow still publishes an installable `-preview.apk` using a new preview key. A later APK with a different key requires uninstalling the older copy first, which also deletes its local project. Install future versions of the regularly signed APK over the existing installation to retain its data.
