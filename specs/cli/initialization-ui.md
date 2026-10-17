# Initialization experience

[Main specification](../_main.md) · [Initialization behavior](initialization.md) · [Shared CLI interaction](interactive-ui.md)

Init is a short, attended journey with a beginning, visible progress and an end. Its functional choices and saved artifacts are defined separately in [initialization](initialization.md). The dashboard is an optional, indefinitely available operating view, not the final wizard page or a prerequisite for unattended work.

## Intent first

Open a new initialization with one generous, focused field asking what the user is working on. Accept a short phrase, a full brief, long pasted text and images or other attachments together. Do not ask the user to separately author a first task. Use the shared [rich composer](rich-input.md), with compact paste/attachment tokens instead of dumping long payloads into the terminal.

Previously supplied input and resumed drafts are retained. Technical questions follow the intent field. Existing-project maintenance reuses its purpose rather than presenting a blank-project creation form.

## Guided, bounded progress

Keep the current step name and a meaningful `Step X of Y` visible throughout the wizard. Count user-facing steps, including grouped steps, rather than internal operations. Account for skipped prerequisites and conditional branches; when choices change the remaining path, update its total honestly. Reused setup steps must not appear as unfinished work. Installing or authenticating may have an indeterminate duration, but the user can still see its place in the overall journey; do not fabricate a completion percentage or time estimate.

Present the **Browser profile** picker with four clearly named choices: dedicated global Promptbook profile **(default)**, isolated per-project profile, user's existing Chrome profile, or a manually supplied custom profile path. Distinguish a Promptbook-created global identity from the user's personal Chrome identity; explain reuse between projects and concurrent-profile ownership. Previously saved choices must not be silently replaced. The headless/headful choice remains independent; see [browser behavior](browser.md).

Group trace choices in a dedicated **Traces** screen with three labeled controls: commit traces to Git, ignore trace videos in Git, and record browser videos. Briefly explain storage/privacy implications and show effective behavior when one choice overrides another. Link their semantics to [trace configuration](trace-configuration.md); noninteractive use has the same decisions without a screen.

Use the same automatically generated [agent visual identity](../agents/visual-identity.md) as the dashboard. The engine-supplied Expert accompanies the wizard as its recognizable guide, with its name visible. This is a local procedural visualization, not a model call or evidence that Expert is already executing the first task. Restrained reactions can reflect input, real setup progress and successful completion. Preserve focus and input; keep errors and required decisions more prominent than decoration.

## Finish, celebrate and leave

After confirmed successful setup and service launch, show a brief, tasteful celebratory terminal effect involving Expert, such as a small confetti-like flourish or happy pose. It should feel polished and rewarding, not noisy, childish or lengthy. It must not require dismissal, delay work, flood scrollback or loop indefinitely. Never celebrate cancelled, incomplete or failed setup as success.

Leave a concise final summary identifying the project, actual engine version, setup result and confirmed service state. Make `ptbk dashboard` the primary next action: the service already runs; viewing it is optional. Offer `ptbk stop` as the way to stop it. Do not hint that a successful default init still needs `ptbk start`, automatically attach the terminal dashboard, or open its browser page. Do not wait for the first task to finish.

Raw/noninteractive output remains finite plain text, with the same truthful outcome and next actions but no animation or input prompts. Respect reduced motion and limited terminals with a static success treatment. The dashboard keeps its distinct live layout, shows the actual agents working in the project and has no step total or overall completion state.

## Acceptance outcomes

Paste a long multiline brief with several images, navigate backward and resize: the input survives and is saved in full, with working project-local asset links. Move through conditional setup: the current step and total remain truthful. Complete setup: Expert celebrates briefly, the service processes its ordinary first task, the terminal returns, and neither dashboard opens. Cancellation, launch failure, raw output and reduced motion never produce a misleading or obstructive celebration.
