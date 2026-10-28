# Project encryption and recovery

[Wallet](wallet.md) · [Workspace](workspace.md) · [Environment](environment.md) · [Recovery](recovery.md)

## Scope and lazy setup

Each project has its own encryption root and encrypted local data. Start with **Wallet credentials and TOTP generators only**. The key hierarchy can protect other domains later, but this version does not encrypt all Books, traces, configuration, browser profiles or existing `.env` keys.

Initialize encryption lazily on first Wallet use requiring storage, or through init's optional **Set up Wallet now?** choice (default No). Both call the same protected setup operation. Generate **12 random recovery words** and show them only in the owner's protected setup surface, with simple guidance to write them down and keep them safely for recovery of encrypted data. Do not add routine unlock/reconfirmation to every use or reboot. Choosing No leaves an empty project without a phrase prompt; choosing Yes deliberately opens the same protected flow. Interrupted first setup preserves a recoverable state and never overwrites an existing vault/key.

Terminal/browser UI and user-facing help say only **“12 words for recovery”** (or localized equivalent). Do not mention Bitcoin, cryptocurrency, BIP names/numbers, Shamir, seed jargon or an optional passphrase there. Those technical details belong in this specification. No additional passphrase or Shamir sharing is in scope.

## Standard derivation and domain separation

Use [BIP-0039](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki), a maintained implementation and its test vectors: OS cryptographic randomness supplies 128 entropy bits; checksum and the standard English wordlist yield exactly 12 words. Validate word count/list/checksum on restoration. Apply the standard UTF-8 NFKD normalization and mnemonic-to-seed PBKDF2-HMAC-SHA512, 2048 iterations, 64-byte output, with the optional passphrase fixed to the empty string. Do not invent a wordlist or let a model choose words.

Derive a 256-bit project root from that seed using HKDF-SHA256 under [RFC 5869](https://www.rfc-editor.org/rfc/rfc5869), with a public random project salt and versioned Promptbook-specific context. Derive independent domain keys with distinct versioned context labels; Wallet is the first domain. Persist format/derivation version, salt and all nonsecret parameters needed to reproduce the keys. Never use a raw mnemonic/seed directly as an encryption key, reuse one domain key everywhere or derive keys from project names/paths.

Use authenticated encryption with a maintained cryptographic library: the initial format uses AES-256-GCM, fresh nonces unique for that key and authenticated format/domain metadata. Persist ciphertext, nonce and authentication tag atomically. Invalid recovery input, authentication failure, corruption and unsupported versions fail without disclosing plaintext or replacing the existing vault. Exact module/library layout is an implementation choice, not a custom cryptographic protocol.

## Project-local data, protected host unlock

Encrypted Wallet records live under ignored **`.ptbk/wallet/`**; encryption metadata and the host-wrapped project-root envelope live under ignored **`.ptbk/encryption/`**. These are persistent project data, not disposable cache. All ciphertext and recovery metadata needed with the 12 words travel with the project folder; Git need not contain any of them.

The local wrapping/unlock secret lives **outside the project** in an OS/service-protected credential facility available to the engine at startup. Store only its nonsecret reference and wrapped key in the project. Windows/macOS native facilities and headless Linux service deployments must support the same unattended behavior; do not depend on an interactive desktop keyring being unlocked on a VPS. A plaintext adjacent key, process-wide exported key or silently weaker file fallback is not acceptable. If the host cannot provide the protection, explain the specific setup problem through Wallet while unrelated work continues.

Provision local automatic unlock once during protected setup/restoration. Afterwards ordinary engine/OS restart, including unattended service startup, requires neither those words nor a master password. The engine uses the protected local wrapping secret to unwrap the project key in memory. Do not store the mnemonic, seed or unwrapped keys in project files, `.env`, argv, logs, Git, chats, traces, ordinary status/API or child-process environments.

## Transfer, restoration and protection boundary

Copying the complete project folder preserves ciphertext/metadata but **does not by itself grant decryption on another host**. Enter the same 12 words once through protected owner input, derive/verify the existing key against the ciphertext and provision that host's automatic unlock. Existing login passwords need not be entered again. Do not silently create a new empty wallet on an unlock error. Recovery needs both the encrypted project data and words; words alone do not restore deleted credential records. Losing both the host unlock and words loses access, without a backdoor.

The trusted engine/Wallet boundary may decrypt for authorized operations. Agent model contexts and agent tool processes must not have direct access to the host unlock facility, raw keys, mnemonic or decrypted records. Enforce tool/filesystem/process permissions; encryption plus prompt instructions or UI redaction alone does not isolate an agent with unrestricted same-user host access. Do not advertise such an unconfined mode as providing this protection. The host administrator's authority is outside the agent-isolation boundary.

## Acceptance outcomes

First Wallet storage shows 12 recovery words through protected UI with no cryptocurrency/standard jargon, and init does so only after the optional Yes choice. Exercise default No, Yes, interrupted/resumed setup and later Wallet setup without replacing an existing vault. Verify standard derivation vectors, domain separation and authenticated tamper failure. Save credentials, restart the engine and reboot the unattended host: login works without manual unlock. Copy the folder to a different host: decryption fails until one protected restoration, then survives reboot. Wrong words/corrupted metadata preserve the vault. Inspect Git, traces, status, logs, child environments and agent tools for absent secret material. Cache cleanup and project migration preserve persistent ciphertext/envelopes.
