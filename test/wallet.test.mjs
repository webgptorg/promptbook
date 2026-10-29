import assert from 'node:assert/strict';
import { createHash, hkdfSync, pbkdf2Sync } from 'node:crypto';
import { cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { test } from 'node:test';
import { entropyToMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { browserTools } from '../dist/browser/agent-tools.js';
import { findBrowserExecutable } from '../dist/browser/browser.js';
import { BrowserFleet } from '../dist/browser/fleet.js';
import { createVerifier, deriveProjectRoot, domainKey, generateRecoveryWords, normalizeRecoveryWords, open, seal, verifyRoot } from '../dist/wallet/crypto.js';
import { WalletSubEngine, maskAccount, normalizeOrigin, originMatches, walletLabel } from '../dist/wallet/wallet.js';
import { commitAudit } from '../dist/project/git.js';
import { committed, git, GIT_IDENTITY, initializedProject, initRepository, ptbk, temporaryDirectory, waitFor } from './helpers.mjs';

/**
 * Why the real-browser Wallet tests are skipped (or false when a Chrome-compatible browser is available).
 */
async function realBrowserSkip() {
    if (process.env.PTBK_TEST_BROWSER === '0') return 'PTBK_TEST_BROWSER=0';
    if (process.env.CI && process.env.PTBK_TEST_BROWSER !== '1') return 'runs on CI only with PTBK_TEST_BROWSER=1';
    return (await findBrowserExecutable({ variant: 'CHROME' })) ? false : 'no Chrome-compatible browser is installed';
}

/**
 * A Wallet over a temporary project with the explicit fixture unlock store under `home` (one "computer").
 */
function walletAt(root, home) {
    const project = { root, runtime: { root: join(root, '.ptbk') } };
    const logs = [];
    const wallet = new WalletSubEngine({ project, env: { ...process.env, PTBK_HOME: home, PTBK_HOST_UNLOCK: 'insecure-test-file' }, onChange: () => undefined, log: (text) => logs.push(text) });
    return { wallet, logs };
}

/**
 * A login page double: the actual origin and a scripted verified result; it records what the Wallet entered.
 */
function fakePage(origin, result = 'signed-in') {
    const entered = [];
    return { entered, page: { browser: 'test-browser', inspect: async () => ({ origin, form: 'password' }), signIn: async (credentials) => (entered.push(credentials), { result }) } };
}

/**
 * Every file below a directory with its content (for "no secret anywhere" checks).
 */
async function filesBelow(directory) {
    const found = [];
    for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.git') continue;
            found.push(...(await filesBelow(path)));
        } else if (entry.isFile()) found.push({ path, content: await readFile(path, 'utf8').catch(() => '') });
    }
    return found;
}

/**
 * Every run of three consecutive recovery words (single common words occur in ordinary text; a run would not).
 */
function recoveryRuns(words) {
    return words.slice(0, -2).map((word, index) => `${word} ${words[index + 1]} ${words[index + 2]}`);
}

/**
 * SHA-256 of a file (to prove that a failed operation changed nothing).
 */
async function digest(path) {
    return createHash('sha256').update(await readFile(path)).digest('hex');
}

test('project encryption: standard 12-word vectors, derivation, domain separation and authenticated tamper failure', () => {
    // BIP-39 reference vectors through the maintained implementation.
    assert.equal(entropyToMnemonic(new Uint8Array(16), wordlist), 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    assert.equal(Buffer.from(mnemonicToSeedSync('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about', 'TREZOR')).toString('hex'), 'c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04');
    assert.equal(entropyToMnemonic(new Uint8Array(16).fill(0x7f), wordlist), 'legal winner thank year wave sausage worth useful legal winner thank yellow');
    assert.equal(Buffer.from(mnemonicToSeedSync('legal winner thank year wave sausage worth useful legal winner thank yellow', 'TREZOR')).toString('hex'), '2e8905819b8723fe2c1d161860e5ee1830318dbf49a83bd451cfb8440c28bd6fa457fe1296106559a3c80937a1c1069be3a3a5bd381ee6260e8d9739fce1f607');

    // The project root: standard seed (PBKDF2-HMAC-SHA512, 2048 iterations, empty passphrase), then HKDF-SHA256.
    const words = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'.split(' ');
    const salt = Buffer.alloc(32, 7);
    const seed = pbkdf2Sync(words.join(' ').normalize('NFKD'), 'mnemonic', 2048, 64, 'sha512');
    assert.equal(seed.toString('hex'), '5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4');
    const root = deriveProjectRoot(words, salt);
    assert.deepEqual(root, Buffer.from(hkdfSync('sha256', seed, salt, 'promptbook/project-root/v1', 32)));
    assert.notDeepEqual(deriveProjectRoot(words, Buffer.alloc(32, 8)), root, 'the public project salt separates projects with the same words');
    assert.notDeepEqual(root, seed.subarray(0, 32), 'the seed is never the key');

    // Independent domain keys; envelopes authenticate their format and domain.
    const wallet = domainKey(root, salt, 'wallet');
    const other = domainKey(root, salt, 'verifier');
    assert.notDeepEqual(wallet, other);
    const envelope = seal(wallet, 'wallet', Buffer.from('secret record'));
    assert.equal(open(wallet, 'wallet', envelope).toString(), 'secret record');
    assert.notEqual(seal(wallet, 'wallet', Buffer.from('secret record')).nonce, envelope.nonce, 'every envelope gets a fresh nonce');
    assert.throws(() => open(other, 'wallet', envelope), /could not be authenticated/, 'another domain key fails');
    assert.throws(() => open(wallet, 'verifier', envelope), /another domain/, 'an envelope never opens as another domain');
    const tampered = { ...envelope, data: Buffer.from(Buffer.from(envelope.data, 'base64').map((byte, index) => (index === 0 ? byte ^ 1 : byte))).toString('base64') };
    assert.throws(() => open(wallet, 'wallet', tampered), /could not be authenticated/, 'tampering is detected');
    assert.throws(() => open(wallet, 'wallet', { ...envelope, format: 'ptbk-encryption/9' }), /unsupported format/);
    const verifier = createVerifier(root, salt);
    assert.ok(verifyRoot(root, salt, verifier));
    assert.ok(!verifyRoot(deriveProjectRoot(generateRecoveryWords(), salt), salt, verifier), 'other words do not open the verifier');

    // Typed words: normalized; count, list and checksum validated; a wrong word is reported by position only.
    const generated = generateRecoveryWords();
    assert.equal(generated.length, 12);
    assert.deepEqual(normalizeRecoveryWords(` 1. ${generated.slice(0, 6).join(' ').toUpperCase()}\n7) ${generated.slice(6).join(', ')} `), generated);
    assert.throws(() => normalizeRecoveryWords(generated.slice(0, 11)), /exactly 12 words/);
    assert.throws(
        () => normalizeRecoveryWords([...generated.slice(0, 2), 'zzzqx', ...generated.slice(3)]),
        (error) => /Word 3 is not on the recovery word list/.test(error.message) && !error.message.includes('zzzqx'),
    );
    // A reordered set fails the checksum (one rotation in 16 may still pass the 4-bit checksum, so pick one that fails).
    const reordered = Array.from({ length: 11 }, (_, index) => [...generated.slice(index + 1), ...generated.slice(0, index + 1)]).find((candidate) => {
        try {
            normalizeRecoveryWords(candidate);
            return false;
        } catch {
            return true;
        }
    });
    assert.throws(() => normalizeRecoveryWords(reordered), /not a valid recovery set|not on the recovery/);
    // Origins and labels.
    assert.equal(normalizeOrigin('example.com/login?next=1'), 'https://example.com');
    assert.ok(originMatches('https://example.com', 'https://www.example.com'));
    assert.ok(!originMatches('https://example.com', 'https://example.com.evil.test'), 'a lookalike host never matches');
    assert.ok(!originMatches('https://example.com', 'http://example.com'), 'another scheme never matches');
    assert.equal(maskAccount('jane.doe@example.com'), 'ja…@example.com');
    assert.equal(walletLabel('https://www.github.com', 'johnsmith'), 'github.com · jo…h');
});

test('Wallet: lazy setup, automatic unlock after restart, origin-bound automatic login, one deduplicated request and transfer with 12 words', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk wallet');
    const home = join(root, 'computer one');
    const project = join(root, 'project');
    await mkdir(project, { recursive: true });

    const first = walletAt(project, home);
    await first.wallet.initialize();
    assert.equal(first.wallet.view().state, 'empty');
    await assert.rejects(stat(join(project, '.ptbk', 'encryption')), 'an unused Wallet creates nothing (no phrase prompt for existing projects)');

    // A login request before setup: one pending action, never a credential prompt in a chat.
    const before = fakePage('https://example.com');
    const missing = await first.wallet.login(before.page, { reason: 'post the weekly update', task: 'Weekly update' });
    assert.equal(missing.status, 'waiting');
    assert.equal(missing.problem, 'missing');
    assert.equal(before.entered.length, 0);

    const { words } = await first.wallet.beginSetup();
    assert.equal(words.length, 12);
    assert.deepEqual((await first.wallet.beginSetup()).words, words, 'reopening the setup shows the same words');
    assert.equal(first.wallet.view().state, 'setup');
    assert.ok(recoveryRuns(words).every((run) => !JSON.stringify(first.wallet.view()).includes(run)), 'snapshots never contain the words');
    await assert.rejects(stat(join(project, '.ptbk', 'encryption')), 'nothing is written before the owner confirms');
    const confirmed = await first.wallet.confirmSetup();
    assert.ok(confirmed.applied, confirmed.outcome);
    assert.equal(first.wallet.view().state, 'ready');
    assert.equal(first.wallet.view().facility, 'insecure-test-file');

    const saved = await first.wallet.save({ origin: 'example.com', username: 'jane.doe@example.com', password: 'correct horse battery', action: missing.action });
    assert.ok(saved.applied && !saved.outcome.includes('correct horse') && !saved.outcome.includes('jane.doe'), saved.outcome);
    assert.equal(first.wallet.action(missing.action).state, 'resolved', 'saving resolves the pending request');
    assert.deepEqual(first.wallet.view().records.map((record) => record.account), ['example.com · ja…@example.com'], 'a useful label derived from the service and account');
    for (const file of await filesBelow(join(project, '.ptbk'))) {
        for (const secret of ['correct horse battery', 'jane.doe@example.com', ...recoveryRuns(words)]) assert.ok(!file.content.includes(secret), `${file.path} contains no secret (${secret.length} chars)`);
    }
    const metadata = JSON.parse(await readFile(join(project, '.ptbk', 'encryption', 'project.json'), 'utf8'));
    assert.equal(metadata.format, 'ptbk-encryption/1');
    assert.match(metadata.derivation.seed, /PBKDF2-HMAC-SHA512, 2048/);

    // Engine restart: unlocked automatically through the host store, no words or password.
    const second = walletAt(project, home);
    await second.wallet.initialize();
    assert.equal(second.wallet.view().state, 'ready');
    const login = fakePage('https://www.example.com');
    const signedIn = await second.wallet.login(login.page, { task: 'Weekly update' });
    assert.deepEqual(signedIn, { status: 'signed-in', origin: 'https://www.example.com', account: 'example.com · ja…@example.com', note: undefined });
    assert.deepEqual(login.entered, [{ origin: 'https://example.com', username: 'jane.doe@example.com', password: 'correct horse battery' }], 'the trusted page received the credentials of its own origin');

    // Another origin never receives them: one deduplicated request for that site instead.
    const evil = fakePage('https://example.com.evil.test');
    const refused = await second.wallet.login(evil.page, { task: 'Weekly update' });
    const again = await second.wallet.login(evil.page, { task: 'Monthly report' });
    assert.equal(evil.entered.length, 0, 'a page on another origin never gets a saved password');
    assert.equal(refused.status, 'waiting');
    assert.equal(again.action, refused.action, 'repeated requests share one pending action');
    const pending = second.wallet.view().pending.find((action) => action.id === refused.action);
    assert.deepEqual([pending.requests, pending.tasks], [2, ['Weekly update', 'Monthly report']]);
    assert.equal((await second.wallet.dismiss(refused.action)).applied, true);
    assert.equal(second.wallet.action(refused.action).state, 'dismissed');

    // A rejected login is a recoverable failure: one request, no silent retries.
    const rejecting = fakePage('https://example.com', 'rejected');
    const rejected = await second.wallet.login(rejecting.page, {});
    assert.deepEqual([rejected.status, rejected.problem], ['waiting', 'rejected']);
    const repeated = await second.wallet.login(rejecting.page, {});
    assert.equal(rejecting.entered.length, 1, 'the rejected login is not tried again until it is updated');
    assert.equal(repeated.action, rejected.action);
    await second.wallet.save({ origin: 'https://example.com', username: 'jane.doe@example.com', password: 'new password 2' });
    assert.equal(second.wallet.view().records.length, 1, 'the same account is updated, not duplicated');
    assert.equal(second.wallet.action(rejected.action).state, 'resolved');

    // A copy of the folder on another computer: locked until one restoration with the 12 words.
    const copy = join(root, 'copy');
    await cp(project, copy, { recursive: true });
    const other = walletAt(copy, join(root, 'computer two'));
    await other.wallet.initialize();
    assert.equal(other.wallet.view().state, 'locked');
    assert.match(other.wallet.view().problem, /12 words for recovery/);
    const lockedRequest = await other.wallet.login(fakePage('https://example.com').page, {});
    assert.deepEqual([lockedRequest.status, lockedRequest.problem], ['waiting', 'locked'], 'a locked Wallet never creates a new empty one');
    await assert.rejects(other.wallet.beginSetup(), /restore it with its 12 words/);
    const recordsFile = join(copy, '.ptbk', 'wallet', 'records.json');
    const metadataFile = join(copy, '.ptbk', 'encryption', 'project.json');
    const [recordsBefore, metadataBefore] = [await digest(recordsFile), await digest(metadataFile)];
    await assert.rejects(other.wallet.restore(generateRecoveryWords().join(' ')), /do not belong to this project/);
    assert.deepEqual([await digest(recordsFile), await digest(metadataFile)], [recordsBefore, metadataBefore], 'wrong words change nothing');
    const restored = await other.wallet.restore(words.map((word) => word.toUpperCase()).join('  '));
    assert.ok(restored.applied, restored.outcome);
    assert.equal(other.wallet.action(lockedRequest.action).state, 'resolved');
    const afterRestore = fakePage('https://example.com');
    assert.equal((await other.wallet.login(afterRestore.page, {})).status, 'signed-in');
    assert.equal(afterRestore.entered[0].password, 'new password 2', 'saved logins need not be entered again');
    const rebooted = walletAt(copy, join(root, 'computer two'));
    await rebooted.wallet.initialize();
    assert.equal(rebooted.wallet.view().state, 'ready', 'the restored computer unlocks automatically afterwards');
    // The original computer keeps working (its own binding is preserved).
    const original = walletAt(project, home);
    await original.wallet.initialize();
    assert.equal(original.wallet.view().state, 'ready');

    // Corrupted metadata: reported, never replaced by a new vault.
    await writeFile(metadataFile, '{ broken');
    const corrupted = walletAt(copy, join(root, 'computer two'));
    await corrupted.wallet.initialize();
    assert.equal(corrupted.wallet.view().state, 'unavailable');
    await assert.rejects(corrupted.wallet.beginSetup(), /already has encrypted Wallet data/);
    assert.equal(await readFile(metadataFile, 'utf8'), '{ broken', 'corrupted metadata is never overwritten');
});

/**
 * A login site: `/` shows a form, `POST /login` signs in (a session cookie) or shows the form again with an error.
 */
function loginSite(password) {
    const server = createServer((request, response) => {
        if (request.method === 'POST' && request.url === '/login') {
            let body = '';
            request.on('data', (chunk) => (body += chunk));
            request.on('end', () => {
                const fields = new URLSearchParams(body);
                if (fields.get('username') === 'fixture-user' && fields.get('password') === password) {
                    response.writeHead(302, { Location: '/home', 'Set-Cookie': 'session=ok; Path=/' });
                    response.end();
                } else {
                    response.setHeader('content-type', 'text/html');
                    response.end(LOGIN_PAGE.replace('<!--error-->', '<p>Wrong username or password</p>'));
                }
            });
            return;
        }
        if (request.url === '/home' && /session=ok/.test(request.headers.cookie ?? '')) {
            response.setHeader('content-type', 'text/html');
            response.end('<title>Home</title><h1>Welcome, fixture-user</h1>');
            return;
        }
        response.setHeader('content-type', 'text/html');
        response.end(LOGIN_PAGE);
    });
    return server;
}

/**
 * The login form of {@link loginSite}.
 */
const LOGIN_PAGE = `<!doctype html><title>Sign in</title><h1>Sign in</h1><!--error-->
<form method="post" action="/login"><input name="username" autocomplete="username" placeholder="Username"><input name="password" type="password" autocomplete="current-password"><button>Sign in</button></form>`;

test('Wallet audit: each meaningful mutation is its own nonsecret (empty) commit, retried automatically without repeating the change, and can be disabled', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk wallet audit');
    const project = join(root, 'project');
    await mkdir(project, { recursive: true });
    await initRepository(project);
    await writeFile(join(project, 'base.txt'), 'base\n');
    await git(project, ['add', '.']);
    await git(project, ['commit', '-qm', 'base']);
    await writeFile(join(project, 'staged.txt'), 'user staged\n');
    await git(project, ['add', 'staged.txt']);
    await writeFile(join(project, 'base.txt'), 'user edit\n');
    const env = { ...process.env, ...GIT_IDENTITY, PTBK_HOME: join(root, 'home'), PTBK_HOST_UNLOCK: 'insecure-test-file' };
    let isEnabled = true;
    let failNext = false;
    const runtime = { root: join(project, '.ptbk'), state: join(project, '.ptbk', 'state'), temporary: join(project, '.ptbk', 'tmp') };
    const logs = [];
    const wallet = new WalletSubEngine({
        project: { root: project, runtime },
        env,
        onChange: () => undefined,
        log: (text) => logs.push(text),
        audit: {
            isEnabled: () => isEnabled,
            commit: async (subject, body) => {
                if (failNext) {
                    failNext = false;
                    throw new Error('hook says no');
                }
                await commitAudit({ projectRoot: project, repositoryRoot: project, subject, body, temporaryDirectory: runtime.temporary, env });
            },
            retryMs: 200,
        },
    });
    await wallet.initialize();
    await wallet.beginSetup();
    await wallet.confirmSetup();
    await wallet.save({ origin: 'example.com', username: 'jane.doe@example.com', password: 'correct horse battery' });
    assert.equal((await git(project, ['log', '-1', '--format=%s'])).trim(), 'ptbk: Wallet - Add login "example.com · ja…@example.com"');
    assert.equal((await git(project, ['show', '--name-only', '--format=', 'HEAD'])).trim(), '', 'an empty audit commit: the vault is never committed');
    const status = await git(project, ['status', '--porcelain']);
    assert.match(status, /^A  staged\.txt$/m, 'user staging is neither committed nor disturbed');
    assert.match(status, /^ M base\.txt$/m);
    const id = wallet.view().records[0].id;
    failNext = true;
    await wallet.save({ origin: 'example.com', username: 'jane.doe@example.com', password: 'new password 2', id });
    assert.equal(wallet.view().records.length, 1, 'the update itself succeeded');
    assert.match(logs.join('\n'), /audit commit .* is pending/);
    assert.equal(JSON.parse(await readFile(join(runtime.state, 'wallet-audit.json'), 'utf8')).length, 1);
    // Neither another mutation nor a restart is needed: the pending audit is committed by its scheduled retry.
    await waitFor(async () => JSON.parse(await readFile(join(runtime.state, 'wallet-audit.json'), 'utf8')).length === 0, { timeoutMs: 10_000, message: 'the scheduled audit retry' });
    assert.equal((await git(project, ['log', '-1', '--format=%s'])).trim(), 'ptbk: Wallet - Update login "example.com · ja…@example.com"', 'the pending audit is committed later');
    await wallet.retryAudits();
    const count = Number((await git(project, ['rev-list', '--count', 'HEAD'])).trim());
    isEnabled = false;
    await wallet.remove(id);
    assert.equal(wallet.view().records.length, 0, 'removal works with the audit disabled');
    assert.equal(Number((await git(project, ['rev-list', '--count', 'HEAD'])).trim()), count, 'no audit commit while disabled; no repeated audit either');
    const history = await git(project, ['log', '-p', '--all']);
    for (const secret of ['correct horse battery', 'new password 2', 'jane.doe@example.com']) assert.ok(!history.includes(secret), `no secret in Git (${secret.length} chars)`);
    assert.doesNotMatch(await git(project, ['ls-files']), /\.ptbk/);
});

test('Wallet in the real browser: the agent requests a login, never sees the password, a wrong one is cleared and the right one signs in', { skip: await realBrowserSkip(), timeout: 180_000 }, async (t) => {
    const teardown = [];
    const root = await temporaryDirectory(t, 'ptbk wallet browser', teardown);
    await mkdir(join(root, '.ptbk', 'tmp'), { recursive: true });
    const project = { root, runtime: { root: join(root, '.ptbk'), temporary: join(root, '.ptbk', 'tmp'), browserProfile: join(root, '.ptbk', 'browser', 'profile') } };
    const env = { ...process.env, PTBK_HOME: join(root, 'ptbk home'), PTBK_HOST_UNLOCK: 'insecure-test-file' };
    const server = loginSite('right password 1');
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const settings = { tools: [{ type: 'BROWSER', variant: 'CHROME', name: 'project-browser', isEnabled: true, profile: { source: 'PROJECT' }, isHeadless: true }], overriddenTools: new Set() };
    const fleet = new BrowserFleet(project, () => settings, env);
    teardown.push(async () => {
        await fleet.close();
        server.closeAllConnections();
        server.close();
    });
    const wallet = new WalletSubEngine({ project, env, onChange: () => undefined, log: () => undefined });
    await wallet.initialize();
    await wallet.beginSetup();
    await wallet.confirmSetup();
    const waits = [];
    const tools = Object.fromEntries(browserTools(fleet.scope('wallet task'), undefined, 'Tester', () => undefined, () => [], { login: (page, request) => wallet.login(page, { ...request, task: 'Wallet task' }), onWait: (action) => waits.push(action) }).map((tool) => [tool.name, tool]));
    const call = async (name, input = {}) => await tools[name].handler(input);

    await call('browser_open', { url: origin });
    let result = await call('wallet_login', { reason: 'read the dashboard' });
    assert.match(result.text, /protected Wallet request was created/);
    assert.match(result.text, /never ask for the username or password in a chat/);
    assert.equal(waits.length, 1, 'the task is told to wait for the protected request');

    await wallet.save({ origin, username: 'fixture-user', password: 'wrong password 9', action: waits[0] });
    result = await call('wallet_login', {});
    assert.match(result.text, /rejected the saved login/, 'the site rejected it; verified on the page, not assumed');
    assert.ok(!result.text.includes('wrong password 9') && !result.text.includes('fixture-user'));
    const leftover = await call('browser_evaluate', { script: "[...document.querySelectorAll('input[type=password]')].map((input) => input.value).join('|')" });
    assert.equal(leftover.text, '', 'no entered password stays readable in the page');

    await wallet.save({ origin, username: 'fixture-user', password: 'right password 1' });
    await call('browser_open', { url: origin });
    result = await call('wallet_login', {});
    assert.ok(!result.isError, result.text);
    assert.match(result.text, /^Signed in to http:\/\/127\.0\.0\.1:\d+ with the saved login "127\.0\.0\.1:\d+ · fi…r"/);
    assert.match(result.text, /Welcome, fixture-user/, 'the resulting session is verified and the page is returned');
    assert.ok(!result.text.includes('right password 1'));
    result = await call('wallet_login', {});
    assert.match(result.text, /shows no login form/, 'an already signed-in session needs no Wallet login');
});

test('Wallet acceptance: a task waits for a protected login (no chat), resumes once after it is saved and signs in; no secret reaches Git, traces, status or logs', { skip: await realBrowserSkip(), timeout: 300_000 }, async (t) => {
    const { project, env: baseEnv } = await initializedProject(t, { check: "process.exit(0);\n" });
    const browser = await findBrowserExecutable({ variant: 'CHROME' });
    const server = loginSite('acceptance password 7');
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => {
        server.closeAllConnections();
        server.close();
    });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const env = { ...baseEnv, CHROME_PATH: browser, FAKE_LOGIN_URL: `${origin}/` };
    const config = JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8'));
    config.tools = [...(config.tools ?? []).filter((tool) => tool.type !== 'BROWSER'), { type: 'BROWSER', variant: 'CHROME', name: 'site-browser', isEnabled: true, profile: { source: 'PROJECT' }, isHeadless: true }];
    await writeFile(join(project, 'ptbk.json'), `${JSON.stringify(config, null, 4)}\n`);
    await git(project, ['commit', '-q', '-m', 'Fixture browser', '--', 'ptbk.json']);

    // The owner set the Wallet up earlier on this computer (the engine unlocks it at startup without prompts).
    const owner = new WalletSubEngine({ project: { root: project, runtime: { root: join(project, '.ptbk') } }, env, onChange: () => undefined, log: () => undefined });
    await owner.initialize();
    const { words } = await owner.beginSetup();
    await owner.confirmSetup();

    assert.equal((await ptbk(['add', 'WALLET_LOGIN Read the fixture dashboard', '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env })).code, 0);
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const { token } = JSON.parse(await readFile(join(project, '.ptbk', 'service', 'process.json'), 'utf8'));
    const status = async () => JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);
    const base = (await status()).connection.local.url;
    const call = async (path, body) => {
        const response = await fetch(`${base}${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
        return { status: response.status, data: await response.json() };
    };

    const request = await waitFor(async () => (await call('api/wallet')).data.pending[0], { timeoutMs: 120_000, message: 'the protected Wallet login request' });
    assert.equal(request.origin, origin);
    assert.deepEqual(request.tasks.map((task) => task.replace(/ — .*$/, '')), ['WALLET_LOGIN Read the fixture dashboard']);
    const waiting = await status();
    assert.equal(waiting.wallet.state, 'ready', 'the engine unlocked the Wallet at startup without words or a password');
    assert.equal(waiting.attention.wallet.tone, 'warning', 'the Wallet tile uses the common attention');
    assert.equal(waiting.chats.waiting.length, 0, 'no chat asks for the credentials');
    await waitFor(async () => (await call('api/tasks')).data.tasks.find((task) => task.title.startsWith('WALLET_LOGIN') && task.readiness === 'awaiting-user' && /Wallet/.test(task.reason)), { timeoutMs: 60_000, message: 'the checkpointed task' });

    // API clients never get the words; secrets are write-only.
    const setup = await call('api/wallet', { action: 'wallet-setup' });
    assert.equal(setup.status, 400, JSON.stringify(setup.data));
    assert.match(setup.data.error, /never to API clients/);
    const wrongRestore = await call('api/wallet', { action: 'wallet-restore', words: generateRecoveryWords().join(' ') });
    assert.equal(wrongRestore.status, 409);
    const saved = await call('api/wallet', { action: 'wallet-save', request: request.id, origin, username: 'fixture-user', password: 'acceptance password 7', label: 'Fixture account' });
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    assert.ok(!JSON.stringify(saved.data).includes('acceptance password 7'));
    assert.equal((await call('api/wallet')).data.pending.length, 0, 'saving clears the request (and its attention) at once');

    const title = await waitFor(async () => committed(project, 'WALLET_LOGIN Read the fixture dashboard'), { timeoutMs: 180_000, message: 'the resumed task to sign in and complete' });
    assert.ok(title);
    assert.match(await readFile(join(project, 'output', 'wallet.txt'), 'utf8'), /^Signed in to .* "Fixture account".*\nWelcome, fixture-user/);
    const turns = (await readFile(env.FAKE_CODEX_LOG, 'utf8')).split('\n').filter((line) => line.includes('WALLET_LOGIN Read') && !line.includes('"assignment":true'));
    assert.equal(turns.length, 2, `one waiting turn and exactly one resumed turn:\n${turns.join('\n')}`);
    // The same raw usage through the shared read-only view: both Developer turns, counted once each.
    const usage = await call('api/usage?group=agent');
    assert.equal(usage.status, 200);
    assert.equal(usage.data.days, 7);
    assert.ok(usage.data.rows.find((row) => row.label === 'Developer')?.units >= 2, JSON.stringify(usage.data.rows));
    assert.equal(usage.data.total.units, usage.data.rows.reduce((sum, row) => sum + row.units, 0), 'self-scope rows partition the total');
    assert.equal((await call('api/usage?group=price-list')).status, 400);
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);

    // No password, username or word anywhere outside the ciphertext: Git history, traces, state, logs, output.
    const history = await git(project, ['log', '-p', '--all']);
    for (const secret of ['acceptance password 7', ...recoveryRuns(words)]) assert.ok(!history.includes(secret), 'Git history contains no secret');
    assert.ok(!(await git(project, ['ls-files'])).includes('.ptbk/'), 'Wallet files are never committed');
    for (const file of await filesBelow(project)) {
        if (file.path.includes(`${join('.ptbk', 'wallet')}`) || file.path.includes(`${join('.ptbk', 'encryption')}`)) continue;
        for (const secret of ['acceptance password 7', ...recoveryRuns(words)]) assert.ok(!file.content.includes(secret), `${file.path} contains no secret`);
    }
});

/**
 * A Wallet with an audit recorder (the audit commits it would create).
 */
function auditedWalletAt(root, home) {
    const project = { root, runtime: { root: join(root, '.ptbk'), state: join(root, '.ptbk', 'state') } };
    const audits = [];
    const wallet = new WalletSubEngine({ project, env: { ...process.env, PTBK_HOME: home, PTBK_HOST_UNLOCK: 'insecure-test-file' }, onChange: () => undefined, log: () => undefined, audit: { isEnabled: () => true, commit: async (subject, body) => void audits.push({ subject, body }) } });
    return { wallet, audits };
}

/**
 * A Bitwarden JSON export with logins, duplicates, conflicts and unsupported entries.
 */
function bitwardenExport() {
    const login = (id, name, username, password, uris, totp) => ({ id, type: 1, name, login: { username, password, totp: totp ?? null, uris: uris.map((uri) => ({ uri, match: null })) } });
    return JSON.stringify({
        encrypted: false,
        folders: [],
        items: [
            login('a', 'Shop', 'jane@example.com', 'shop secret 1', ['https://shop.example.com/login', 'https://app.example.org'], 'otpauth://totp/Shop:jane?secret=JBSWY3DPEHPK3PXP'),
            login('b', 'Existing same', 'jane@example.com', 'same password', ['https://example.com']),
            login('c', 'Existing other', 'joe@example.com', 'changed password', ['https://example.com/account']),
            { id: 'd', type: 2, name: 'A note', notes: 'private' },
            login('e', 'No address', 'nobody', 'x', []),
            login('f', 'Android only', 'app-user', 'y', ['androidapp://com.example.app']),
        ],
    });
}

test('Wallet records are encrypted completely; records of the older format are migrated once unlocked', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk wallet records');
    const home = join(root, 'computer');
    const project = join(root, 'project');
    await mkdir(project, { recursive: true });
    const { wallet } = auditedWalletAt(project, home);
    await wallet.initialize();
    const { words } = await wallet.beginSetup();
    await wallet.confirmSetup();
    await wallet.save({ origin: 'https://example.com', username: 'jane@example.com', password: 'same password' });
    const stored = await readFile(join(project, '.ptbk', 'wallet', 'records.json'), 'utf8');
    assert.doesNotMatch(stored, /example\.com|jane|same password|ja…/, 'no plaintext service, account, label or secret');
    assert.equal(JSON.parse(stored).version, 2);
    // An older file with plaintext labels: it keeps working and is rewritten entirely encrypted.
    const metadata = JSON.parse(await readFile(join(project, '.ptbk', 'encryption', 'project.json'), 'utf8'));
    const salt = Buffer.from(metadata.salt, 'base64');
    const key = domainKey(deriveProjectRoot(words, salt), salt, 'wallet');
    const legacy = { format: metadata.format, projectKeyId: metadata.projectKeyId, records: [{ id: 'legacy1', origin: 'https://legacy.example.com', account: 'legacy.example.com · old', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', secret: seal(key, 'wallet', Buffer.from(JSON.stringify({ origin: 'https://legacy.example.com', username: 'old', password: 'legacy password' }))) }] };
    await writeFile(join(project, '.ptbk', 'wallet', 'records.json'), JSON.stringify(legacy));
    const reopened = auditedWalletAt(project, home);
    await reopened.wallet.initialize();
    assert.deepEqual(reopened.wallet.view().records.map((record) => record.account), ['legacy.example.com · old']);
    assert.doesNotMatch(await readFile(join(project, '.ptbk', 'wallet', 'records.json'), 'utf8'), /legacy\.example\.com|old/, 'migrated to whole-record encryption');
    const page = fakePage('https://legacy.example.com');
    assert.equal((await reopened.wallet.login(page.page, {})).status, 'signed-in');
    assert.equal(page.entered[0].password, 'legacy password');
    // Locked on another computer: only the number of encrypted logins is known.
    const copy = join(root, 'copy');
    await cp(project, copy, { recursive: true });
    const other = auditedWalletAt(copy, join(root, 'computer two'));
    await other.wallet.initialize();
    assert.equal(other.wallet.view().state, 'locked');
    assert.deepEqual(other.wallet.view().records, [], 'no labels without a key');
    assert.equal(other.wallet.view().lockedRecords, 1);
    assert.match(other.wallet.view().summary, /1 saved login \(encrypted\)/);
});

test('Wallet import: one Bitwarden preview with individual/all/none selection, duplicates and conflicts, no secret in previews or audits', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk wallet import');
    const project = join(root, 'project');
    await mkdir(project, { recursive: true });
    const { wallet, audits } = auditedWalletAt(project, join(root, 'computer'));
    await wallet.initialize();
    await assert.rejects(wallet.previewImport({ content: bitwardenExport() }), /Set up the Wallet first/, 'import never silently creates or resets a Wallet');
    await wallet.beginSetup();
    await wallet.confirmSetup();
    await wallet.save({ origin: 'https://example.com', username: 'jane@example.com', password: 'same password', label: 'Main' });
    await wallet.save({ origin: 'https://example.com', username: 'joe@example.com', password: 'old password', label: 'Joe' });
    const waiting = await wallet.login(fakePage('https://shop.example.com').page, { reason: 'checkout' });
    assert.equal(waiting.status, 'waiting');
    audits.length = 0;
    await assert.rejects(wallet.previewImport({ content: JSON.stringify({ encrypted: true, encKeyValidation_DO_NOT_EDIT: 'x', data: 'y' }) }), /encrypted .*cannot be read here/);
    await assert.rejects(wallet.previewImport({ content: 'not json' }), /not a Bitwarden JSON export/);
    const preview = await wallet.previewImport({ content: bitwardenExport() });
    assert.doesNotMatch(JSON.stringify(preview), /shop secret|same password|changed password|JBSWY3DP|jane@example\.com/, 'no secret or full username in the preview');
    const state = (origin, label) => preview.candidates.find((candidate) => candidate.origin === origin && (!label || candidate.label === label))?.state;
    assert.equal(state('https://shop.example.com'), 'new');
    assert.equal(state('https://app.example.org'), 'new', 'every supported website of an item is kept, none is guessed');
    assert.equal(state('https://example.com', 'Existing same'), 'duplicate');
    assert.equal(state('https://example.com', 'Existing other'), 'conflict');
    assert.ok(preview.candidates.find((candidate) => candidate.origin === 'https://shop.example.com').totp);
    assert.deepEqual(preview.skipped.map((entry) => entry.label), ['A note', 'No address', 'Android only'], 'unsupported entries are reported honestly');
    // None selected: nothing changes and no audit.
    const none = await wallet.applyImport({ draft: preview.draft, select: [] });
    assert.equal(none.applied, false);
    assert.equal(audits.length, 0, 'a no-op selection creates no commit');
    await assert.rejects(wallet.applyImport({ draft: preview.draft, select: [] }), /no longer current/, 'an applied preview cannot be replayed');
    // All selected, the conflict kept: new logins added once, the duplicate reused, the conflicting saved login untouched.
    const again = await wallet.previewImport({ content: bitwardenExport() });
    const all = await wallet.applyImport({ draft: again.draft, select: again.candidates.map((candidate) => candidate.key) });
    assert.deepEqual([all.imported, all.reused, all.skipped, all.replaced], [2, 1, 1, 0]);
    assert.match(all.outcome, /Delete the export file safely now/);
    assert.equal(wallet.view().records.length, 4);
    assert.equal(wallet.action(waiting.action).state, 'resolved', 'the waiting login request is resolved by the import');
    const joe = fakePage('https://example.com');
    assert.equal((await wallet.login(joe.page, { account: 'Joe' })).status, 'signed-in');
    assert.equal(joe.entered[0].password, 'old password', 'a conflict is never overwritten without the owner choosing it');
    assert.equal(audits.length, 1, 'one nonsecret summary for the import');
    assert.match(audits[0].subject, /^Wallet - Import 2 logins from Bitwarden$/);
    assert.doesNotMatch(`${audits[0].subject}\n${audits[0].body}`, /shop secret|password 1|JBSWY|jane@example\.com/);
    // Repeating the import with the conflict explicitly replaced: no duplicates, the chosen value is used.
    const third = await wallet.previewImport({ content: bitwardenExport() });
    const conflict = third.candidates.find((candidate) => candidate.state === 'conflict');
    const replaced = await wallet.applyImport({ draft: third.draft, select: third.candidates.map((candidate) => candidate.key), replace: [conflict.key] });
    assert.deepEqual([replaced.imported, replaced.replaced], [0, 1]);
    assert.equal(wallet.view().records.length, 4, 'a repeated import adds nothing twice');
    const joeAgain = fakePage('https://example.com');
    await wallet.login(joeAgain.page, { account: 'Joe' });
    assert.equal(joeAgain.entered[0].password, 'changed password');
    assert.doesNotMatch(await readFile(join(project, '.ptbk', 'wallet', 'records.json'), 'utf8'), /shop\.example|changed password/);
});

test('Wallet recovery: new words re-encrypt everything with a working key; an interrupted switch completes; old words stop working', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk wallet rotation');
    const home = join(root, 'computer');
    const project = join(root, 'project');
    await mkdir(project, { recursive: true });
    const { wallet, audits } = auditedWalletAt(project, home);
    await wallet.initialize();
    const { words: oldWords } = await wallet.beginSetup();
    await wallet.confirmSetup();
    await wallet.save({ origin: 'https://example.com', username: 'jane@example.com', password: 'kept password' });
    const preview = await wallet.previewImport({ content: bitwardenExport() });
    await wallet.applyImport({ draft: preview.draft, select: preview.candidates.filter((candidate) => candidate.origin === 'https://shop.example.com').map((candidate) => candidate.key) });
    audits.length = 0;
    const before = join(root, 'before');
    await cp(project, before, { recursive: true });
    // Prepared files without a journal (interrupted before the switch) are discarded: the old generation stays.
    const early = join(root, 'early');
    await cp(before, early, { recursive: true });
    await writeFile(join(early, '.ptbk', 'wallet', 'records.next.json'), '{"partial":');
    const kept = auditedWalletAt(early, home);
    await kept.wallet.initialize();
    assert.equal(kept.wallet.view().state, 'ready');
    assert.equal(kept.wallet.view().records.length, 2);
    await assert.rejects(stat(join(early, '.ptbk', 'wallet', 'records.next.json')));
    // The old words are forgotten: this computer's working key is enough.
    assert.deepEqual(wallet.view().management, { canImport: true, canRotate: true, canReset: false });
    const { words: newWords } = await wallet.beginRotation();
    assert.notDeepEqual(newWords, oldWords);
    assert.equal(wallet.cancelRotation().applied, true, 'declining keeps the current words');
    const { words } = await wallet.beginRotation();
    const rotated = await wallet.confirmRotation();
    assert.ok(rotated.applied, rotated.outcome);
    assert.deepEqual(audits.map((audit) => audit.subject), ['Wallet - Replace the recovery words']);
    assert.doesNotMatch(audits[0].body, new RegExp(words.join('|')));
    assert.equal(wallet.view().records.length, 2, 'every record is preserved');
    const rebooted = auditedWalletAt(project, home);
    await rebooted.wallet.initialize();
    assert.equal(rebooted.wallet.view().state, 'ready', 'this computer still unlocks it after a restart');
    const shop = fakePage('https://shop.example.com');
    assert.equal((await rebooted.wallet.login(shop.page, {})).status, 'signed-in');
    assert.equal(shop.entered[0].password, 'shop secret 1');
    // Another computer: the old words no longer open it, the new ones do.
    const copy = join(root, 'copy');
    await cp(project, copy, { recursive: true });
    const other = auditedWalletAt(copy, join(root, 'computer two'));
    await other.wallet.initialize();
    await assert.rejects(other.wallet.restore(oldWords.join(' ')), /do not belong/);
    assert.ok((await other.wallet.restore(words.join(' '))).applied);
    assert.equal(other.wallet.view().records.length, 2);
    // An interruption after the next generation was prepared and journaled completes on the next start.
    const interrupted = join(root, 'interrupted');
    await cp(before, interrupted, { recursive: true });
    for (const [directory, name] of [['wallet', 'records'], ['encryption', 'hosts'], ['encryption', 'project']]) await cp(join(project, '.ptbk', directory, `${name}.json`), join(interrupted, '.ptbk', directory, `${name}.next.json`));
    await writeFile(join(interrupted, '.ptbk', 'encryption', 'generation.json'), JSON.stringify({ at: new Date().toISOString() }));
    const resumed = auditedWalletAt(interrupted, home);
    await resumed.wallet.initialize();
    assert.equal(resumed.wallet.view().state, 'ready');
    assert.equal(resumed.wallet.view().records.length, 2, 'one coherent new generation');
    await assert.rejects(stat(join(interrupted, '.ptbk', 'encryption', 'generation.json')));
});

test('Wallet reset after total key loss: strongly confirmed, declinable, empty and audited without old labels', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk wallet reset');
    const project = join(root, 'project');
    await mkdir(project, { recursive: true });
    const first = auditedWalletAt(project, join(root, 'computer'));
    await first.wallet.initialize();
    await first.wallet.beginSetup();
    await first.wallet.confirmSetup();
    await first.wallet.save({ origin: 'https://example.com', username: 'jane@example.com', password: 'lost password', label: 'Lost login' });
    // Another computer without the words: nothing can unlock it.
    const { wallet, audits } = auditedWalletAt(project, join(root, 'computer two'));
    await wallet.initialize();
    assert.equal(wallet.view().state, 'locked');
    assert.deepEqual(wallet.view().management, { canImport: false, canRotate: false, canReset: true });
    await assert.rejects(wallet.beginRotation(), /locked|unlock/);
    const waiting = await wallet.login(fakePage('https://example.com').page, {});
    assert.equal(waiting.problem, 'locked');
    const files = [join(project, '.ptbk', 'wallet', 'records.json'), join(project, '.ptbk', 'encryption', 'project.json')];
    const original = await Promise.all(files.map(digest));
    await assert.rejects(wallet.beginReset({ confirm: 'yes' }), /Type RESET to confirm\. Resetting discards ALL old Wallet data/);
    const declined = await wallet.beginReset({ confirm: 'RESET' });
    assert.equal(declined.words.length, 12);
    assert.match(declined.warning, /usernames, passwords and TOTP generators/);
    wallet.cancelSetup();
    assert.deepEqual(await Promise.all(files.map(digest)), original, 'declining preserves the original ciphertext');
    assert.equal(wallet.view().state, 'locked');
    const { words } = await wallet.beginReset({ confirm: 'RESET' });
    const reset = await wallet.confirmSetup();
    assert.ok(reset.applied, reset.outcome);
    assert.equal(wallet.view().state, 'ready');
    assert.deepEqual(wallet.view().records, [], 'a new empty Wallet');
    assert.equal(wallet.action(waiting.action).state, 'pending');
    assert.match(wallet.view().pending[0].reason, /was reset and has none/, 'requests now wait for a login to be added');
    assert.deepEqual(audits.map((audit) => audit.subject), ['Wallet - Reset to a new empty Wallet']);
    assert.doesNotMatch(audits[0].body, /Lost login|example\.com/, 'the audit never reads old labels');
    const reopened = auditedWalletAt(project, join(root, 'computer two'));
    await reopened.wallet.initialize();
    assert.equal(reopened.wallet.view().state, 'ready', 'the new Wallet unlocks automatically here');
    const elsewhere = join(root, 'elsewhere');
    await cp(project, elsewhere, { recursive: true });
    const third = auditedWalletAt(elsewhere, join(root, 'computer three'));
    await third.wallet.initialize();
    assert.ok((await third.wallet.restore(words.join(' '))).applied, 'the new words open the new Wallet');
});
