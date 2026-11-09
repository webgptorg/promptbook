# Local desktop controller

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../../design/readme-wordmark-dark.svg">
  <img src="../../design/readme-wordmark.svg" alt="Promptbook" width="230">
</picture>

An optional Electron client for the local `ptbk` engine on Windows and macOS. The renderer uses the [shared Promptbook brand](../../design/README.md). The CLI remains the primary interface; this package is not included in the npm engine's dependencies.

From the repository root:

```sh
npm ci
npm run build
npm ci --prefix apps/desktop
npm --prefix apps/desktop start
```

Development uses this checkout's built CLI and system `node`. Set `PTBK_DESKTOP_NODE` when Node is not on PATH. On Windows, a packaged installation uses the per-user runtime descriptor prepared by the Windows bootstrap (`installation`, `nodePath`, and the verified PATH). `PTBK_DESKTOP_RUNTIME` can point a disposable test to another descriptor.

```sh
npm --prefix apps/desktop test
npm --prefix apps/desktop run package:windows
npm --prefix apps/desktop run test:e2e
```

Set `PTBK_DESKTOP_EXECUTABLE` to the packaged `promptbook.exe` to run the end-to-end fixture against the distributable. The fixture uses the repository's deterministic fake harness and stops only its own disposable engine. The package version is derived from the root engine manifest during packaging.

The main process owns the tray, windows and PTYs. A small system-Node adapter imports existing observation/control operations from the actual CLI installation. Each project dashboard is an unprivileged view of its verified loopback HTTP server. The shell's narrow preload never reaches project content. The optional prompt transport changes presentation only; ordinary initialization owns the decisions, validation, writes and background start.

Live tab control and voice are presented in place, without a temporary server, link or external browser. The adapter runs the CLI's own tab viewer and voice relays over the engine's control channel. Their page is served from the private `ptbk-feature:` scheme into a sandboxed view of the owning window, with its own in-memory session, a restrictive content security policy and only `feature-preload.cjs`, which carries its messages over IPC. Only that live view's main frame is accepted. The voice view may use the microphone (audio only), and the tab viewer may use the clipboard for explicit copy and paste. Every other permission is denied. The shell keeps the trusted tab controls outside the page: **Return control to agent**, **End use**, Wallet's save offer and **Sign in manually** for pending Wallet requests. Voice starts only from the open chat: **Start voice chat** sits beside the composer (also before the first message of a new chat), and the call's state, captions, microphone/sound mute and **End voice chat** stay in that chat, with its media view directly below. The unprivileged dashboard hands these intents to its own shell as a refused popup of `/.ptbk-desktop/voice` carrying a per-view token; the shell validates the token, action and chat and binds the call to that chat, so later navigation never retargets it. Leaving the chat view, reopening the dashboard or closing the window ends the call, but only detaches a tab viewer. The tab stays with you until you return it.

Closing a window detaches its clients. Tray Quit is separately confirmed and uses shared graceful/force-stop controls for the listed local engines. `--tray` opens no window and starts no project. The installer uses `--quit-client` during uninstall/upgrade to close only the desktop process, preserving engines.

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
