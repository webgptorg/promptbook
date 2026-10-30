# Test one Wallet credential through real login

[Wallet](wallet.md) · [Minimal interruption](../concepts/minimal-interruption/authentication-examples.md) · [DRY](../coding-standards/shared-logic.md)

## Shared verification, not another login implementation

Alongside Edit and Delete, each credential offers **Test**. The target is exactly the selected item/account, not every account for that service. Run a short agent-assisted login session using the available browser and the same trusted Wallet operations, service/account matching, reusable additional fields, protected factor handling and verified-access logic as normal login. Adding or updating credentials invokes this same verification instead of a separate form-specific implementation.

Show live understandable progress: what is being checked, whether login/access actually succeeded, or what remains. The operator can supply a missing factor, approve the required device action or take over the existing supported browser through the normal protected flow. Do not ask the user to copy a code from an inbox the agent can already read. Keep secrets out of ordinary progress/model context/evidence.

An already signed-in session alone cannot prove that this particular stored credential works. Verify the selected credential through a suitably separate login context or equivalent supported verifier while avoiding unnecessary logout/disruption of existing sessions. Check the resulting service/account identity. If actual credential verification is unavailable/incomplete, say so rather than report success from session reuse.

## Incomplete verification and latest outcome

Saving a credential and verifying it are separate outcomes. Preserve newly supplied records as **unverified** if verification is cancelled, a factor is unfinished or the service is temporarily unavailable. Record the actual incomplete/failure reason rather than delete usable user input or label a temporary outage as a proven bad password. Ordinary credential mutations retain their existing protected storage/audit contract.

Keep the latest redacted test result, timestamp and concise failure/incompletion reason per item in ignored local Wallet state, outside Git. Reopening the page can inspect it; protect it consistently with the item's account metadata. Never retain passwords, codes, secret responses or raw sensitive page text in that report. Last-tested success is historical evidence, not a guarantee that a service session remains valid forever.

The test is not a project task, queued run or Git-recorded execution. Do not create a task Book, task trace directory or test-only Git commit. It may use a short agent session and incur actual usage; unlike pre-project initialization calls, an existing project's available usage follows the ordinary attribution contract without inventing a task identity. Saving new/revised credentials still uses the separate normal Wallet mutation audit; a test outcome is not a credential mutation.

## Initialization and acceptance

Optional init uses this same verifier with the protected in-memory Wallet draft. It must not create target-project Wallet/files before [final confirmation](initialization.md#draft-confirmation-and-project-creation). A missing factor remains visible; incomplete credentials are retained as unverified when the user proceeds with otherwise valid setup.

Test one of several accounts, including a browser already signed into another account. Verify correct-credential failure versus existing-session success, additional reusable fields, accessible email codes, protected manual factors, takeover, cancellation and temporary outage. Preserve existing sessions where possible, retain the latest honest result after reopening/restart, and produce no test task/Git history or secret leakage. Adding, manual Test and ordinary login exercise one shared login implementation.
