# Stale `npx` assertion in `boilerplateTemplates.test.ts` broke `test-unit` on `main`

While adding the comparison section to the `ptbk coder` landing page, `npm run test-for-ptbk-coder` failed at the `test-unit` step on a test that has nothing to do with that change and **already fails on unmodified `main`**.

## Where

[`src/cli/cli-commands/coder/boilerplateTemplates.test.ts`](../src/cli/cli-commands/coder/boilerplateTemplates.test.ts), in `creates the default template files during coder init`:

```
expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false

> 116 |         ).toBe(true);
```

## Why it fails

Commit `021cd489b` — _"Using NPX because `ptbk` can be installed globally or locally, and NPX will resolve it correctly in either case."_ — deliberately prefixed every entry of `DEFAULT_CODER_PACKAGE_JSON_SCRIPTS` in [`getDefaultCoderPackageJsonScripts.ts`](../src/cli/cli-commands/coder/getDefaultCoderPackageJsonScripts.ts) with `npx `.

That commit touched only the source file. The test still asserted the **opposite** of the new deliberate behaviour:

```ts
expect(
    Object.values(defaultCoderPackageJsonScripts).every((scriptCommand) => !scriptCommand.includes('npx ')),
).toBe(true);
```

So the assertion, not the source, was wrong — it encoded a rule (`no npx in coder scripts`) that the repository had just decided against.

## What I did

The assertion was flipped to encode the intent of `021cd489b`, so that the test now guards the resolution strategy the repository actually wants:

```ts
// Note: Every script goes through NPX, because `ptbk` can be installed globally or locally
//       and NPX resolves it correctly in either case
expect(
    Object.values(defaultCoderPackageJsonScripts).every((scriptCommand) => scriptCommand.startsWith('npx ptbk')),
).toBe(true);
```

No source behaviour was changed. The neighbouring assertion that `AGENT_CODING.md` does not mention `npx ptbk` was left as it is — that file documents the command for a human reader, where the bare `ptbk coder` form is the right one, and it was passing already.

**Note:** A change to `getDefaultCoderPackageJsonScripts.ts` is expected to be paired with this test; the two now state the same rule from both sides.
