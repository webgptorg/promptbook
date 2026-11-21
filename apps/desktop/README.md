# Promptbook desktop

The optional Windows and macOS application packages manGoweb’s production `@ptbk/engine-ui` from `webgptorg/app`. Opening the app attaches to a running project under the current OS user. The project switcher’s **All projects** link, the native **Projects** menu and the tray list other local projects. The chooser can explicitly start a stopped project or open the ordinary setup wizard. Closing the window leaves the engines running.

A local engine needs a version with the `desktop-app-connect` control method. An already running older engine needs an update and restart. The CLI-only installation and its interactive console work independently. The browser App continues to use its existing relay, pairing, passkeys and signed UI releases.

## Building the desktop client

From the Promptbook checkout, with Node 24, npm, Git and read access to `webgptorg/app`:

```sh
npm ci
npm run build
npm ci --prefix apps/desktop
npm --prefix apps/desktop start
```

Each desktop build fetches the current App main in a temporary directory, installs its frozen lockfile with its declared Bun version, generates and builds `apps/engine-ui`, then embeds the compiled files and source commit in Electron. The UI ships inside the installer and works offline. To test a specific local checkout set `PTBK_APP_CHECKOUT` to its path. The build exports its committed HEAD into a temporary directory.

For Actions, set the Promptbook repository secret `PROMPTBOOK_APP_READ_TOKEN` to a fine-grained token with **Contents: Read** on `webgptorg/app`. Only the trusted UI build checks out the private source. Both native packagers consume the same compiled artifact via `PTBK_DESKTOP_UI_BUNDLE`. A release reuses a validated Windows candidate only when the bundled UI also matches the current App main. PR checks use the base branch’s compiled artifact.

```sh
npm --prefix apps/desktop test
npm --prefix apps/desktop run package:windows
npm --prefix apps/desktop run test:e2e
```

## Local connection

Electron discovers running engines through the installed CLI’s per-user registry and authenticated control channel. Only an explicit desktop attachment opens the engine’s HTTP contract on a private Unix socket or Windows named pipe. The Electron main process holds its random credential. A sandboxed project view loads the packaged UI under a virtual HTTPS origin, with a separate Electron session per project, the upstream content security policy and no Node preload. API requests, uploads and event streams go to the selected pipe. The local owner does not create a web member, web session or passkey.

Development uses this checkout’s built CLI and system Node. Set `PTBK_DESKTOP_NODE` if Node is outside PATH. Packaged Windows installations use the installer’s per-user runtime descriptor. `PTBK_DESKTOP_RUNTIME` can select a disposable runtime descriptor for testing.

## macOS installation

On [GitHub Releases](https://github.com/webgptorg/promptbook/releases), choose the versioned `arm64` DMG for Apple Silicon or the `x64` DMG for Intel. Open it, drag **Promptbook** into **Applications**, then launch the installed app. Use that location for subsequent upgrades so persisted engines retain the same runtime path. Stop engines and quit the client before replacing the app. Projects and harness installations are outside the application bundle.

The bundle supplies its matching `ptbk`, Node.js and npm. Use an existing Git installation or Apple's Command Line Tools (`xcode-select --install`) for project setup. The GUI looks in common user and Homebrew executable directories. npm-based harness setup defaults to the user’s `~/.local` prefix. The global CLI remains a separate npm installation.

**Promptbook → Open at Login** registers the controller as a macOS login item. **Quit Promptbook** closes the app. **Quit Promptbook and engines…** also stops the listed engines after confirmation.

### Build and verify

Use an official Node.js 24 distribution, including its npm, on a Mac of the target architecture. After installing dependencies and building the engine as shown above, run:

```sh
npm --prefix apps/desktop run package:macos
bash apps/desktop/test/macos-dmg.sh apps/desktop/release/Promptbook-*-macos-*-unsigned.dmg
```

The test mounts the actual DMG and runs the existing desktop fixture from a copy of its app with the bundled runtime. Local and Check workflow builds use an ad-hoc signature. A release prerelease can use an explicitly named `-unsigned.dmg` when all Apple signing settings are absent. Gatekeeper may block opening those test builds from a browser download.

For Developer ID releases, configure the GitHub Actions secrets `MAC_CSC_LINK` (base64-encoded Developer ID Application certificate export), `MAC_CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`. The release job signs and notarizes both the app and its DMG, validates both tickets, and publishes the verified artifacts and checksums. Stable builds require all five settings.
