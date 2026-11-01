import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/** Exact release source used to verify this demonstration is not based on later code. */
const released = execFileSync('git', ['show', 'v0.119.0-45:src/book/references.ts'], { encoding: 'utf8' });
/** Compile the immutable tagged source directly, independently of the working tree's dist build. */
const compiled = ts.transpileModule(released, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
/** Dependency-free release module loaded from its freshly compiled bytes. */
const { findActiveReferences } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
/** Safe illustrative chat messages; this demo never sends a message or invokes an agent. */
const samples = ['@Adam please review', '+@Adam please review', '`+@Adam`', 'for example +@Adam', '+{Frontend Developer} please review'];
/** Captured output must remain identical to the output shown in the prepared video. */
const expected = readFileSync(new URL('./demo.txt', import.meta.url), 'utf8').trimEnd();
/** Actual output from the tagged parser, compared before printing. */
const lines = [];
lines.push('ptbk 0.119.0-45: actual invitation parser output (not a sent chat)');
for (const text of samples) lines.push(`${JSON.stringify(text)} => ${JSON.stringify(findActiveReferences(text).map((reference) => reference.name))}`);
assert.equal(lines.join('\n'), expected);
console.log(lines.join('\n'));
