import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { delimiter, join } from 'node:path';
import { test } from 'node:test';
import { EngineApi } from '../dist/app/api/engine-api.js';
import { AccessStore } from '../dist/app/web/access.js';
import { harnessTerminalPage } from '../dist/app/web/harness-terminal.js';
import { instanceEnvironment, nativeSetupTool } from '../dist/engine/harnesses.js';
import { harnessPlugin } from '../dist/harness/registry.js';
import { classifyFailure } from '../dist/harness/run.js';
import { ProjectHarnessRecovery } from '../dist/onboarding/recovery.js';
import { temporaryDirectory, waitFor } from './helpers.mjs';

test('an expired Claude session reopens owner-only sign-in on an existing engine and verifies the selected profile', { skip: process.platform === 'win32' }, async t => {
    assert.equal(classifyFailure('OAuth session expired and could not be refreshed'), 'authentication');
    const root = await temporaryDirectory(t);
    const plugin = harnessPlugin('claude-code');
    const tool = nativeSetupTool(plugin, randomUUID());
    const env = instanceEnvironment(plugin, tool, undefined, { ...process.env, PTBK_HOME: root, PATH: root + delimiter + process.env.PATH });
    await mkdir(env.CLAUDE_CONFIG_DIR, { recursive: true });
    await writeFile(join(root, 'claude'), `#!/bin/sh
case "$*" in
    --version) echo 2.1.330 ;;
    'auth login --help') echo 'claude auth login --claudeai' ;;
    'auth login --claudeai')
        stty -echo
        printf '\\033]8;;https://claude.ai/oauth/authorize?state=fixture\\007Sign in\\033]8;;\\007\\n'
        read -r code && test "$code" = fixture-return && touch "$CLAUDE_CONFIG_DIR/ready" ;;
    'auth status --json')
        if test -f "$CLAUDE_CONFIG_DIR/ready"; then echo '{"loggedIn":true,"authMethod":"oauth"}'; else echo '{"loggedIn":false}'; fi ;;
    -p*) test -f "$CLAUDE_CONFIG_DIR/ready" && echo '{"type":"result","subtype":"success","result":"PONG"}' ;;
esac
`);
    await chmod(join(root, 'claude'), 0o755);
    const target = { tool, plugin, context: { tool, env, projectRoot: root } };
    let failed = true;
    const recovery = new ProjectHarnessRecovery(() => failed ? target : undefined, async checked => {
        assert.equal(checked, target);
        failed = false;
    });
    t.after(() => recovery.stop());
    const access = await AccessStore.open(join(root, 'app'));
    const engine = new EngineApi({ recovery, projectRoot: root, stateDirectory: join(root, 'app'),
        engineId: () => 'fixture', hostname: () => 'engine.test', dashboardUrl: () => null, security: () => undefined, ui: () => ({}) });
    const owner = { role: 'owner', memberId: 'owner', permissions: ['settings.manage'], sessionId: 'owner-session' };
    const member = { ...owner, role: 'member', memberId: 'member' };
    const get = async actor => (await engine.handle(new Request('https://engine.test/api/v1/onboarding'), actor, access)).json();
    const send = async (body, actor = owner) => engine.handle(new Request('https://engine.test/api/v1/onboarding/answer', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    }), actor, access);
    const state = await get(owner);
    assert.equal(state.canDefer, true);
    assert.equal((await get(member)).status, 'completed');
    const reconnect = { promptId: state.prompt.id, action: 'answer', answer: { kind: 'confirm', confirmed: true } };
    assert.equal((await send(reconnect, member)).status, 403);
    assert.equal((await send(reconnect)).status, 200);
    const prompt = await waitFor(() => recovery.state().prompt?.method === 'return-code' && recovery.state().prompt);
    assert.equal(prompt.url, 'https://claude.ai/oauth/authorize?state=fixture');
    assert.equal((await send(reconnect)).status, 409);
    const reply = { promptId: prompt.id, action: 'answer', answer: { kind: 'harness-login', returnCode: 'fixture-return' } };
    assert.equal((await send(reply)).status, 200);
    assert.equal((await send(reply)).status, 409);
    await waitFor(() => !failed && recovery.state().status === 'completed');
    assert.equal((await get(owner)).status, 'completed');

    failed = true;
    const later = recovery.state();
    assert.equal((await recovery.answer({ promptId: later.prompt.id, action: 'answer', answer: { kind: 'confirm', confirmed: false } })).deferred, true);
    assert.notEqual(recovery.state().prompt.id, later.prompt.id);
    assert.equal((await harnessTerminalPage(new Request('https://engine.test/_ptbk/harness-terminal'), member, recovery)).status, 403);
});
