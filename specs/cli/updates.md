# Promptbook self-update

[Main specification](../_main.md) · [Configuration compatibility](configuration-migrations.md)

Self-update targets the installation actually running, independently of the destination project and [harness updates](harness-updates.md). Identify current version and local/global scope correctly. Do not update another project's copy or every installation on the machine.

Early interactive init may check for a newer applicable release. New-project intent remains the first question; retain that draft through technical decisions. Offer an available optional update with Yes focused, showing current/target versions and affected installation. No may continue with the current engine **only when it is compatible with the project's configuration**.

A saved `promptbookVersion` newer than the running engine is a separate required compatibility gate before project work/configuration writes. Explain both versions and offer this same update flow. Declining, unavailable updates or failure cannot downgrade the project or bypass the gate. Noninteractive use gives the actionable update/rerun requirement without silently accepting consent. Read-only inspection can still report incompatibility.

Yes updates the same installation: originating project dependency for local invocation, active global installation for global invocation. Preserve existing dependency versus devDependency placement. After success, end the invocation before target setup and ask for a rerun. Keep accepted intent/assets as a recoverable bounded draft without premature project publication; do not demand repasting or pretend the already-loaded engine changed in place.

Update failure can offer retry or continued current-version operation only where compatibility permits it. Noninteractive optional update/skip must be explicitly supplied; no hidden prompt or accepted interactive default. A requested successful update still ends with a rerun instruction.

Optional release lookup is bounded/best-effort: offline lookup is unknown, not up-to-date, and does not prevent compatible local initialization. The known project-version gate still applies offline. Unsupported update methods are diagnosed without mutating a different install. Read-only commands perform no update, and a live agenda never replaces its executing engine mid-task. Configuration migration after a compatible rerun preserves customized project Books.

See [installation](installation.md), [initialization experience](initialization-ui.md) and [version display](help.md).
