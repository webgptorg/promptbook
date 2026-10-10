# Acceptance scenarios

[Main specification](../_main.md)

These are verifiable product outcomes, not an implementation plan or evidence of completed tests. Exercise common behavior with local fixture projects and deterministic substitutes; paid provider checks are separate and explicit.

## Installation and startup

- **S01:** Global `ptbk` and project-local `npx ptbk` work outside this repository. Two projects use different versions, and their daemons and Experts use the correct installation after restart.
- **S02:** Repeating init preserves customized source and creates only missing core files. Basic initialization does not unexpectedly execute work. Requested agenda creation performs setup, materializes Expert's first task and begins the agenda without an Expert project file.
- **S03:** Plain start creates one daemon with persistence, a free localhost port and a scannable QR code for the actual URL. No-server/no-QR and an explicit port behave as advertised; a port conflict is not reported as success. Bare `ptbk` offers start without hanging noninteractively.
- **S04:** Start/stop/restart/status/show target the correct project. Repeated/concurrent starts do not duplicate it or control an unrelated PID. Status/show never start work; an intentional stop remains stopped after reboot.
- **S05:** Verify daemon reboot/crash recovery on Linux, macOS and Windows. No-persist disables automatic restart but retains state. Foreground raw and interactive modes do not silently become daemons; unsupported persistence prerequisites are reported.

## Agents, language and assignment

- **A01:** Case, diacritics, separators, camel case and nested/hidden paths resolve agents consistently. Normalized collisions and reserved names are rejected with locations. Hidden agents are referenceable but not ordinary automatic work candidates.
- **A02:** Default inheritance reaches Adam; custom ancestors are allowed when the chain terminates. FROM cycles fail. Void/Null/0 ends inheritance and is a TEAM no-op; User fails in FROM and creates a request in TEAM; Expert works in both.
- **A03:** Reciprocal TEAM relationships are valid, consultations are bounded and the project still has one active task. Advisors receive their own instructions and cannot exceed task authority.
- **A04:** Start discovers installed/authenticated harnesses and their models. Missing all usable harnesses invokes setup or gives an unattended diagnostic. Manager's checked prerequisite fills missing routing without changing explicit requirements or recursively assigning itself. No unauthorized paid fallback occurs.
- **A05:** Implicit/explicit OPEN produces one Teacher follow-up; limited OPEN is respected. CLOSED prevents learning, including pending learning work. Teacher is customizable but must be CLOSED, and non-agents are not rewritten as local Books.
- **A06:** Agent-name-first and TASK-title-first Books are distinct. Multiline prose and fenced commitment-looking examples survive edits. Every documented commitment and alias has its declared meaning; malformed controls never silently activate work.

## Tasks and persistence

- **T01:** Duplicate task titles are valid; stable references distinguish them. Numeric/textual priority, prerequisites, parents, unavailable assignments and time constraints produce the same explanations in list, preview, controls and execution.
- **T02:** Each accepted task yields one commit containing its changes, formatter/check changes, dated TASK DONE and newly created follow-ups. Commit subject/body correspond to the assignment. Teacher's subsequent work has its own commit. No failed check is stamped complete.
- **T03:** Run is finite and uses one configuration; start operates indefinitely. At most one project task is active across interfaces and service commands. Future high-priority work does not block ready work or trigger goal enquiry.
- **T04:** With no unfinished present or future tasks, goal enquiry is materialized as ordinary checked work. It may create a future task or no work. Cooldowns survive restart, and supporting agents or empty results cannot cause an unbounded generation loop.
- **T05:** Earliest-start boundaries, explicit offsets and ambiguous local times are respected. Recurrence preserves anchors and history, coalesces downtime, never overlaps and runs at most one occurrence per finite invocation.
- **T06:** Interrupt before/during checks, completion, commit and push. Safe recovery resumes the correct phase without duplicate execution/commits; uncertainty leaves the supervisor inspectable. Unrelated edits, staged content, hooks and signing are respected.
- **T07:** Commit/push failure never reruns successful model work. Full/partial reverts and changed dependencies are reconciled, including external effects. Worktree integration preserves the single task commit or keeps an unintegrated result safely.
- **T08:** Markdown states, sections, priorities and selectors remain supported. Conversion preserves payload, assets, meaning and known timestamps without making two copies runnable or inventing missing dates. Repeating conversion is safe.

## Controls, access and evidence

- **U01:** Terminal, page and REST API show and control one process. Pause, settings changes and answers synchronize; startup-only settings and changes waiting for a safe boundary are explicit.
- **U02:** TEAM User, system confirmations and browser login requests share a durable request mechanism without being conflated. Interactive input, daemon `answer`, page and API can respond once; the CLI answer path works without HTTP. Raw mode never waits invisibly on stdin.
- **U03:** The default ignored browser profile retains sessions across restart. Headless/headful switching and explicit existing-profile selection preserve data and reject conflicting profile ownership. Human login/2FA hands control back safely; a headless host does not pretend to display a window.
- **U04:** No password database or browser-session data appears in Git, traces or API output. External content cannot become authority to change rules; localhost requests do not bypass control authorization.
- **U05:** Read-only services work offline without mutation, initialization or paid calls. Plan cannot implement or delegate writes; fix does not run backlog work; verify remains human review.
- **U06:** Logs, usage and status describe observed outcomes, with unknown data and truncation explicit. Teacher uses only exposed evidence. Low disk, unavailable login, quota and repeated failures preserve work and keep a running daemon controllable.
