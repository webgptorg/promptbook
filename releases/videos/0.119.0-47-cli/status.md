# Practical CLI video - preparation status

State: waiting for the owner's protected Wallet login update on 2026-11-02. No new video, narration or upload has been created.

The original brief is [the owner conversation](../../../chats/2026-11-02-1622-chatter-youtube-videa-maji-ukazovat-pouziti-ptbk.book). It requests a practical CLI video for the latest version, using the ElevenLabs voice named exactly `Pavol Hejny 20206`, while leaving both existing videos unchanged. This directory is a separate production draft; it does not supersede either original publication receipt.

## Evidence collected

- Repository package version and installed `ptbk --version`: `0.119.0-47`.
- The public npm registry page inspected on 2026-11-02 reports dist-tag `latest` as `0.119.0-47`. Full semantic release ordering, exact metadata and tag comparison still need a fresh verification before production. A compact browser evaluation failed with `Illegal return statement`; it supplies no additional evidence.
- Existing repository receipts identify the two public videos as https://www.youtube.com/watch?v=lMl8T_zR2hs (0.119.0-45) and https://www.youtube.com/watch?v=jdSEZ5OJEho (0.119.0-47), both on channel `UCH76EQk6XKI6WF7k_Pdh2GA`. Neither video nor its files were changed. Live Studio reconciliation remains required before any new upload.
- Installed `ptbk add --help` and `ptbk list --help` were executed successfully. They document `add --no-commit`, `list --json` and `list --ready`; the actual task-creation/list workflow has not yet been demonstrated. Do not present help output as proof of the workflow.

Validation: `npm run check` passed (TypeScript check, exit 0) on 2026-11-02.

## Blocking access

ElevenLabs redirected the voice-library URL to its sign-in page. Wallet metadata contains an owner login for `me@pavolhejny.com` and an unrelated account. The owner login was selected from context; the unrelated account was not used. ElevenLabs rejected the saved owner login. Wallet created protected request `205f13c0af`; credentials must be corrected through that interface.

External-action ID: `act-ybqxcf8jkq`, failed sign-in. No successful authenticated session was observed. The exact requested voice is unverified; no substitute voice was selected, no speech was generated, and nothing was uploaded or published in this task.

## Resume from here

1. Open ElevenLabs sign-in and use Wallet after its protected request is resolved. Verify the exact voice name and retain its stable voice ID before generating narration. Record the generation as an external action and disclose synthetic narration.
2. Reverify the latest published release and immutable revision. Run the released CLI in an isolated fixture inside this directory, with commits disabled and no access to private project data. Capture actual commands, exit codes, output and resulting task Book. Demonstrate a concrete workflow rather than internal-module calculations or theoretical slides.
3. Build and review terminal footage, Czech narration and readable captions using only verified results. Preserve reproducible sources and media checksums. Run `npm run check`.
4. Reconcile the target channel's live Studio content and this task's action records before upload. The owner's new brief authorizes a separate practical video for the latest version; preserve both existing videos. Record the new video's actual upload/publication state and verify playback before claiming publication.
