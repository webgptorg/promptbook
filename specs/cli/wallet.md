# Wallet: project credentials and verified login

[Sub-engines](sub-engines.md) · [Project encryption](project-encryption.md) · [Browser tools](browser.md) · [Human interactions](user-interactions.md) · [Storage and Git](storage-and-git.md)

**Wallet** is one project-owned credential-manager sub-engine, intended as the user's ordinary manager for service accounts, passwords and TOTP generators. It is not a Book entity, agent, cryptocurrency wallet or tool type. Projects retain separate vaults even when sharing a browser profile. The sub-engine works with zero clients and has its own dashboard tile/page.

## Access without exposing credentials

An agent missing website authentication requests Wallet login with the actual service origin, target browser/tab, required account context and affected work. It does not request credentials in chat, read/decrypt the vault, fetch secrets into model context or type them itself. The trusted Wallet/browser integration applies protected values directly and returns only redacted progress, waiting, failure or verified success. Headless/headful use the same contract.

Reuse an already authenticated suitable session. Otherwise use matching stored credentials automatically without per-use approval. Actual origin/account matching prevents a page's instructions from redirecting secrets to another service. Shared-profile account interference remains a [known limitation](known-limitations.md), not a new automatic account-isolation requirement.

## One continuing login workflow

The unit of completion is **verified access to the requested service/account**, not saving credentials or submitting a form. Input, trusted browser interaction and verification form one continuing workflow. Progress may request further fields, a TOTP factor, mobile approval, consent or manual takeover of the existing headful browser. New steps extend the current request rather than create repeated disconnected prompts.

Keep one durable request for the same unresolved service/account/login context. Do not collapse distinct accounts together or create duplicate credential records just because a login retried. Preserve affected-work links, current step, supplied-factor state and safe resume point across restart. Rejected input returns that same workflow to the relevant protected field with an actionable failure; bound retries and do not consume repeated model calls waiting for a human.

A protected save immediately clears the answered input's attention and permits verification, but does not mark the whole login request successful or unblock access-dependent work. Report verifying/waiting/failed states honestly. Only verified session access completes the request and resumes affected work once. A new genuinely necessary human step sets attention on that same workflow.

Checkpoint affected work and release safe capacity while waiting. A Wallet wait does not stop independent tasks, supervision or the engine. Manual login in the existing headful browser remains possible with optional protected remembering. Do not claim a GUI exists on a headless host or require a new remote desktop/VNC/screen-sharing product now.

## Protected records and forms

Use [project encryption](project-encryption.md), not plaintext `.env`, `ptbk.json` or Books. Persist service/origin, account context, editable label, username, password and supported generator parameters in the encrypted store. Vault/encryption files stay ignored and survive ordinary restart/cache cleanup; do not commit even their ciphertext.

Derive a useful initial item label from service and account, rather than a meaningless placeholder. The owner can rename it. In add/update and pending-login forms, **username is visible by default; password is masked by default**. Both have independent show/hide controls (terminal Ctrl+R for the current field; accessible buttons in browser UI). Masked typing shows neutral characters or equivalent feedback, never a blank unresponsive field. Toggling preserves the entered value and never submits. New forms reset to these defaults; erase secret entry before advancing/cancelling.

Owner-controlled reveal of newly entered values is confined to the protected surface. Ordinary views, agent APIs, browser observation/JavaScript/CDP, model tools, logs, traces, screenshots/video and diagnostics never receive raw secrets. API clients cannot submit arbitrary decryption requests. Harness API-key/native-auth setup retains its existing environment/native-store rules; do not silently migrate all credentials now.

## TOTP and other factors

Store a **TOTP generator**, not a succession of expiring codes: secret plus the algorithm, digits, period and applicable service/account metadata required to generate codes correctly. Existing generators may be imported through a secret/configuration value or export QR in protected Wallet input. QR payloads and generator secrets stay outside agent context, Git and evidence. Generate/apply each current code inside the trusted boundary.

A one-off human code is temporary input for the current login step, not a reusable generator or durable ordinary record. If the owner cannot export an existing generator, offer the actually required manual code/approval step without pretending the factor was imported. Preserve the same request during factor entry, mobile confirmation or takeover. Solve challenges autonomously when supported and authorized, including browser CAPTCHA under [browser instructions](browser.md); request human action only when it is genuinely needed.

## Autonomous management and human intervention

Use the shared minimal-interruption principle within authorized work. Agents can request technical corrections/updates that the trusted Wallet performs without routine human reapproval. Merely changing a saved record or advancing a login does not automatically require a confirmation window.

When a human's decision or action is actually required, use Wallet's own attributed protected notice/form, not a request to approve a secret operation in agent chat. Ask only for the missing input/action, such as a code, mobile approval or an otherwise unresolved consequential access decision. Preserve the user's explicit account/authority constraints.

For example, an agent may create a new service account needed for authorized work and have its generated credentials saved by trusted Wallet operations without an extra routine confirmation. This is an example of Wallet use, not a separately specified account-registration subsystem.

Management adds/updates/removes records through shared operations with atomic recovery and no unrelated-record changes. Meaningful mutations follow the default-on, disableable [nonsecret Git audit](storage-and-git.md#wallet-operation-audit); failures in audit persistence never cause a successful service action to repeat.

## Initialization and presentation

Init offers **Set up Wallet now?**, default No. Yes uses precisely the same protected initialization and 12-recovery-word flow as later dashboard/first use, without duplicating logic or recreating an initialized vault. No defers it. After chosen/reused setup, offer the same optional Bitwarden import before init completes, with individual/all/none selection and no later mandatory dashboard visit.

The home tile gives a compact ready/empty/waiting/failure summary and pending count. Its page lists nonsecret service/account labels, workflow progress and protected management actions. Never present keys, passwords, codes or recovery words as ordinary state or chat text. Recovery words appear only in deliberate protected setup/restoration/replacement flows. Requests are Wallet actions, not a fourth Book entity; chats may contain a nonsecret reason/link/outcome.

## Import and recovery management

Provide the shared extensible [Bitwarden importer](wallet-import.md) in Wallet and optional init setup, with individual/all/none selection, duplicate/conflict handling and whole-record encryption. Selected routine access should not require a later dashboard configuration visit.

The Wallet page offers [new recovery words or reset](wallet-recovery.md): if a valid host/other key can decrypt it, re-encrypt all contents with fresh words and preserve records; if all keys/words are lost, only a strongly warned, separately confirmed empty reset is possible. Keep account/service metadata encrypted too. No plaintext account index or routine login/update approval is introduced.

## Acceptance outcomes

Test init No/Yes/later setup with one implementation. Username starts visible, password masked with typing feedback; independent reveal preserves values, never submits and resets correctly on new forms. Useful editable labels survive restart.

Exercise stored and missing credentials, rejection, extra login fields, imported TOTP secret/QR, one-off code, mobile approval and manual takeover. Repeated attempts keep one request/record and accurate step state. Saving a password clears only that input attention; failed/unverified access never releases dependent work. Verified access resumes once after restart and keeps unrelated work running.

Verify origin/account matching and exclusion of all secret material from Git, ordinary API/status, model tools, browser observations and recordings. Perform authorized technical updates without automatic approval prompts; genuinely necessary human steps use protected Wallet input. Audit meaningful mutations separately, including empty commits and disabled audit, without versioning the vault or rerunning successful external effects.
