# One-command VPS onboarding

[Main specification](../_main.md) · [Installation](installation.md) · [Initialization](initialization.md) · [Server deployment guide](../../deploy/README.md)

An owner connected to a clean supported VPS can paste one shell command and reach Promptbook's ordinary interactive initialization. Missing Node.js/npm must not turn this into a separate prerequisite tutorial. The command prepares the machine, installs the engine and automatically hands control to the existing wizard; after successful setup, ordinary init starts the engine and opens its terminal dashboard.

## Supported starting point

The initial supported clean-server target is Ubuntu 24.04 LTS on x86-64 with systemd, outbound HTTPS and an interactive shell reached through SSH or the provider's console. The owner has root or suitable sudo access for installation. Do not imply that the Ubuntu installer supports every Linux distribution, ARM, Windows or macOS; local-machine guidance uses the appropriate supported installation path.

The published entry command works without preinstalled Node.js, npm, Git, Chrome or an AI harness. It also handles any missing HTTPS download prerequisites needed on that documented base image, rather than asking the owner to paste another prerequisite command. Required privilege prompts may remain attended. Explain the supported host and privileges beside the command; keep its HTTPS source inspectable.

Check OS/architecture and conflicting existing installation/account state before incompatible changes. Prepare a runtime satisfying the selected package's requirements, npm, Git, a supported browser and the ordinary global `ptbk` executable. Reuse compatible components within the bootstrap's supported installation scope and preserve unrelated system runtimes/installations. Resolve a requested published version exactly; resolve a default publication tag once for the operation and report the actual installed version. Never silently substitute a different requested version or turn a repeated bootstrap into an engine upgrade. Engine updates follow [their own workflow](updates.md).

## Privileges, ownership and terminal handoff

Use elevated privileges for prerequisite and service-account preparation only. Initialization, native harness sign-in, projects, browser profiles and ordinary execution belong to the dedicated non-sudo engine user. Preserve its real home, writable data/config/cache paths and executable discovery in both the attended terminal and the background service. Do not authenticate under root or the SSH administrator and then start a differently scoped daemon that cannot use that sign-in. Preserve an existing Git identity; prepare the ordinary explicit service identity when absent so init can make its setup commit.

Once prerequisites are verified, invoke the installed `ptbk init` automatically in the same live terminal under that account. The owner does not need an intervening shell, account-switch, `cd`, initializer command or new SSH session. Preserve a usable input/output terminal even when bootstrap code was downloaded or piped; script input at EOF is not interactive user input. Harness setup must also retain the terminal when its native flow needs it.

Use init's ordinary intent-first workflow and [destination policy](initialization.md#initial-input-and-destination). Without an explicit project destination, offer the shared projects root under the engine user's resolved home. With one, reuse and confirm it through ordinary init. Never initialize the download directory, a system installation directory or the shared projects container by accident. Existing projects retain their files, Git history and settings; repeating the entry command is not permission to reset them or create another agenda.

The launcher is a thin bootstrap. Do not duplicate destination selection, core-agent preparation, tool configuration, Wallet setup, setup commits, migration, first-task creation or start/dashboard logic in a shell script. Use the shared init/start operations, including their cancellations, explicit overrides and honest outcomes. Selected harnesses are installed and authenticated by their shared adapters during attended init; the bootstrap does not silently pick a provider or require an API key.

## Remote operation and provider provisioning

An interactive SSH session is sufficient for supported technical setup. A missing server desktop must not block supported native harness authentication; use shared [remote-login setup](harness-authentication.md), display its instructions in the terminal and let the owner finish the human part on another device. Default the project browser to headless when no usable display exists, without conflating it with harness authentication. Website logins are a separate capability and may still need their own protected human interaction.

Provider startup scripts, cloud-init and template extensions have no attended terminal. They reuse the same prerequisite bootstrap but do not launch a hidden initializer, wait for an OAuth browser/code or claim a ready agenda. Report **server prepared; initialization pending**. Their guide supplies a single attended continuation command over SSH, reusing satisfied prerequisites and automatically entering the same initializer. A cloud provider's running VM status is separate from successful prerequisite installation, sign-in and project launch.

Other explicit noninteractive uses supply required decisions/access in advance and follow ordinary noninteractive init semantics. If an attended invocation cannot obtain a usable terminal, stop the interactive handoff with a clear incomplete outcome and a concrete resumption command; do not hang, invent answers or report completed onboarding. This is distinct from a deliberately requested prerequisite-only provider bootstrap.

Keep dashboard/API/browser-debugging ports private. Enable the existing per-user persistence prerequisites so ordinary init/start can register its project service, and report what was actually enabled. Never add another always-restarting supervisor that defeats [service lifecycle](service-lifecycle.md), [startup intent](persistence.md), manual stop or panic. Closing the dashboard or SSH after a successful background launch leaves ordinary engine ownership unchanged.

## Failures and completion

Distinguish download, prerequisite installation, engine installation, local setup, harness authentication, confirmed service launch and optional remote Git publication. Failure or cancellation in one stage never becomes a full-success message. Report a failed command's real status and actionable repair; never continue into init after a failed prerequisite. A sign-in or init failure preserves installed components and saved setup for retry.

Repeating a partially completed installation reuses compatible completed steps and existing account/project data. It does not reset Wallet, replace a native login, duplicate the bootstrap task, start a second engine or create an empty setup commit. Do not retry an incompatible version over a running installation; use the ordinary update process.

Successful attended onboarding means ordinary local setup and selected initial tools passed their real checks and the service launch was confirmed. Interactive init then attaches the same terminal dashboard unless the owner's explicit ordinary presentation options suppress it. Opening a URL or saving configuration alone proves none of those outcomes. Task completion and optional Git publication are not prerequisites for the dashboard handoff. See [init completion](initialization.md#completion-and-automatic-start).

## Acceptance scenarios

- On a clean supported host without Node.js/npm/Git/browser/harness, one pasted command prepares prerequisites and opens the intent field without a second shell command. Supported selected native sign-in completes without a desktop on the server; successful init starts one engine and attaches its ordinary dashboard.
- Both direct-root and sudo-admin installation hand off to the engine user. Native readiness, browser profiles, home-based destination, Git commit and service discovery use that same account; no root-owned project or administrator-only sign-in is mistaken for readiness.
- Input remains usable after downloading/piping the bootstrap. An explicitly supplied destination is confirmed once; the default does not initialize a system, temporary or shared-container directory. Explicit no-dashboard/raw/noninteractive policies retain their normal behavior.
- Unsupported hosts, conflicting installations, denied privileges and failed downloads report the actual failed stage without launching init. Retry after installation or sign-in interruption preserves completed setup and creates no duplicate task, project or worker.
- Unattended provider provisioning finishes without waiting for login and reports initialization pending. Its one-command attended continuation reuses prerequisites. A missing interactive terminal produces an actionable incomplete handoff rather than a hang or false success.
- After confirmed launch, leaving the dashboard/disconnecting SSH keeps the engine available. Startup and stop/panic behavior follow the ordinary persistence contract; no public control/debugging port or extra supervisor is introduced.
