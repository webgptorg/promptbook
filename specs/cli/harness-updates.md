# Harness updates

[Main specification](../_main.md)

Harness updates are independent of [Promptbook self-update](updates.md). They operate on the selected harness's global system installation, which may be shared with other projects and used outside Promptbook. Use the harness's [plugin contract](harness-plugins.md); do not install a private replacement in the project or repeat a healthy login.

## Initialization and setup

Check versions only for the harnesses selected for this setup, after resolving their installation. Do not check/update the entire supported catalog merely because it exists.

If one selected harness is outdated, offer update or keep the current version. If several are outdated, offer **Keep current versions**, **Update all outdated selected harnesses**, or **Choose individually**. Use the shared [single-choice picker](interactive-ui.md#predefined-choices) for this decision and a checkbox picker for Choose individually, including only outdated selected harnesses. Never require typing harness identifiers to select updates. Current harnesses need no update prompt. Show the global scope and actual outcome; declining an update does not make an otherwise compatible harness unusable.

## Ongoing start

By default, start checks enabled harnesses before use and automatically updates outdated ones. Recheck during ongoing operation at bounded intervals so later launches can use updates without restarting the agenda. Configuration and temporary CLI overrides can disable automatic harness updates.

Apply updates at a safe boundary, never by replacing a harness under an active invocation or racing another Promptbook project using the shared installation. Verify the resulting version and readiness before subsequent work. Do not alter account choice, API-key permissions or selected model requirements as a side effect.

Offline checks, unavailable permissions and failed/unsupported updates are visible maintenance outcomes, with diagnostic evidence. An unknown latest version is not proof of currency. Continue on the existing version only if it remains usable and compatible; otherwise block affected work without losing it. Do not retry updates in a tight loop or mark them successful on command launch alone.
