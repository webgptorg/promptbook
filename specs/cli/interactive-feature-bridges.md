# Interactive features in terminal and desktop dashboards

[Terminal dashboard](terminal.md) · [Desktop client](desktop.md) · [Voice chat](voice-chats.md) · [Browser tab control](browser-tab-control.md)

The terminal dashboard and the local Windows/macOS dashboard expose the same project operations. A feature that needs live media or rich input beyond a text terminal's capabilities may use a temporary browser surface in the terminal. The graphical desktop client presents that same feature directly in the relevant page or chat.

## Shared feature operations and client presentation

- The owning domain defines the target, authorization, start/attach/end operations, observed state and outcome. Browser control uses the selected browser tab and its ownership rules. Voice uses the open chat view's bound Book identity and its harness voice session. The [chat view](voice-chat-ui.md#the-chat-is-the-controller) supplies this target to the media presenter.
- The terminal presenter uses one reusable helper for creating a temporary server, authorizing one surface, observing attachment/loss and closing the server. The CLI process rendering the dashboard or standalone interactive view starts and owns that server in process. Each operation gets a separate listener and scoped access. Feature-specific media, inputs and controls plug into the helper.
- The desktop presenter embeds media and controls in the graphical client using the same domain operations over a trusted local client connection. It needs no terminal feature server, external browser window or duplicate feature state machine. An actual CLI view opened in the embedded terminal follows the terminal rules.

The temporary server has its own lifetime and works with the project HTTP API and browser dashboard disabled (`--no-server`). The engine's scheduling and lifecycle remain independent of the surface.

## Open one local surface

On explicit interactive entry, bind to loopback and let the operating system allocate a free port. Wait until the listener is ready, offer a clickable URL and open the system's default browser where supported. Keep the URL available in the owning terminal if automatic opening fails. Report **Waiting for browser** until an authorized page actually attaches. Expire unused invitations within a bounded time and issue a fresh one only on an explicit retry. Raw, redirected and noninteractive invocations do not launch a surface or wait for hidden input.

Use an unguessable, short-lived, single-use token in the launch link. An authenticated handshake by the actual page redeems it atomically and grants that page one live feature session without a login screen. Prefetches and link previews do not redeem it. Remove the bootstrap token from the visible URL after redemption, and never persist it in logs, diagnostic output, traces or project files. The original URL cannot attach another page. A still-live surface may recover a transient connection using its scoped session grant. A reload may recover only if the feature can establish continuity with the original owner and reject concurrent or stale owners.

Check the expected local host and origin, including media/input connections. Give the surface only this operation's endpoints and payloads. Isolate trusted controls from streamed website content, prevent cross-origin access, and use restrictive content, cache and referrer policies. Do not expose general project control, browser debugging endpoints, project API credentials or harness credentials through the temporary listener.

## Close the surface and release resources

On close, explicit end, owner exit or loss of the underlying feature, revoke the page grant, stop accepting inputs and release media, connections and the temporary port. Observe connection loss with bounded liveness as a fallback when page-close events are unavailable. A live but idle or backgrounded page remains usable. The domain decides what ending the surface means for the work. Voice ends its call. Browser control detaches the viewer without handing the tab back to automation.

## Local support and remote boundary

The terminal, engine and feature viewer are supported on the same computer. With a VPS shell, including SSH and browser-based consoles, the printed loopback URL refers to the host running the CLI. A public IP alone cannot reach a loopback listener. An operator-provided forward or proxy could make a port reachable if it preserves the access and origin checks. Such configurations are outside the supported flow. Public HTTP also lacks the secure context needed by APIs such as microphone and programmatic clipboard access. Future remote use belongs to the encrypted [remote App transport](../app/integration.md). [Secure Contexts](https://www.w3.org/TR/secure-contexts/) · [Clipboard API](https://www.w3.org/TR/clipboard-apis/)

## Acceptance outcomes

- Start voice and browser control from the terminal with `--no-server`. Allocate independent available ports and attach exactly one authorized page to each operation. With the desktop dashboard, open both features in place without starting the helper.
- Test manual opening, a preview fetching the link, simultaneous redemptions, duplicate tabs, wrong hosts/origins, an expired token and a retry. Only an authorized live owner can exchange feature data.
- Close the page/window, lose a connection and terminate the owning CLI. Verify bounded cleanup, no replay of stale input and the domain-specific end state. Keep a backgrounded live page open and verify it retains its session.
