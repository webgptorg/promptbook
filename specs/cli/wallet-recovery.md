# Wallet recovery-word replacement and reset

[Wallet](wallet.md) · [Encryption](project-encryption.md) · [Import](wallet-import.md) · [Wallet page](dashboard-details.md#wallet-page)

Offer deliberate protected owner actions directly on Wallet, including when locked, without manual internal-file deletion. One engine-owned implementation serves local terminal/browser owner surfaces; agent APIs cannot obtain keys/words or a decryption bypass.

## New words while decryption remains available

If existing host-protected binding or another valid available key actually decrypts the vault, allow **Generate new 12 words for recovery** even when the old words are forgotten. Verify decryption first; finding an envelope or knowing an account name is insufficient. Explain/confirm that the new phrase replaces the recovery path for the updated Wallet while its records are preserved.

Generate fresh cryptographically random words with the existing derivation mechanism, derive a new root, and consistently re-encrypt all records/update metadata and the current-host wrapped envelope. Preserve origins, usernames, labels, passwords and TOTP generators. Provision the new host unlock and display words only through protected owner input; unattended reboot still works and no plaintext phrase/key is stored.

New words unlock the updated generation and old words do not. Historical ciphertext copies are not retroactively revoked; never promise otherwise. Interrupted/failed replacement leaves a coherent recoverable old or new generation, not mismatched ciphertext/keys. Repeated completion/audit retries never silently rotate again.

## Empty reset when every key is lost

When no valid key/12 words can unlock it, clearly state that the old Wallet **cannot be recovered**. Offer **Reset Wallet** to create a new empty encrypted Wallet with fresh words and host unlock.

Before replacement, show a strong loss warning and require a separate deliberate destructive confirmation, default Cancel. The warning covers **all old Wallet data**: account/service list, labels, usernames, passwords and TOTP generators. Unlock failure, opening Wallet or retrying login never implicitly resets it. Decline preserves original ciphertext.

Keep full-record encryption: do not add a plaintext account/origin list or pretend it can be recovered without a key. Reset invalidates discarded cached key/credential material and reconciles pending login workflows so old records are not silently applied. Populate the new vault manually or through the ordinary Bitwarden importer; import is not verified service access.

Scope reset to Wallet/encryption state; preserve project Books/configuration, other tools, action/task/Git history and unrelated files. Report failure honestly. These explicit owner-maintenance confirmations are not a blanket approval requirement for ordinary authorized technical Wallet updates/logins.

## Persistence and acceptance

Use the existing default-on disableable nonsecret Wallet audit for successful replacement/reset. Never commit ciphertext, keys, words, raw import exports or protected account data. A locked reset audit identifies the operation without reading old labels; audit retry repeats persistence only.

Forget old words while host unlock works: replace words, preserve every record/factor, verify new versus old recovery on updated data and reboot unattended. Interrupt key/ciphertext/envelope writes without mixed generations/data loss. With all keys lost, decline reset unchanged, then explicitly confirm all-data loss and create an empty encrypted Wallet with fresh words. No plaintext index/decryption bypass appears; reimport selected Bitwarden entries once. Exercise stale/concurrent actions, pending-login reconciliation and failed writes/audits without secret exposure.
