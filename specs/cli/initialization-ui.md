# Initialization experience

[Main specification](../_main.md) · [Initialization behavior](initialization.md) · [Shared CLI interaction](interactive-ui.md)

Init is a short attended journey with a beginning, visible progress and an end. After confirmed background start, ordinary interactive init automatically hands off (optionally through the brief visible cancellable countdown) into the same dashboard used by `ptbk dashboard`. `--no-dashboard` suppresses that viewer handoff. This is a handoff from finite setup to an independent viewer, not a special initializer dashboard or a prerequisite for unattended work. Functional saved choices are defined in [initialization](initialization.md).

## Intent first, simple tool choices

Open new initialization with one generous field asking what the user is working on. Accept prose, long pasted material and images/files through the shared [rich composer](rich-input.md), with inspectable compact tokens instead of terminal payload dumps. Retain supplied input and resumed drafts. Existing-project maintenance reuses recorded purpose and does not request a replacement brief. Do not ask for a separate first task.

After intent, offer the three [destinations](initialization.md#initial-input-and-destination) in order: shared home-based PTBK projects folder, current directory, new subfolder. Explain existing-work versus new-agenda use, reuse an explicit destination and show the resolved path before writes.

Offer **Use the global CLI** first/preferred and local installation second, respecting an existing destination-local dependency. For a fresh selection, preselect installed and verified-ready harnesses; executable presence alone is insufficient. Let users deselect them and retain explicit/prior selections.

Offer **Set up Wallet now?**, default No. Yes opens the same protected setup/recovery-word flow as later Wallet management; No proceeds without it. Existing vaults are preserved.

Keep the familiar selected-harness featured/More flow and one **Browser profile** picker: dedicated global Promptbook profile (default), isolated project profile, user's existing Chrome profile, or custom path. Explain the difference between dedicated and personal identities and safe sharing; preserve previous choices. Headless is independent. Unified tools are an internal/configuration improvement, not a requirement to ask about advanced instance naming, account pools, multiple browsers or fallback chains in the normal wizard. Those are managed later.

Harness selection must visibly warn when the selected set is empty, explaining that no model work can run and Router cannot receive its concrete initial selection. Preserve the user's current selection and offer the normal navigation to choose a harness; do not silently select one, claim successful readiness or hide the empty selection behind a later cryptic failure.

There is **no check-command question**, script picker or validation-deferral screen. Missing validation receives the explicit informational placeholder described in [checks](checks.md); the wizard does not claim real tests passed. Existing real validation is preserved.

## Bounded progress and conditional synchronization

Show a meaningful `Step X of Y` and current step throughout. Count actual user-facing/grouped steps, including conditional branches and skipped/reused prerequisites. Update totals honestly when choices change. Installation/authentication duration may be indeterminate, not a fabricated completion estimate.

Add **Automatic synchronization**, default off, reusing an existing decision. No ends this branch immediately. Yes offers GitHub publication or another supplied Git origin; GitHub visibility defaults private and public is an explicit choice. Show the intended repository/destination clearly and report local setup separately from remote publication. Follow [synchronization setup](synchronization-setup.md), without exposing unsupported dedicated GitLab onboarding. Do not add an interval-configuration question.

Keep a dedicated **Traces** screen with three controls: commit traces, ignore videos in Git, and record browser videos. Explain privacy/storage and effective parent/video exclusions using [trace configuration](trace-configuration.md). Noninteractive mode supplies the same decisions without screens.

Expert is the recognizable procedural visual guide, using the same [agent identity](../agents/visual-identity.md) as the dashboard. This is not a model call or evidence that bootstrap work is already executing. Restrained reactions can reflect actual progress, with decisions/errors above decoration. Preserve focus and drafts through resize and backward navigation.

## Finish, celebrate and hand off

After successful local setup and confirmed service launch, show a brief tasteful Expert celebration and short visible countdown to the ordinary project dashboard, without a long delay, looping animation or scrollback flood. Never celebrate failed/cancelled local setup as success. Remote publication may still be pending; make that qualification explicit rather than claiming full synchronization success.

Leave a concise summary of project, actual engine version, local setup, confirmed service state and relevant pending synchronization. Unless `--no-dashboard` is set, interactive countdown permits Enter to open the dashboard immediately and Escape/Ctrl+C to skip the viewer handoff and return; skipping or later closing the viewer leaves the engine running. On expiry, attach the existing shared dashboard without another start, initialization or worker. With `--no-dashboard`, raw/no-UI/noninteractive mode reports and returns without a countdown or automatic viewer. Never wait for the first task's result; reduced motion removes animation without losing actions or truthful status. Always leave `ptbk dashboard` and `ptbk stop` available as ordinary commands.

## Acceptance outcomes

Preserve a long brief and ordered attachments through navigation/resize and save them verbatim. Verify the old simple tool selectors, no check-command prompt, correct placeholder labeling and conditional sync step totals. No skips all remote questions; GitHub defaults private; custom origin remains available. Complete local setup and start without waiting for bootstrap or requiring an open view. Cancellation/launch failure never produces false celebration, and remote failure is shown independently while safe local work continues.
