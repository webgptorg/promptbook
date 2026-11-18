# Computer Control

[Main specification](../_main.md) · [Tools](tools.md) · [Browser](browser.md) · [Trace policy](trace-configuration.md) · [App connection](../app/connection.md)

## Purpose and ownership

Computer Control is a **capability of the engine**, independent of the optional Electron Desktop Console. The same
native helper and MCP interface serve npm/CLI installations, the terminal Console, Desktop Console and authenticated
App clients. Closing a Console does not terminate a running engine or grant new desktop authority.

Use the dedicated browser tool for work it can perform. Computer Control is the final native fallback for other
applications, OS dialogs, extensions or interactions the browser tool cannot perform. Browser profile ownership and
Computer Control are distinct: the latter reaches the existing signed-in desktop, including its system cursor,
focused window and ordinary installed applications. Do not launch a second browser over an occupied profile.

The first implementation supports the **primary monitor** of the engine host's current interactive session on
Windows 10/11 and Apple Silicon macOS 14+. Linux, headless VPS sessions, Intel Macs and control of a different
computer are unavailable. Additional monitors and isolated desktop sessions are outside this version's scope.
The cursor and keyboard focus are shared with the human. A separate colored, click-through halo identifies agent
activity, but does not claim independent OS input. Genuine independent pointers are not guaranteed by either backend.

## Configuration and migration

```json
{
  "type": "COMPUTER_CONTROL",
  "variant": "NATIVE",
  "name": "computer-control",
  "isEnabled": true
}
```

Normal initialization adds one enabled record without another wizard question. The deterministic `0.119.0-97`
migration appends it once, using an available name without replacing a conflicting record. An existing record,
including a disabled one, is retained. After the migration advances `promptbookVersion`, removing the tool does not
cause it to reappear. A missing OS permission does not block init or unrelated browser/harness work.

Configured/enabled is distinct from usable. Tools reports unsupported platforms, unchecked permissions and actual
checked runtime results separately. The tool detail offers permission setup, status, pause, resume and session stop.
macOS permission setup is requested for the engine's native helper (Accessibility, screen capture and input
monitoring); the OS owns those grants and may attribute them to a responsible launching process. The helper uses a stable
per-user executable location; OS updates or a changed binary/launcher can still require permission renewal. Windows secure desktops, elevated applications and session boundaries remain OS limitations.

Disabling/removing this tool is an exception to retained-use rules: stop native access **before** waiting for the
configuration's Git/sync transaction. A failed save never automatically resumes it. Tool changes do not create new
per-click approvals or change the agent's existing project/task authority.

## Human priority and lifecycle

| Event | Agent input | Agent observation | Resumption |
|---|---|---|---|
| Physical mouse, wheel or keyboard activity | Interrupt immediately; release synthetic held inputs | Live observation remains allowed | After five seconds of physical inactivity and a fresh observation |
| Explicit pause / take control | Stop | Stop | Explicit human return only |
| Session emergency stop | Stop across projects | Stop across projects | Explicit human resume only |
| Tool disable/remove | Cancel current access and latch session stop | Stop | Enable if necessary and explicit human resume |
| Engine pause/stop, lock, sleep, session or permission loss | Stop; invalidate pending coordinates | No agent capture while unavailable | Revalidate availability and observe again; deliberate human pause remains |

The native always-on-top bar names project, agent and actual control state, with pause/return and immediate emergency
stop. It is part of the helper, not the Console. Input requires an acknowledged visible indicator and physical-input
monitoring. A lost/closed helper, failed input monitor or unavailable indicator fails closed. Tagged synthetic events
do not count as physical human activity. Real movement follows a smooth interruptible path rather than teleporting
under an animated overlay. Interruption does not imply rollback of already-delivered input.

Human latches are stored outside projects in the per-user runtime and survive engine restart. Emergency stop has
unique persistent markers so an ordinary pause or stale concurrent write cannot clear it. Explicit resume removes
only the markers observed at that handoff. Owner-only remote viewing/input remains available during takeover, while
agent MCP observation stays stopped. Emergency stop blocks the owner input path too until explicit resume.

## Coordination and fresh observations

Engines of the OS user share a desktop coordination domain. They serialize native operations with unique atomic
Lamport bakery tickets, not PID-only stale lock removal. Dead participants may be cleaned up without deleting a new
owner's lock. A live stalled participant is never silently overtaken.

Admission to observation/action episodes is FIFO, with a 15-second idle lease and 60-second total limit. The live
previous owner releases held input before another agent takes an expired episode. `computer_release` ends the episode
promptly; task cleanup does the same. Failed observations release their episode after input cleanup, so an unavailable
helper cannot strand the desktop under a live engine PID. Cleanup failures retain ownership until reconciled. Do not reserve the whole desktop for a long-running task. Browser and terminal
work may continue independently, except where they share protected surfaces or lifecycle gates.

Screenshots/accessibility observations return an opaque `frame`, tied to episode ownership, human-input epoch,
primary-display topology and focused-window context. Mutating calls require the latest frame. Most successful
mutations consume it, requiring another observation before the next step; short button down/up sequences can retain
the frame while focus/topology remains unchanged. A stale frame never authorizes a new click. Native context checks
also reject focus changes between the coordinator's status check and input delivery.

Movement/drag durations and coordinates are bounded, and held synthetic keys/buttons are released on interruption,
failure, episode release/expiration and helper EOF. After an uncertain result, inspect actual application state
before retrying. No transport automatically retries a mutation that may already have happened.

## Harness interface

The ordinary engine MCP bridge exposes `computer_status`, `computer_screenshot`, `computer_accessibility`,
`computer_move`, `computer_click`, `computer_button`, `computer_drag`, `computer_scroll`, `computer_key`,
`computer_type`, `computer_clipboard_read`, `computer_clipboard_write` and `computer_release`.
Drag is an atomic native button-down, smooth move and button-up from the current pointer position.
Screenshots use MCP image blocks and primary-display pixel coordinates; accessibility supplements image targeting,
with capability varying by application. Clipboard use is explicit, not continuous synchronization.

This interface is provider-neutral and does not require a separate model/API subscription. A harness still needs
working tool/MCP and image support; unsupported harnesses do not silently acquire a different provider or billing
mode. The tool transports observed inputs/outputs and never promises private model reasoning.

## Privacy, recording and external effects

Desktop pixels are live-only by default. `computer.isRecordingEnabled` defaults false; explicit opt-in saves **agent
screenshots**, not video, only in ignored `.ptbk/computer-recordings/`, mode 0600 where supported. Keep at most 100 MiB
and seven days of screenshots, pruning on capture. Owner takeover frames, clipboard values and accessibility results
are never recorded by this recorder. Local opt-in images may contain private information; arbitrary image/PII
redaction is not claimed.

Persistent technical traces retain operation, attribution and outcome. Structured browser/computer tool inputs and
results, clipboard/text payloads and image data are removed before text rendering/storage, including split native
harness tool-use/result envelopes. Browser video is also default-off and local-only under ignored `traces/<task>/local/video/`.
Existing recordings and already-committed history are not retroactively erased. Known-secret redaction remains
defense in depth; an unknown secret restated as ordinary model prose cannot be universally identified.

Shared protection markers precede Wallet entry and remain until protected fields are cleared. An agent cannot use
whole-desktop capture, accessibility or clipboard tools to bypass Wallet operations or any human-reserved browser
tab, including another project's tab. A boundary-check/storage failure does not grant desktop access.

Logical effects use the existing external-action log regardless of whether performed through browser, native desktop,
API or shell. Meaningful persistent effects outside the project, including OS settings/software installation when
applicable, are recorded with their contextual impact; pure technical intermediate clicks remain traces. Reconcile
uncertain effects before retrying and never imply Git revert undoes an external action.

## Remote primary desktop and distribution

The owner may open `/computer` on the engine origin through the existing authenticated App connection, or its local
Console link. The viewer polls live PNG frames and forwards bounded native inputs. It is a primary-desktop viewer,
not a video/WebRTC stream, and operates the **engine host**. `/api/v1/computer/*` requires the existing gateway's owner
role and same-origin mutation protection; local `/api/computer/*` retains authenticated loopback/CSRF rules. Responses
are private/no-store. No new public listener, relay decryption or arbitrary-command endpoint is introduced. Losing a
viewer does not implicitly return control or replay queued input.

The npm runtime ships the native sources and a release-built arm64 macOS helper. Publication builds the helper on
macOS, transfers the matching source-digest artifact to the npm/desktop packaging jobs and refuses a missing/mismatched
binary. Developer source checkouts can compile with Apple command-line tools. Windows uses its built-in PowerShell
and native Win32/UI Automation helper, without Electron or third-party automation services.

## Verification and completion

Portable tests use injectable backends to exercise real coordinator cancellation, cross-project latches, stale
frames, lock ordering, Wallet/takeover boundaries, input bounds and MCP/HTTP authorization. Native tests compile and
probe the actual helper on supported runners. A Linux typecheck or fake backend does not prove real native behavior.

Before declaring platform acceptance, verify on real supported macOS and Windows: permission setup from npm-only
installation, native screenshot/accessibility, Unicode typing/clipboard, smooth click/drag/scroll, physical interruption
during movement/typing, explicit takeover and emergency stop from another project, primary-screen scaling/focus
changes, lock/sleep/unlock, helper/indicator loss and crash recovery without duplicate external effects.
