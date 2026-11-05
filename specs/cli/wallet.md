# Wallet: project credentials and verified login

[Sub-engines](sub-engines.md) · [Project encryption](project-encryption.md) · [Browser tools](browser.md) · [Live tab control](browser-tab-control.md) · [Human interactions](user-interactions.md) · [Storage and Git](storage-and-git.md)

**Wallet** is one project-owned credential-manager sub-engine, intended as the user's ordinary manager for service accounts, passwords and additional reusable login fields. It is not a Book entity, agent, cryptocurrency wallet or tool type. Projects retain separate vaults even when sharing a browser profile. The sub-engine works with zero clients and has its own dashboard tile/page.

## Access without exposing credentials

An agent missing website authentication requests Wallet login with the actual service origin, target browser/tab, required account context and affected work. It does not request credentials in chat, read/decrypt the vault, fetch secrets into model context or type them itself. The trusted Wallet/browser integration applies protected values directly and returns only redacted progress, waiting, failure or verified success. Headless/headful use the same contract.

Reuse an already authenticated suitable session. Otherwise use matching stored credentials automatically without per-use approval. Actual origin/account matching prevents a page's instructions from redirecting secrets to another service. Shared-profile account interference remains a [known limitation](known-limitations.md), not a new automatic account-isolation requirement.

## Autonomous account discovery

Before Wallet use, inspect/reuse a suitable existing browser session and verify its account. Agents may list intentionally nonsecret service/account metadata, including labels, usernames and emails, through trusted Wallet operations; secrets never enter their context and the stored records remain fully encrypted with no plaintext index. Several supplied accounts may be inspected/used in one assignment according to context, including company databoxes, social accounts, email senders and calendars. Do not routinely ask the user to select one when context or identity checks can resolve it.

Credential discovery recognizes verified related service domains, subdomains and redirects instead of exact-origin equality alone. For example, a Google service can discover an accounts.google.com credential. Discovery does not weaken secret application: verify the real login destination and service/account relationship, never trust an arbitrary page's claim. Avoid duplicate credentials or another request for already stored details.

Add/update verification and explicit per-item **Test** use the same [credential testing/login logic](wallet-testing.md). Apply the [authentication examples](../concepts/minimal-interruption/authentication-examples.md) and common DRY operations across init, Wallet and ordinary login.

## One continuing login workflow

The unit of completion is **verified access to the requested service/account**, not saving credentials or submitting a form. Input, trusted browser interaction and verification form one continuing workflow. Progress may request further fields, a TOTP factor, mobile approval, consent or [manual control of the relevant browser tab](browser-tab-control.md). New steps extend the current request rather than create repeated disconnected prompts.

Keep one durable request for the same unresolved service/account/login context. Do not collapse distinct accounts together or create duplicate credential records just because a login retried. Preserve affected-work links, current step, supplied-factor state and safe resume point across restart. Rejected input returns that same workflow to the relevant protected field with an actionable failure; bound retries and do not consume repeated model calls waiting for a human.

A protected save immediately clears the answered input's attention and permits verification, but does not mark the whole login request successful or unblock access-dependent work. Report verifying/waiting/failed states honestly. Only verified session access completes the request and resumes affected work once. A new genuinely necessary human step sets attention on that same workflow.

Checkpoint affected work and release safe capacity while waiting. A Wallet wait does not stop independent tasks, supervision or the engine. **Sign in manually** is available whether the selected browser is headless or headful. It uses the same request and browser profile as automatic sign-in. While the user controls the tab, Wallet may show that sign-in was detected. Work waiting on the controlled session stays at its checkpoint until the explicit handoff and access revalidation.

## Remembering a password from manual sign-in

Entering credentials directly in a protected Wallet form uses its normal save flow. Entering them on a website in the live tab permits sign-in. Wallet may offer to save or update a reusable username and password only after it can reliably associate the submitted credential with successful sign-in to the actual service and account. Use trusted, narrowly scoped login-form evidence. Do not log keystrokes, infer secrets from arbitrary fields or retain one-time codes, QR values, security answers or other additional factors from the stream.

Show **Save to Wallet?** or **Update password in Wallet?** with the verified service/account in the owning CLI dashboard or desktop controls, outside the streamed website. Offer **Yes** and **No** for this occurrence. Keep the prompt nonblocking, with no automatic consent or persistent Always/Never choice. A credential already saved with the same values needs no prompt. A sign-in on another site after navigation may produce its own offer only when its actual service and account are verified independently of the original request.

**Yes** uses ordinary encrypted Wallet add/update operations with duplicate and revision checks. The saved credential can be used on a future sign-in if the current session expires or the browser restarts. Use evidence of this exact credential where available under [credential testing](wallet-testing.md). **No**, dismissing the offer or losing the surface discards the transient candidate and preserves the current browser session and any existing Wallet record. Both choices leave the current sign-in in place without a second login. A save result is independent of the explicit **Return control to agent** action. An unanswered offer must not delay handoff and is discarded if handoff ends the surface.

Keep only the minimum candidate in protected memory while the offer is current. Discard obsolete candidates on replacement, rejection, handoff or session loss. A stale response cannot save another site's credential or overwrite a newer record. Report failed saves separately from authenticated access. The offer and any values remain outside agent tools, chat, logs, traces and Git.

## Resolution during protected input

Every attention-producing login request retains its initiating agent as [responsible owner](notifications.md#ownership-and-continuing-relevance); system-originated requests belong to Fixer. Wallet supplies trusted technical evidence, and uncertain authentication/relevance waits use [progressive waiting](../concepts/progressive-waiting.md). Automatic agent assessments obey Pause; existing deterministic verification and explicit protected user input retain their normal lifecycle rules.

If manual login or another authorized route establishes suitable access, verify service, account, permissions and usable browser/session context. A user-controlled tab requires [explicit handoff and revalidation](browser-tab-control.md#exclusive-control-and-handoff) before dependent work can continue in that context. Suitable access through another independent authorized route can resolve its own dependencies while the user's tab stays protected. Complete the satisfied request and retire its human wait/attention without requiring a credential save or separate acknowledgement. A shared successful login can satisfy several matching consumers. Remove only satisfied consumer links. A chat needing A and B still waits on B after A succeeds. Append the owning agent's concise nonsecret explanation to each originating chat, summarizing what is resolved and what remains, without another active User ping. Keep protected records secret and never manufacture chat history for a request with no chat origin.

Do not close/reset an open credential form or discard protected input when the original login need resolves. Show a nonblocking resolved indication and let User leave or finish saving valid reusable credentials for the same item/account for future use. Keep ordinary duplicate/conflict/revision checks; saving after resolution does not reopen the old request or replay its operation. Preserve supplied credentials as unverified until their own [credential test](wallet-testing.md) actually succeeds: existing-session success proves access, not that this password works. Expired/one-off factors cannot revive the old login step or become reusable credentials.

Reconcile a concurrent resolution/save/reject against the current workflow/consumer state. A delayed response cannot change a replacement step or another account. A genuinely new access need, including a later expired session, may create fresh attention, but reopening/restart and an unchanged explicitly rejected request cannot.

## Seen and rejected requests

Provide two separate English actions on a pending human-input request:

- **Mark as seen** acknowledges only its current alert. Clear that occurrence's attention across all clients and the terminal attention marker, but keep the protected request, current fields/step, affected-work wait and pending inventory entry. It is not refusal, approval, credential submission or successful authentication. Opening the Wallet page alone does not perform it.
- **Reject request** explicitly denies and ends this pending request/step and clears its alert everywhere. Return a truthful rejection to the waiting agent; never report login success, invent credentials or resume access-dependent work as authenticated. The agent may pursue another authorized route or report the unmet prerequisite. Do not silently recreate/re-alert the same rejected request on the next poll/retry.

Avoid the ambiguous label Dismiss for either action. Persist/share the seen or rejection outcome with the existing request state and reconcile concurrent save/seen/reject operations without applying a stale action to a later step. A genuinely new necessary human step has new attention; unchanged state, reopen and restart do not. These shared operations use protected Wallet persistence without Git commits. The [temporary effects switch](notifications.md) changes only sound/desktop delivery, never either action's meaning.

## Protected records and forms

Use [project encryption](project-encryption.md), not plaintext `.env`, `ptbk.json` or Books. Persist service/origin, account context, editable label, username, password and supported additional login fields and their persistence/sensitivity metadata in the encrypted store. Vault/encryption files stay ignored and survive ordinary restart/cache cleanup; do not commit even their ciphertext.

Derive a useful initial item label from service and account, rather than a meaningless placeholder. The owner can rename it. In add/update and pending-login forms, **username is visible by default; password is masked by default**. Both have independent show/hide controls (terminal Ctrl+R for the current field; accessible buttons in browser UI). Masked typing shows neutral characters or equivalent feedback, never a blank unresponsive field. Toggling preserves the entered value and never submits. New forms reset to these defaults; erase secret entry before advancing/cancelling.

Owner-controlled reveal of newly entered values is confined to the protected surface. Ordinary views, agent APIs, browser observation/JavaScript/CDP, model tools, logs, traces, screenshots/video and diagnostics never receive raw secrets. API clients cannot submit arbitrary decryption requests. Harness API-key/native-auth setup retains its existing environment/native-store rules; do not silently migrate all credentials now.

## Additional fields and one-time factors

Credentials are not limited to username/password. Support other required fields, such as date of birth or a security answer, with appropriate secrecy and persistence. Persist reusable fields; use clearly one-time SMS/email/TOTP codes only for the continuing login step. When persistence is uncertain, prefer retaining the field encrypted with an uncertainty marker if useful to avoid asking again. Uncertainty does not make a sensitive value ordinary agent-visible metadata. Existing encrypted records remain preserved.

If a factor arrives through an email/channel the agent can already access, obtain it autonomously and complete the protected Wallet flow. Otherwise request only the missing code/mobile approval through Wallet's own protected UI and dashboard attention, never normal chat. A code does not become a reusable credential. Attempt supported authorized CAPTCHA solving and choose stay-signed-in/trust-device options to reduce later human work.

Automatic mobile SMS retrieval and Wallet-owned TOTP-generator import/generation are **future extensions**. Current work must function with accessible-channel retrieval and protected manual factor entry without those features. Preserve any existing encrypted generator data without promising current generation/import support or discarding it during maintenance.

## Autonomous management and human intervention

Use the shared minimal-interruption principle within authorized work. Agents can request technical corrections/updates that the trusted Wallet performs without routine human reapproval. Merely changing a saved record or advancing a login does not automatically require a confirmation window.

When a human's decision or action is actually required, use Wallet's own attributed protected notice/form, not a request to approve a secret operation in agent chat. Ask only for the missing input/action, such as a code, mobile approval or an otherwise unresolved consequential access decision. Preserve the user's explicit account/authority constraints.

For example, an agent may create a new service account needed for authorized work and have its generated credentials saved by trusted Wallet operations without an extra routine confirmation. This is an example of Wallet use, not a separately specified account-registration subsystem.

Management adds/updates/removes records through shared operations with atomic recovery and no unrelated-record changes. Mutations stay in protected storage and create no Git commits.

## Initialization and presentation

Init offers **Set up Wallet now?**, default No. Yes uses precisely the same protected initialization and 12-recovery-word flow as later dashboard/first use, without duplicating logic or recreating an initialized vault. During new-project init, hold pending setup/import records and key material in protected memory until the final project-creation confirmation; do not write project-local vault/encryption files early. No defers it. After chosen/reused setup, offer the same optional Bitwarden import before init completes, with individual/all/none selection and no later mandatory dashboard visit.

The home tile gives a compact ready/empty/waiting/failure summary and pending count. Its page lists nonsecret service/account labels, workflow progress and protected management actions. Never present keys, passwords, codes or recovery words as ordinary state or chat text. Recovery words appear only in deliberate protected setup/restoration/replacement flows. Requests are Wallet actions, not a fourth Book entity; chats may contain a nonsecret reason/link/outcome.

## Import and recovery management

Provide the shared extensible [Bitwarden importer](wallet-import.md) in Wallet and optional init setup, with individual/all/none selection, duplicate/conflict handling and whole-record encryption. Selected routine access should not require a later dashboard configuration visit.

The Wallet page offers [new recovery words or reset](wallet-recovery.md): if a valid host/other key can decrypt it, re-encrypt all contents with fresh words and preserve records; if all keys/words are lost, only a strongly warned, separately confirmed empty reset is possible. Keep account/service metadata encrypted too. No plaintext account index or routine login/update approval is introduced.

## Acceptance outcomes

Test init No/Yes/later setup with one implementation. Username starts visible, password masked with typing feedback; independent reveal preserves values, never submits and resets correctly on new forms. Useful editable labels survive restart.

Exercise stored and missing credentials, rejection, extra login fields, accessible emailed code, protected manual TOTP/SMS input, reusable/uncertain additional fields, one-off code, mobile approval and manual takeover. Repeated attempts keep one request/record and accurate step state. Saving a password clears only that input attention; failed/unverified access never releases dependent work. Verified access resumes once after restart and keeps unrelated work running.

Sign in manually, choose No and hand back the tab. Continue with the authenticated session and require sign-in again after expiry if no usable credential is stored. Repeat with Yes and reuse the saved credential only when a later login is needed. Check updated passwords, wrong accounts, unrelated navigation, failed sign-in, one-time factors, stale save responses, viewer loss and sign-in without handoff.

Verify origin/account matching and exclusion of all secret material from Git, ordinary API/status, model tools, browser observations and recordings. Perform authorized technical updates without automatic approval prompts; genuinely necessary human steps use protected Wallet input. Keep Wallet mutations in protected storage without creating Git commits or rerunning successful external effects.

Exercise Mark as seen versus Reject request from concurrent clients and after restart. Only the former keeps the request waiting; only the latter returns denial. Neither proves access or clears another request/Health incident. Enabled desktop notifications contain only the nonsecret action description and safely open the correct protected request when activation is supported.
