# Importing credentials into Wallet

[Wallet](wallet.md) · [Encryption](project-encryption.md) · [Initialization](initialization.md) · [Recovery management](wallet-recovery.md)

## One protected extensible importer

Provide a shared source-adapter/import/selection operation, initially **Bitwarden**, used by init and Wallet. Adding other sources later must not copy validation, selection, encryption or persistence logic. The initial concrete path accepts a standard **unencrypted Bitwarden JSON vault export** through protected owner-controlled local file input, following [Bitwarden export guidance](https://bitwarden.com/help/export-your-data/). Direct live synchronization and other export formats are not required now.

The export contains secrets: keep it outside ordinary chat/composer attachments, project sources, Git, traces, logs, browser observations and model context. Process only inside trusted Wallet, retain no ordinary plaintext working copy and advise the owner to remove the original safely after use; do not silently delete an owner-supplied original. Detect unsupported/encrypted/account-restricted exports and explain the supported path before any Wallet mutation; never claim decryption without support.

Import supported login origins/account identity, editable labels, username/password and available supported TOTP-generator parameters. Retain relevant supported origins rather than arbitrarily choosing a similarly named service. Report unsupported item kinds/fields, invalid origins/factors and skips truthfully. Importing a credential does not verify login or make an unsupported factor available; reuse normal Wallet origin matching and trusted application.

## Selection, existing data and persistence

Protected owner preview shows useful service/account labels and compatible/unsupported/conflict state, never passwords/generator secrets in ordinary lists. Support **individual selection, Select all and Select none**. None/cancel is valid and changes nothing; one deliberate Import applies selected compatible records without repetitive per-item approval.

Preserve existing items. Match actual service/account identity, not label alone; reuse/skip identical duplicates and require an explicit replacement choice for conflicting values, optionally for a batch. Do not overwrite a different account or duplicate items on retries. Report imported/reused/skipped/conflicted/failed outcomes.

Use shared revision-safe Wallet writes with recoverable batch application. Unlock/setup is required; import must not silently reset a locked Wallet. Encrypt entire records including labels/origins/usernames, with no plaintext account index. Interruption/audit failure retains completed writes and protected recovery information, without corrupting unrelated items or importing twice. The default-on disableable [Wallet audit](storage-and-git.md#wallet-operation-audit) can have one scoped nonsecret batch summary; raw exports/secrets never enter Git, and no-op selection produces no commit.

## Init and dashboard parity

Wallet offers Import credentials/source selection. After init's optional Set up Wallet now Yes (or reused setup), offer exactly this import and individual/all/none selection. Wallet No skips it; choosing no import is valid. Reinit preserves existing data/decisions. Reset can reuse the same import afterwards.

Correctly completed attended initialization with required selected integrations/access must suffice for continuing work, without mandatory later dashboard configuration. Show skipped/unsupported/missing access honestly and never require importing the entire vault. Preview/import makes no paid readiness calls and cannot launch the agenda early.

## Acceptance outcomes

Import subsets/all/none through init and Wallet with one implementation. Exercise cancel, repeats, multiple origins/accounts, TOTP, malformed/unsupported/encrypted exports, conflicts, concurrent edits and interrupted writes/audits. Preserve old records and accurate outcomes, exclude source/secrets from ordinary surfaces/Git/agent context, and finish chosen routine setup without later configuration or invented login success.
