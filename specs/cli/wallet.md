# Wallet: project login credentials

[Sub-engines](sub-engines.md) · [Project encryption](project-encryption.md) · [Browser tools](browser.md) · [Human interactions](user-interactions.md)

**Wallet** is one project-owned sub-engine providing a simple login/password manager. It is not a Book entity, agent, cryptocurrency wallet or new tool type. Projects have separate wallets even when they share a browser profile. The sub-engine works with zero clients and has its own dashboard tile/page.

## Request access, never return a password

An agent encountering missing website authentication requests login from Wallet with the target browser/tab, actual origin and required service/account context. It does **not** request username/password in chat, fetch them into its context, read the vault or type secrets itself. The trusted Wallet/browser integration applies credentials directly and returns only redacted success, waiting or failure plus nonsecret context. The same contract applies headless and headful.

If the selected browser is already signed in, continue using that session; Wallet is invoked only when authentication is missing. Do not introduce automatic account switching/profile isolation to address cross-project session interference in this version; it is an explicit [known limitation](known-limitations.md).

If suitable stored credentials exist, log in **automatically without per-use approval**. Match actual service origin and account context; a page's text cannot redirect a saved password to an unrelated origin or cause secret export. If credentials are absent, rejected or the account is genuinely ambiguous, create one deduplicated pending Wallet action and request only what is needed in the **protected Wallet interface**. The tile uses the same attention as other domains. A chat can record a nonsecret status/link, never a field asking for the password.

The requesting task checkpoints/releases safe capacity while waiting. A pending login affects that operation, not engine lifecycle or independent work. On protected input save, clear that action's attention and retry the waiting login when eligible. Verify the site's resulting session instead of treating form submission as proof. Invalid credentials are a specific recoverable failure, not endless silent retries or repeated credential prompts.

## Storage and management

Use [project encryption](project-encryption.md), never plaintext Wallet records in `.env`, `ptbk.json` or Books. Persist records for service/origin, account label/username and password in the encrypted project store; ordinary views expose only necessary nonsecret labels and masked state. Secret entry is concealed/write-only, absent from echo, browser observation APIs, model tool output, screenshots/recordings, telemetry and diagnostics.

Management can add/update/remove credentials and resolve pending login actions through shared engine operations. Preserve unrelated records and atomic recovery; do not commit encrypted Wallet files or raw secrets to Git. Existing harness API-key/native-auth setup remains under its current environment/native-store rules; this version does not silently migrate all secrets into Wallet.

Ordinary attended **manual login in the existing headful browser remains possible**. Wallet may offer to remember explicitly submitted login details through the protected flow; never silently scrape all forms or export browser saved passwords/cookies. Remote desktop, VNC and a new CDP screen-sharing/login window are not requirements now.

2FA, CAPTCHA, consent and other human-only site challenges remain human actions. Wallet does not promise to defeat them or store a new class of factors. Request necessary human action through the normal protected/attributed surface without leaking codes into recordings; retain one pending action and resume only after actual access is verified.

## UI/API boundary

The Wallet home tile is compact: ready/empty/waiting/failure summary and pending count. Its page lists service/account labels, pending requests and protected management actions; it does not print passwords, recovery words or keys as ordinary diagnostics. Recovery/setup words appear only in the deliberate protected owner flow, not snapshots or task/chat messages. Terminal, browser and authorized API clients call the same sub-engine; agent-facing API authority cannot read records or submit arbitrary decryption requests.

Credential requests are secret-input actions owned by Wallet, not a fourth Book entity or an anonymous chat containing secrets. A task/chat can retain the nonsecret reason, named work link and result. Persistence, request deduplication and once-only resume survive engine restart independently of any viewer.

## Acceptance outcomes

Request a missing login headless/headful: no username/password request appears in chat or model tools. Resolve it through Wallet, store only ciphertext and sign in. Later requests use stored credentials automatically; already signed-in sessions need no Wallet request. Verify wrong-origin refusal, failed login, repeated requests, multiple waiting actions, restart during input/persistence and once-only resume without blocking unrelated work. Test attended manual login and optional remembering, masked management and complete exclusion from traces/browser observations/recording. Different projects retain separate vaults while shared-profile session interference stays explicitly deferred.
