[x] ~$0.5356 an hour by OpenAI Codex `gpt-5.3-codex`

[🧪💬] Mocked Chats utility for "System" -> Utilities

Overview: Add an "Utilities" section under the "System" menu (visible to all logged-in users) and implement the first utility: "Mocked Chats" - a small UI for creating, editing and opening saved mocked-chat presets in a new window for recording/showcase purposes.

-   Purpose: let any logged-in user create a deterministic, pre-sequenced chat (participants, messages, timings, colors, background) that can be opened in a new window using the existing Mocked Chat component for screen/video recording and demos. The live typing box in the opened mocked chat should append messages locally (for demo interaction) but must NOT overwrite the saved mocked preset.
-   Availability: add a new System -> Utilities menu item (non-admins included). Utilities will be a simple index page listing available utilities (start with Mocked Chats). The Mocked Chats editor and the open chat viewer are reachable from there.
-   persist mocked chats per user using the existing arbitrary user-data saving system
-   Two parts:
    -   Creation & editing UI (inside Agents Server)
        -   Simple editor page with list of user's mocked chats (My Mocked Chats) on the left, editor on the right.
        -   Create, duplicate, rename, delete, and save operations. Autosave optional - initially provide explicit Save + Save as New.
        -   Participant editor: add participant, name, avatar/icon, bubble color, optional background image/color for the whole chat, typing avatar.
        -   Metadata editor: global timing presets (fast / normal / slow), loop/replay options, viewport size presets for recording, show/hide timestamps.
        -   Persist to the user data store under a new key namespace e.g. mockedChats.v1 (final key name to be decided).
    -   Showing & opening the mocked chat (new window)
        -   Each saved mocked chat can be opened in a new browser window/tab (target=\_blank) which renders the Mocked Chat component with the mocked chat data passed in as props.
        -   When opened, render the Promptbook header bar but do not render the My Chats tray. Replace the left tray with a minimal "My Chats" list component that shows only mocked chats (from the user's mockedChats store) - this allows quick switching between mocked chats while recording.
        -   Behavior: the Mocked Chat plays the preset messages (simulated arrival by using the stored timestamp offsets). If user types in the chat input in this opened window, their input is appended to the displayed conversation but does not alter the saved mocked chat.
-   UI/UX constraints
    -   Keep the editor and viewer simple and predictable - low friction for recording. Follow current Promptbook styling and accessibility patterns.
    -   The opened window must be distraction-free; include the Promptbook header bar only (logo, back, user controls), not the full site chrome or My Chats tray.
    -   Provide a clear "Open in new window" CTA in the editor and in the mocked chat list.
-   Security & permissions
    -   Utilities must be visible to all logged-in users. Mocked chats are saved per-user and are only accessible by that user unless a later sharing feature is added.
    -   Input should be sanitized and validated before saving.
-   Acceptance criteria
    -   A new "Utilities" item appears under System for all logged-in users.
    -   Users can create, edit, save, duplicate, delete mocked chats; data is saved in the user-data system.
    -   Users can open any mocked chat in a new window where the Mocked Chat component plays the scripted messages according to timings and shows customized participants/colors/background.
    -   The opened mocked-chat window shows the Promptbook header bar but not the full My Chats tray; it shows a minimal My Chats which lists only mocked chats (created by user).
    -   Typing in the open mocked chat appends messages locally but does not modify the saved preset.
-   Future enhancements (out of scope for first iteration)
    -   Share mocked chats between users or export/import JSON presets
    -   Add timeline scrubbing, precise timestamp editing, or VTT export for video captions
    -   Add CLI or scheduled playback for automated recordings
-   Use existing `MockedChat` component for rendering the chat in the new window, passing the mocked chat data as props.
-   You are working with the [Agents Server](apps/agents-server)
