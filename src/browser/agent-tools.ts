import { PtbkError, errorMessage } from '../common/errors.js';
import { Mutex } from '../common/mutex.js';
import type { BridgeTool, ToolResult } from '../engine/bridge.js';
import type { SignInPage, WalletLoginResult, WalletSubEngine } from '../wallet/wallet.js';
import type { TaskChats } from '../chats/task-chats.js';
import type { BrowserScope } from './fleet.js';
import type { PointerTarget } from './browser.js';
import { parseModifiers } from './input.js';

/**
 * JSON Schema of the optional browser name every browser tool accepts.
 */
const BROWSER_PROPERTY = { browser: { type: 'string', description: 'Name of the browser tool to use (see browser_list); defaults to the browser this task already uses, else the first enabled one.' } } as const;

/**
 * JSON Schema of the ways to aim a pointer action.
 */
const POINTER_PROPERTIES = {
    ref: { type: 'number', description: 'Number of the element from the last browser_read.' },
    x: { type: 'number', description: 'Viewport x in CSS pixels (instead of ref; see browser_screenshot).' },
    y: { type: 'number', description: 'Viewport y in CSS pixels (instead of ref).' },
} as const;

/**
 * Reads an optional finite number argument.
 */
function numberArgument(input: Readonly<Record<string, unknown>>, key: string): number | undefined {
    const value = input[key];
    if (value === undefined || value === null || value === '') return undefined;
    const number = Number(value);
    if (!Number.isFinite(number)) throw new PtbkError(`${key} must be a number.`, { kind: 'usage' });
    return number;
}

/**
 * Reads where a pointer action aims.
 */
function pointerArgument(input: Readonly<Record<string, unknown>>): PointerTarget {
    return { ref: numberArgument(input, 'ref'), x: numberArgument(input, 'x'), y: numberArgument(input, 'y'), force: input.force === true };
}

/**
 * The Wallet as one task's agent may use it: a login request for the page it works on (never reading a record).
 *
 * @private project browser
 */
export type AgentWallet = {
    readonly login: (page: SignInPage, request: { readonly account?: string; readonly reason?: string; readonly ignoreRelated?: boolean; readonly requestCode?: boolean }) => Promise<WalletLoginResult>;
    /** Nonsecret metadata of the saved logins (service, label, username/email), optionally for one site. */
    readonly accounts: WalletSubEngine['accounts'];
    /** The task now waits for a protected Wallet action (it checkpoints when its turn ends). */
    readonly onWait: (action: string) => void;
};

/**
 * How an agent completes a one-time code step: autonomously from a channel it can already read, otherwise through the
 * Wallet's protected owner input (never a chat).
 */
const CODE_GUIDANCE =
    "For a one-time code: when it arrives in an email or another channel you can already read, get it there and enter it yourself (a code is used once, it is no credential). Otherwise call wallet_login again on this page with requestCode set to true: the owner enters the code in the Wallet's protected input; never ask for it in a chat.";

/**
 * What the agent learns from a Wallet login request (redacted: never a username or password).
 */
function walletMessage(result: WalletLoginResult): string {
    switch (result.status) {
        case 'signed-in':
            return `Signed in to ${result.origin} with the saved login "${result.account}" (the Wallet entered it; the credentials are not available to you).${result.note ? ` ${result.note}.` : ''} Verify the page shows what the task needs.`;
        case 'challenge':
            return `The Wallet entered the saved login "${result.account}" for ${result.origin}, and the site now asks for another step (${result.note ?? 'for example a CAPTCHA, a two-factor code or an approval'}). Complete technical steps such as a CAPTCHA yourself (the Wallet enters the login only into a form without an unsolved CAPTCHA: when the login form is shown after you solved it, call wallet_login again), and choose "stay signed in" or "trust this device" when offered. ${CODE_GUIDANCE} Use browser_request_user_action only for an approval only the account owner can give. You are not signed in until the site shows the access you need.`;
        case 'no-login-form':
            return `The current page of ${result.origin} shows no login form. If the site is already signed in, just continue; otherwise open its login page and call wallet_login again.`;
        case 'related':
            return `The Wallet has no login for ${result.origin} itself, but for the related service domain${result.logins.length === 1 ? '' : 's'} ${result.logins.map((login) => `${login.origin} ("${login.account}")`).join(', ')}. Open that site's own sign-in page (usually through this site's Sign in link, which leads there) and call wallet_login again on it; never ask for the credentials. If that login does not apply to this site, call wallet_login here again with ignoreRelated set to true.`;
        case 'code-needed':
            return `${result.origin} asks for a one-time code. ${CODE_GUIDANCE}`;
        case 'approval-needed':
            return `${result.origin} waits for this sign-in to be approved in its app or on another device; the Wallet has nothing to enter. Check the page again shortly: it usually continues by itself once approved. If it does not, use browser_request_user_action for this approval, which only the account owner can give.`;
        case 'code-entered':
            return `The Wallet entered the one-time code the owner supplied, and ${result.origin} accepted it${result.note ? ` (${result.note})` : ''}. Verify the page shows what the task needs.`;
        case 'ambiguous':
            return `The Wallet has several logins for ${result.origin}: ${result.accounts.map((account) => `"${account}"`).join(', ')}. Call wallet_login again with account set to the one the task requires.`;
        case 'waiting':
            if (result.problem === 'field') return `${result.reason} A protected Wallet request was created for the owner (request ${result.action}); never ask for these values in a chat. End your turn now with status waiting-for-user: the task resumes once they are added, then open the login page again and call wallet_login (the Wallet fills them; you never see them).`;
            if (result.problem === 'code') return `${result.reason} A protected Wallet request was created for the owner (request ${result.action}); never ask for the code in a chat. End your turn now with status waiting-for-user: the task resumes once the code is entered, then call wallet_login again on the same code page (the Wallet enters the code; you never see it).`;
            return `${result.reason} A protected Wallet request was created for the owner (request ${result.action}); never ask for the username or password in a chat. End your turn now with status waiting-for-user: the task resumes once the login is added, then open the login page again and call wallet_login.`;
        case 'failed':
            return `The Wallet could not sign in: ${result.reason}`;
    }
}

/**
 * Browser tools exposed to agents through the ptbk MCP bridge. An agent has full access to the browser it uses —
 * everything a person at that browser could do: every tab, any URL, the complete page (shadow DOM and frames
 * included), trusted mouse and keyboard input, uploads, page JavaScript, the raw DevTools protocol and the DevTools
 * endpoint for its own scripts. Every call resolves the live inventory: a browser added during the task is selectable
 * at the next call; `browser` names a specific tool (account/profile).
 *
 * @private project browser
 */
export function browserTools(fleet: Pick<BrowserScope, 'acquire'>, chats: TaskChats | undefined, agent: string, onUserChat: (chat: { chat: string; awaited: number }) => void, describe: () => Array<{ name: string; description?: string; profile: string; isHeadless: boolean }>, wallet?: AgentWallet): BridgeTool[] {
    // One task's browser calls run one at a time: nothing observes its tab while the Wallet enters a login.
    const serial = new Mutex();
    const run = async (action: () => Promise<string | ToolResult>): Promise<ToolResult> =>
        await serial.run(async () => {
            try {
                const result = await action();
                return typeof result === 'string' ? { text: result } : result;
            } catch (error) {
                const next = error instanceof PtbkError && error.details.next?.length ? ` ${error.details.next.join(' ')}` : '';
                return { text: `${errorMessage(error)}${next}`, isError: true };
            }
        });
    const name = (input: Readonly<Record<string, unknown>>): string | undefined => (typeof input.browser === 'string' && input.browser.trim() ? input.browser.trim() : undefined);
    const tool = (definition: { name: string; description: string; properties?: Record<string, unknown>; required?: string[] }, handler: (input: Readonly<Record<string, unknown>>) => Promise<string | ToolResult>): BridgeTool => ({
        name: definition.name,
        description: definition.description,
        inputSchema: { type: 'object', properties: { ...definition.properties, ...BROWSER_PROPERTY }, ...(definition.required ? { required: definition.required } : {}) },
        handler: (input) => run(() => handler(input)),
    });
    const browser = (input: Readonly<Record<string, unknown>>) => fleet.acquire(name(input));
    return [
        {
            name: 'browser_list',
            description: "List the project's enabled browser tools (names, descriptions, profile kinds). You have full access to the browser you use; choose the one whose account/profile fits the task and never act from a different account merely because it is logged in.",
            inputSchema: { type: 'object', properties: {} },
            handler: () =>
                run(async () => {
                    const browsers = describe();
                    if (!browsers.length) return 'No browser tool is enabled for this project.';
                    return browsers.map((item) => `- ${item.name}${item.description ? `: ${item.description}` : ''} (${item.profile}, ${item.isHeadless ? 'headless' : 'visible window'})`).join('\n');
                }),
        },
        tool(
            { name: 'browser_open', description: 'Open any URL in the project browser (persistent logged-in sessions of its profile), optionally in a new tab, and return the page text and numbered interactive elements.', properties: { url: { type: 'string' }, newTab: { type: 'boolean', description: 'Open it in a new tab instead of the current one.' } }, required: ['url'] },
            async (input) => (await browser(input)).open(String(input.url ?? ''), input.newTab === true),
        ),
        tool(
            { name: 'browser_navigate', description: "Go back or forward in the current tab's history, or reload it; returns the page.", properties: { action: { type: 'string', enum: ['back', 'forward', 'reload'] } }, required: ['action'] },
            async (input) => {
                const action = String(input.action ?? '');
                if (action !== 'back' && action !== 'forward' && action !== 'reload') throw new PtbkError('action must be back, forward or reload.', { kind: 'usage' });
                return (await browser(input)).navigate(action);
            },
        ),
        tool(
            { name: 'browser_tabs', description: 'Work with the tabs of the browser: list them (default), open a new one (optionally at url), select one to work in, or close one (default: the current tab). Tabs a website opens are included.', properties: { action: { type: 'string', enum: ['list', 'new', 'select', 'close'] }, tab: { type: 'string', description: 'Tab id (or a unique prefix) from the list.' }, url: { type: 'string', description: 'URL for a new tab.' } } },
            async (input) => {
                const action = String(input.action ?? 'list');
                const instance = await browser(input);
                if (action === 'list') return instance.tabs();
                if (action !== 'new' && action !== 'select' && action !== 'close') throw new PtbkError('action must be list, new, select or close.', { kind: 'usage' });
                return instance.tab(action, typeof input.tab === 'string' ? input.tab : undefined, typeof input.url === 'string' ? input.url : undefined);
            },
        ),
        tool(
            { name: 'browser_read', description: 'Return the complete current page: open dialogs, text (including shadow DOM and same-origin frames), and numbered interactive elements (links, buttons, fields, rich-text editors, ARIA widgets) with their current values. The numbers are the ref of the other browser tools.' },
            async (input) => (await browser(input)).read(),
        ),
        tool(
            {
                name: 'browser_click',
                description: 'Click like a person (trusted mouse events) on an element by ref or at viewport coordinates; returns the page afterwards. A tab the click opens becomes the current tab. Refuses when another element covers the target (pass force: true for a programmatic click).',
                properties: {
                    ...POINTER_PROPERTIES,
                    button: { type: 'string', enum: ['left', 'right', 'middle'] },
                    clickCount: { type: 'number', description: '2 for a double click.' },
                    modifiers: { type: 'array', items: { type: 'string', enum: ['Alt', 'Control', 'Meta', 'Shift'] } },
                    force: { type: 'boolean', description: 'Click the element programmatically even when covered.' },
                },
            },
            async (input) => {
                const button = input.button === undefined ? undefined : String(input.button);
                if (button !== undefined && button !== 'left' && button !== 'right' && button !== 'middle') throw new PtbkError('button must be left, right or middle.', { kind: 'usage' });
                return (await browser(input)).click(pointerArgument(input), { button, clickCount: numberArgument(input, 'clickCount'), modifiers: parseModifiers(Array.isArray(input.modifiers) ? input.modifiers : undefined) });
            },
        ),
        tool({ name: 'browser_hover', description: 'Move the mouse over an element by ref or to viewport coordinates (menus and tooltips that open on hover); returns the page.', properties: { ...POINTER_PROPERTIES } }, async (input) => (await browser(input)).hover(pointerArgument(input))),
        tool(
            {
                name: 'browser_scroll',
                description: 'Scroll an element (ref) into view, or turn the mouse wheel by deltaX/deltaY pixels (default: most of a screen down) at a viewport point (default: the center), which scrolls the page or the scrollable area under it; returns the page.',
                properties: { ref: POINTER_PROPERTIES.ref, deltaX: { type: 'number' }, deltaY: { type: 'number' }, x: POINTER_PROPERTIES.x, y: POINTER_PROPERTIES.y },
            },
            async (input) => (await browser(input)).scroll({ ref: numberArgument(input, 'ref'), deltaX: numberArgument(input, 'deltaX'), deltaY: numberArgument(input, 'deltaY'), x: numberArgument(input, 'x'), y: numberArgument(input, 'y') }),
        ),
        tool(
            {
                name: 'browser_type',
                description:
                    'Type text like a person (trusted keyboard input) into an element by ref — its content is replaced unless replace is false — or, without ref, at the caret of the focused element. Works in plain fields and rich-text editors (contenteditable, also in shadow DOM); newlines become Enter. For selects, checkboxes and date/color/range inputs the text is the value or option to choose. Returns the element content afterwards to verify, then the page. Secret fields are never recorded.',
                properties: { ref: POINTER_PROPERTIES.ref, text: { type: 'string' }, replace: { type: 'boolean', description: 'Replace the existing content (default true with ref, false without).' }, submit: { type: 'boolean', description: 'Submit afterwards (the form of an input, else Enter).' } },
                required: ['text'],
            },
            async (input) => (await browser(input)).type({ ref: numberArgument(input, 'ref'), text: String(input.text ?? ''), replace: typeof input.replace === 'boolean' ? input.replace : undefined, submit: input.submit === true }),
        ),
        tool(
            { name: 'browser_press_key', description: 'Press a key or shortcut in the current page, e.g. Enter, Tab, Escape, Backspace, ArrowDown, PageDown, Shift+Tab or Control+A (editing shortcuts work on every platform); optionally repeated. Returns the page.', properties: { keys: { type: 'string' }, times: { type: 'number' } }, required: ['keys'] },
            async (input) => (await browser(input)).pressKeys(String(input.keys ?? ''), numberArgument(input, 'times') ?? 1),
        ),
        tool(
            { name: 'browser_upload', description: 'Attach files to a file input by ref, or to the file chooser that clicking the element (e.g. an "Add media" button) opens. Paths are absolute or relative to the project.', properties: { ref: POINTER_PROPERTIES.ref, paths: { type: 'array', items: { type: 'string' } } }, required: ['ref', 'paths'] },
            async (input) => {
                const ref = numberArgument(input, 'ref');
                if (ref === undefined) throw new PtbkError('Give the ref of the file input or of the element that opens the file chooser.', { kind: 'usage' });
                return (await browser(input)).upload(ref, Array.isArray(input.paths) ? input.paths.map(String) : typeof input.paths === 'string' ? [input.paths] : []);
            },
        ),
        tool(
            { name: 'browser_evaluate', description: 'Run JavaScript in the current page (top-level await allowed; elements of the last browser_read are ptbkRef(n)) and return its JSON value.', properties: { script: { type: 'string' } }, required: ['script'] },
            async (input) => (await browser(input)).runScript(String(input.script ?? '')),
        ),
        tool({ name: 'browser_screenshot', description: 'Take a screenshot of the viewport (or the full page) that you can see; also saved to a file whose path is returned.', properties: { fullPage: { type: 'boolean' } } }, async (input) => {
            const shot = await (await browser(input)).screenshot(input.fullPage === true);
            return { text: shot.summary, images: [{ data: shot.data, mimeType: 'image/png' }] };
        }),
        tool(
            {
                name: 'browser_cdp',
                description: 'Send any Chrome DevTools Protocol command to the current page (scope page, default) or to the browser (scope browser), e.g. Page.printToPDF, Emulation.setGeolocationOverride or Input.dispatchDragEvent; returns its JSON result.',
                properties: { method: { type: 'string' }, params: { type: 'object' }, scope: { type: 'string', enum: ['page', 'browser'] } },
                required: ['method'],
            },
            async (input) => (await browser(input)).protocol(String(input.method ?? ''), input.params && typeof input.params === 'object' ? (input.params as Record<string, unknown>) : {}, input.scope === 'browser' ? 'browser' : 'page'),
        ),
        tool({ name: 'browser_devtools_endpoint', description: "Return the browser's local DevTools endpoint for your own automation scripts (Playwright connectOverCDP, Puppeteer connect) while this task holds the browser." }, async (input) => (await browser(input)).devtoolsEndpoint()),
        ...(wallet
            ? [
                  tool(
                      {
                          name: 'wallet_accounts',
                          description:
                              "List the project's saved Wallet logins as nonsecret metadata (service, label, username or email) to decide which account the work should use without asking; with site, only that website and its related service domains (e.g. accounts.google.com for mail.google.com). Passwords and codes are never available; sign in with wallet_login.",
                          properties: { site: { type: 'string', description: 'Website address to filter by (optional).' } },
                      },
                      async (input) => {
                          const listed = wallet.accounts(typeof input.site === 'string' && input.site.trim() ? input.site : undefined);
                          if (listed.state !== 'ready') return `The Wallet is ${listed.state} on this computer, so its logins cannot be listed now; wallet_login creates a protected request for the owner when a login is needed.`;
                          if (!listed.accounts.length) return 'The Wallet has no saved login for this.';
                          return listed.accounts.map((login) => `- ${login.origin}: "${login.label}"${login.username ? ` (${login.username})` : ''}${login.related ? ' — related service domain' : ''}`).join('\n');
                      },
                  ),
                  tool(
                      {
                          name: 'wallet_login',
                          description:
                              "When the website open in your current tab requires signing in (and is not signed in already): the project's Wallet signs in with a saved login of that page's actual origin, without showing you the credentials. Open the site's login page first. If no saved login fits (or it was rejected), the Wallet asks the owner through its protected interface; never ask for usernames or passwords in a chat and never type them yourself.",
                          properties: {
                              account: { type: 'string', description: 'Account the task requires (label or username), when the task names one.' },
                              reason: { type: 'string', description: 'Why the task needs this login (shown to the owner).' },
                              ignoreRelated: { type: 'boolean', description: "Set to true only after a related service domain's login (reported earlier) turned out not to apply to this site." },
                              requestCode: { type: 'boolean', description: 'On a one-time code page: set to true when you cannot obtain the code yourself from an email or channel you can read; the owner then enters it in protected Wallet input.' },
                          },
                      },
                      async (input) => {
                          const instance = await browser(input);
                          const result = await wallet.login(instance.walletPage(), { account: typeof input.account === 'string' ? input.account : undefined, reason: typeof input.reason === 'string' ? input.reason : undefined, ignoreRelated: input.ignoreRelated === true, requestCode: input.requestCode === true });
                          if (result.status === 'waiting') wallet.onWait(result.action);
                          const message = walletMessage(result);
                          return result.status === 'signed-in' || result.status === 'code-entered' ? `${message}\n\n${await instance.read()}` : { text: message, isError: result.status === 'failed' };
                      },
                  ),
              ]
            : []),
        tool(
            {
                name: 'browser_request_user_action',
                description: `Only for a step that genuinely needs the human after you tried it with full access to the browser (a code or approval only the account owner receives, consent only they may give, a challenge you could not solve${wallet ? '; a missing username/password or a one-time code goes through wallet_login instead' : ', credentials you do not have'}): ask the human to act in the project browser. Attempt CAPTCHAs and other technical steps yourself first. Never use it to ask for browser control or permissions. Then end your turn with status waiting-for-user.`,
                properties: { reason: { type: 'string' } },
                required: ['reason'],
            },
            async (input) => {
                if (!chats) throw new PtbkError('The user is not available in this run; report blocked with the reason instead.', { kind: 'unsupported' });
                const instance = await browser(input);
                const note = await instance.bringToFront();
                const chat = await chats.askUser({
                    agent,
                    reason: String(input.reason ?? `A website needs your action in the browser "${instance.name}".`),
                    attempted: `I used the existing session of the project browser "${instance.name}"; the website still requires this human-only step.`,
                    question: `Please complete the action in the browser "${instance.name}"${note ? ` (${note})` : ''}, then confirm here.`,
                    choices: ['Done', 'I cannot do it'],
                });
                onUserChat(chat);
                return `The request is in the chat {${chat.chat}}, waiting for the user. End your turn now with status waiting-for-user.`;
            },
        ),
    ];
}
