'use strict';

/**
 * Runs the Next.js command line interface resolved through Node's module resolution.
 *
 * Invoking `../../node_modules/next/dist/bin/next` directly assumes that the installed
 * dependencies always sit exactly two directories above this workspace. That assumption breaks
 * inside a git worktree (for example the `ptbk coder --isolate` worktrees under
 * `.promptbook/coder-isolation-worktrees`), where the worktree root has no `node_modules` of its
 * own and Node finds Next.js only by walking further up the directory tree. The hardcoded path
 * then fails with `MODULE_NOT_FOUND` even though Next.js is perfectly resolvable.
 *
 * The Next.js binary parses `process.argv` itself, so requiring it here forwards every argument
 * of this script unchanged, for example `node ./scripts/next-cli.js build`.
 */
require(require.resolve('next/dist/bin/next'));
