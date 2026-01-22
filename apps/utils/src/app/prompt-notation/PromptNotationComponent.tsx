'use client';

import { PromptString, prompt, valueToString } from '@promptbook-local/utils';
import { useEffect, useState } from 'react';
import { DEFAULT_PROMPT_CODE, PROMPT_NOTATION_EXAMPLES } from './promptNotationExamples';

/**
 * Props for the CodeBlock component.
 */
type CodeBlockProps = {
    label: string;
    content: string;
};

/**
 * Renders a read-only code block with a label.
 */
function CodeBlock({ label, content }: CodeBlockProps) {
    return (
        <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
            <pre className="rounded-lg bg-slate-900 p-4 text-sm text-slate-100 shadow-inner overflow-auto">
                <code className="whitespace-pre">{content}</code>
            </pre>
        </div>
    );
}

/**
 * Normalizes evaluated output into a display string.
 *
 * @param value Value returned from the evaluator.
 */
function formatEvaluationResult(value: unknown): string {
    if (value instanceof PromptString) {
        return value.toString();
    }

    return valueToString(value);
}

/**
 * Extracts a user-friendly message from thrown errors.
 *
 * @param error Error thrown during evaluation.
 */
function formatEvaluationError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return valueToString(error);
}

/**
 * Evaluates prompt notation code and returns output or error.
 *
 * @param source User-provided JavaScript source code.
 */
function evaluatePromptSource(source: string): { output: string; error: string | null } {
    try {
        const evaluator = new Function(
            'prompt',
            'PromptString',
            'valueToString',
            `"use strict";
            let result;
            let output;
            ${source}
            return typeof result !== "undefined" ? result : output;`,
        ) as (tag: typeof prompt, promptType: typeof PromptString, stringify: typeof valueToString) => unknown;

        const value = evaluator(prompt, PromptString, valueToString);

        if (typeof value === 'undefined') {
            return {
                output: '',
                error: 'No output returned. Assign to result or output, or return a value.',
            };
        }

        return { output: formatEvaluationResult(value), error: null };
    } catch (error) {
        return { output: '', error: formatEvaluationError(error) };
    }
}

/**
 * Renders the prompt notation documentation and interactive evaluator.
 */
export function PromptNotationComponent() {
    const [source, setSource] = useState(DEFAULT_PROMPT_CODE);
    const [output, setOutput] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const handler = setTimeout(() => {
            const result = evaluatePromptSource(source);
            setOutput(result.output);
            setErrorMessage(result.error);
        }, 150);

        return () => {
            clearTimeout(handler);
        };
    }, [source]);

    return (
        <div className="space-y-12">
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-gray-900">Prompt notation</h2>
                <p className="text-gray-700">
                    The <code className="bg-gray-100 px-1 rounded">prompt</code> tag turns template literals into
                    safe prompt strings. It returns a <code className="bg-gray-100 px-1 rounded">PromptString</code>,
                    which you can convert with <code className="bg-gray-100 px-1 rounded">toString()</code> when you
                    need plain text.
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>Simple values are inlined directly into the prompt.</li>
                    <li>Unsafe or multiline values are replaced with numbered parameters and appended as data.</li>
                    <li>Nested prompt values stay as prompt content and are not escaped.</li>
                    <li>Non-string values are stringified via Promptbook utilities.</li>
                </ul>
            </section>

            <section className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900">Examples</h2>
                <div className="grid gap-6 lg:grid-cols-2">
                    {PROMPT_NOTATION_EXAMPLES.map((example, index) => (
                        <div key={example.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Example {index + 1}: {example.title}
                            </h3>
                            <p className="text-gray-600 mt-2">{example.description}</p>
                            <div className="mt-6 grid gap-4">
                                <CodeBlock label="Code" content={example.code} />
                                <CodeBlock label="Output" content={example.output} />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900">Try it in the browser</h2>
                <p className="text-gray-700">
                    Write JavaScript with <code className="bg-gray-100 px-1 rounded">prompt</code> notation on the
                    left. Assign to <code className="bg-gray-100 px-1 rounded">result</code> or{' '}
                    <code className="bg-gray-100 px-1 rounded">output</code>, or return a value.
                </p>
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700" htmlFor="prompt-source">
                            JavaScript
                        </label>
                        <textarea
                            id="prompt-source"
                            className="w-full min-h-[360px] rounded-lg border border-gray-300 bg-white p-4 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            value={source}
                            onChange={(event) => setSource(event.target.value)}
                            spellCheck={false}
                        />
                        <p className="text-xs text-gray-500">
                            Available helpers: <code className="bg-gray-100 px-1 rounded">prompt</code>,{' '}
                            <code className="bg-gray-100 px-1 rounded">PromptString</code>,{' '}
                            <code className="bg-gray-100 px-1 rounded">valueToString</code>.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700" htmlFor="prompt-output">
                            Result
                        </label>
                        <textarea
                            id="prompt-output"
                            className="w-full min-h-[360px] rounded-lg border border-gray-300 bg-gray-100 p-4 font-mono text-sm shadow-sm"
                            value={output}
                            readOnly
                        />
                        {errorMessage ? (
                            <p className="text-sm text-red-600">Error: {errorMessage}</p>
                        ) : (
                            <p className="text-xs text-gray-500">Output updates automatically as you edit.</p>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
