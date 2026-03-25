[🧪💬] Mocked Chats utility for Administration -> Utilities

-   *(@@@@ Written by agent)*

Overview: Add an "Utilities" section under the Administration menu (visible to all logged-in users) and implement the first utility: "Mocked Chats" — a small UI for creating, editing and opening saved mocked-chat presets in a new window for recording/showcase purposes.

-   Purpose: let any logged-in user create a deterministic, pre-sequenced chat (participants, messages, timings, colors, background) that can be opened in a new window using the existing Mocked Chat component for screen/video recording and demos. The live typing box in the opened mocked chat should append messages locally (for demo interaction) but must NOT overwrite the saved mocked preset.
-   Availability: add a new Administration -> Utilities menu item (non-admins included). Utilities will be a simple index page listing available utilities (start with Mocked Chats). The Mocked Chats editor and the open chat viewer are reachable from there.
-   Data storage: persist mocked chats per user using the existing arbitrary user-data saving system. (Use the existing service/utility used across the app for storing user-scoped JSON blobs; placeholder: @@@ — inspect and reuse the same API and types so mocked chats are stored as part of the user's data.) Each mocked chat record: id, title, description, participants (name, role, avatar/color), messages (author, text, timestamp offset), metadata (timing/speed presets, chat color/theme, background), createdAt, updatedAt.
-   Two parts:
    -   Creation & editing UI (inside Agents Server)
        -   Simple editor page with list of user's mocked chats (My Mocked Chats) on the left, editor on the right.
        -   Create, duplicate, rename, delete, and save operations. Autosave optional - initially provide explicit Save + Save as New.
        -   Message editor supports: add message, reorder messages (drag & drop), set message timestamp offset or relative delay, choose participant for each message, mark message as "system" or "bot" if needed (@@@ for exact roles).
        -   Participant editor: add participant, name, avatar/icon, bubble color, optional background image/color for the whole chat, typing avatar.
        -   Metadata editor: global timing presets (fast / normal / slow), loop/replay options, viewport size presets for recording, show/hide timestamps.
        -   Persist to the user data store under a new key namespace e.g. mockedChats.v1 (final key name to be decided).
    -   Showing & opening the mocked chat (new window)
        -   Each saved mocked chat can be opened in a new browser window/tab (target=_blank) which renders the Mocked Chat component with the mocked chat data passed in as props.
        -   Use the existing Mocked Chat component (component path: @@@ — locate and import it). The Mocked Chat must receive the timing metadata and participants/colors/background.
        -   When opened, render the Promptbook header bar but do not render the My Chats tray. Replace the left tray with a minimal "My Chats" list component that shows only mocked chats (from the user's mockedChats store) — this allows quick switching between mocked chats while recording.
        -   Behavior: the Mocked Chat plays the preset messages (simulated arrival by using the stored timestamp offsets). If user types in the chat input in this opened window, their input is appended to the displayed conversation but does not alter the saved mocked chat.
-   UI/UX constraints
    -   Keep the editor and viewer simple and predictable — low friction for recording. Follow current Promptbook styling and accessibility patterns.
    -   The opened window must be distraction-free; include the Promptbook header bar only (logo, back, user controls), not the full site chrome or My Chats tray.
    -   Provide a clear "Open in new window" CTA in the editor and in the mocked chat list.
-   Implementation notes & files to change (initial list — refine while implementing):
    -   apps/agents-server/src/app/administration (create or extend): add Utilities route and menu entries @@@
    -   apps/agents-server/src/app/administration/utilities (new folder): index page listing utilities and link to Mocked Chats editor
    -   apps/agents-server/src/app/administration/utilities/mocked-chats (new folder): editor page, list, detail editor, and open-in-new-window link
    -   apps/agents-server/src/components/Header (ensure header is usable in the opened window and can hide the My Chats tray) @@@
    -   apps/agents-server/src/components/MyChats (or wherever My Chats tray is implemented): add a mode to only show mocked chats or hide completely in new-window mode @@@
    -   apps/agents-server/src/utils/userData (reuse existing saving/loading helpers) @@@
    -   Use existing Mocked Chat component: locate and import from @@@ (it already exists in the project; wire its props so timing/participants/colors/background are passed through)
    -   tests: add basic integration tests for create/save/open flow (Playwright or unit tests) in apps/agents-server/tests or playwright config
-   Security & permissions
    -   Utilities must be visible to all logged-in users. Mocked chats are saved per-user and are only accessible by that user unless a later sharing feature is added.
    -   Input should be sanitized and validated before saving.
-   Acceptance criteria
    -   A new "Utilities" item appears under Administration for all logged-in users.
    -   Users can create, edit, save, duplicate, delete mocked chats; data is saved in the user-data system.
    -   Users can open any mocked chat in a new window where the Mocked Chat component plays the scripted messages according to timings and shows customized participants/colors/background.
    -   The opened mocked-chat window shows the Promptbook header bar but not the full My Chats tray; it shows a minimal My Chats which lists only mocked chats (created by user).
    -   Typing in the open mocked chat appends messages locally but does not modify the saved preset.
-   Future enhancements (out of scope for first iteration)
    -   Share mocked chats between users or export/import JSON presets
    -   Add timeline scrubbing, precise timestamp editing, or VTT export for video captions
    -   Add CLI or scheduled playback for automated recordings

Notes / questions / placeholders — please provide the following to finalize implementation:
-   Exact path of the existing Mocked Chat component and its prop signature (I put @@@ where unknown).
-   The exact utility of the current user-data saving API (file/service path) so I can store mocked chats alongside other user data without introducing new storage layers (@@@).
-   Any design assets for participant avatars, background images and header variants if desired.

This PRD file will be committed to prompts/ and used as the implementation source. After you confirm the placeholders above I will update the PRD and push any follow-ups.

```
[🧪💬] Mocked Chats utility for Administration -> Utilities

-   Add an "Utilities" section under Administration and implement Mocked Chats: create/edit/open mocked chat presets in a new window using existing Mocked Chat component. Persist per-user via existing user-data store. Opened window shows Promptbook header only and a My Chats list limited to mocked chats. Typing appends locally and does not change preset.

This commit was done by [Promptbook Agent](https://pavol-hejny.ptbk.io/agents/E1upys74QBME7s/)
```