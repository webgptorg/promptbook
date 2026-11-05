# Live control of a browser tab

[Browser tools](browser.md) · [Wallet](wallet.md) · [User control](../concepts/user-control.md) · [Terminal and desktop presentation](interactive-feature-bridges.md)

Let the user see and operate one real tab of the selected Promptbook browser profile. Stream the rendered tab live to the viewer and deliver the user's inputs back to that tab. Use the browser in its current headless or headful mode with the same profile and session. The interaction should feel like [Chrome Remote Desktop](https://support.google.com/chrome/answer/1649523) scoped to one browser tab.

## Entry and presentation

Wallet offers **Sign in manually** alongside its protected credential flow. It opens the actual login page in the browser/profile required by the request. Reuse the relevant tab when safe, or open a tab in the same profile. The user can enter credentials on the original website or complete additional fields, SMS/TOTP codes, phone approval, a displayed QR sign-in or a CAPTCHA. The Browser page can open control for a selected tab in the project's browser context through the same operation.

In the terminal, the [temporary feature server](interactive-feature-bridges.md) opens the tab viewer in the system browser. Wallet decisions and the handoff action remain in the controlling dashboard. In the desktop app, show the live view and the same trusted controls together on the relevant page. Promptbook's controls stay separate from the streamed page in both presentations.

Show the actual current URL and a simple trusted toolbar with an editable address field, Back, Forward and Reload. Let the user navigate away, follow redirects and continue browsing. An address change alone neither changes the original Wallet request nor transfers its authority to the newly opened site. Render the toolbar in the viewer and stream the tab content underneath it. Keep the viewer confined to the selected tab and its authorized control scope.

## Input and media

- Stream live video with low latency on the same machine. Adapt to viewport changes, map input coordinates to the rendered content and drop stale frames under backpressure while preserving the ordering of user inputs.
- Forward typing, keys and key combinations, pointer movement and hover, left and right clicks, text selection, scrolling and in-page dragging. Preserve site context-menu behavior and make normal tab-content actions accessible. Where a browser or OS intercepts a needed shortcut, offer an explicit way to send it. Support touch input on touch devices, including taps and scrolling. System gestures are outside the initial scope.
- Support copy and paste of text in both directions, including Ctrl+C/Ctrl+V and macOS Command+C/Command+V. Transfer clipboard contents only for an explicit user action. Use the viewer's actual clipboard permission or activation flow where required, and show an actionable result if denied or unavailable. Avoid background clipboard synchronization and keep contents out of diagnostics and evidence.
- Let user-initiated web downloads use the selected browser's normal handling, subject to its download policy. In-page dragging does not require host file drag-and-drop.

The first version carries video and tab inputs. Leave browser audio, file drag-and-drop, virtual USB and live agent collaboration as extension points. Native passkey dialogs, hardware keys, desktop capture and extension-specific UI are outside the first version. A passkey flow that only requires scanning a QR code displayed by the site can use the tab viewer.

## Exclusive control and handoff

Reserve the actual tab to one controlling user surface before showing the interactive stream. Enforce the reservation at the shared browser-control boundary for every connected engine, including queued input, navigation, close, inspection, screenshots and agent-facing JavaScript/CDP. Settle in-flight operations at a safe boundary before opening control and defer conflicting profile-wide operations. Other tabs and independent tasks can continue where they do not interfere. Where a browser path cannot enforce this boundary, surface the limitation before starting protected control.

Keep **Return control to agent** visible in the trusted controls throughout the session, alongside any Wallet save offer. Signing in, saving or declining a credential, changing focus and inactivity do not hand the tab back. A user may keep browsing as long as they need. Exclude the user-controlled interval from agent observations and traces, including video, inputs, clipboard and secret form data. Wallet may use narrowly scoped trusted evidence for sign-in verification and its protected credential offer.

An explicit handoff stops further user input to the tab and ends the live view. Before restoring agent access, ensure the returned tab exposes no residual protected inputs and discard the viewer's temporary media, input and clipboard buffers. Keep an unsafe tab protected and show why it cannot be returned. Release the reservation once the tab is safe to use. A duplicate or stale handoff cannot release a later reservation. Revalidate current access and the original service, account, permissions and session before releasing dependent Wallet work. Revalidate other suspended work against the current tab state and latest instructions before resuming. An unrelated sign-in, the wrong account or an expired session leaves the original access requirement unsatisfied.

Closing the surface or losing its connection ends streaming and discards unaccepted credential candidates. It does not perform a handoff. If the controlled tab still exists, leave its work intact and outside agent control. Show the detached state and let the user reopen control with fresh access, explicitly return the tab, or end their use of the tab without resuming its dependent operation. If the tab or browser disappears, report the interruption and recover the affected checkpoint without assuming authorization or replaying actions. An engine Stop still applies its normal lifecycle rules.

## Acceptance outcomes

- In headless and headful modes, open the original site in the intended profile, complete a form with extra fields, a QR or phone flow, a code and a human CAPTCHA. Verify editable URL, Back/Forward/Reload, shortcut and context-menu input, hover, selection, drag, scroll, touch and two-way text clipboard with permission allowed and denied.
- While two engines share a profile, take over one tab. Attempt queued and new agent input, inspection and trace capture against that tab. Keep independent tabs working. Browse away after login and leave the surface open in the background, including for a long session. Verify exclusive control stays with the user.
- Exercise explicit handoff, viewer close, connection loss and tab/browser loss. Only a valid handoff permits automation to take back the reserved tab. A mismatched account or stale session cannot release the original login-dependent work. Verify no residual protected inputs or stale actions reach the agent after handoff, and that independent work and usable profile cookies survive normal viewer closure.
