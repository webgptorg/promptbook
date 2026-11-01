# Promptbook 0.119.0-45: invite agents and keep task history

## YouTube description

A caption-only technical overview of Promptbook 0.119.0-45: explicit agent invitations, append-only task changes and honest delivery receipts. Includes actual output from the release's invitation parser; the task Book is an illustrative example, not a recording of a running task. No spoken audio. This overview selects a few changes rather than covering the full release.

Package: https://www.npmjs.com/package/ptbk/v/0.119.0-45
Source: https://github.com/webgptorg/promptbook/tree/v0.119.0-45
Changes: https://github.com/webgptorg/promptbook/compare/v0.119.0-44...v0.119.0-45

## Evidence

- Public npm metadata at `https://registry.npmjs.org/ptbk/0.119.0-45` returned version `0.119.0-45`, gitHead `039c470bb6f11275e2c0cbc64363c676ffb3f1cd`, and its versioned tarball on 2026-11-01. `git log -1 v0.119.0-45` returned the same revision. Public npm metadata also confirmed preceding version `0.119.0-44`, gitHead `a9fd17056ad2689e12efe9ea46f7b50a18156409`.
- Release diff adds active invitations in `src/book/references.ts` and task-control behavior in `src/engine/task-control.ts`, with tests in `test/task-control.test.mjs`. Only those selected changes are narrated. No claim about Marketplace publication or every change in the accumulated changelog.
- `node releases/videos/0.119.0-45/demo.mjs` compiles the immutable release-tag reference source directly with TypeScript, executes that parser and asserts its output matches the retained demo output without sending chat messages. Actual output is saved in `demo.txt` and rendered on screen.
- `TASK CHANGE`, `TASK REOPEN` and Saved/Delivered/Applied are supported by release code and task-control tests. The on-screen Book is clearly marked illustrative. No live task is changed for filming.

## Narration and visual order

The exact explanatory captions are in `narration.txt` (a retained text source, despite the filename). The render uses six readable technical cards, including actual parser output and an illustrative Book. English matches the request; this is a production choice, not an asserted owner preference. The video is silent. macOS speech generation returned empty audio under the execution sandbox, so the renderer uses complete captions instead of claiming successful narration.

## Reproduce

From the repository root, with project dependencies installed:

```sh
node releases/videos/0.119.0-45/demo.mjs > releases/videos/0.119.0-45/demo.txt
python3 releases/videos/0.119.0-45/render.py
```

The renderer needs Pillow and `ffmpeg`; inspect the result with `ffprobe`. Generated frames and MP4 are locally ignored; do not confuse their existence with an upload. Review the opening, parser output, illustrative Book, closing frames and duration before publication.
