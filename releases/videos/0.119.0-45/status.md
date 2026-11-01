# 0.119.0-45 publication status

State: publicly published and verified on 2026-11-01T21:01:22+01:00. Do not upload this version again.

- Channel: Pavol Hejný, `UCH76EQk6XKI6WF7k_Pdh2GA`, handle `@ptbkio`. The owner explicitly selected this channel in the source chat with a Studio screenshot; the live Studio channel ID matched it.
- Video: `lMl8T_zR2hs`, https://www.youtube.com/watch?v=lMl8T_zR2hs
- Title: Promptbook 0.119.0-45: invite agents and keep task history
- Publication timestamp from YouTube: `2026-11-01T12:01:05-08:00` (21:01:05 Europe/Prague).
- Visibility: public. Studio confirmed “Video zveřejněno”, then listed exactly one video as “Veřejné” and “Publikováno”. Checks completed with no problems.
- Watch-page verification: correct video/channel IDs, `isPrivate: false`, `isUnlisted: false`, playability `OK`; playback advanced, readyState 4, duration 155.981 seconds. The initial playback used 240p; full HD completion was not separately verified.
- External-action receipt: `act-f52mpbqxkw`, `actions/2026-11-01-0225-create-a-release-video-agent-and-publish-youtube/2026-11-01-2100-upload-and-publicly-publish-release-video-youtube.md` (success). Upload, metadata and publication were one intended operation; no second upload occurred.
- Before upload, the unfiltered Studio video list was empty and task/action records contained no earlier upload for this version.
- Revalidation: immutable-release parser demo passed, the media hash matched the reviewed artifact, and `npm run check` passed (exit 0).
- YouTube noted that clickable external description links require one-time channel verification; the source URLs remain in the description. Publication itself succeeded.

## Earlier preparation and access history

The observations below describe the earlier blocked attempts and are retained as history, not the current publication state.

Release: npm `ptbk@0.119.0-45`, matching Git tag/revision `v0.119.0-45` / `039c470bb6f11275e2c0cbc64363c676ffb3f1cd` verified on 2026-11-01.

Owner: the initial Expert task. Do not create a second publication task for this version.

Access observation: opening YouTube Studio in the project browser prompted creation of a channel. Cancelled that dialog. The account menu identified `pavol@ptbk.io`; Switch account and All channels showed only Pavol Hejný with “No channel”. The Wallet reported no YouTube/related login. No replacement channel was created and no video was uploaded. Personal-channel access is required before publication; an owner name alone cannot establish the target channel.

Channel ID: unresolved. Video ID/URL: none. Visibility: none. Publication receipt: none.

Prepared artifact: `video.mp4`, 1920x1080, H.264, approximately 156 seconds, caption-only with no spoken audio. Reproducible sources and exact explanatory text are retained alongside it. Speech synthesis was attempted but produced zero-length audio under the sandbox; the final video does not claim narration.

Media verification: ffprobe reported H.264 1920x1080 and 155.958333 seconds. The final encoded video decoded without reported errors; sampled encoded frames and the full-size parser/example cards were visually inspected. SHA-256: `256704ad8008701b81aab7fdaa9c4d1cb57051c6705dd1900bafc6cace3507fd`.

Validation: `npm run check` passed. `node bin/ptbk.js lint --json` returned `ok: true` with no findings for the new agent or recurring task (existing legacy warnings remain). The parser demonstration ran successfully against source identical to the release tag. Supplementary `node --test test/task-control.test.mjs` did not pass in this sandbox: engine scenarios timed out waiting for test sessions. This is not reported as passing release validation; no task-control implementation was changed by this work.

Recovery: verify any newly supplied personal-channel identity in Studio, inspect existing videos and drafts before upload, then use external-action logging. Retain this task and prepared artifacts; do not restart by creating another upload/task. The only external effect so far deferred an optional Google service-linking prompt for one week; it was recorded separately and is not publication evidence.

## Resumed access attempt — 2026-11-01

The newly supplied Google Wallet entries are available. Opened the Google AddSession login page for YouTube Studio and used Wallet login for the personal-domain account. Google rejected sign-in before displaying a password field with “This browser or app may not be secure.” Repeated once using Google’s own Try again link with the same result. The existing workspace account remains the only verified signed-in session and previously showed no channel. No browser configuration was changed, no channel was created, and no upload was attempted. The sign-in intent act-5x5fezqauf was closed as not-performed because nothing changed remotely. Human sign-in intervention is required; the personal channel identity still needs verification after access.

Resumed validation: `npm run check` passed (TypeScript check, exit 0).

Release Video was consulted and confirmed responsibility. Its provenance review led to compiling the parser directly from immutable release-tag source rather than importing the working build. The resulting output was asserted identical to demo.txt and the existing footage; the assertion passed.
