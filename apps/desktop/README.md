# Local desktop controller

An optional Electron client for the separately installed local `ptbk` engine. Windows is the supported distribution target. The CLI remains the primary interface; this package is not included in the npm engine's dependencies.

From the repository root:

```sh
npm ci
npm run build
npm ci --prefix apps/desktop
npm --prefix apps/desktop start
```

Development uses this checkout's built CLI and system `node`. Set `PTBK_DESKTOP_NODE` when Node is not on PATH. A packaged installation uses the per-user runtime descriptor prepared by the Windows bootstrap (`installation`, `nodePath`, and the verified PATH). `PTBK_DESKTOP_RUNTIME` can point a disposable test to another descriptor.

```sh
npm --prefix apps/desktop test
npm --prefix apps/desktop run package:windows
npm --prefix apps/desktop run test:e2e
```

Set `PTBK_DESKTOP_EXECUTABLE` to the packaged `promptbook.exe` to run the end-to-end fixture against the distributable. The fixture uses the repository's deterministic fake harness and stops only its own disposable engine. The package version is derived from the root engine manifest during packaging.

The main process owns the tray, windows and PTYs. A small system-Node adapter imports existing observation/control operations from the actual CLI installation. Each project dashboard is an unprivileged view of its verified loopback HTTP server. The shell's narrow preload never reaches project content. The optional prompt transport changes presentation only; ordinary initialization owns the decisions, validation, writes and background start.

Closing a window detaches its clients. Tray Quit is separately confirmed and uses shared graceful/force-stop controls for the listed local engines. `--tray` opens no window and starts no project. The installer uses `--quit-client` during uninstall/upgrade to close only the desktop process, preserving engines.
