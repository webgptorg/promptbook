# Unreleased

## Contribution instructions

- Remove the blanket prohibition on committing changes from `AGENTS.md`.

## Windows installer preparation

- Fix the Inno Setup case fallback so the installer compiles on Windows. Keep isolated prerequisite checks focused on project creation, allowing PowerShell's own profile cache, and explicitly load the shell's utility module for Windows PowerShell 5.1 download/archive fixtures.
- Detect usable Node.js/npm and Git before installation and show what is already available and what must be installed. Keep prerequisites mandatory and move Codex/Claude Code installation out of the Windows component list into ordinary project setup.
- Keep preparation and its animated progress inside Setup, capturing PowerShell output without opening console windows. Show the actual failure stage, error, retry action and diagnostic file in the installer, including unexpected script exceptions.
- Reuse a previously prepared private Node.js runtime even when Setup inherits a stale PATH. Enable TLS 1.2 for Windows PowerShell downloads, retry transient failures, retain checksum verification and validate clean-user runtime preparation in the Windows checks.
- Extract verified Node.js archives through literal Unicode paths instead of PowerShell's wildcard-sensitive destination handling. Stage extraction privately, preserve an earlier runtime during repair and clean incomplete extraction files.

## Complete hosted release validation

- Run the complete project check in every required Node 22/24 Linux, macOS and Windows matrix job, including behavioral and package checks, before the publication workflow can proceed. The matrix previously ran only the light type check.
- Propagate browser-pool lock filesystem errors instead of treating a missing, read-only or full runtime directory as contention and retrying forever during shutdown or validation.
- Preserve scheduler wake-ups received during evaluation so account fallback, resumed work and task changes cannot sleep until an unrelated later event. Respect Windows `Path` when caching harness capabilities, and make fixture path/Unicode assumptions explicit. Allow forty minutes for the complete hosted matrix without reducing coverage.
- Gate concurrency fixtures on the actual acquisition of all independent workers rather than assuming every OS starts them within a short sleep; keep assertions for overlapping execution and isolated result commits.
- Release a shared-file fixture's first owner only after the service observes the competing claim waiting. Verify cancellation recovery against that task's actual retained paths, including their tracked contents, while independent Health/report work continues.
- Disable optional Git index refresh in fixture observations, matching the engine's read behavior. Polling for a clean tree cannot take an index-writing lock and interrupt the very commit being observed; a real-index regression preserves its bytes across an unchanged-file status read.
- Verify panic's control-only persistence at the actual stop boundary and on an idempotent repeat, preserving checkpointed partial files. Do not require a clean tree after explicitly restarting and force-stopping fresh task work; keep the owned-process termination, registration, authority and no-false-completion checks.
- Replace streamed chat updates atomically so concurrent readers always retain the accepted conversation, including during force-stop recovery. Retain the last snapshot, working-tree changes and service events when a restart fixture cannot settle.
- Retain a cancelled task's recovery checkpoint without reserving its agent or restarting its work. An explicit reopening restores its partial-file ownership, including after a service restart, so those files do not incorrectly block its continuation as unrelated changes.
- Reserve Router prerequisites before publishing their files to concurrent work, transferring protection to their executing unit. Attribute only changes still pending in Git: withdrawn untracked files and files another unit already committed never become phantom deletions that leave a task retrying an impossible pathspec.
- Preserve versionable dangling symlinks when excluding withdrawn untracked helper files from task snapshots.
- Add the Windows bootstrap/CLI initialization instructions after verifying the installer even when the extension publisher created their shared GitHub Release first; preserve existing release notes.

## Experimental project sounds and desktop notifications

- Add one shared **Sounds & notifications (experimental)** control, **Ctrl+N**, in project terminal dashboards, standalone chat, editors and protected Wallet prompts. It starts Off, follows the last-used live client and resets when the final client leaves or the engine restarts. Other projects, init, global dashboards and raw output stay independent.
- Coordinate event consumption in the owning engine, with leased shared runtime coordination for standalone chats when no engine is running. New human-needed calls across the project can alert once after ten seconds without input; suppressed events, old backlog, reconnects and handoffs are never replayed. Navigation, saved sends and reply starts use bounded subtle cues.
- Support quiet generated local audio, native macOS/Windows notifications and available Linux helpers. Probe Kitty's notification protocol through the actual terminal, including SSH, before using it; correlate notification clicks to still-live sources. Native helper submission does not claim verified OS delivery or exact-tab activation, and remote server audio is never presented as local sound.

## Project lifecycle and attention in terminal titles

- Prefix project dashboard and standalone chat titles with running, pausing, paused, stopping, stopped, attention or unknown markers. Seen chat/Wallet requests cease contributing without releasing their waits; actionable Health incidents retain their warning.
- Share one monotonic render/animation clock between the dashboard and title, including nested views. Respect reduced motion, title opt-out and output backpressure; the global title keeps its existing form.

## Explicit User pings and shared seen state

- An accepted agent message with the active `+@User` / `+{User}` prefix invites the human to the chat once and pings it as a new attention occurrence; plain mentions, code, quotes, escapes, examples and streamed progress stay passive. Structured task questions are posted as an explicit ping, and an agent reply that pings waits for the user. The human is never invited as an agent.
- Seen and resolved are separate, project-shared and durable (`.ptbk/state/attention.json`, never committed): a pinged message displayed during active viewing (terminal chat or browser) is seen in every client and after restarts, while its question keeps waiting. A saved response or the chat leaving `waiting-for-user` resolves it. A question written before pings existed is one implicit occurrence. A task waiting for that chat or Wallet request follows the same seen state.
- Snapshots list the unseen pings (`chats.pings`); `POST /api/chats/<name>/seen` and the `chat-seen` control method record what was displayed.
- Seen unanswered questions stay seen without expiry. Slow or hidden terminals acknowledge only frames actually displayed, and background browser tabs do not acknowledge a preloaded conversation.
- Preserve each browser conversation's scroll position during refresh, and acknowledge visible calling messages when real input resumes. Shared seen or answer outcomes also withdraw any attention effect that has not yet been delivered.
- Remove the earlier deferred scroll-to-bottom callback so seen-state refreshes retain the actual calling message in view; verify list, offscreen, long-message and post-refresh behavior in a real browser fixture.

## Wallet Mark as seen and Reject request

- Pending Wallet requests offer **Mark as seen** (the alert ends; the request keeps waiting with its fields, step and work) and **Reject request** (the request ends; the waiting work is told truthfully that nothing was provided and does not resume as signed in). Opening the Wallet page does neither. Both name the step the owner saw, so a request that moved to a new step meanwhile is not changed.
- A new step of a request (another problem or other fields) asks for attention again; the same step asked again keeps its seen state. A rejected request is not recreated or alerted on the same work's next retry (for 12 hours), while other work may still ask. `wallet-dismiss` remains as the earlier name of Reject request.

## Windows packaging icon

- Keep graphical default focus identical to terminal focus when a preferred choice is disabled.
- Use the existing 256px transparent product logo for the Electron ICO container; preserve the source PNG bytes and validate its dimensions before packaging. The original 48px installer icon was insufficient for Electron metadata.
- Disable implicit Electron publication; the existing versioned Inno release flow remains the only Windows publisher.

## Desktop completion and verification

- Preserve shared rich text, long pasted blocks, ordered attachments and clipboard images in graphical init; keep the first enabled default choice and remove terminal styling from presentation labels.
- Attach the exact initialized project after the original CLI reports successful setup/start, without guessing from registry changes or launching another engine. Bound native-terminal delivery with renderer acknowledgements.
- Make every Windows desktop check fail independently and retain the candidate installer as a CI artifact. Document local development and packaged end-to-end checks.

## Windows desktop installation and release checks

- Offer engine/CLI, a default-selected desktop controller and optional Codex/Claude installations. Preserve prerequisite verification and CLI-only handoff; desktop completion opens the shared initializer and sign-in startup opens only the tray.
- Package the desktop at the root release version, include it in the existing Inno installer and exercise the packaged Windows executable in CI without paid providers. Desktop removal preserves engine/project installations.

## Optional local desktop client

- Add a Windows-first Electron tray/controller with independent windows, the existing graphical dashboard, shared global controls and actual xterm/node-pty CLI attachments. Window closure leaves project engines and per-project supervision unchanged.
- Render the same init prompts graphically with shared rich-input payloads, native sign-in in the embedded terminal and direct CLI page fallback. Keep the separate system Node/CLI runtime outside Electron and preserve headless npm dependencies.
- Add focused controller validation tests and a packaged Windows end-to-end fixture covering multiple windows, native terminals, init cancellation and engine survival.

## Shared desktop initialization presentation

- Let attended desktop CLI children render the original init prompts through a private authenticated loopback transport, with the same validation, Back/Cancel, complete attachment payloads and native-terminal fallback. Ordinary CLI/headless input is unchanged; presentation credentials never enter persisted service environments.
- Add `ptbk dashboard --view <page>` for direct page attachment without starting or changing the engine, using the normal page loaders.

## Local desktop control contract

- Specify an optional Windows Electron client with independent windows, a login-started tray, the existing per-project supervision and explicit host-wide quit semantics.
- Keep CLI first, including future features, and require one initializer with graphical prompts plus actual native terminals for login and session attachment.
- Define default-selected desktop and optional Codex/Claude installer components without changing npm/headless operation.

## Consistent ptbk naming

-   New projects use `<home>/ptbk/project/`, including the Windows installer and Ubuntu setup. Existing folders are not moved or migrated.
-   Dashboard labels, terminal/browser titles, documentation and release-video captions use `ptbk`. Technical identifiers, environment variables, headers, trailers and historical commit parsing keep their established casing.

## Licensing information and commercial proposal

- Link the README and distribution notice to the bilingual engine licensing page, which distinguishes existing rights from the non-effective commercial and continuity proposal.
- Preserve the existing BUSL notice offline and all earlier valid grants. This documentation change does not adopt a new licence, change package SPDX metadata, or silently grant unrestricted commercial self-hosting.

## Specification: project attention, sounds and desktop notifications

-   Specified explicit `+@User` / `+{User}` invite-and-ping behavior for chat, task and TEAM questions, with durable shared seen state separate from unanswered work. Wallet actions are named **Mark as seen** and **Reject request**; Health keeps its own resolution/override rules.
-   Specified one temporary project-wide experimental sounds/notifications switch across dashboards and standalone chat, last-used-client ownership, ten-second activity suppression, no historical/delayed alert replay and capability-aware activation/SSH support. Defined lifecycle/attention title markers and one shared animation scheduler.
-   Aligned the related contracts and acceptance scenarios; recorded macOS sleep-prevention research separately as deferred work. Initialization/global notification behavior remains excluded. This change updates specifications only; it does not implement sounds, notifications, User pings or power management.

## Release video 0.119.0-47

-   Published https://www.youtube.com/watch?v=jdSEZ5OJEho on the owner-selected personal channel and verified public Studio status and watch-page playback. Prepared a factual, caption-only release video on external-action impact, batch totals and aging priority, using the immutable npm-matched revision and a disposable synthetic fixture. Preserved reproducible sources and 11 passing release tests under `releases/videos/0.119.0-47/`; publication state and receipts are recorded there.

## Release videos: discover the next published version

-   Checked all published npm versions, including prereleases, and queued one ordinary Release Video task for `0.119.0-47`, preserving registry metadata, matching Git revisions, the published `0.119.0-45` baseline and the owner's recurring authorization. No `0.119.0-46` publication exists in the observed registry.
-   Saved discovery and duplicate-reconciliation evidence under `releases/videos/0.119.0-47/status.md`. The already published `0.119.0-45` remains with its initial task; discovery performed no upload and added no scheduler.

## VS Code: visible reference colors

-   `@Name` and `{Full Name}` references now use the active theme's link color independently of semantic token styling, including `FROM @Adam`. Colors update while editing and when showing another file or a split editor; code, escaped lines and emails stay literal.

## External activity log: find what mattered in a long history

-   The Action log tile and page are now the **External activity log**, in the terminal and the browser.
-   It opens on the actions that matter most: a smart order that weighs impact against age, losing one impact point per 30 days. You can also sort by time or by impact, and saved impact itself never decays.
-   Choose the default view with collapsed batches, a fully ungrouped list, or summaries by task or by agent, and press Enter to go down a level. A task under an agent lists only that agent's actions, each action is counted once, and operations without a task stay in their own branch.
-   A 1,000-email campaign appears as one row with its aggregate impact and its counts of each outcome, never a claim that everything succeeded. Opening it shows every separate record.
-   Rows below impact 1 are hidden after aggregation, so ten impact-0 actions still form a visible impact-1 group. **Show all** removes the cutoff in any view, and actions with unknown impact stay visible in their own labelled place, with no invented number.
-   Filter by outcome to get a subtotal labelled as filtered. Back or Escape returns one level with your selection kept, and arrivals do not move you.
-   A record's detail shows what was done, the reason for its estimate, the methodology evidence, its attempts and verified links to the task, evidence, harness session and receipt. You can also reach a task's activity from the task itself (`O` in the terminal, **External activity** in the browser).
-   Clients read `GET /api/actions/view` with `grouping`, `sort`, `showAll`, `outcome`, `agent`, `task`, `batch`, `offset` and `limit`. Viewing only reads saved records and a rebuildable cache: it never retries anything, calls a model or commits.

## External actions: impact, failed attempts and bulk operations

-   Each external action now carries the executing agent's own impact estimate and short reason: the consequence if it succeeds, whatever its outcome, as a number on a decimal logarithmic scale that can be fractional or above 6. "Unknown" is a separate answer, never treated as 0, and records from before this release stay unknown without being rescored.
-   Meaningful attempts that fail, such as a refused payment, and reads that change something, such as opening an email that marks it read, are now recorded. The outcome names are `success`, `failed`, `pending`, `partial`, `uncertain` and `not-performed`; earlier `confirmed` records read as `success`.
-   Retries of one intended action stay one record with an attempt count. Two effects that really happened stay two records and can reference each other.
-   One bulk operation, such as a 1,000-email campaign, keeps one record per recipient and marks them with a shared group. Their records are saved at once and share one commit within about 15 seconds, at the end of the task or at a graceful stop, so history is not flooded and a crash loses nothing.
-   Each record states which methodology the estimate relied on: source URL, release, hash and retrieval time, or that the source was unavailable, plus the local Book revisions. A copy of the methodology is kept in `actions/.methodology/`, so a later change of the remote source cannot erase that evidence. A changed estimate stays attributable, with the original kept in the record's history.
-   Fixed: records of the engine's own operations under `actions/.engine/` were saved but never listed.

## Knowledge: a Book can reference shared knowledge by URL

-   `KNOWLEDGE <url ending in .book>` now loads that Book as knowledge through a cached snapshot under `.ptbk/knowledge/`. Only its `RULE` and `KNOWLEDGE` text counts: it never registers or runs another agent, adds teammates or changes a model, and it grants no authority.
-   Task turns receive the text. Chat replies and consultations get its source, release and hash with where to read it, so the source is not loaded into every request.
-   The latest URL is revalidated at most hourly, an immutable release such as `.../1.0.0.book` is never requested again once held, and a new release reaches the next task attempt without a new engine.
-   During an outage the verified earlier content stays in use and is labelled as a cached copy. An unavailable source is stated plainly, and agents are told its rules were not applied. Set `PTBK_KNOWLEDGE_SOURCES=off` to stop retrieving, keeping what is already held.

## Expert and Teacher: your project's Adam now reaches them too

-   Expert now builds on your project's own Adam and adds the running engine's expertise on top. Teacher, and any local specialization of Expert, receive your project's rules and knowledge through it. Two projects with different Adams therefore have different effective Experts on the same engine.
-   `Adam -> Expert -> Adam` is reported as an inheritance cycle. If a project has no Adam yet, Expert stays usable to repair it and says that Adam is missing, without substituting another one.
-   New and unchanged Adams now reference the shared impact methodology through `KNOWLEDGE https://ptbk.io/book/external-action-impact.book`, with a rule saying when to apply it. A customized Adam is left as you wrote it, and removing, pinning, replacing or inlining the source survives later updates.
-   Fixed: an older unchanged core Book could lose template rules during an update, because it could merge against a newer template than its own and read the rules it never had as your deletions.

## Release videos: a dedicated agent and ordinary recurring discovery

-   Added the editable Release Video agent for the owner's authorized personal-YouTube release videos, starting with 0.119.0-45, and an hourly ordinary task that discovers published versions and queues one publication task per version.
-   Added release evidence, a reproducible invitation-parser demonstration and sources for the first caption-only video. After the owner selected the channel and completed access, published 0.119.0-45 on Pavol Hejný's specified channel (`UCH76EQk6XKI6WF7k_Pdh2GA`): https://www.youtube.com/watch?v=lMl8T_zR2hs. Verified public visibility in Studio and playable watch-page metadata; retained the publication receipt and earlier access history.
-   Documented per-version ownership, Studio/action-record reconciliation and confirmed video receipts to prevent duplicate uploads after retries or restarts. Preserved the source conversation and added the agent as a participant.
## Git: Wallet operations stay out of project history

-   Wallet changes, imports, recovery-word replacement and reset no longer create metadata-only Git commits. Account labels and service URLs stay out of commit messages.
-   Remove the Wallet audit setting, pending queue and retry mechanism, and the Git helper for intentional empty commits. Ordinary scoped commits still record changes to versioned files, including external-action records.

## Windows installer

- Fixed a release blocker: the Windows check still expected the wording from before the private Node.js runtime, so it failed even though the installer was right, and that failure stopped publishing. A new test on every platform now compares the two.
- Automatically prepare a verified private Node.js runtime when Node or npm is missing or incompatible, retaining existing tools.
- Add Promptbook branding, license acceptance and Start menu entries for Promptbook and ptbk.
- Report incomplete setup on the final page and through a nonzero installer exit code.


## VS Code: reference navigation and occurrence highlighting

-   Ctrl+click/Cmd+click, F12 and Peek Definition use the full `@Name` or `{Name}` reference as a link and select the target agent, task or chat name, including changes in open and newly created Book files.
-   Selecting a reference or its declaration highlights equivalent names in both reference syntaxes, using the engine's case, accent and separator normalization. Reference colors follow the editor theme; code, escaped lines and emails stay literal.

## Releasing: publish the extension alongside npm

-   After all release checks pass, npm publication and the VS Code extension run in parallel. The Windows installer still waits for npm because its bootstrap verifies installation of the exact published version.
-   Both asset publishers tolerate the other creating the GitHub Release concurrently. An unrelated release lookup error still fails instead of being treated as a missing release.

## Chats: work can move to another agent

-   Asking a chat to give a task to someone else moves it: the previous agent stops at its nearest safe point, and the new one takes over only once it is free, so a task never has two owners and no agent holds two tasks.
-   The new agent starts its own session and continues from the partial work. The earlier agent stays in the task's Book, and the new session shows which one it replaced.
-   A name that matches no agent is refused and nothing changes. Moving only later occurrences of a recurring task is not supported yet and is refused with an explanation.

## Harnesses: Cline is no longer a supported harness

-   Cline can no longer be selected or added, and it is gone from the harness lists in help and setup.
-   A `CLINE` record already in `ptbk.json` stays there as written, and Promptbook says plainly that it is no longer supported and how to remove or replace it. Promptbook never swaps in a different tool on its own.

## Chats: ask about, change, cancel or follow existing work in plain words

-   Chatter can now look up what is going on, change running or finished work, accept a partial result, cancel work, stop a recurring task and tell you when something is done, without you naming tasks, agents or sessions.
-   Each change is appended to the task's Book, and the dashboards and the chat show separately whether it is Saved, Delivered or Applied, or why it is waiting.
-   A running turn is interrupted at its safe point and continues with the change; a pause or a person controlling that session holds delivery back, and a task never records a result against instructions that have since changed.
-   Cancelling keeps the Book, prior results and any partial changes, and is never reported as success; asking about status or to be told when something is done changes nothing.

## Harnesses: every agent session is visible, and you can deliberately step into one

-   The Harnesses tile and page replace Current work in the terminal and the browser: they list every open harness session, including idle ones, with its agent, task or chat, state, tool, billing path, model and usage; ended sessions stay available as evidence, not as live work.
-   Selecting a session always opens the same read-only detail, even when its harness has no client to open.
-   Entering a session asks first: Do not enter is the default, Watch only uses the read-only view, and Control offers an exclusive takeover of that one session while other work continues.
-   Work interrupted by a pause now continues in its own harness session, keeping its context, where the installed harness release supports it.

## Pause: task work stops at its nearest safe point and chats keep working

-   Pausing or stopping the engine now interrupts running task work at the nearest safe point and keeps its checkpoint, instead of waiting for it to finish.
-   An operation that cannot be interrupted is shown as settling until it reaches its own boundary; nothing new starts meanwhile.
-   Chats keep answering during a Pause, and stopping from Pause does not wake suspended work.

## Work: the limit of five things at once is gone

-   Promptbook no longer has a shared limit on tasks and chats running at once. Each agent still works on one started task at a time and can answer any number of chats, so six agents, or more, can work together
-   Screens show plain counts of active, waiting and queued work, with no "3/5" figure. Work that has to wait now says why: its agent is busy or another run is changing a file it needs
-   A saved `execution.maxConcurrentWork` no longer limits anything. `ptbk lint` reports it as obsolete without changing the file, and the next configuration migration removes it and records its old value

## Chats: +@Name brings an agent in, and a plain @Name only refers to it

-   In a chat message, `+@Adam`, `+{Adam}` or `+{Frontend Developer}` invites that agent if needed and asks it to reply. An agent that is already a member is not added twice
-   A plain `@Adam` or `{Adam}` no longer changes who replies or which question an answer goes to, even when Adam is a member
-   The plus only counts at the start of a message or after a space or opening bracket, so `x+@Adam` does nothing. It also does nothing inside code, quotes, escaped text or examples
-   A `+` in front of an unknown name, a task or a chat refuses the message and saves nothing, so you can correct it and send it again
-   Several agents addressed in one message each answer in turn. One message never answers more than one waiting question, and a restart carries on with the same agents without reading old messages again
-   An agent in a chat can now invite another agent when you ask for it in words, using the same operation
-   The VS Code extension treats `+@Name` as the same reference, with the plus outside the name, and knows `TASK CHANGE` and `TASK REOPEN`

## Tasks: a task can be changed, reopened or cancelled by appending to its Book

-   A new `TASK CHANGE <timestamp> <task|occurrence|future> [<chat>]` line adds an amendment under the original instructions, which stay in the Book. Agents receive only the amendments that apply to their run: an `occurrence` change ends with that run, and a `future` change waits for the next run
-   Scheduling values under a `TASK CHANGE`, such as `TASK AGENT`, `TASK PRIORITY`, `TASK AFTER`, `TASK DUE DATE` and `TASK REPEAT`, replace the earlier value while the earlier line stays. Two different values with no change between them are still reported as a conflict, and an invalid new value keeps the old one
-   A new `TASK REOPEN <timestamp> [<chat>]` line starts the same task again and keeps its earlier `TASK DONE` lines as history. `TASK STATUS todo` alone no longer looks like a way to reopen finished work
-   `TASK STATUS` now also accepts `cancelled`, which ends unfinished work without counting as success, so tasks that depend on it keep waiting. `TASK STATUS` can be repeated, and the last valid value counts
-   A recurring task can drop one run by cancelling it under an `occurrence` change, and its schedule carries on. One finished run can also be reopened, which reuses that run instead of adding another

## Wallet: adding a website login in the terminal can finish again

-   The dashboard's form for adding a website login could never finish. At its last step, the optional additional fields, leaving the field empty was refused with "A value is required", and Esc discarded the whole login with the typed password. An empty field now finishes the form and saves the login. Logins saved in the browser were not affected

## Tools: the model endpoint is chosen from a list

-   Changing a harness tool's endpoint in the terminal now shows a list, Default, Official, Local or Another base URL, with only what that harness can reach. Before, you had to type a word or a URL and nothing showed which were valid
-   Choosing Official, here or with `--base-url official`, now saves that choice. Before, it was treated like Default and nothing was saved

## Pickers and composers: the mouse now works in the terminal

-   Wizard pickers, toggle lists and the dashboard's new-chat picker now take clicks and the wheel. In a single-choice picker, a click focuses an option and a click on the focused option confirms it, so a stray click cannot choose anything. In a checkbox list or toggle list, a click toggles the option. The keyboard works as before
-   Clicking in a composer places the cursor: wizard text steps, chat and the Book editor. A click never submits
-   While one of these has focus, selecting text or scrolling back in the terminal needs a modifier, usually Shift, or Option on macOS. Set `PTBK_TERMINAL_POINTER=off` to keep the terminal's own selection and scrollback. Dashboard pages and tiles do not take the mouse, so selection there works as usual
-   Windows consoles stay keyboard-only unless you set `PTBK_TERMINAL_POINTER=on`
-   The chat composer now shows its cursor. Before, it had none, so you could not see where typing would land
-   Answers an agent offers in terminal chat are now a selectable list: with an empty composer, ↑↓ choose and Enter sends, and a click focuses and a second click sends. Before, only the first nine could be chosen, by number, although an agent may offer up to 50. The number keys still work, and a draft is never lost to a choice
-   Messages in chat and the Book editor, such as "Not sent: …" or "Not saved: …", now have their own line. Before, they came after the long key legend and were cut off at common terminal widths, so a failed send or save could go unseen
-   Moving the cursor inside a long text no longer scrolls it. Before, moving up kept the cursor pinned to the bottom row of the field

## Files: the terminal dashboard shows images where the terminal can

-   Opening an image on the Files page now displays it in terminals with an inline image protocol: iTerm2, WezTerm and mintty (PNG, JPEG, GIF and WebP) and kitty and Ghostty (PNG). Before, every terminal only said that the browser dashboard shows the image
-   Other terminals keep showing the file's type and size. So do tmux and screen, which do not pass images through. An unsupported type or an image above the existing 4 MiB limit gets a note saying why it is not shown, and a GIF is not played under reduced motion
-   VS Code's terminal shows images only with its `terminal.integrated.enableImages` setting, which ptbk cannot see. After you turn that on, set `PTBK_TERMINAL_IMAGES=iterm`. Set `PTBK_TERMINAL_IMAGES=off` to turn images off in any terminal
-   The image is sent once and again only after its area was repainted, for example after a resize, so live updates stay light. Only base64 image data reaches the terminal unfiltered

## Usage: calculated costs now use real current prices

-   The engine now reads each harness's current token prices once a day and keeps them under `.ptbk/pricing/`. Before, nothing ever downloaded a price list, so the Usage page could never show a calculated API cost or a token-price equivalent outside hand-written fixtures
-   OpenAI Codex, Claude Code, Gemini CLI, Qwen Code, Cline and OpenCode each name the provider sections they are billed under, in the public [LiteLLM price catalog](https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json). GitHub Copilot bills requests rather than tokens, so its usage stays unpriced instead of getting invented rates. A model the catalog does not price in plain per-token rates also stays unpriced, for example tiered models
-   A new observation is saved only when the rates changed. Earlier usage keeps the rate of its time. Usage from before the first observation is labelled as an estimate
-   The download runs in the background and contains no project data. An unavailable list records nothing, logs one note and is retried after three hours. It does not delay work or touch usage. Set `PTBK_PRICE_LISTS=off` to switch it off, or to a URL to use another catalog with the same format

## Init: selected Wallet logins can be tested before the project is created

-   After you choose logins from a Bitwarden export in `ptbk init`, you can test them with a real sign-in, using the same check as **Test** on the Wallet page. The question defaults to No
-   Each test runs in a temporary browser outside the project folder, which is removed afterwards. Nothing is written into the project before the final confirmation, and your browser sessions are untouched
-   You see each step and can enter a one-time code in a protected input. Esc or an empty code stops that test
-   Every saved login keeps its result. One that was refused or could not finish stays unverified, and init's final notes give the reason

## Wallet: a credential test looks for an emailed code itself before you have to copy it

-   When **Test** reaches a one-time code step, a short session of Fixer now looks for the code in what agents can already read, such as a signed-in webmail in the project browser. A code it finds is entered once and the test continues without you
-   The protected code input stays open while it looks. Entering the code yourself ends the search, and when it finds nothing the test simply keeps waiting for you. If the website refuses a found code, the test asks you for the current one
-   The session only reads, gets no Wallet access and never asks you anything. The code is kept nowhere. It is not a task or a chat and adds no trace folder or commit
-   Its usage counts in the project's usage as `wallet-test` work and is stored in ignored local runtime storage (`.ptbk/usage/usage.jsonl`)

## Wallet: agents create and change logins with a generated password they never see

-   When authorized work needs a new account, or a password change or reset, an agent now fills the form's other fields and calls the new `wallet_create_login` browser tool as the last step. The Wallet generates a strong password within the length the form allows, enters it in every new-password field (and the current password of a saved login when the form asks for it), submits the form and keeps the login encrypted for the page's actual origin. Before, agents could only sign in with saved logins: the Wallet had no way to receive credentials an agent's work created, so the agent had to ask the owner or keep them somewhere unprotected
-   The agent never sees the password, and nothing stays readable in the page. Nothing asks the owner for a confirmation. A new login stays unverified until it is tested
-   A form the website shows again, or one stopped by a CAPTCHA, restores the Wallet's earlier state. A changed login keeps its earlier password until the first sign-in shows which one the website holds, so a change that only seemed to work cannot lose access
-   The new `wallet_correct_login` tool corrects a saved login's username or label without asking. Its website and password stay as they are, so a page's text cannot redirect a saved password to another site

## Releasing: the VS Code extension uses trusted publishing when the Marketplace token is refused

-   The Publish workflow's `vscode-extension` job could not publish to the VS Code Marketplace because the token it falls back to (the organization's `VSCE_TOKEN`) has expired. The same token already stopped the last publication from the former extension repository (1.0.70, "The Personal Access Token used has expired"). The Marketplace listing therefore stays at 1.0.69 until a working credential is available.
-   When the Marketplace refuses the token (expired, revoked or without access), the job now tries trusted publishing (OIDC) from GitHub Actions instead; the job already has the `id-token: write` permission. Without any token it uses trusted publishing directly, as before. Other failures, such as a version that already exists, are not retried with another credential.
-   When nothing is accepted, the job names the remedy: set a new Azure DevOps Personal Access Token with Marketplace (Manage) access as the `VSCE_PAT` repository secret, or configure trusted publishing for the Promptbook publisher, then rerun the job. No new version is needed, because the npm package and the GitHub Release are already complete.

## Releasing: a failed VS Code Marketplace publication shows its reason

-   When the Publish workflow's `vscode-extension` job cannot publish the Book extension to the VS Code Marketplace, its log now shows `vsce`'s own messages, which also appear as annotations, for example an expired or insufficient access token. Before, `vsce` reported them on its captured output, which was dropped, so the 0.119.0-44 job ended with only "Command failed: … vsce publish …". A successful publication now shows `vsce`'s output too.

## Releasing: stale installed packages stop a release at once, with the cause

-   `npm version …` (and so `npm run release:prerelease`) now checks before any release check that the installed direct dependencies match `package-lock.json`, and that the lockfile matches `package.json`. Otherwise it stops at once, names each affected package and asks for `npm ci`. No version is changed. Before, a pull or merge that added packages without a following install failed the release minutes later inside `check:full`. The VS Code extension's new type library, for example, failed as `TS2688: Cannot find type definition file for 'vscode'`.

## Wallet: a CAPTCHA is solved before the login is entered; a Wallet test can be taken over to solve it

-   The Wallet now recognizes an unsolved CAPTCHA (reCAPTCHA, hCaptcha, Turnstile and similar widgets whose response is still empty; invisible widgets and badges do not count). It enters a login, additional field or one-time code only into a form without one. Before, it submitted into the unsolved CAPTCHA. The site then showed its login form again, which counted as a **rejected password**: a Wallet test reported **test rejected**, and ordinary work created a request to update a login that was fine. A CAPTCHA page after a submission no longer counts as signed in either.
-   In ordinary work, `wallet_login` reports the CAPTCHA as a further step. The agent solves it as before, then calls `wallet_login` again, and the Wallet enters the login.
-   A Wallet **Test** that meets a CAPTCHA brings its login window forward when the project browser shows windows, and waits up to ten minutes. The progress reads "Solve the CAPTCHA of … in the browser window …". Once it is solved, the test signs in again with the saved login, never with what was typed in the window, and checks the result. The test can be cancelled while it waits. A headless browser has no window to take over, so the test ends as unverified (incomplete) with that reason, never as a bad password.
-   While a test waits for the owner (a code, an approval or a takeover), the web dashboard now shows its step without the trailing "…" of ongoing activity, as the terminal already did.

## Wallet: a sign-in waiting for an approval on another device is no longer taken as signed in

-   After the password or a one-time code, some websites wait until the sign-in is approved in their app or on another device. The Wallet now recognizes such a page: a short page without any field to fill whose wording asks for that approval. Before, any page without a login form counted as a successful sign-in, so a **Test** reported such a login as **verified** although nothing had been proven, and ordinary work was told it was signed in.
-   The Wallet test now waits at that step with its login, up to ten minutes as for a code. The progress reads "Waiting for you to approve this sign-in where … asked"; there is nothing to enter, and the test can be cancelled. Once the website continues to its signed-in page, the login is **verified**. Approval not given in time, a declined or expired approval, or a cancellation ends the test as unverified (incomplete), never as a bad password. A code followed by an approval, or an approval followed by a code, is handled in one test.
-   In ordinary work, `wallet_login` reports the approval as a further step. Called again on the approval page, it tells the agent that there is nothing to enter, that the page usually continues once approved, and that only the account owner can give the approval (through `browser_request_user_action`).

## Task purpose: status and the Tasks tiles show content work first

-   `ptbk status`, `ptbk status --json` and the live snapshot behind both dashboards now carry each source-backed task's effective purpose. Before, only engine-owned tasks had one there, so supporting system work written in task Books, such as Router's `Assign routing: …` tasks, appeared unmuted between content tasks.
-   The pretty status lists content and unclassified tasks first, and supporting system work after them in muted text. The raw status names the purpose (`· system work`).
-   The Tasks tile in the terminal and web dashboards shows a ready content or unclassified task as "next" ahead of ready supporting system work. System work is "next" only when nothing else is ready.

## Wallet: the reset warning in both dashboards is the engine's own

-   **Reset Wallet** in the terminal and web dashboards now shows the engine's all-data-loss warning, which the Wallet view carries while a reset is possible. It names the services and accounts, labels, usernames, passwords, additional login fields and any retained legacy TOTP data. Before, both dashboards showed their own older copy, which named "TOTP generators" and left out additional login fields.

## Task purpose: tasks created in a chat, including by Tasker, can carry their purpose

-   The chat agents' `create_task` tool takes an optional `purpose` (`content` or `system`, relative to this project). The new task is written with `TASK PURPOSE CONTENT` or `TASK PURPOSE SYSTEM`. Before, Talk to Tasker, the main way to author tasks, could not record a purpose, although Tasker's instructions ask it to classify new work where useful.
-   Leaving it out keeps the purpose undefined, which is valid, and an unusable value is ignored rather than failing the task. The running engine and `ptbk chat` without a service build the new task's commitments the same way.

## Task purpose: engine-authored routing and repair tasks are system work

-   The tasks the engine writes for Router to choose an executor (`Assign routing: …`) and for Fixer to repair the project's own setup now carry `TASK PURPOSE SYSTEM`. Fixer's tasks cover the project health check, impossible execution requirements, Router's execution setup, core template reconciliation and synchronization conflicts. In any project this is supporting work, so the default task views show it muted in the lower supporting group instead of between content tasks. Before, these tasks were unclassified.
-   This changes presentation only: scheduling, priority and permissions stay as they were. A question on such a task stays conspicuous. Tasks whose purpose depends on the project keep an undefined purpose until Tasker, Router or the working agent classifies them: Teacher learning, goal discovery, failing-check fixes and the initial Expert task.

## Health: a memory shortage on Linux adds swap by itself

-   When available memory falls below `limit.memory` or runs out on Linux, and no swap is active, the Health sub-engine now adds the planned swap file by itself. It does this only with privileges the engine already has (it runs as root, or `sudo -n` works). It uses the same operation as the Health page's swap action, before anyone is asked. Before, swap was only ever added after the operator pressed that action.
-   It never prompts for a password, overwrites an existing file, adds swap next to swap that is already active, or writes `/etc/fstab`. The Health page shows the size, path and outcome as the incident's automatic remedy, with the `/etc/fstab` line that keeps the swap after a reboot. When it cannot act, the remedy says why, for example missing administrator privileges or swap that is already active.
-   One attempt serves the soft and the hard memory incident of the same shortage. Memory asks for help with the same rules as before, but never while the remedy is running. An incident whose condition already stopped holding is recovering and no longer asks for an action, which also removes a short false request right after a successful disk cleanup.

## Adam: shared writing rules

- Adam now supplies English rules for factual accuracy, preserving the author's meaning and voice, and direct writing without stock AI phrasing. Newly initialized agents receive them through ordinary inheritance; Adam keeps its general role without a writing-specific goal or a fixed output language. The repository's own Adam uses the same rules, and the previous default is retained for safe template updates that preserve project customizations.

## Action log: the GitHub repository created by initialization is recorded

-   When `ptbk init` creates the project's GitHub repository, it now saves a confirmed external-action record under `actions/.engine/initialization/` and commits it (`Action - Create repository · GitHub`) before publishing. The record names the engine-owned operation (**System operation: Initialization**) instead of an invented task or source file. The Action log lists it as `engine · Initialization`. Before, this remote effect left no audit record.
-   The setup now saves its intent before the creation request. If the request reports a failure but the repository exists afterwards, or a rerun finds a repository an earlier request created without an acknowledgement, the creation is recorded and reused, never requested again.

## Tasks: a discovered technical prerequisite pauses the task until it is done

-   An agent that finds a technical prerequisite its task cannot continue without (for example an accounting task that needs an XML parser) can call the new `create_prerequisite_task` tool and end its turn with the new status `waiting-for-task`. Before, the only way out was to report the task as blocked, which failed it, or to do the supporting work inside the content task.
-   The prerequisite is committed at once as an ordinary task of its own, separate from the waiting task's result. It has `TASK PURPOSE SYSTEM` (or CONTENT when the agent says so), `TASK PARENT` naming the waiting task, an optional `TASK AGENT` and the waiting task's priority, so it is not starved. The waiting task gets `TASK DEPENDS ON {prerequisite}` in its own Book and keeps its own purpose.
-   The waiting task is checkpointed with its changed files and recorded external actions. Views show it as waiting for its dependency, never as a question for the user. Its agent may start the prerequisite despite the one-started-task-per-agent rule, because it belongs to the same chain. Other tasks for that agent still queue.
-   When the prerequisite is completed, the task continues from where it stopped, also after a restart. It is told that its confirmed external actions are done and not to repeat them. If the prerequisite is retired, marked failed or removed instead, the task resumes and is told so. A prerequisite that is still being recovered keeps the task waiting.
-   Fixed: a task Book or brief that the engine published while another task was capturing its changes was sometimes reported as "changed while several tasks worked and no task claimed or reported it", although the engine committed it itself.

## Initialization: Wallet setup and import are part of the draft

-   Choosing **Set up Wallet now?** in `ptbk init` (and the global dashboard's New project) now shows the 12 words for recovery and the optional Bitwarden import inside the wizard, before the final review. Before, both ran after **Create and start project**, so the project was already written when they asked their questions.
-   The words, the key material and the selected logins stay only in the wizard's memory. Nothing is written until the final confirmation, and the target folder does not exist before it. After confirmation the Wallet is created in the final folder (also when the review renamed it) with the words already written down, and the selected logins are saved. No more questions follow the confirmation. Going back keeps the confirmed words and the import selection. Answering No, choosing a destination that already has a Wallet, or cancelling discards them.

## Wallet: additional reusable login fields

-   A saved login can now keep additional fields that a website asks for besides the username and password, such as a date of birth, a security answer or a customer number. They are added when a login is added or updated (terminal: named one by one with masked values; web: **Additional login fields** in the login dialog), stored encrypted inside the login's record and never shown again. Views list only their names. An update keeps them unless one is changed, or removed with an empty value. A value that may change can be kept marked as uncertain, so it need not be asked again.
-   The trusted sign-in fills the fields the login form asks for from the saved ones with a matching label, also on a sign-in question step after the password. A masked answer field there is no longer mistaken for the login form returning (a false "rejected").
-   When a form requires a field the login does not have, nothing is submitted. One protected Wallet request names exactly the missing fields (`Enter` on the request in the terminal, **Add the fields** on the web), and the agent is told never to ask for them in a chat. The owner's values are saved with the login and the waiting work signs in again. A credential test reports such a field as incomplete, never as a bad password.
-   Bitwarden import takes text and hidden custom fields as additional login fields. Boolean and linked custom fields are reported as not imported, and a replaced login keeps its other saved fields.
-   The Wallet's own sign-in now chooses an offered **Remember me**, **Stay signed in**, **Keep me signed in** or **Trust this device** option of the login or code form before submitting, so later work needs no new sign-in or factor. Other checkboxes, such as newsletter consent, are left alone. Before, only the agent was told to choose these options.

## Wallet: Test one saved login through a real sign-in

-   Each saved login on the Wallet page (terminal and web) offers **Test** next to Update and Remove (`T` in the terminal). Only that one account is tested, not every account of the service. The test opens the website in a separate, fresh browser login context with no existing sessions, follows an evident "Sign in" link when the page shows no form, and signs in with the same trusted Wallet sign-in and verified-result check as ordinary work. An existing signed-in session therefore cannot make a wrong password look valid, and that session is neither signed out nor replaced.
-   Adding or updating a login from the Wallet page runs the same test after saving. Saving and verifying are separate outcomes: the login is kept whatever the test finds.
-   Progress is shown live with the login. Afterwards it shows **verified**, **test rejected** or **unverified (test incomplete)** with the time and a concise reason, for example when no login form was found, the site asks for another step such as a code, or the website or browser is unavailable. A temporary outage is never reported as a bad password, and a login never tested reads as unverified. The latest result is stored inside the login's encrypted record (ignored local Wallet state, never in Git), with passwords and other secrets redacted, and it survives a restart. Updating the login clears it, and a result about values changed during the test is dropped.
-   A test is not a task, run or credential mutation: it creates no task Book, trace or commit.
-   When the website asks for a one-time code after the password, the test waits with its login for up to ten minutes: **Enter the code** on the web, or Enter on the login in the terminal (masked input). The code is entered once into the test's own login context and never stored or kept in the result. A refused code asks for the current one, up to three codes. A running test can be cancelled (`X` in the terminal, **Cancel test** on the web). A missing code or a cancellation ends the test as unverified (incomplete), never as a bad password.
-   Not covered yet: codes the test obtains from an inbox by itself (the test runs without an agent).

## Wallet: one-time codes through protected owner input, never a chat

-   When a site asks for a one-time code after the Wallet signed in, the agent first gets it itself from an email or another channel it can already read. A code is used once and is not a credential. Only when it cannot does `wallet_login` with `requestCode` create one protected Wallet request, with the ordinary Wallet attention, and the task waits for it. The agent is no longer told to ask for such codes through a browser user-action chat.
-   The owner enters the code on the Wallet page: Enter on the request in the terminal (masked input), or **Enter the code** on the web. The Wallet holds it in memory only, nev…38066 tokens truncated… writing follow-up tasks are told the canonical format and the current creation time; a new task Book that is invalid or reuses an existing name is sent back for repair before the result is accepted.
-   Core agents and default roles are written as `AGENT …` Books; core agents are created only when no Book uses their name. `DELETE RULE …` is recognized as one complete keyword. Init's first task is recognized by its origin on reinitialization.

## Service lifecycle, diagnostics, global dashboard and Chatter

-   One engine-owned lifecycle shared by CLI, terminal, browser and API, with exactly four live states: `running`, `pausing` (the current task settles, then `pause`), `pause` (alive and controllable, no task runs or starts) and `stopping` (the current task settles, then orderly shutdown). Pause/stop never start a next task, follow-up, Manager, Teacher, Fixer or discovery task (claims are serialized with control decisions) and never suspend the harness. New `ptbk pause` and `ptbk resume`; resume also cancels a pending pause, stop or restart without replaying the current task. Replacing a pending stop with pause needs explicit confirmation against the current decision revision (noninteractive callers get the conflict instead of a hidden prompt). One-shot results distinguish pending from completed outcomes.
-   `ptbk stop` is now graceful by default (`--after-task` is accepted as a hidden compatibility flag); `ptbk stop --force`/`-F` interrupts owned work immediately, keeps its recovery record and never marks it done. Stop works for daemon and foreground owners alike, is confirmed only after the owner ended, and the engine records an intentional stop itself — cancelling a pending stop leaves no permanent-stop setting. OS termination signals drain gracefully and are not treated as an intentional stop; owning terminals (foreground start, run) stop gracefully on the first Ctrl+C and force on the second.
-   `ptbk restart` drains like a graceful stop (with visible restart intent), releases ownership and starts exactly one replacement with the same project, configuration and installation: the daemon's supervisor relaunches its worker (exit code 75), a foreground owner restarts in place (never becoming a daemon). Engines without the shared restart fall back to stop-then-start.
-   Owner-only cleanup: every shutdown path (graceful, restart, internal force stop) removes the owner's own discovery entry, process record and lock with bounded steps; a lock conflict names the verified owner or states the uncertainty of a possibly reused PID instead of taking over.
-   Dashboards: a visible **Service controls** panel in the terminal and browser (P pause/resume, U cancel, X graceful stop that never escalates, R restart, F force stop with confirmation; pairing renewal moved to V). Initially collapsed **execution details** (E: agent, harness, concrete model and thinking level of the actual run in the harness's own terminology — reported/requested/automatic/not-applicable/unknown kept distinct, with the source of each value and separate consultation contexts; the last run is labelled historical) and **browser details** (B: effective profile source and path, requested/actual mode, health, ownership, last redacted failure, automatic recovery; 1 recheck, 2 retry startup, 3 restart the project browser). The same information is in raw status output and the API snapshot (`service.lifecycle`, `execution`, `browser`).
-   The project browser now tracks its health, retries a failed launch automatically within a bound, detects a lost connection and relaunches on the next use, coordinates automatic and manual starts (never two owners) and defers a manual restart until the current task's browser use ends. It never kills other browsers or restarts the engine.
-   `ptbk dashboard --global`: a continuously refreshed table of every running engine of your OS user, from any directory and across installations/versions (project, path, version, PID, mode, live state, current work). It stays open with zero engines, shows later starts, labels ended engines, keeps the selection stable, attaches to a project's ordinary dashboard without `cd` (Q returns to the table) and never starts a worker or touches project locks; `--raw` streams plain events. Engines register in a per-user discovery registry (`<Promptbook app data>/services/`, no credentials); verification uses the project's own process record and proven-dead entries are removed.
-   **Chatter** is the fifth core agent (`agents/.core/chatter.book`, ordinary Adam inheritance, OPEN): created when missing with TEAM access to every other initialized role (never itself) and Expert, after the default roles so its team covers the completed set; existing customized Books are never rewritten. New chats without an explicit agent offer **Chat with Chatter** (Enter) or **Choose another agent** (every valid alternative) in `ptbk chat`, the terminal dashboard and the browser; noninteractive and API chat creation default to Chatter; a missing/invalid Chatter is diagnosed, never silently replaced. Existing and agent-authored waiting chats keep their real participants.
-   Conversation-scoped TEAM consultations: an agent answering a chat (e.g. Chatter) can consult teammates through `consult`; each bounded exchange is an internal two-agent chat linked to the conversation and committed as its own scoped authoring operation — no fabricated task, no participant switch.
-   Task evidence now lives in `traces/<task-file-basename>/`: the actual source filename without its final `.book` (or legacy `.md`), copied literally — not the normalized TASK name. Each run records a `provenance` event with the declared name, source path and source revision (Git blob hash). Task sources whose basenames collide (e.g. `a.book` and `a.md`) are blocked with an explanation instead of sharing evidence. Evidence that older engines stored under name-derived directories stays in place, is linked as `historical-evidence` when verifiably the same task, and is shown by `ptbk list <task>`; `ptbk list --json` returns each task's trace path.

## Viewing a service of another ptbk version

-   `ptbk dashboard` and `ptbk status` no longer crash with an internal error (`Cannot read properties of undefined`) when the running service was started by another ptbk version (for example a linked checkout while the global installation is older or newer). Engines report a control contract in `identify`; when it differs from the client's, the view opens through the service's own installation (still holding that exact version), so it shows that engine with its actual version. The global dashboard attaches the same way.
-   If the service's installation is gone, the command explains the version difference and how to continue (`ptbk stop` then `ptbk start` to switch versions, or `npx ptbk@<version> dashboard`) instead of misrendering it. One-shot results after `pause`, `resume`, `stop`, `restart`, `start` and `init` show the service's actual version and process identity without guessing its live details.
-   Release: the **Check ptbk** workflow passes on Windows again (a browser-profile test assumed POSIX absolute paths), so tagged versions are published again.

## Named tools, versioned configuration, Git synchronization and the Windows installer

-   **Named tools.** Browsers and harnesses are ordered records in `ptbk.json` `tools` (`type` `BROWSER`/`HARNESS`, `variant`, kebab-case `name`, optional `description`, `isEnabled`), replacing the singleton `browser` setting and the `harnesses` map. Browsers have `profile.source` (`MANAGED_GLOBAL`, `PROJECT`, `USER_EXISTING`, `CUSTOM` + `path`), `isHeadless` and `executable`; harnesses have `authentication` (`NATIVE` or `API_KEY`), `apiKey` (`${{ env.NAME }}` references only), `accountProfile` (separate native login contexts for Codex `CODEX_HOME` and Claude Code `CLAUDE_CONFIG_DIR`), `model`, `thinkingLevel` and `models`. Several instances of one variant form a fallback chain in array order: the first usable instance serves work and a quota/authentication failure moves the retry to the next one at once (an explicit `TASK HARNESS <tool-name>` is never broadened). Different variants are still chosen for suitability. Ambient API keys never turn a native instance into API billing; `PTBK_OPENAI_CODEX_USE_API_KEY` is superseded by explicit `API_KEY` tools.
-   **`ptbk tool list|show|add|modify|enable|disable|remove (delete)|move`** — one shared implementation used by init, the CLI, the terminal dashboard (`T`), the browser dashboard (Tools card) and the API (`POST /api/tools`). Every real change is committed immediately as its own `ptbk: ` commit, also while a task runs (the change is planned on HEAD, so someone else's uncommitted `ptbk.json` edit is never swept into it); no-ops and refusals commit nothing. Disabling/removing the last enabled browser or harness needs `--yes`; changing a tool that active work holds needs `--force` (the work finishes with the configuration it acquired) or the separate `ptbk stop --force` — there is no tool force-stop. New keys come in through `--api-key-stdin` (hidden input) and go to the ignored `.env` with timestamped `# … ptbk: added — …` comments; replaced or retired lines are commented out, never deleted, and a key is retired only when ptbk added it and nothing else uses it.
-   **Live tools.** The engine re-reads `ptbk.json` and `.env` before every task, while idle and when they change during work: a tool added or enabled from another terminal or the dashboard is usable at once, also by the task already running (agents see browsers through the new `browser_list` tool and pick one by name). With no usable browser or harness the engine stays `running` and shows **waiting for tools** with the concrete enable/add/repair action; `ptbk start` and init no longer treat missing tools as unfinished setup.
-   **Versioned configuration.** `promptbookVersion` records the engine that initialized or last migrated the project. A newer engine applies the applicable migration steps and commits the whole pass once (`ptbk: Migrate configuration from <old> to <new>`, also for a version-only pass) before new work; an older engine refuses (no writes) and asks for an update. A configuration without the field is treated as `0.119.0-21`. The first migration (bound to `0.119.0-22`, the first release shipping it) converts the browser and harness settings into named tools (native authentication kept; `apiKeyEnv` becomes an inactive `apiKey` reference), renames the boolean settings to their `is…` names (`execution.isCommitEnabled`, `traces.isCommitted`, `server.isEnabled`, `service.isPersistent`, …, false values kept), canonicalizes enum values (`YES_AND_FIX`, `IGNORE`, `OFF`, `CLOUDFLARE_QUICK`, `HIGH`, …), adds `isAutoSync: false` and retires `execution.autoPull`/`autoPush` and the old `version` counter. A migration needs a commit: `--no-commit` invocations refuse it before writing. Unambiguous spelling mistakes in a current configuration are corrected in a `ptbk: Normalize project configuration` commit; collisions, unknown variants and inline secrets are reported for Fixer.
-   **Git synchronization.** `isAutoSync` (default off) synchronizes with the repository's existing origin and the branch the engine started on: a pull attempt every 60 seconds, before every task and authoring operation and before their commits (pre-commit attempts only fetch; integration follows after the local commit), and publication after commits. Remote changes are integrated with visible `ptbk: Merge origin/<branch> into <branch>` merge commits (never rebase, reset or force-push; no empty merges); uncommitted local edits of incoming files and running tasks defer integration; a conflict is aborted cleanly and handed to Fixer as an ordinary task. Failures back off and never stop local work. `--auto-sync`/`--no-auto-sync` override it per invocation (`--auto-pull`/`--auto-push` are aliases); `--no-commit` conflicts with it. The dashboards show a synchronization panel and **Synchronize now** (`G`) only while it is enabled.
-   **Init.** No check-command question: an existing real check is kept, a supplied `--check` is saved, otherwise `execution.check` gets the informational placeholder `echo "Configure project checks in ptbk.json execution.check"`, which is labelled as "real validation not configured" everywhere and never repaired as a failing check (`--defer-check` is a no-op). New **Automatic synchronization** step (default no): GitHub publication of a new private repository through the GitHub CLI login (public only when chosen), another origin URL, or reuse of an existing origin; publication failures are reported separately and do not block the local start (`--auto-sync`, `--sync-provider`, `--github-repository`, `--github-visibility`, `--origin-url`). New repositories start on `main`; `.env` is ignored; tools are saved through the shared tool operations; the initial browser must be usable.
-   **Fixer** is initialized as a general problem solver: `GOAL Solve problems and reduce the decisions the user needs to make.`, with `TEAM @User` and Expert; existing (customized) Fixer Books are kept.
-   **Windows installer.** `installer/windows/` contains a thin Inno Setup bootstrap (per user, no own elevation): it reuses compatible Node.js/npm/Git, installs missing ones from official distributions (winget, else checksum-verified downloads), installs the exact `ptbk` version globally, proposes `%USERPROFILE%\Promptbook`, creates an empty first-project folder (never reusing a nonempty one) and opens a PowerShell terminal running `ptbk init --path <folder>`. The Publish workflow builds it from the release tag, verifies it and attaches it with a SHA-256 checksum to the GitHub Release; the Check workflow validates the bootstrap on Windows.
-   Status, dashboards and the API show the tool inventory (enabled/usable/in use/retained), every named browser with per-browser recheck/retry/restart, the tool instance that served each run, and (when enabled) synchronization state. The control contract is now 3 (older clients view such engines through the engine's own installation).

## Release fix: hosted checks for 0.119.0-22

-   The **Check ptbk** matrix failed on every runner because new tests assumed that a repository created by the fixture starts on `main`; hosted Git defaults to `master`. ptbk itself was right (only a repository created by init is put on `main`; existing repositories keep their branch): the tests now read the actual branch, and a dedicated test proves that init creates `main` even when Git defaults to `master` and keeps an existing branch (`trunk`).
-   The Windows installer check failed to parse `bootstrap.ps1`: Windows PowerShell 5.1 reads a BOM-less script as ANSI, where an em dash contains a right double quotation mark that PowerShell treats as a string delimiter. The installer sources and the workflows' PowerShell steps are now pure ASCII (a test enforces it), the console-encoding switch tolerates a missing console, and the bootstrap merges the registry PATH into the current one instead of replacing it (keeping the Node.js selected by the launching environment). Inno Setup identifiers that shadowed built-ins were renamed.

## Release fix: Windows checks for 0.119.0-23

-   On Windows, the synchronization coordinator test failed because the runner's Git checks text files out with CRLF (`core.autocrlf`): it compared the merged file as checked out, and its clones, unlike other fixtures, did not pin `core.autocrlf=false`, so the coordinator's Git and the test's Git disagreed about line endings (a clean tree looked modified after an aborted conflicting merge). The test now compares committed content and pins the setting in its clones; the whole suite also passes under a Windows-like system Git configuration (`autocrlf=true`, default branch `master`).
-   The Windows installer reported the runner's working Node.js as "does not run": the bootstrap probed a tool with `Select-Object -First 1`, which stops the program before its exit code is recorded. The probe now collects the whole output, records the exit code explicitly and logs each probe to the bootstrap diagnostics. A new test runs the bootstrap in plan mode with every available PowerShell (Windows PowerShell 5.1 and PowerShell 7 on Windows, PowerShell 7 on the hosted Linux and macOS runners) and requires the present Node.js, npm and Git to be reused.
-   Folder names with `[` or `]` no longer confuse the bootstrap's "inside the projects folder" check (a plain prefix comparison instead of a wildcard match).
-   Release workflow hardening: the bootstrap logs are printed when an installer step fails; `npm.cmd` is called explicitly so the execution policy cannot block `npm.ps1`; the Inno Setup compiler is located wherever Chocolatey installed it; the post-publication installation retries while the registry propagates the new version; `gh` gets the repository explicitly.

## Release fix: Windows installer check for 0.119.0-24

-   The bootstrap now works on the hosted Windows runner (install, reuse and the refused nonempty folder all behaved as specified), but the step still failed: the GitHub runner ends every PowerShell step with `exit $LASTEXITCODE`, so the expected refusal (exit 4) became the step's own exit code. The steps that accept a nonzero exit code (the refusal, and an exit 3 from the handed-off `ptbk init`) now reset it after checking it. These steps were reproduced locally with the runner's exact wrapper before and after the fix.

## Release fix: Windows installer build for 0.119.0-25

-   The Inno Setup compiler rejected `VersionInfoProductVersion=0.119.0-25`: Windows version resources are numeric (`a.b.c.d`). The binary file and product versions now use the numeric form (`0.119.0.25`), while the release version text goes into `VersionInfoTextVersion` and `VersionInfoProductTextVersion`; a test guards both.

## Specification alignment: honest checks, Fixer policy, isolation and installer handoff

-   **Check placeholder is never a passed check.** The informational `execution.check` placeholder saved by init is no longer run as if it were validation: task execution, the pre-work check (`--check-before`) and `ptbk run` label it as "real automated validation is not configured" (trace event `check` with `placeholder: true`, `passed: null`), and agents are told that it proves nothing instead of "must pass". Real checks behave as before.
-   **Fixer's own Book governs consultation.** The project health check handed to Fixer no longer instructs it to "ask @User"; it consults its team as its own instructions direct, so a customized Fixer (all, some or no User consultation) is respected.
-   **Isolated tasks integrate with a visible merge.** `--isolate` no longer rebases the task's result onto a moved branch and fast-forwards: the original result commit is kept and joins the project branch through a `ptbk: Merge the isolated result of <task> into <branch>` merge commit (also when a fast-forward was possible), prepared in the worktree and rechecked when intervening commits changed the merged content. A conflict or failing recheck leaves the project branch untouched and the result on `ptbk/<run>`; the task is checkpointed ("waits for a visible merge", not a user question), an ordinary Fixer task is created to merge it, and the task completes without rerunning any model work once the branch is merged (by Fixer or by hand). Resuming an interrupted integration now integrates instead of claiming completion, local evidence written inside the worktree is moved to the project's `traces/` before the worktree is removed, and Teacher follow-ups of isolated work name the project's agent Book (not a path relative to the worktree). Maintenance work such as Fixer's merge is never itself isolated.
-   **Explicit destinations are confirmed, not re-chosen.** An interactive `ptbk init --path <folder>` (as launched by the Windows installer) no longer skips the destination silently: after the intent it shows the folder for confirmation (Yes, set it up here / No, cancel — nothing is changed) instead of offering another current-directory/subfolder choice. Single-choice questions now wrap instead of clipping long text such as paths.
-   **Failed tasks go to Fixer before anyone is asked.** In the ongoing agenda, a task that exhausts its attempt or technical-retry budget (or whose agent reports it blocked) is no longer turned straight into a "Retry or acknowledge?" question for the user. It is handed to the ordinary Fixer, which continues the same task record — its partial changes, trace directory and eventual single `ptbk: <task>` result commit (the body records "Completed by Fixer after <agent> could not: …") — for one bounded round of at most two attempts, with the failure and evidence in its prompt, consulting its team only as its own Book directs. Only when Fixer cannot resolve it either does Fixer (the agent that last handled it) ask how to continue in a recovery chat; Fixer's own failures, generated assignment/learning/discovery work and finite `ptbk run` (whose agent was chosen explicitly) keep the direct decision. A deliberate retry starts again with the task's own agent. The takeover is recorded as a `handed-over` trace event, and a resumed run's feedback is no longer labelled "Feedback from attempt 0".
-   **Searchable agent lists and catalogs.** "Choose another agent" in `ptbk chat` and in the terminal dashboard (`C`) now narrows as you type (case- and accent-insensitive; Backspace edits, Esc clears the filter before going back), and the dashboard's list scrolls within a bounded window instead of growing with the number of agents. The featured/More harness catalog of init (and the individual harness-update choice) filters the whole catalog the same way while Space still toggles, so large catalogs stay navigable without typing identifiers.

## Full browser access for agents

-   An agent that uses a browser tool now has **full access to that browser and its profile** — everything a person at that browser could do ([specification](../specs/cli/browser.md#full-access-for-agents)). Configuring the browser tool is the grant: agents no longer stop to ask for "computer control", never ask the user to enable or widen browser control and do not change the browser configuration to work around a tool. Task authority still decides consequential actions (posting, paying), and genuinely human-only steps (credentials, two-factor codes, CAPTCHAs) still go through a chat.
-   **Complete page reading.** `browser_read` shows open dialogs first and includes content inside open shadow roots (such as LinkedIn's post composer, which it previously missed) and same-origin frames; rich-text editors (`contenteditable`) and ARIA widgets are listed with their current values (secret fields masked), dialog and on-screen elements are numbered first.
-   **Trusted input, as from a person.** `browser_click` (by ref or viewport coordinates, right/double click, modifiers; refuses with the reason when another element covers the target, `force` clicks programmatically), `browser_hover`, `browser_scroll` and `browser_press_key` (keys and shortcuts; `Control+A` and other editing shortcuts also work on macOS). `browser_type` uses real keyboard input, so it works in rich-text editors (also in shadow DOM): multiline text, replace or append, and the element's resulting content is returned for verification; selects, checkboxes and special inputs are set to the given value.
-   **Tabs and navigation.** `browser_tabs` (list, new, select, close), `browser_navigate` (back, forward, reload) and `browser_open` for any URL (a scheme-less address opens like in the address bar) and optionally in a new tab. A tab the website opens becomes the current tab; closing it continues in another one, and the recording follows the tab the agent works in.
-   **Programmatic control.** `browser_upload` (file inputs and the file chooser a button opens), `browser_evaluate` (page JavaScript with top-level `await`; listed elements are `ptbkRef(n)`), `browser_cdp` (any DevTools protocol command for the page or the browser) and `browser_devtools_endpoint` (for the agent's own Playwright/Puppeteer scripts while its task holds the browser).
-   `browser_screenshot` returns the image to the model (MCP image content) with coordinate guidance, optionally of the full page; image data stays out of the readable `harness.log`. Headless browsers get a desktop-sized window (1280×900), so websites show their desktop layout.

## Self-naming terminal titles and safe terminal output

-   Interactive sessions name their terminal tab/window ([specification](../specs/cli/terminal-title.md)) with a standard OSC 0 title such as `📖 Promptbook · birds · Dashboard · Developer: Fix the feed`: project, mode (`Init`/`Setup`, `Dashboard`, `Foreground`, `Run`, `Chat`, `Plan`, `New task`, `Answer`, `Verify`, or `All engines` for `ptbk dashboard --global`) and the current context — the agent and task being worked on, `Needs you` while an agent waits for you, `Paused`/`Stopping`, `Blocked` or `Waiting for tools`. The title changes only when that context changes (task start or switch, opening a chat, attaching from the global dashboard), never per refresh. Works in Bash/Zsh terminals whose tabs show application titles; the OS process name is untouched. The VS Code integrated terminal receives the title but labels tabs with the process name (`node`) by default — set `"terminal.integrated.tabs.title": "${sequence}"` to see it; since VS Code ignores the title stack, ptbk clears its title there on exit instead of leaving a finished session named.
-   Titles are written only to an interactive, pretty TTY: never with `--raw`/`--no-ui`, `--non-interactive`, `--json`, redirected output, `TERM=dumb` or one-shot commands. Switch them off with `--no-terminal-title` or `PTBK_TERMINAL_TITLE=off` (`DISABLE_AUTO_TITLE=true`, the setting of users who manage titles themselves, is respected too; `PTBK_TERMINAL_TITLE=on` overrides it). The previous title is saved on the terminal's title stack and restored on exit where the terminal supports it; elsewhere the shell or terminal restores its own title.
-   Project, task, chat and agent names are sanitized for titles (escape sequences, control and bidirectional characters removed, line breaks flattened, length capped), so untrusted names cannot inject terminal commands or misleading multiline titles.
-   **Safe terminal output.** The terminal screens render untrusted text without its control sequences: a task, chat or agent name (or message) with an embedded escape sequence can no longer retitle, clear, reset or move the cursor of the terminal through the dashboard, chat, wizard or panel views, nor reach plain dashboard events (the UI's own colors and emphasis are kept).
-   **Leaving a dashboard is immediate.** Leaving an attached dashboard (`Q`, or Ctrl+C in raw mode) returns to the shell at once instead of waiting up to 20 seconds for the service's next update.

## Router, Tasker and one shared MODEL commitment

-   **One `MODEL` commitment for agents, tasks and chats** ([specification](../specs/book-language/commitments/model.md)). Each line is one alternative made of `harness=`, `model=`, `thinking=`, `provider=`, `origin=` and `runtime=` fields (`*` or an omitted field means any value; `runtime` is `default`, `official`, `local` or an endpoint URL). An agent's effective MODEL is the intersection along its `FROM` chain, a task has one MODEL and a chat uses its latest one. Invalid or impossible MODEL content is reported with its line (`ptbk lint`, the Book editor) and never guessed around. `TASK HARNESS`, `TASK MODEL` and `TASK THINKING LEVEL` are read as the former form of a task MODEL (with a warning); combining them with `MODEL` is an error.
-   **Router replaces Manager, and Tasker is a new core agent.** Router (`agents/.core/router.book`) chooses the responsible agent and specializes the task's MODEL in place within the agent's and the task's constraints, in the same assignment commit; earlier values stay only in Git history. Tasker (`agents/.core/tasker.book`) creates and manages tasks. Router's own MODEL is bootstrapped from the first usable harness and that plugin's defaults, so routing never depends on routing. A combination that cannot run (no agent or enabled harness satisfies it) is not retried silently: it becomes one ordinary Fixer repair task. Future, waiting and dependent tasks are routed early, after ready work, nearest first.
-   **Chats are routed on their first message.** The Router decision is committed chronologically as `Chat routing - <name>` (with `Chat-Model`/`Routed-By` trailers) before the agent replies, and later messages reuse the recorded MODEL. Chats, including this routing, stay available while the engine is paused.
-   **Plugins own model defaults; tools own endpoints.** Each harness plugin declares its default model, default thinking level, whether its model catalog is complete, and the endpoints it supports. A harness tool now records only connection, authentication and endpoint (`baseUrl`: `OFFICIAL`, `LOCAL` or a URL; `ptbk tool add|edit … --base-url`, the Endpoint field of the tool forms); its former `model`, `thinkingLevel` and `models` fields and `--model`/`--thinking-level`/`--models`/`--clear-model` are gone. The `routing.harness`, `routing.model`, `routing.thinkingLevel` and `routing.preferences` settings and the legacy `PTBK_*` environment fallbacks were removed (`routing.defaultAgent` stays); stale values are reported instead of applied.
-   **Fixer asks before changing explicit requirements.** Fixer's default RULE now asks the user before a repair would alter their explicit intent.
-   **One migration of configuration and Books.** Configuration steps and Book steps run through one coordinator against one project version, and each pass produces one `Migrate project from X to Y` commit (a dirty affected Book is refused before anything is written; a failed pass restores every file). The 0.119.0-32 step converts Manager into Router (keeping its customizations and renaming references), adds Router's bootstrap MODEL and Tasker, turns former task execution controls into `MODEL`, and moves removed routing and tool model settings out of `ptbk.json`. The historical 0.119.0-22 step keeps per-tool model fields for this conversion instead of dropping them.

## Dashboard navigation and shared Book editing

-   **Separate Agents, Chats and Tasks panels.** The terminal dashboard shows agents (with core agents and the engine-owned Expert), chats and tasks as separate panels instead of one queue. Arrow keys move focus between panels spatially without enlarging them, Enter drills into the focused panel, Escape goes back, and Escape at the root closes only this viewer (the engine keeps running). The Tasks view lists the complete inventory — including completed and historical work — in a smart order (current decisions, coming up soon, recent results, distant future, old history; recurring and higher-priority work first), with `S` to change the sort field, `D` to reverse it, circular `↑↓` navigation, details on Enter and `T` to talk to Tasker. Sorting is viewer-local and never changes scheduling.
-   **Book source editing.** `E` opens the real source of the focused agent, task or chat in a full-screen editor where Enter inserts a line and Ctrl+S saves without closing (`Edit <kind> - <name>` commit). Saving is never refused for problematic content: detected problems are shown with their lines, and Fixer gets an ordinary repair task (pending while the engine is paused). Stale revisions are reported as conflicts, a task being executed is protected, Expert is shown read-only, and leaving keeps an unsaved draft. Pasted images and files become project assets next to the Book. The HTTP API offers the same operations (`GET /api/tasks`, `GET /api/books`, `POST /api/books`).
-   **One rich input everywhere.** Init's intent, chat messages and Book editing share one implementation of multiline editing, paste, attachments and tokens: Ctrl+V pastes text, images or documents from the clipboard; long pastes become `[Pasted text #1, 12,400 characters]` tokens that can be inspected, expanded with Ctrl+T or removed; Shift+Enter (where the terminal distinguishes it), Ctrl+J or Alt+Enter insert a newline in flow inputs, where Enter submits. Chat attachments are saved under `chats/_assets/`.

## Command entry aligned with the dashboard

-   **`ptbk run` was removed**, together with `--limit` and `--no-auto`; `ptbk run` now explains that `ptbk start` operates the ongoing engine. Bounded work is described as ordinary tasks.
-   **Bare `ptbk` offers actions.** In an interactive terminal it shows **Initialize project**, **Start engine** and **Open dashboard** with the version and current project; choosing one runs that command, and cancelling starts nothing. Redirected or noninteractive invocation still prints technical help.
-   **`ptbk about`** is a compact product box rather than a command reference: the shared product introduction, the actual engine version and installation, the website and GitHub. Raw output keeps the same copy and facts as plain text.
-   **Init hands off to the dashboard.** After a confirmed background start, interactive init shows a short countdown (Enter opens now, Esc or Ctrl+C skips) and then attaches the ordinary dashboard to the service that was just started, without another start or worker; leaving it keeps the engine running. Raw and noninteractive init return directly. An empty harness selection is warned about visibly (no model work can run and Router gets no concrete initial MODEL) and needs a second Enter to confirm.

## Book language extension built with the engine

- The existing `Promptbook.book-extension` now lives in `extensions/vscode` in this repository. Syntax highlighting, completion, hover, diagnostics, outline, folding and reference navigation use the current engine parser and vocabulary. Historical BookC previews remain read-only.
- Normal builds stage the extension; `npm run package:vscode` creates a versioned VSIX and checksum. The Marketplace version derives automatically from the engine version while remaining newer than the legacy 1.x releases.
- CI checks the extension, and every official engine release attaches its matching VSIX/checksum and publishes the existing Marketplace listing from the same release tag, using Trusted Publishing or the repository’s VSCE credential.

## Practical CLI release-video preparation

- Added a separate production status for the owner's requested practical CLI video for 0.119.0-47, preserving both existing videos and the original brief. Recorded the rejected ElevenLabs owner login and protected Wallet request; the exact requested voice remains unverified, with no new media or publication.
