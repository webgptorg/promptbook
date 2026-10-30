/**
 * JavaScript evaluated inside project-browser pages on behalf of agents.
 *
 * Pages are read through open shadow roots and same-origin frames (rich editors of sites such as LinkedIn live in
 * shadow DOM), and the numbered elements of the last read are kept in the page (`window.__ptbkRefs`, reachable as
 * `ptbkRef(n)` from agent scripts) so later actions address exactly the listed element.
 */

/**
 * Maximal page text returned to an agent.
 *
 * @private browser page scripts
 */
export const MAX_PAGE_TEXT = 20_000;

/**
 * Maximal number of listed interactive elements.
 */
const MAX_ELEMENTS = 250;

/**
 * Elements an agent can interact with: links, buttons, form fields, rich-text editors and ARIA widgets.
 */
const INTERACTIVE_SELECTOR = [
    'a[href]',
    'button',
    'input',
    'textarea',
    'select',
    'summary',
    '[contenteditable]:not([contenteditable="false"])',
    ...['button', 'link', 'textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'slider', 'spinbutton', 'treeitem'].map((role) => `[role="${role}"]`),
].join(', ');

/**
 * Helpers shared by the page scripts (defined inside each evaluated function).
 */
const HELPERS = `
    const ptbkClean = (text) => String(text || '').replace(/\\s+/g, ' ').trim();
    const ptbkRoots = () => {
        const roots = [];
        const visit = (root) => {
            roots.push(root);
            for (const element of root.querySelectorAll('*')) {
                if (element.shadowRoot) visit(element.shadowRoot);
                if (element.tagName === 'IFRAME' || element.tagName === 'FRAME') {
                    let inner = null;
                    try { inner = element.contentDocument; } catch (error) { inner = null; }
                    if (inner && inner.documentElement) visit(inner);
                }
            }
        };
        visit(document);
        return roots;
    };
    const ptbkParent = (node) => {
        const parent = node.parentNode;
        if (!parent) return null;
        if (parent.nodeType === 11) return parent.host || null;
        if (parent.nodeType === 9) { try { return parent.defaultView ? parent.defaultView.frameElement : null; } catch (error) { return null; } }
        return parent;
    };
    const ptbkContains = (ancestor, node) => { for (let current = node; current; current = ptbkParent(current)) if (current === ancestor) return true; return false; };
    const ptbkDeepActive = () => {
        let active = document.activeElement;
        for (;;) {
            if (active && active.shadowRoot && active.shadowRoot.activeElement) active = active.shadowRoot.activeElement;
            else if (active && (active.tagName === 'IFRAME' || active.tagName === 'FRAME')) { let inner = null; try { inner = active.contentDocument; } catch (error) { inner = null; } if (inner && inner.activeElement && inner.activeElement !== inner.body) active = inner.activeElement; else break; }
            else break;
        }
        return active;
    };
    const ptbkIsSecret = (element) => Boolean(element && (element.type === 'password' || /otp|one-time|password|passcode/i.test(element.autocomplete || element.name || '')));
    const ptbkTextEntry = (element) => {
        if (!element) return false;
        if (element.isContentEditable) return true;
        if (element.tagName === 'TEXTAREA') return true;
        if (element.tagName === 'INPUT') return ['text', 'search', 'email', 'url', 'tel', 'password', 'number', ''].includes((element.getAttribute('type') || '').toLowerCase());
        return false;
    };
    const ptbkContent = (element) => {
        if (!element) return '';
        if (ptbkIsSecret(element)) return element.value ? '(secret value, not shown)' : '';
        if (element.isContentEditable) return element.innerText;
        if (element.tagName === 'SELECT') return [...element.selectedOptions].map((option) => option.text.trim()).join(', ');
        if (element.tagName === 'INPUT' && (element.type === 'checkbox' || element.type === 'radio')) return element.checked ? 'checked' : 'unchecked';
        if (element.tagName === 'INPUT' && element.type === 'file') return [...(element.files || [])].map((file) => file.name).join(', ');
        return 'value' in element ? String(element.value) : element.innerText || '';
    };
    const ptbkDescribe = (element) => {
        if (!element) return 'nothing';
        const id = element.id ? '#' + element.id : '';
        const field = element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
        const text = ptbkClean(element.getAttribute('aria-label') || element.getAttribute('placeholder') || (field ? '' : element.innerText) || '').slice(0, 60);
        return element.tagName.toLowerCase() + id + (text ? ' "' + text + '"' : '');
    };
    const ptbkElement = (ref) => {
        const element = (window.__ptbkRefs || [])[ref - 1];
        return element && element.isConnected ? element : null;
    };
    const ptbkPoint = (element) => {
        element.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = element.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return { visible: false };
        let x = rect.left + rect.width / 2;
        let y = rect.top + rect.height / 2;
        let view = element.ownerDocument.defaultView;
        while (view && view !== window && view.frameElement) {
            const frame = view.frameElement.getBoundingClientRect();
            x += frame.left + view.frameElement.clientLeft;
            y += frame.top + view.frameElement.clientTop;
            view = view.parent;
        }
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return { visible: false };
        let covered = '';
        if (element.ownerDocument === document) {
            let hit = document.elementFromPoint(x, y);
            while (hit && hit.shadowRoot) { const inner = hit.shadowRoot.elementFromPoint(x, y); if (!inner || inner === hit) break; hit = inner; }
            if (hit && !ptbkContains(element, hit)) covered = ptbkDescribe(hit);
        }
        return { visible: true, x, y, covered };
    };
`;

/**
 * Wraps a script body into an evaluated function with the shared helpers.
 */
function pageFunction(body: string): string {
    return `(() => {${HELPERS}\n${body}\n})()`;
}

/**
 * Result of {@link readPageScript}.
 *
 * @private browser page scripts
 */
export type PageReading = { url: string; title: string; text: string; elements: string[]; omitted: number };

/**
 * Reads the complete page: open dialogs first, the page text, then content of open shadow roots and same-origin
 * frames, plus numbered interactive elements (dialog and in-viewport elements first) with their current values.
 *
 * @private browser page scripts
 */
export function readPageScript(): string {
    return pageFunction(`
        const roots = ptbkRoots();
        const hidden = (element) => { const style = element.ownerDocument.defaultView.getComputedStyle(element); return style.display === 'none' || style.visibility === 'hidden'; };
        const dialogs = [];
        for (const root of roots) for (const dialog of root.querySelectorAll('dialog[open], [aria-modal="true"], [role="dialog"], [role="alertdialog"]')) if (dialog.getClientRects().length && !hidden(dialog) && !dialogs.some((outer) => ptbkContains(outer, dialog))) dialogs.push(dialog);
        // Children that are (or hold) an open dialog are shown with the dialog, not again with their shadow root.
        const shadowText = (root, skipDialogs) => [...root.children].filter((child) => !['STYLE', 'SCRIPT', 'TEMPLATE', 'LINK'].includes(child.tagName) && !(skipDialogs && dialogs.some((dialog) => ptbkContains(child, dialog)))).map((child) => child.innerText || '').filter((text) => text.trim()).join('\\n');
        const deepText = (element) => [element.innerText || '', ...roots.filter((root) => root.host && ptbkContains(element, root.host)).map((root) => shadowText(root, false))].filter((text) => text.trim()).join('\\n');
        const sections = [];
        let budget = ${MAX_PAGE_TEXT};
        const add = (heading, text, limit) => {
            const value = String(text || '').trim();
            if (!value || budget <= 0) return;
            const cut = value.slice(0, Math.min(limit, budget));
            budget -= cut.length;
            sections.push((heading ? heading + '\\n' : '') + cut + (cut.length < value.length ? '\\n… (' + (value.length - cut.length) + ' more characters)' : ''));
        };
        for (const dialog of dialogs) add('Open dialog' + (dialog.getAttribute('aria-label') ? ' "' + ptbkClean(dialog.getAttribute('aria-label')) + '"' : '') + ':', deepText(dialog), ${MAX_PAGE_TEXT / 2});
        const extra = [];
        for (const root of roots) {
            if (root === document) continue;
            const host = root.host || (root.defaultView ? root.defaultView.frameElement : null);
            if (!host || dialogs.some((dialog) => ptbkContains(dialog, host))) continue;
            const text = root.host ? shadowText(root, true) : root.body ? root.body.innerText : '';
            if (text.trim()) extra.push({ heading: root.host ? 'Content of <' + host.tagName.toLowerCase() + (host.id ? '#' + host.id : '') + '> (shadow DOM):' : 'Frame ' + (host.getAttribute('src') || '') + ':', text });
        }
        const extraLength = extra.reduce((sum, item) => sum + item.text.length, 0);
        add(dialogs.length ? 'Whole page:' : '', document.body ? document.body.innerText : '', Math.max(budget - Math.min(extraLength, ${MAX_PAGE_TEXT / 4}), ${MAX_PAGE_TEXT / 4}));
        for (const item of extra) add(item.heading, item.text, ${MAX_PAGE_TEXT / 4});
        const candidates = [];
        for (const root of roots) for (const element of root.querySelectorAll(${JSON.stringify(INTERACTIVE_SELECTOR)})) {
            if (element.isContentEditable && element.parentElement && element.parentElement.isContentEditable) continue;
            const file = element.tagName === 'INPUT' && element.type === 'file';
            if (!file && (!element.getClientRects().length || hidden(element))) continue;
            candidates.push(element);
        }
        const inView = (element) => { const rect = element.getBoundingClientRect(); return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth; };
        const rank = (element) => (dialogs.some((dialog) => ptbkContains(dialog, element)) ? 0 : element.ownerDocument === document && inView(element) ? 1 : 2);
        const ranked = candidates.map((element, index) => ({ element, index, rank: rank(element) })).sort((a, b) => a.rank - b.rank || a.index - b.index);
        const chosen = ranked.slice(0, ${MAX_ELEMENTS}).map((item) => item.element);
        window.__ptbkRefs = chosen;
        window.ptbkRef = (ref) => (window.__ptbkRefs || [])[ref - 1];
        const labelOf = (element) => {
            const labelledBy = element.getAttribute('aria-labelledby');
            const root = element.getRootNode();
            const labelled = labelledBy && root.getElementById ? labelledBy.split(/\\s+/).map((id) => { const target = root.getElementById(id); return target ? target.innerText || target.textContent || '' : ''; }).join(' ') : '';
            const native = element.labels && element.labels.length ? [...element.labels].map((label) => label.innerText).join(' ') : '';
            return ptbkClean(element.getAttribute('aria-label') || labelled || native || element.getAttribute('placeholder') || element.getAttribute('aria-placeholder') || element.getAttribute('data-placeholder') || element.getAttribute('title') || element.getAttribute('alt') || element.getAttribute('name') || '');
        };
        const elements = chosen.map((element, index) => {
            const tag = element.tagName.toLowerCase();
            const role = element.getAttribute('role') || '';
            const type = tag === 'input' ? (element.getAttribute('type') || 'text').toLowerCase() : '';
            const field = ['input', 'textarea', 'select'].includes(tag) || element.isContentEditable || ['textbox', 'searchbox', 'combobox', 'spinbutton', 'slider'].includes(role);
            const kind = [tag, type, role && role !== tag ? 'role=' + role : '', element.isContentEditable ? 'editable' : '', element.disabled || element.getAttribute('aria-disabled') === 'true' ? 'disabled' : '', element.getAttribute('aria-expanded') ? 'expanded=' + element.getAttribute('aria-expanded') : '', element.getAttribute('aria-checked') ? 'checked=' + element.getAttribute('aria-checked') : '', element.getAttribute('aria-selected') === 'true' ? 'selected' : ''].filter(Boolean).join(' ');
            const text = field || tag === 'select' ? '' : ptbkClean(element.innerText || element.value || '');
            const label = labelOf(element);
            let line = '[' + (index + 1) + '] ' + kind;
            if (text || label) line += ' "' + (text || label).slice(0, 100) + '"';
            if (text && label && label !== text) line += ' (' + label.slice(0, 60) + ')';
            if (field || (tag === 'input' && ['checkbox', 'radio', 'file'].includes(type))) { const content = ptbkContent(element); line += ' = ' + JSON.stringify(content.length > 500 ? content.slice(0, 500) + '…' : content); }
            if (tag === 'select') line += ' options: ' + [...element.options].slice(0, 30).map((option) => ptbkClean(option.text)).join(' | ');
            if (tag === 'a') line += ' -> ' + String(element.getAttribute('href') || '').slice(0, 160);
            if (element.ownerDocument !== document) line += ' (in frame)';
            return line;
        });
        return { url: location.href, title: document.title, text: sections.join('\\n\\n'), elements, omitted: candidates.length - chosen.length };
    `);
}

/**
 * Locates a numbered element, scrolls it into view and returns its click point (viewport CSS pixels), whether it has
 * a visible box and what covers it.
 *
 * @private browser page scripts
 */
export function elementPointScript(ref: number): string {
    return pageFunction(`
        const element = ptbkElement(${Number(ref)});
        if (!element) return { missing: true };
        return { ...ptbkPoint(element), description: ptbkDescribe(element) };
    `);
}

/**
 * Clicks a numbered element programmatically (for elements without a visible box or an explicit `force`).
 *
 * @private browser page scripts
 */
export function programmaticClickScript(ref: number): string {
    return pageFunction(`
        const element = ptbkElement(${Number(ref)});
        if (!element) return false;
        element.click();
        return true;
    `);
}

/**
 * Classifies the target of text entry (a numbered element or the focused one): `text` for fields and editors that
 * take typed text, `value` for selects, checkboxes, dates, colors and ranges, `file` for file inputs.
 *
 * @private browser page scripts
 */
export function entryTargetScript(ref: number | undefined): string {
    return pageFunction(`
        const element = ${ref === undefined ? 'ptbkDeepActive()' : `ptbkElement(${Number(ref)})`};
        if (!element || element === document.body) return ${ref === undefined ? "{ kind: 'text', secret: false, singleLine: false }" : '{ missing: true }'};
        const file = element.tagName === 'INPUT' && element.type === 'file';
        const kind = file ? 'file' : ptbkTextEntry(element) || ['textbox', 'searchbox', 'combobox'].includes(element.getAttribute('role') || '') ? 'text' : element.tagName === 'SELECT' || element.tagName === 'INPUT' ? 'value' : 'text';
        return { kind, secret: ptbkIsSecret(element), singleLine: element.tagName === 'INPUT', focused: ptbkDeepActive() === element, description: ptbkDescribe(element), ...(${ref === undefined ? 'false' : 'kind === "text"'} ? ptbkPoint(element) : {}) };
    `);
}

/**
 * Places the caret in a numbered (or the focused) text-entry element: everything selected (to be replaced) or the
 * caret at the end.
 *
 * @private browser page scripts
 */
export function focusForEntryScript(ref: number | undefined, replace: boolean): string {
    return pageFunction(`
        const element = ${ref === undefined ? 'ptbkDeepActive()' : `ptbkElement(${Number(ref)})`};
        if (!element) return false;
        element.focus();
        if (element.isContentEditable) {
            const selection = (element.getRootNode().getSelection ? element.getRootNode().getSelection() : null) || element.ownerDocument.getSelection();
            const range = element.ownerDocument.createRange();
            range.selectNodeContents(element);
            if (!${replace}) range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        } else if (typeof element.select === 'function' && ${replace}) element.select();
        else if (typeof element.setSelectionRange === 'function') { try { element.setSelectionRange(element.value.length, element.value.length); } catch (error) { /* type without selection API */ } }
        return true;
    `);
}

/**
 * Sets the value of a select, checkbox/radio or special input (date, color, range, …) like a person choosing it.
 *
 * @private browser page scripts
 */
export function setValueScript(ref: number, value: string): string {
    return pageFunction(`
        const element = ptbkElement(${Number(ref)});
        if (!element) return { error: 'missing' };
        const wanted = ${JSON.stringify(value)};
        element.focus();
        if (element.tagName === 'SELECT') {
            const options = [...element.options];
            const option = options.find((item) => item.value === wanted) || options.find((item) => ptbkClean(item.text) === ptbkClean(wanted)) || options.find((item) => ptbkClean(item.text).toLowerCase().includes(ptbkClean(wanted).toLowerCase()));
            if (!option) return { error: 'No option ' + JSON.stringify(wanted) + '; options: ' + options.map((item) => ptbkClean(item.text)).join(' | ') };
            element.value = option.value;
            option.selected = true;
        } else if (element.type === 'checkbox' || element.type === 'radio') {
            const on = /^(true|1|yes|on|checked)$/i.test(wanted.trim());
            if (element.checked !== on) element.click();
            return { content: ptbkContent(element) };
        } else {
            const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set;
            if (setter) setter.call(element, wanted); else element.value = wanted;
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return { content: ptbkContent(element) };
    `);
}

/**
 * Submits the form of a numbered (or the focused) element; `false` when it has no form (Enter is pressed instead).
 *
 * @private browser page scripts
 */
export function submitFormScript(ref: number | undefined): string {
    return pageFunction(`
        const element = ${ref === undefined ? 'ptbkDeepActive()' : `ptbkElement(${Number(ref)})`};
        if (!element || element.tagName !== 'INPUT' || !element.form) return false;
        if (element.form.requestSubmit) element.form.requestSubmit(); else element.form.submit();
        return true;
    `);
}

/**
 * Current content of a numbered (or the focused) element, with secrets masked.
 *
 * @private browser page scripts
 */
export function entryContentScript(ref: number | undefined): string {
    return pageFunction(`
        const element = ${ref === undefined ? 'ptbkDeepActive()' : `ptbkElement(${Number(ref)})`};
        return element ? { description: ptbkDescribe(element), content: ptbkContent(element) } : undefined;
    `);
}

/**
 * The numbered element itself (evaluated without `returnByValue` to obtain its remote object).
 *
 * @private browser page scripts
 */
export function elementObjectScript(ref: number): string {
    return `(window.__ptbkRefs || [])[${Number(ref) - 1}]`;
}

/**
 * Whether a numbered element is a file input.
 *
 * @private browser page scripts
 */
export function isFileInputScript(ref: number): string {
    return pageFunction(`
        const element = ptbkElement(${Number(ref)});
        return element ? element.tagName === 'INPUT' && element.type === 'file' : null;
    `);
}

/**
 * Viewport and document size in CSS pixels plus the device pixel ratio.
 *
 * @private browser page scripts
 */
export function viewportScript(): string {
    return `({ width: window.innerWidth, height: window.innerHeight, scale: window.devicePixelRatio, pageWidth: Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0), pageHeight: Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0), scrollX: window.scrollX, scrollY: window.scrollY })`;
}

/**
 * Result of {@link loginFormScript}.
 *
 * @private browser page scripts
 */
export type LoginScan = {
    readonly origin: string;
    readonly username: boolean;
    readonly password: boolean;
    readonly otp: boolean;
    /**
     * Other empty fields of the login form (date of birth, security answer, customer number, …), marked `field-<n>`,
     * with their visible label and whether the form requires them. Without a username or password field, only required
     * fields of a form whose label looks like a sign-in question count (a step after the password).
     */
    readonly fields: readonly { readonly marker: string; readonly label: string; readonly required: boolean }[];
    /**
     * The page has no field to fill and waits for the sign-in to be approved elsewhere (a prompt in the service's app,
     * another device, number matching): a short page whose wording asks for such an approval.
     */
    readonly approval: boolean;
};

/**
 * Finds the visible login fields of the current page (top document) for the Wallet and marks them: the password field
 * and the username field before it in its form, or a lone username field of a two-step login, plus the form's other
 * empty fields with their labels. Values are never read.
 *
 * @private browser page scripts
 */
export function loginFormScript(): string {
    return `(() => {
        const visible = (element) => { const box = element.getBoundingClientRect(); const style = getComputedStyle(element); return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && !element.disabled && !element.readOnly; };
        const label = (element) => [element.name, element.id, element.placeholder || '', element.getAttribute('aria-label') || '', element.autocomplete || ''].join(' ');
        const textual = (element) => ['text', 'email', 'tel', ''].includes((element.getAttribute('type') || '').toLowerCase());
        const userLike = (element) => textual(element) && (element.type === 'email' || /username|email/i.test(element.autocomplete || '') || /user|e-?mail|login|account|identifier|phone/i.test(label(element)));
        const otpLike = (element) => /one-time-code/i.test(element.autocomplete || '') || /otp|totp|2fa|mfa|two.?factor|verification.?code|security.?code/i.test(label(element));
        for (const marked of document.querySelectorAll('[data-ptbk-wallet]')) marked.removeAttribute('data-ptbk-wallet');
        const inputs = [...document.querySelectorAll('input')].filter(visible);
        // The visible name of a field: its label element, aria label(l)ing, a wrapping label, then placeholder or name.
        const describe = (element) => {
            const byFor = element.id ? document.querySelector('label[for="' + CSS.escape(element.id) + '"]') : null;
            const labelled = (element.getAttribute('aria-labelledby') || '').split(/\\s+/).filter(Boolean).map((id) => (document.getElementById(id) || {}).textContent || '').join(' ');
            const wrapping = element.closest('label');
            return ((byFor && byFor.textContent) || labelled || element.getAttribute('aria-label') || (wrapping && wrapping.textContent) || element.placeholder || element.name || element.id || '').replace(/\\s+/g, ' ').trim().slice(0, 80);
        };
        // A masked answer to a sign-in question (security answer, memorable word) without a text field before it is an
        // additional field of a step after the password, not the login password itself.
        const precededByText = (element) => [...(element.form || document).querySelectorAll('input')].some((other) => other !== element && visible(other) && textual(other) && other.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
        const questionLike = (element) => /answer|question|memorable|birth/i.test(describe(element)) && !precededByText(element);
        const passwords = inputs.filter((element) => element.type === 'password' && !otpLike(element) && !questionLike(element));
        const password = passwords.find((element) => element.autocomplete !== 'new-password') || passwords[0];
        let username = null;
        if (password) {
            const scope = password.form || document;
            const before = [...scope.querySelectorAll('input')].filter((element) => visible(element) && textual(element) && !otpLike(element) && (element.compareDocumentPosition(password) & Node.DOCUMENT_POSITION_FOLLOWING));
            username = before.filter(userLike).pop() || before.pop() || null;
            password.setAttribute('data-ptbk-wallet', 'password');
        } else username = inputs.find((element) => userLike(element) && !otpLike(element)) || null;
        if (username) username.setAttribute('data-ptbk-wallet', 'username');
        const code = inputs.find(otpLike);
        if (code) code.setAttribute('data-ptbk-wallet', 'code');
        const fillable = (element) => !element.value && !element.hasAttribute('data-ptbk-wallet') && ['text', 'email', 'tel', 'password', 'number', 'date', ''].includes((element.getAttribute('type') || '').toLowerCase()) && !otpLike(element);
        const required = (element) => element.required || element.getAttribute('aria-required') === 'true';
        const anchor = password || username;
        const question = /birth|answer|question|security|memorable|secret|\\bpin\\b|customer|client|member|account.?number|passcode|postal|zip/i;
        const extra = anchor
            ? [...(anchor.form || document).querySelectorAll('input')].filter((element) => visible(element) && fillable(element))
            : code
              ? []
              : inputs.filter((element) => element.form && fillable(element) && required(element) && question.test(describe(element)));
        const fields = extra.slice(0, 12).map((element, index) => {
            element.setAttribute('data-ptbk-wallet', 'field-' + index);
            return { marker: 'field-' + index, label: describe(element), required: required(element) };
        });
        // Waiting for an approval elsewhere: only on a short page without any field to fill (never a signed-in page
        // that merely mentions approvals among its content).
        const text = !password && !username && !code && !fields.length && document.body ? (document.body.innerText || '').slice(0, 4000) : '';
        const approval = text.length > 0 && text.length < 3000 && /(approve|confirm|allow)[^.!?\\n]{0,60}(sign.?in|log.?in|request|it.?s (really )?you)|(check|open)[^.!?\\n]{0,30}(phone|mobile|device|authenticator|app)\\b|(sent|pushed)[^.!?\\n]{0,40}(notification|push|prompt)|waiting for (your )?(approval|confirmation)|(tap|select) the number/i.test(text);
        return { origin: location.origin, username: Boolean(username), password: Boolean(password), otp: Boolean(code), fields, approval };
    })()`;
}

/**
 * Focuses a login field marked by {@link loginFormScript} and selects its content (trusted text entry replaces it).
 *
 * @private browser page scripts
 */
export function focusLoginFieldScript(field: 'username' | 'password' | 'code' | `field-${number}`): string {
    const marker = /^field-\d+$/.test(field) ? field : field === 'password' ? 'password' : field === 'code' ? 'code' : 'username';
    return `(() => {
        const element = document.querySelector('[data-ptbk-wallet="${marker}"]');
        if (!element) return false;
        element.focus();
        if (element.select) element.select();
        return document.activeElement === element;
    })()`;
}

/**
 * Submits the login form of the marked fields (its submit button, else the form); `false` when Enter is needed.
 *
 * @private browser page scripts
 */
export function submitLoginScript(): string {
    return `(() => {
        const field = document.querySelector('[data-ptbk-wallet="password"]') || document.querySelector('[data-ptbk-wallet="username"]') || document.querySelector('[data-ptbk-wallet="code"]') || document.querySelector('[data-ptbk-wallet^="field-"]');
        const form = field && field.form;
        if (!form) return false;
        const button = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
        if (button && !button.disabled) { button.click(); return true; }
        if (form.requestSubmit) { form.requestSubmit(); return true; }
        return false;
    })()`;
}

/**
 * Chooses the login form's offered "stay signed in" / "remember me" / "trust this device" option (an unchecked visible
 * checkbox of the form of a marked field, by its label), so later work needs no new sign-in or factor. Returns how many
 * were chosen.
 *
 * @private browser page scripts
 */
export function staySignedInScript(): string {
    return `(() => {
        const field = document.querySelector('[data-ptbk-wallet="password"]') || document.querySelector('[data-ptbk-wallet="username"]') || document.querySelector('[data-ptbk-wallet="code"]') || document.querySelector('[data-ptbk-wallet^="field-"]');
        const scope = (field && field.form) || null;
        if (!scope) return 0;
        const pattern = /remember\\s*me|stay\\s*(signed|logged)\\s*in|keep\\s*me\\s*(signed|logged)\\s*in|trust\\s*(this|my)?\\s*(device|browser|computer)|(don.?t|do not)\\s*ask\\s*(again|me again)/i;
        let chosen = 0;
        for (const box of scope.querySelectorAll('input[type="checkbox"]')) {
            const label = ((box.id && document.querySelector('label[for="' + CSS.escape(box.id) + '"]')) || box.closest('label') || {}).textContent || box.getAttribute('aria-label') || box.name || '';
            const style = getComputedStyle(box);
            const shown = style.visibility !== 'hidden' && style.display !== 'none';
            if (box.checked || box.disabled || !shown || !pattern.test(label)) continue;
            box.click();
            if (box.checked) chosen++;
        }
        return chosen;
    })()`;
}

/**
 * Follows the page's evident sign-in link or button (`Sign in`, `Log in`, `Login`, by visible text or accessible name)
 * when the page shows no login form; `false` when there is none.
 *
 * @private browser page scripts
 */
export function followSignInLinkScript(): string {
    return `(() => {
        const pattern = /^\\s*(sign|log)\\s*-?\\s*in\\b|^\\s*login\\b/i;
        const visible = (element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; };
        for (const element of document.querySelectorAll('a[href], button, [role="button"], [role="link"]')) {
            const name = (element.getAttribute('aria-label') || element.textContent || '').trim();
            if (pattern.test(name) && visible(element)) { element.click(); return true; }
        }
        return false;
    })()`;
}

/**
 * Clears every password field of the page and removes the Wallet's marks, so no entered secret stays readable after a
 * Wallet sign-in (also when the site rejected it).
 *
 * @private browser page scripts
 */
export function clearLoginFieldsScript(): string {
    return `(() => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        for (const element of document.querySelectorAll('input[type="password"], [data-ptbk-wallet="password"], [data-ptbk-wallet="code"], [data-ptbk-wallet^="field-"]')) {
            if (!element.value) continue;
            setter.call(element, '');
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
        for (const marked of document.querySelectorAll('[data-ptbk-wallet]')) marked.removeAttribute('data-ptbk-wallet');
        return true;
    })()`;
}
