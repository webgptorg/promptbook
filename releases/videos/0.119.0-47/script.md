# Promptbook 0.119.0-47: external-action impact and priority

## YouTube description

A caption-only technical overview of Promptbook 0.119.0-47: external-action impact, batch totals and aging priority. Actual output comes from the immutable release implementation with synthetic action records. No emails are sent; this is not dashboard footage. No spoken or synthetic narration. This video covers selected changes, not the entire release.

Package: https://www.npmjs.com/package/ptbk/v/0.119.0-47
Source: https://github.com/webgptorg/promptbook/tree/v0.119.0-47
Changes: https://github.com/webgptorg/promptbook/compare/v0.119.0-45...v0.119.0-47

## Evidence and scope

Registry metadata was rechecked in the project browser at 2026-11-01T20:06:17.981Z. Exact version endpoints returned HTTP 200. Version 0.119.0-47 has gitHead fd1860136b55cd95c45066660bdcc7c9c417e9fb, matching the local tag. The preceding published version is 0.119.0-45, revision 039c470bb6f11275e2c0cbc64363c676ffb3f1cd. There is no registry entry for 0.119.0-46. See registry.json.

The immutable release diff adds src/engine/action-impact.ts and test/action-impact.test.mjs. The module implements decimal-log aggregation, per-member 30-day aging, view grouping, outcome counts, explicit unknowns, post-aggregation cutoff and Show all. src/engine/action-log.ts integrates the view and records impact and outcome separately. These are the selected claims. No claim is made about unrelated Windows, Wallet, editor or common-knowledge changes.

The demonstration transpiles that exact revision's module, creates synthetic summaries in memory and asserts the results. With --release-tests it writes a disposable fixture under the locally ignored frames directory and executes all 11 tests from the immutable release, changing only the module import path. These pass. It does not read project action records, invoke agents or send messages. demo.txt is actual calculation/view-model output, not a live dashboard recording.

The full explanatory captions are retained in narration.txt and render.py; slides.json records timing. The video is silent and uses no synthetic narration, owner likeness or attributed personal opinions. English and the simple technical cards are production choices, not claims about the owner's preferences. No suitable style retrieval tools were available; the script follows the explicit writing rules and existing release format without asserting a personal style match.

## Reproduce

From the project root with dependencies, Python Pillow, and ffmpeg installed:

```sh
node releases/videos/0.119.0-47/demo.mjs > releases/videos/0.119.0-47/demo.txt
node releases/videos/0.119.0-47/demo.mjs --release-tests > releases/videos/0.119.0-47/verification.txt
python3 releases/videos/0.119.0-47/render.py
npm run check
```

Generated frames, disposable fixture and MP4 remain locally ignored. Inspect encoded samples and decode the MP4 before upload. Publication evidence belongs in status.md and the external-action receipt, not in the existence of a rendered file.
