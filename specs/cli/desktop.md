# Local desktop client

Windows and macOS share the same [Promptbook wordmark and robot artwork](../../design/README.md).
The header follows the application's selected appearance. The empty project view uses
the homepage robot as a supporting illustration.

[Main specification](../_main.md) · [Windows installer](windows-installer.md) · [Global dashboard](global-dashboard.md) · [Initialization](initialization.md) · [Harness sessions](harness-sessions.md)

## Authority and scope

Specifications define behavior; the project engine implements it; the CLI and terminal dashboard are the primary control interface. The optional desktop application is a thin local client derived from those interfaces. Future features must remain fully usable in the CLI, without installing desktop dependencies or running a graphical session. Desktop work must not change existing CLI behavior to accommodate its presentation.

Ship Windows and macOS desktop clients from one Electron, xterm.js and native PTY implementation. Platform code handles packaging, startup integration, icons and locating the standalone CLI runtime. This is local control on the computer running the engines, separate from the future remote customer App.

Preserve the existing per-project supervisors, engine ownership, discovery registry and OS-startup rules. Do not introduce a global engine or a new always-running engine supervisor. Shared refactoring is permitted when observable CLI/engine semantics are preserved. Clients never own scheduling, Git transactions, credentials or project state.

## Tray and lifetime

The optional desktop installation provides a background tray controller and any number of independent windows. The tray controller starts at Windows sign-in without opening a window or starting/resuming a project. On macOS, Open at Login is an opt-in native login item. Login opens the controller without opening the first-project wizard or starting a project. The Dock icon reopens a window. Standard macOS Quit closes the client, and Quit Promptbook and engines uses the explicit host-wide operation below. Engine startup remains governed by existing persistence. An engine-only npm installation has no tray or Electron dependency.

Closing a window closes only that client view and its terminal attachments. Other windows, the tray and all engines keep running. Multiple graphical windows and ordinary terminals may observe/control the same project; shared actions and chat changes propagate from the same engine.

The tray lists the same known projects as the global dashboard, including stopped projects, their current state, and entries for Open, New window, New project and About. Opening a stopped project never implicitly starts it. Quit from the tray is a distinct explicit operation: when engines are live or cannot be verified, confirm its host-wide scope and offer graceful Stop and quit, a separately confirmed Force stop and quit, or Cancel. Graceful quit waits for verified absence of each owner; an accepted stop or lost connection is not completion. Never silently escalate. A failed/unconfirmed stop retains the controller and reports the affected project. Recheck discovery before exit so a concurrently started engine is not silently abandoned. Intentional stop retains existing next-boot pause semantics.

## Project views and terminal parity

Reuse global observation and individual/bulk Start, Start paused, Pause, Resume, Stop, Force stop and stopped-entry removal. Preserve their applicability, confirmations, conflict handling and per-project outcomes. Forgetting a stopped project never deletes its files. Use verified engine identity and current control endpoints, not window-local cached state.

Reuse the existing graphical dashboard presentation and shared controls. Every project page has Open in terminal, opening the corresponding page of the actual CLI dashboard in xterm.js; keep the selected project and supported entity context. A general CLI/global-dashboard fallback remains available, including when the engine's HTTP server is disabled or its graphical view is unavailable. New CLI functionality must always be reachable through this fallback before bespoke graphical presentation exists.

Embed [live browser tab control](browser-tab-control.md) and [realtime voice](voice-chat-ui.md) directly in their graphical dashboard pages. Use the same authorization, lifecycle and outcomes as the terminal, with local media and input in the desktop client. The [temporary browser surface](interactive-feature-bridges.md) is used when the user is in the actual CLI dashboard, including its embedded terminal presentation. Closing a graphical window ends its owned media surfaces under their individual rules.

Harness sign-in runs its real native terminal workflow inside the application. Harness sessions retain their actual identity and the shared Observe/exclusive/shared takeover and lease rules. Open the existing session through the terminal dashboard; never represent a fresh unrelated harness invocation as the running session. Closing an observing terminal does not stop an engine or its harness work.

### Appearance and layout

Use the public [Promptbook brand guide](https://www.ptbk.io/en/branding) for the wordmark, palette, Inter interface text and Outfit headings. Show the current appearance with an icon control for system, light and dark. Keep the system default and save explicit preferences across windows and restarts.

Allow dragging the divider next to the projects sidebar and between the setup form and its embedded terminal. Provide keyboard resizing and preserve usable space for both panels. Show the project’s observed lifecycle in the sidebar and overview with a dot and a text label. Shared dashboard attention takes precedence over a live status color, with distinct indicators for a verified stop and unknown connectivity. Respect reduced motion.

Present desktop conversations with a separate header, a scrollable transcript with distinct user and agent bubbles, and a dedicated reply area below. Keep draft, sending, task, attention and read behavior shared with the existing graphical dashboard.

## One initializer, two presentations

With no known projects, opening the application starts the first-project wizard. New project invokes the same intent-first initialization state machine and domain operations as `ptbk init`, with clickable choices, text fields and file attachments. There is no second initializer or project format. The CLI keeps its terminal presentation. Shared prompts may expose a private authenticated presentation transport; options, validation, Back, cancellation, review, deferred writes, login verification, Git, setup commits and the single background start remain owned by normal init.

Native sign-in and any terminal-only interactions remain available in the embedded terminal without restarting the wizard. Switching presentation must not submit an answer, lose a draft or duplicate initialization. Cancel is the normal init cancellation, not an engine stop. Show incomplete/failed setup truthfully and keep its diagnostics/retry path. On successful completion, attach the graphical dashboard to the exact project reported by the shared initializer; never infer it from another concurrently registered project or start another engine.

## Installation and isolation

The Windows wizard offers the engine/CLI and the desktop application (selected by default). The desktop package and installer match the release version. Successful installation opens the ordinary desktop entry point, where first-project setup follows the same flow as on macOS. CLI-only completion points to the Start menu terminal and later explicit `ptbk init`. Ordinary init owns harness choices and sign-in.

Keep Node.js, npm and Git prerequisite discovery, exact-version verification, retry behavior, PATH and project preservation. Desktop uninstall removes its own shortcuts/startup registration only, preserving engines, projects, Node.js, Git and harnesses. A desktop failure must not be reported as a successful desktop installation.

On macOS, provide a drag-to-Applications DMG for Apple Silicon and one for Intel. Bundle standalone native Node.js, npm, and the engine built from the exact release source. The app opens and discovers local projects without installing a global `ptbk` or changing system PATH. Use system or user-installed Git and discover common Homebrew and user executable directories for Git and harnesses. npm-based harness setup uses a writable user prefix. Run the application from its installed location so ordinary engine persistence points at a stable path. Upgrades replace the application bundle after its engines have been stopped. The user’s projects and harnesses live outside the app.

The graphical shell loads packaged local content with context isolation, sandboxing, no renderer Node integration and a narrow validated preload interface. Project dashboards run without a privileged preload. Allow only verified loopback engine addresses and reject arbitrary shell navigation. Authenticate private prompt transport, bind terminal ownership to its window, bound messages/buffers and validate command arguments. Spawn Node/CLI with argument arrays, never interpolated shell commands. External browser links require an explicit user gesture and an http(s) URL.

Deny renderer permission requests by default. After explicit call start, permit microphone access only from the verified voice surface of the owning window and active local call, subject to OS consent. Apply the scoped clipboard action rules to the trusted tab viewer. Streamed pages cannot acquire desktop permissions or navigate the app shell. Validate feature messages against the owning window and active operation and revoke feature access when that operation ends.

## Acceptance

- On macOS, mount each architecture’s actual DMG, copy its app and confirm the exact bundled CLI version, npm, the tray and native PTY. Exercise multiwindow, setup cancellation and engine lifetime with the same fixture as Windows.
- On Windows, install with and without the desktop component; verify the matching executable, shortcuts, login startup and the absence of project-folder creation during installation. A clean machine needs no manual commands.
- Open two windows and an ordinary terminal on one engine; pause/chat/control changes agree. Close either window and verify the same engine/supervisor survives.
- Reboot/sign in: the tray appears without opening a window, while existing engine persistence rules remain unchanged. CLI-only/headless use never loads Electron.
- Complete, go back, cancel and resume the same initializer from graphical presentation, with native login in its terminal and complete attachment payloads.
- Open each page in the CLI terminal. Attach to a real session using normal observation/takeover rules; detach without ending work.
- On Windows and macOS, start voice inside a chat and control a headless browser tab inside the app. Verify neither starts a temporary CLI server. Check microphone/clipboard permission scope, Wallet save choices and explicit browser handoff. Close the window and verify voice ends while the tab remains protected against automatic takeover.
- Quit with live, paused, unreachable and concurrently started engines; distinguish graceful acceptance from verified completion, retain the tray on failures, and never force without explicit confirmation.
- Reject untrusted IPC senders, arbitrary remote URLs, cross-window terminal control and invalid/stale prompt answers. Build/package checks include the native Windows PTY.
