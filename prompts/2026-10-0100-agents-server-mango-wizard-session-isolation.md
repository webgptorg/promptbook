[ ] !!!!!

[✨🥭] Isolate every manGo new-agent onboarding session

Fix the Agents Server's manGo wizard so creating a second agent never reuses the previous agent's brief, generated Book, uploaded knowledge, test conversation or saved identity. Each explicit new-agent creation starts a fresh, independent session; navigating between steps of that same session preserves its work.

This is one focused bug fix for `MANGO_WIZARD`, not a redesign of all onboarding modes or a replacement of AI-generated Books with templates.

## Reported problem and reproduction

-   In the same browser tab, open manGo, enter agent A's name and description, generate its Book, attach a distinguishable file/link, optionally test the agent, and complete creation.
-   Leave through the ordinary completion/navigation or close path, then use the application's normal new-agent action to create agent B. Do not manually clear browser storage between these operations.
-   Enter a clearly different name and description for B and advance to Book generation. The reported failure is that the Book still reflects A's description and A's uploaded files or other draft data remain associated with the new flow. The problem is not merely an incorrect displayed title.
-   B must instead generate from B's current inputs and start with no inherited knowledge, test history, saved agent identifier or completion state. Saving B must create a distinct agent without changing A. Repeating the process for C must work as well.

## Inspected implementation and investigation boundary

The following observations come from source inspection at `cc82cd1c97d8bc1cdb251d401a0ab62a29c296f1`; they are reproduction leads, not a claim that a browser regression test has already been run:

-   `state/OnboardingProvider.tsx` hydrates every provider mount from the same `sessionStorage` key, `onboarding:v2`. That snapshot includes `agentName`, `agentBrief`, `bookSource`, `knowledge`, `testMessages`, `savedAgentId` and `savedAgentTargetPath`, with no creation-session identity.
-   `ZadaniStep.tsx` updates the name/brief independently. `BookStep.tsx` treats any nonempty hydrated `bookSource` as ready and skips generation; it does not establish that the Book belongs to the current new-agent request.
-   `DoneStep.tsx` persists the saved agent identity and uses it to skip creation on a revisit. Its explicit start-over button calls `reset()`, but the normal host open/close and open-created-agent paths in `useNewAgentDialog.tsx` do not establish a fresh manGo storage scope.
-   Generation, upload and creation callbacks can update wizard state after asynchronous work completes. Inspect their ownership across close, reset, replacement and hydration rather than fixing only the visible form fields.
-   The inspected server helper `runManGoLiteAgent` already constructs a new `LiteAgent` per invocation. Do not assume a shared backend agent singleton is the cause. Trace the actual client payload and any relevant request/cache state before changing backend behavior.

## Session lifecycle and state ownership

-   Establish one explicit creation-session boundary at the shared new-agent entry point. Every fresh manGo opening, including opening again after completion, closing/cancelling and starting another agent, and the in-wizard start-over action, gets a new session identity and initial state.
-   Session identity must not be derived only from the agent name, current user, folder or wizard mode. Two consecutive creations can use the same display name and still be different sessions. Keep the identity stable across normal re-renders, step transitions and retries within the active draft.
-   Initialize all draft-owned state together: name, brief and additional inputs; generated/edited Book and editor state; knowledge items, upload references/progress and file inputs; test messages and evaluation results; validation/generation/save errors; pending-operation flags; saved agent ID/target route; and current step. Use a fresh state factory or equivalent non-shared state initialization, including fresh collections.
-   Preserve intentional host configuration, such as current folder, server-configured default visibility, authentication and wizard selection. These are not previous-agent content and must not be erased by a draft reset.
-   Going Back/Next within one session must retain that session's Book edits and knowledge. Do not implement isolation by resetting on every step mount, name keystroke or render, or by assigning a new React key on every render.
-   A new session must never briefly display or submit the previous snapshot while hydration/reset effects are running. Resolve freshness before accepting restored data or launching generation/creation. A remount alone is insufficient while it still reads the old global key.

## Persistence and cleanup

-   Replace the unscoped last-onboarding snapshot with session-owned persistence if persistence is retained. Validate the stored schema, session identity and applicable authenticated-user/server scope before restoring it. Never infer that the last saved draft is the intended new agent.
-   Existing same-draft recovery may remain only for an explicitly identified unfinished session. A fresh New agent action always starts clean; it is not an implicit resume. No new draft-management interface is required for this fix. Document the supported reload/recovery behavior.
-   Prevent legacy `onboarding:v2` data from being silently imported into a fresh session, including browsers that already contain A's completed snapshot. Ignore or narrowly retire that obsolete wizard-owned entry; do not clear all `sessionStorage`, `localStorage`, authentication data, caches or unrelated drafts.
-   Closing, abandoning, completing or replacing a session must invalidate its future updates and restore eligibility. Keep enough session-local success information for the completion screen and the correct open-created-agent action, but never make a completed draft the starting state of the next creation.
-   Cleanup must affect only the owning session. Late cleanup from A must not delete B's stored draft. Malformed, unavailable or quota-limited storage must fall back safely to isolated in-memory state rather than resurrecting another session or preventing ordinary creation.
-   Resetting knowledge means removing draft associations and transient UI resources, not deleting uploaded objects used by an already saved agent. Preserve A and its knowledge. Reuse existing safe orphan-cleanup rules where available; do not introduce broad storage deletion or a new garbage-collection subsystem.

## Correct generation and asynchronous isolation

-   Generate B's Book from B's current name and description through the existing Book-generation service. Do not reuse A's Book and replace only its title, and do not send A's brief, knowledge or test messages as hidden generation context.
-   Associate generated results with their owning session and input/request revision. Within a draft, preserve manual edits on ordinary navigation. When the user requests generation after changing its inputs, use the latest inputs; do not silently label a stale generated Book as newly generated. Preserve the editor's deliberate regenerate/replace behavior rather than erasing edits on every input change.
-   Guard generation, upload/extraction where present, test/review and creation callbacks with ownership checks. Abort superseded work where supported, and also reject late results when cancellation cannot stop an already running request. Session guards must cover persisted writes and callbacks, not just React rendering.
-   A delayed response, rejection or `finally` from A must not overwrite B's Book, append A's attachments, set B's error/loading state, repopulate old storage, mark B as saved, or close/navigate B's dialog. Apply equivalent request-revision protection to out-of-order regeneration within a single session.
-   Preserve successful concurrent uploads belonging to the same active session. Removing an item must not let its eventual upload result reattach it. Reusing a filename for a later agent is not consent to reuse the earlier attachment association.
-   Final Book composition, live tests and the classic Book-editor handoff must use only the active session's deliberately supplied content. Verify the actual `KNOWLEDGE` commitments and creation payload, not only the visible list.
-   Keep the existing create-agent service, permission checks, folder/visibility semantics and per-draft duplicate-submission protections. Session initialization or development-mode effect re-execution must not create an agent twice. Failures must retain the current draft for retry; successful save must retain the correct result identity without contaminating a later session.
-   A client cancellation cannot undo a server creation that has already succeeded. Associate any such outcome with its original operation and preserve the created agent; never reinterpret it as B's success, automatically retry a known successful creation, or delete an existing agent as cleanup.

## Architecture and scope

-   Give the host/controller responsibility for starting and ending creation sessions, the provider/state layer responsibility for draft ownership, and focused helpers responsibility for storage validation and asynchronous result acceptance. Keep step components concerned with their step's UI and actions.
-   Use one shared lifecycle/reset policy for all manGo entry and exit paths. Do not scatter independent field-reset lists or ad hoc storage removal across buttons and effects, copy the whole wizard, or add another mutable singleton holding the current agent.
-   Sharing immutable helper Books, stateless utilities and appropriately scoped infrastructure is fine. Do not globally disable caching, force users to reload the application, change models, or rewrite the underlying agent engine to hide this bug.
-   Preserve the other onboarding modes and existing same-draft handoff to the classic editor. A deliberate handoff carries the current Book; a later unrelated new-agent opening does not. No new workflow, deployment, model integration or database redesign is required.

## Acceptance criteria and regression tests

-   Add a deterministic reproduction against the actual host/provider/step integration, with mocked generation, uploads and agent persistence. At least the stale-snapshot regression must fail on the inspected baseline and pass after the fix.
-   Create A with a unique brief, Book marker, file/link and test message; leave normally; create B without clearing browser storage. Assert B's empty initial draft, the generation request containing only B's inputs, B's generated and saved source containing no A-only marker/knowledge URL, and a new saved ID/target. Verify A remains unchanged. Repeat for C, including one creation with the same name but a different brief.
-   Cover both the ordinary host new-agent action and in-wizard start-over, completion-to-chat followed by new creation, cancellation/reopen, and repeated step navigation. Navigation retains the active draft's manual Book edits and files; fresh creation does not.
-   Seed old `onboarding:v2` snapshots with both incomplete and completed A data, including saved identifiers. Neither may suppress B's generation/creation or redirect to A. Test corrupt storage and storage access/write failures without using global storage clearing as test setup between A and B.
-   Resolve/reject A's mocked generation, upload, test/review and creation promises after B starts. Assert that B's in-memory state, persistent state, UI and host navigation are unaffected. Also cover out-of-order regeneration, a removed pending upload, concurrent valid same-session uploads, and stale cleanup.
-   Test generation/save error and retry within the same session, duplicate submission/effect re-execution, and correct success navigation. No valid current work is lost and no duplicate agent is created merely by remounting or resetting another session.
-   Verify independently opened sessions do not contaminate each other, including another tab and applicable account/server changes. Preserve normal host defaults, folder/visibility settings, classic-editor handoff and the other wizard modes.
-   Run relevant existing tests and Agent Server type/lint/build checks for touched code. Record the reproduced cause and exact verification results, distinguishing source inspection from executed browser tests. Use fixtures and deterministic mocks; no paid model calls, real user uploads or production agent mutations are required.

## Context and documentation

-   Inspect the [shared new-agent controller](../apps/agents-server/src/components/NewAgentDialog/useNewAgentDialog.tsx), [manGo host](../apps/agents-server/src/components/NewAgentDialog/ManGoNewAgentWizard/ManGoNewAgentWizard.tsx), and [state/storage provider](../apps/agents-server/src/components/NewAgentDialog/ManGoNewAgentWizard/state/OnboardingProvider.tsx).
-   Follow [assignment input](../apps/agents-server/src/components/NewAgentDialog/ManGoNewAgentWizard/components/steps/ZadaniStep.tsx), [Book generation](../apps/agents-server/src/components/NewAgentDialog/ManGoNewAgentWizard/components/steps/BookStep.tsx), [knowledge uploads](../apps/agents-server/src/components/NewAgentDialog/ManGoNewAgentWizard/components/steps/KnowledgeStep.tsx), and [creation/completion](../apps/agents-server/src/components/NewAgentDialog/ManGoNewAgentWizard/components/steps/DoneStep.tsx), including their shared services and tests.
-   Inspect the [server-side manGo runtime](../apps/agents-server/src/utils/manGoOnboarding/manGoOnboardingAgentRuntime.ts) and its API callers to verify request isolation without assuming a singleton defect.
-   Keep the implementation DRY, update relevant onboarding documentation and lifecycle comments, and add the implemented fix to the [current changelog](../changelog/_current-preversion.md).
