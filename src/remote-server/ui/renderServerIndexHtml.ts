import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { ServerInfo } from './types';

const h = createElement;

function KeyVal(props: { label: string; value: ReactNode }) {
    return h(
        'div',
        { className: 'flex items-start gap-2' },
        h('div', { className: 'font-semibold min-w-[14rem]' }, props.label),
        h('div', { className: 'text-gray-800' }, props.value),
    );
}

function List(props: { items: ReadonlyArray<string> }) {
    if (!props.items?.length) return h('span', { className: 'text-gray-500' }, 'none');
    return h(
        'ul',
        { className: 'list-disc ml-6' },
        ...props.items.map((item, i) => h('li', { key: String(i), className: 'break-all' }, item)),
    );
}

function Section(props: { title: string; children?: ReactNode }) {
    return h(
        'section',
        { className: 'mt-8' },
        h('h2', { className: 'text-xl font-semibold mb-2' }, props.title),
        props.children,
    );
}

function ServerBody({ info }: { info: ServerInfo }) {
    return h(
        'div',
        { className: 'max-w-4xl mx-auto p-6' },
        h('h1', { className: 'text-3xl font-bold mb-4' }, 'Promptbook Server'),
        h(
            'div',
            { className: 'space-y-2' },
            h(KeyVal, { label: 'Book language version:', value: info.bookLanguageVersion }),
            h(KeyVal, { label: 'Promptbook engine version:', value: info.promptbookEngineVersion }),
            h(KeyVal, { label: 'Node.js version:', value: info.nodeVersion }),
            h(KeyVal, { label: 'Server port:', value: String(info.port ?? '') }),
            h(KeyVal, { label: 'Startup date:', value: info.startupDate }),
            h(KeyVal, {
                label: 'Anonymous mode:',
                value: info.isAnonymousModeAllowed ? 'enabled' : 'disabled',
            }),
            h(KeyVal, {
                label: 'Application mode:',
                value: info.isApplicationModeAllowed ? 'enabled' : 'disabled',
            }),
            h(KeyVal, { label: 'Running executions:', value: String(info.runningExecutions) }),
        ),
        h(Section, { title: 'Pipelines in collection' }, h(List, { items: info.pipelines })),
        h(Section, { title: 'Paths' }, h(List, { items: info.paths })),
        h(
            Section,
            { title: 'Instructions' },
            h(
                'ol',
                { className: 'list-decimal ml-6 space-y-1' },
                h(
                    'li',
                    null,
                    'The client ',
                    h(
                        'a',
                        {
                            href: 'https://www.npmjs.com/package/@promptbook/remote-client',
                            className: 'text-blue-600 underline',
                        },
                        'https://www.npmjs.com/package/@promptbook/remote-client',
                    ),
                ),
                h(
                    'li',
                    null,
                    'OpenAI compatible client ',
                    h('span', { className: 'text-gray-500' }, '(Not working yet)'),
                ),
                h('li', null, 'REST API'),
            ),
            h(
                'p',
                { className: 'mt-2' },
                'For more information look at: ',
                h(
                    'a',
                    { href: 'https://github.com/webgptorg/promptbook', className: 'text-blue-600 underline' },
                    'https://github.com/webgptorg/promptbook',
                ),
            ),
        ),
    );
}

function HtmlDoc({ info }: { info: ServerInfo }) {
    return h(
        'html',
        { lang: 'en' },
        h(
            'head',
            null,
            h('meta', { charSet: 'UTF-8' }),
            h('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }),
            h('title', null, 'Promptbook Server'),
            h('link', {
                href: 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
                rel: 'stylesheet',
            }),
        ),
        h('body', { className: 'bg-gray-50 text-gray-900' }, h('div', { id: 'root' }, h(ServerBody, { info }))),
    );
}

/**
 * Render full HTML for the server index using React SSR without requiring TSX/JSX compiler flags.
 *
 * @private internal utility of Remote Server
 */
export function renderServerIndexHtml(info: ServerInfo): string {
    return '<!DOCTYPE html>' + renderToStaticMarkup(h(HtmlDoc, { info }));
}
