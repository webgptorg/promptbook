import type { ReactNode } from 'react';
import type { ServerInfo } from './types';

function KeyVal(props: { label: string; value: ReactNode }) {
    return (
        <div className="flex items-start gap-2">
            <div className="font-semibold min-w-[14rem]">{props.label}</div>
            <div className="text-gray-800">{props.value}</div>
        </div>
    );
}

function List(props: { items: ReadonlyArray<string> }) {
    if (!props.items?.length) return <span className="text-gray-500">none</span>;
    return (
        <ul className="list-disc ml-6">
            {props.items.map((item, i) => (
                <li key={i} className="break-all">
                    {item}
                </li>
            ))}
        </ul>
    );
}

function Section(props: { title: string; children: ReactNode }) {
    return (
        <section className="mt-8">
            <h2 className="text-xl font-semibold mb-2">{props.title}</h2>
            {props.children}
        </section>
    );
}

function ServerBody({ info }: { info: ServerInfo }) {
    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-4">Promptbook Server</h1>

            <div className="space-y-2">
                <KeyVal label="Book language version:" value={info.bookLanguageVersion} />
                <KeyVal label="Promptbook engine version:" value={info.promptbookEngineVersion} />
                <KeyVal label="Node.js version:" value={info.nodeVersion} />
                <KeyVal label="Server port:" value={String(info.port ?? '')} />
                <KeyVal label="Startup date:" value={info.startupDate} />
                <KeyVal label="Anonymous mode:" value={info.isAnonymousModeAllowed ? 'enabled' : 'disabled'} />
                <KeyVal label="Application mode:" value={info.isApplicationModeAllowed ? 'enabled' : 'disabled'} />
                <KeyVal label="Running executions:" value={String(info.runningExecutions)} />
            </div>

            <Section title="Pipelines in collection">
                <List items={info.pipelines} />
            </Section>

            <Section title="Paths">
                <List items={info.paths} />
            </Section>

            <Section title="Instructions">
                <ol className="list-decimal ml-6 space-y-1">
                    <li>
                        The client{' '}
                        <a
                            href="https://www.npmjs.com/package/@promptbook/remote-client"
                            className="text-blue-600 underline"
                        >
                            https://www.npmjs.com/package/@promptbook/remote-client
                        </a>
                    </li>
                    <li>
                        OpenAI compatible client <span className="text-gray-500">(Not working yet)</span>
                    </li>
                    <li>REST API</li>
                </ol>
                <p className="mt-2">
                    For more information look at:{' '}
                    <a href="https://github.com/webgptorg/promptbook" className="text-blue-600 underline">
                        https://github.com/webgptorg/promptbook
                    </a>
                </p>
            </Section>
        </div>
    );
}

/**
 * Renders the HTML document for the Promptbook Server UI.
 *
 * @private internal utility of Remote Server
 */
export function HtmlDoc({ info }: { info: ServerInfo }) {
    return (
        <html lang="en">
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Promptbook Server</title>
                <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
            </head>
            <body className="bg-gray-50 text-gray-900">
                {/* Note: Pure SSR to avoid bundling/hydration for now */}
                <div id="root">
                    <ServerBody info={info} />
                </div>
            </body>
        </html>
    );
}

/**
 * Add Note: [💞] Ignore a discrepancy between file name and entity name
 *     <- TODO: !!! Maybe split into multiple files
 */
