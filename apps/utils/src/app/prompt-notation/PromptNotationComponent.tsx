'use client';

import Editor from '@monaco-editor/react';
import { PromptString, prompt, spaceTrim, valueToString } from '@promptbook-local/utils';
import { Copy, Download, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TIME_INTERVALS } from '../../../../../src/constants';
import {
    DEFAULT_PROMPT_CODE,
    getPromptNotationRunnableCode,
    PROMPT_NOTATION_EXAMPLES,
    PromptNotationExample,
} from './promptNotationExamples';

const PROMPT_NOTATION_INSTALL_NOTE = spaceTrim(`
    // Note 🔽: To install Promptbook run:
    //         > npm install ptbk
    //         OR
    //         > npm install @promptbook/utils
`);
const PROMPT_NOTATION_IMPORT_LINE = "import { prompt } from '@promptbook/utils';";

/**
 * Props for the CodeBlock component.
 */
type CodeBlockProps = {
    label: string;
    content: string;
    language: string;
};

/**
 * Combines a prompt notation example with evaluated output for display.
 */
type PromptNotationExampleWithOutput = {
    example: PromptNotationExample;
    runnableCode: string;
    output: string;
    error: string | null;
};

/**
 * Renders a read-only code block with a label.
 */
function CodeBlock(props: CodeBlockProps) {
    const { label, content, language } = props;
    return (
        <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
            <pre className="rounded-lg bg-slate-900 p-4 text-sm text-slate-100 shadow-inner overflow-auto">
                <Editor
                    className="h-[300px]"
                    language={language}
                    theme="vs-dark"
                    value={content}
                    options={{
                        readOnly: true,
                        readOnlyMessage: {
                            value: 'Look at playground below to try editing prompts!',
                        },
                        wordWrap: 'on',
                        minimap: { enabled: false },
                        lineNumbers: 'off',
                        folding: false,
                    }}
                    loading={<code className="whitespace-pre">{content}</code>}
                />
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
 * Builds prompt notation example source with optional install instructions.
 *
 * @param exampleCode Example code body.
 * @param includeInstallNote Whether to include install instructions comment.
 */
function buildPromptNotationExampleSource(exampleCode: string, includeInstallNote: boolean): string {
    return spaceTrim(
        (block) => `
            ${block(includeInstallNote ? PROMPT_NOTATION_INSTALL_NOTE : '')}
            ${block(PROMPT_NOTATION_IMPORT_LINE)}

            ${block(exampleCode)}
        `,
    );
}

/**
 * Builds a download filename for a prompt notation example.
 *
 * @param exampleId Example identifier.
 */
function getExampleDownloadFilename(exampleId: string): string {
    return `prompt-notation-${exampleId}.js`;
}

/**
 * Copies text to the clipboard using the browser API.
 *
 * @param text Text to copy.
 */
async function copyTextToClipboard(text: string): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        throw new Error('Clipboard API is unavailable.');
    }

    await navigator.clipboard.writeText(text);
}

/**
 * Triggers a browser download for plain text content.
 *
 * @param filename File name for the download.
 * @param content Text content to save.
 */
function downloadTextFile(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
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
            spaceTrim(
                (block) => `
                
                    "use strict";

                    ${block(source)}

                    return output;
                `,
            ),
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
 * Evaluates a prompt notation example so docs can render output dynamically.
 *
 * @param example Example definition.
 */
function evaluatePromptNotationExample(example: PromptNotationExample): PromptNotationExampleWithOutput {
    const runnableCode = getPromptNotationRunnableCode(example);
    const result = evaluatePromptSource(runnableCode);

    return {
        example,
        runnableCode,
        output: result.output,
        error: result.error,
    };
}

/**
 * Renders the prompt notation documentation and interactive evaluator.
 */
export function PromptNotationComponent() {
    const [source, setSource] = useState(DEFAULT_PROMPT_CODE);
    const [output, setOutput] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const exampleOutputs = useMemo(
        () => PROMPT_NOTATION_EXAMPLES.map((example) => evaluatePromptNotationExample(example)),
        [PROMPT_NOTATION_EXAMPLES, evaluatePromptNotationExample],
    );
    const actionButtonClassName =
        'inline-flex items-center gap-2 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm font-medium transition-colors';
    const actionIconClassName = 'h-4 w-4';

    /**
     * Loads example code into the playground after warning about overwriting.
     *
     * @param example Example definition to load.
     */
    const handleTryInPlayground = (example: PromptNotationExample): void => {
        const shouldReplace = window.confirm('This will overwrite the playground editor. Continue?');

        if (!shouldReplace) {
            return;
        }

        setSource(getPromptNotationRunnableCode(example));
        editorRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    /**
     * Copies runnable example code to the clipboard.
     *
     * @param example Example definition to copy.
     */
    const handleCopyToClipboard = (example: PromptNotationExample): void => {
        const downloadSource = buildPromptNotationExampleSource(getPromptNotationRunnableCode(example), true);
        void copyTextToClipboard(downloadSource).catch((error) => {
            console.error('Failed to copy prompt notation example.', error);
        });
    };

    /**
     * Downloads runnable example code as a file.
     *
     * @param example Example definition to download.
     */
    const handleDownload = (example: PromptNotationExample): void => {
        const filename = getExampleDownloadFilename(example.id);
        const downloadSource = buildPromptNotationExampleSource(getPromptNotationRunnableCode(example), true);
        downloadTextFile(filename, downloadSource);
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            const result = evaluatePromptSource(source);
            setOutput(result.output);
            setErrorMessage(result.error);
        }, TIME_INTERVALS.HUNDRED_MILLISECONDS);

        return () => {
            clearTimeout(handler);
        };
    }, [source]);

    return (
        <div className="space-y-12">
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-gray-900">Prompt notation</h2>
                <p className="text-gray-700">
                    The <code className="bg-gray-100 px-1 rounded">prompt</code> tag turns template literals into safe
                    prompt strings. It returns a <code className="bg-gray-100 px-1 rounded">PromptString</code>, which
                    you can convert with <code className="bg-gray-100 px-1 rounded">toString()</code> when you need
                    plain text.
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>Simple values are inlined directly into the prompt.</li>
                    <li>Unsafe or multiline values are replaced with labeled parameters (numbers or letters) and appended as data.</li>
                    <li>Nested prompt values stay as prompt content and are not escaped.</li>
                    <li>Non-string values are stringified via Promptbook utilities.</li>
                </ul>
            </section>

            <section className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900">Examples</h2>
                <div className="grid gap-6 lg:grid-cols-2">
                    {exampleOutputs.map((exampleResult, index) => (
                        <div
                            key={exampleResult.example.id}
                            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
                        >
                            <h3 className="text-lg font-semibold text-gray-900">
                                Example {index + 1}: {exampleResult.example.title}
                            </h3>
                            <p className="text-gray-600 mt-2">{exampleResult.example.description}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                    onClick={() => handleTryInPlayground(exampleResult.example)}
                                    className={actionButtonClassName}
                                >
                                    <Play className={actionIconClassName} aria-hidden />
                                    Try in playground
                                </button>
                                <button
                                    onClick={() => handleCopyToClipboard(exampleResult.example)}
                                    className={actionButtonClassName}
                                >
                                    <Copy className={actionIconClassName} aria-hidden />
                                    Copy to clipboard
                                </button>
                                <button
                                    onClick={() => handleDownload(exampleResult.example)}
                                    className={actionButtonClassName}
                                >
                                    <Download className={actionIconClassName} aria-hidden />
                                    Download
                                </button>
                            </div>
                            <div className="mt-6 grid gap-4">
                                <CodeBlock
                                    label="Code"
                                    language="javascript"
                                    content={buildPromptNotationExampleSource(exampleResult.example.code, false)}
                                />
                                <CodeBlock
                                    label="Output"
                                    language="markdown"
                                    content={
                                        exampleResult.error
                                            ? `Error: ${exampleResult.error}`
                                            : exampleResult.output
                                    }
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-6" ref={editorRef}>
                <h2 className="text-2xl font-semibold text-gray-900">Try it in the browser</h2>
                <p className="text-gray-700">
                    Write JavaScript with <code className="bg-gray-100 px-1 rounded">prompt</code> notation on the left.
                    Assign to <code className="bg-gray-100 px-1 rounded">result</code> or{' '}
                    <code className="bg-gray-100 px-1 rounded">output</code>, or return a value.
                </p>
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">JavaScript</div>
                        <pre className="rounded-lg bg-slate-900 p-4 text-sm text-slate-100 shadow-inner overflow-auto">
                            <Editor
                                className="h-[360px]"
                                language="javascript"
                                theme="vs-dark"
                                value={source}
                                onChange={(value) => setSource(value || '')}
                                options={{
                                    wordWrap: 'on',
                                    minimap: { enabled: false },
                                    lineNumbers: 'on',
                                    folding: false,
                                }}
                                loading={<code className="whitespace-pre">{source}</code>}
                            />
                        </pre>
                    </div>
                    <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Result</div>
                        <pre className="rounded-lg bg-slate-900 p-4 text-sm text-slate-100 shadow-inner overflow-auto">
                            <Editor
                                className="h-[360px]"
                                language="markdown"
                                theme="vs-dark"
                                value={output}
                                options={{
                                    readOnly: true,
                                    readOnlyMessage: {
                                        value: '<- Edit code on the left to see output here!',
                                    },
                                    wordWrap: 'on',
                                    minimap: { enabled: false },
                                    lineNumbers: 'off',
                                    folding: false,
                                }}
                                loading={<code className="whitespace-pre">{output}</code>}
                            />
                        </pre>
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
