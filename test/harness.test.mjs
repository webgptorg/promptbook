import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, readFile, rm, access, symlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { Readable, PassThrough } from 'node:stream';
import { HARNESS_REGISTRY, runHarness, runProcess, classifyHarnessResult, redactSecrets } from '../dist/coder/harness.js';
import { prepareAgent, isPrivateBookAddress } from '../dist/coder/agents.js';
import { advisorTools, createToolBridge } from '../dist/coder/team.js';
import { planningReadTools, planConversation } from '../dist/coder/planner.js';
import { resolveWorkspace } from '../dist/coder/workspace.js';

const helpFlags = '--json --sandbox --ignore-user-config --ignore-rules --disable --output-format --effort --thinking --mcp-config --variant --reasoning-effort --additional-mcp-config --approval-mode --safe-mode --tools --strict-mcp-config --bare --deny-tool --disable-builtin-mcps --excluded-tools --plan --auto-approve --no-credits --strict-config --input-format --allowedTools --restricted --setting-sources --settings --disable-slash-commands --acp --no-auto-update --no-custom-instructions --no-bash-env --pure --config --data-dir --model';

async function fixture(action) {
    const directory = await mkdtemp(join(tmpdir(), 'ptbk-harness-'));
    try { return await action(directory); } finally { await rm(directory, { recursive: true, force: true }); }
}

async function fakeProviders(directory) {
    const bin = join(directory, 'bin');
    await mkdir(bin);
    const script = '#!' + process.execPath + '\n' +
        "const args=process.argv.slice(2);\n" +
        "if(args.includes('--help')) { console.log(process.env.PTBK_TEST_HELP || " + JSON.stringify(helpFlags) + "); process.exit(0); }\n" +
        "if(args[0]==='login' && args[1]==='status') { console.log(process.env.PTBK_TEST_AUTH || 'Logged in using ChatGPT'); process.exit(process.env.PTBK_TEST_AUTH==='Not logged in'?1:0); }\n" +
        "async function nativeDiscover(client){const fs=require('node:fs');const url=JSON.parse(fs.readFileSync(client,'utf8').match(/const url = (.*);/)[1]);if(process.env.PTBK_TEST_IGNORE_MCP)return [];let tools;for(const method of ['initialize','tools/list']){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method})});const value=await r.json();if(method==='tools/list')tools=value.result.tools;}return tools;}\n" +
        "if(args.includes('--headless')){const fs=require('node:fs');let pending=Buffer.alloc(0),sessionId,tools=[],create;const methods=[];const emit=m=>{const b=JSON.stringify(m);process.stdout.write('Content-Length: '+Buffer.byteLength(b)+'\\r\\n\\r\\n'+b)};process.stdin.on('end',()=>process.exit(0));process.stdin.on('data',async chunk=>{pending=Buffer.concat([pending,chunk]);for(;;){const p=pending.indexOf('\\r\\n\\r\\n');if(p<0)return;const n=Number(pending.subarray(0,p).toString().match(/Content-Length: (\\d+)/i)[1]);if(pending.length<p+4+n)return;const m=JSON.parse(pending.subarray(p+4,p+4+n).toString());pending=pending.subarray(p+4+n);methods.push(m.method);if(m.method==='connect')emit({jsonrpc:'2.0',id:m.id,result:{protocolVersion:3}});else if(m.method==='session.create'){create=m.params;sessionId=m.params.sessionId;tools=await nativeDiscover(m.params.mcpServers.ptbk.args[0]);emit({jsonrpc:'2.0',id:m.id,result:{sessionId}})}else if(m.method==='session.mcp.list')emit({jsonrpc:'2.0',id:m.id,result:{servers:[{name:'ptbk',status:'connected'}]}});else if(m.method==='session.mcp.listTools')emit({jsonrpc:'2.0',id:m.id,result:{tools}});else if(m.method==='session.send'){fs.writeFileSync(process.env.PTBK_TEST_RECORD,JSON.stringify({args,input:m.params.prompt,cwd:process.cwd(),methods,create}));emit({jsonrpc:'2.0',id:m.id,result:{messageId:'ack'}});emit({jsonrpc:'2.0',method:'session.event',params:{sessionId,event:{type:'assistant.usage',data:{inputTokens:11,outputTokens:4}}}});emit({jsonrpc:'2.0',method:'session.event',params:{sessionId,event:{type:'session.idle',data:{}}}});}}});return;}\n" +
        "if(args.includes('--tui')){const fs=require('node:fs');const client=JSON.parse(fs.readFileSync(process.env.CLINE_MCP_SETTINGS_PATH,'utf8')).mcpServers.ptbk.args[0];nativeDiscover(client).then(()=>{console.log('idle startup; no task');setInterval(()=>{},1000);});return;}\n" +
        "if(args.includes('mcp')&&!args.includes('--prompt')){const fs=require('node:fs');let client;if(process.env.OPENCODE_CONFIG_CONTENT)client=JSON.parse(process.env.OPENCODE_CONFIG_CONTENT).mcp.ptbk.command[1];else client=JSON.parse(fs.readFileSync(args[args.indexOf('--additional-mcp-config')+1].slice(1),'utf8')).mcpServers.ptbk.args[0];nativeDiscover(client).then(tools=>{console.log(JSON.stringify({tools}));process.exit(0);});return;}\n" +
        "if(args.includes('--acp')){const fs=require('node:fs'),rl=require('node:readline').createInterface({input:process.stdin});const methods=[];rl.on('close',()=>process.exit(0));rl.on('line',async line=>{const m=JSON.parse(line);methods.push(m.method);if(m.method==='initialize')console.log(JSON.stringify({jsonrpc:'2.0',id:m.id,result:{protocolVersion:1}}));else if(m.method==='session/new'){await nativeDiscover(m.params.mcpServers[0].args[0]);console.log(JSON.stringify({jsonrpc:'2.0',id:m.id,result:{sessionId:'acp-session',modes:{currentModeId:args[args.indexOf('--approval-mode')+1]},models:{currentModelId:'native-acp-model'}}}));}else if(m.method==='session/prompt'){fs.writeFileSync(process.env.PTBK_TEST_RECORD,JSON.stringify({args,input:m.params.prompt[0].text,cwd:process.cwd(),methods}));console.log(JSON.stringify({jsonrpc:'2.0',method:'session/update',params:{update:{sessionUpdate:'usage_update',used:15}}}));console.log(JSON.stringify({jsonrpc:'2.0',id:m.id,result:{stopReason:'end_turn'}}));}});return;}\n" +
        "if(args[0]==='app-server'){const fs=require('node:fs'),rl=require('node:readline').createInterface({input:process.stdin});let url,tools={},threadParams;const methods=[];const emit=(message)=>console.log(JSON.stringify(message));rl.on('close',()=>process.exit(0));rl.on('line',async line=>{const m=JSON.parse(line);methods.push(m.method);if(m.method==='initialize')emit({id:m.id,result:{}});else if(m.method==='config/read')emit({id:m.id,result:{config:{features:Object.fromEntries(['shell_tool','unified_exec','hooks','plugins','apps','multi_agent','computer_use','browser_use','image_generation','view_image'].map(n=>[n,false])),mcp_servers:{unwanted:{command:'unsafe-server'}}}}});else if(m.method==='thread/start'){threadParams=m.params;const client=m.params.config.mcp_servers.ptbk.args[0];url=JSON.parse(fs.readFileSync(client,'utf8').match(/const url = (.*);/)[1]);if(!process.env.PTBK_TEST_IGNORE_MCP){for(const method of ['initialize','tools/list']){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method})});const value=await r.json();if(method==='tools/list')tools=Object.fromEntries(value.result.tools.map(t=>[t.name,t]));}}emit({id:m.id,result:{thread:{id:'fixture-thread'},sandbox:{type:m.params.sandbox==='read-only'?'readOnly':'workspaceWrite'},approvalPolicy:'never',model:'native-model'}});}else if(m.method==='mcpServerStatus/list'){const data=[{name:'ptbk',tools}];if(process.env.PTBK_TEST_EXPOSE_EXTRA_MCP)data.push({name:'unwanted',tools:{write:{name:'write'}}});emit({id:m.id,result:{data,nextCursor:null}});}else if(m.method==='turn/start'){fs.writeFileSync(process.env.PTBK_TEST_RECORD,JSON.stringify({args,input:m.params.input[0].text,cwd:process.cwd(),threadParams,methods}));if(process.env.PTBK_TEST_PROPOSE)await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'propose_task',arguments:{title:'Reviewed task',prompt:'Implement the reviewed behavior.',filename:'reviewed.book'}}})});emit({id:m.id,result:{turn:{id:'turn',status:'inProgress'}}});emit({method:'thread/tokenUsage/updated',params:{tokenUsage:{total:{input_tokens:11,output_tokens:4}}}});emit({method:'turn/completed',params:{turn:{status:'completed'}}});}});}else if(args.includes('--input-format')){const fs=require('node:fs'),rl=require('node:readline').createInterface({input:process.stdin});const methods=[];let tools=[];rl.on('close',()=>process.exit(0));rl.on('line',async line=>{const m=JSON.parse(line);if(m.type==='control_request'){methods.push(m.request.subtype);if(m.request.subtype==='initialize'){const c=JSON.parse(fs.readFileSync(args[args.indexOf('--mcp-config')+1],'utf8')).mcpServers.ptbk.args[0];const url=JSON.parse(fs.readFileSync(c,'utf8').match(/const url = (.*);/)[1]);if(!process.env.PTBK_TEST_IGNORE_MCP)for(const method of ['initialize','tools/list']){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method})});const value=await r.json();if(method==='tools/list')tools=value.result.tools;}console.log(JSON.stringify({type:'control_response',response:{subtype:'success',request_id:m.request_id,response:{}}}));}else console.log(JSON.stringify({type:'control_response',response:{subtype:'success',request_id:m.request_id,response:{mcpServers:[{name:'ptbk',status:'connected',tools}]}}}));}else if(m.type==='user'){methods.push('user');fs.writeFileSync(process.env.PTBK_TEST_RECORD,JSON.stringify({args,input:m.message.content,cwd:process.cwd(),methods}));console.log(JSON.stringify({type:'result',is_error:false,usage:{input_tokens:11,output_tokens:4}}));}});}else{\n" +
        "let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>input+=chunk);process.stdin.on('end',async()=>{" +
        "const fs=require('node:fs');let client;const codex=args.find(arg=>arg.startsWith('mcp_servers.ptbk.args='));if(codex)client=JSON.parse(codex.split('=').slice(1).join('='))[0];" +
        "const configIndex=args.indexOf('--mcp-config');const copilotIndex=args.indexOf('--additional-mcp-config');const config=process.env.CLINE_MCP_SETTINGS_PATH||(configIndex>=0?args[configIndex+1]:copilotIndex>=0?args[copilotIndex+1].slice(1):undefined);" +
        "if(config)client=JSON.parse(fs.readFileSync(config,'utf8')).mcpServers.ptbk.args[0];if(process.env.GEMINI_CLI_SYSTEM_SETTINGS_PATH)client=JSON.parse(fs.readFileSync(process.env.GEMINI_CLI_SYSTEM_SETTINGS_PATH,'utf8')).mcpServers.ptbk.args[0];if(process.env.OPENCODE_CONFIG_CONTENT){const mcp=JSON.parse(process.env.OPENCODE_CONFIG_CONTENT).mcp;if(mcp)client=mcp.ptbk.command[1];}" +
        "if(client&&!process.env.PTBK_TEST_IGNORE_MCP){const source=fs.readFileSync(client,'utf8');const url=JSON.parse(source.match(/const url = (.*);/)[1]);for(const method of ['initialize','tools/list'])await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method})});if(process.env.PTBK_TEST_PROPOSE)await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'propose_task',arguments:{title:'Reviewed task',prompt:'Implement the reviewed behavior.',filename:'reviewed.book'}}})});}" +
        "if(process.env.PTBK_TEST_CLINE_MUTATE&&process.env.CLINE_PROVIDER_SETTINGS_PATH){const p=process.env.CLINE_PROVIDER_SETTINGS_PATH;const original=fs.readFileSync(p,'utf8');console.log(JSON.parse(original).providers[0].apiKey);fs.writeFileSync(p,JSON.stringify({selectedModel:'changed-in-temporary-state'}));}fs.writeFileSync(process.env.PTBK_TEST_RECORD,JSON.stringify({args,input,cwd:process.cwd(),api:process.env.OPENAI_API_KEY,codexApi:process.env.CODEX_API_KEY,mcp:process.env.CLINE_MCP_SETTINGS_PATH,clineProvider:process.env.CLINE_PROVIDER_SETTINGS_PATH,clineGlobal:process.env.CLINE_GLOBAL_SETTINGS_PATH,clineData:process.env.CLINE_DATA_DIR,gemini:process.env.GEMINI_CLI_SYSTEM_SETTINGS_PATH,opencode:process.env.OPENCODE_CONFIG_CONTENT})); console.log(process.env.PTBK_TEST_RESULT || '{\"type\":\"turn.completed\",\"usage\":{\"input_tokens\":11,\"output_tokens\":4}}');process.exit(Number(process.env.PTBK_TEST_EXIT||'0'));});}\n";
    for (const { executable } of HARNESS_REGISTRY) await writeFile(join(bin, executable), script, { mode: 0o755 });
    const previous = { ...process.env };
    process.env.PATH = bin + (process.platform === 'win32' ? ';' : ':') + process.env.PATH;
    process.env.PTBK_TEST_RECORD = join(directory, 'record.json');
    return () => { for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key]; Object.assign(process.env, previous); };
}

test('nonzero exit, failed JSON and quota override completion markers', () => {
    const base = { exitCode: 0, signal: null, output: 'tokens used\n1000\nTask complete', cancelled: false };
    assert.equal(classifyHarnessResult(base), 'success');
    assert.equal(classifyHarnessResult({ ...base, exitCode: 1 }), 'process-failure');
    assert.equal(classifyHarnessResult({ ...base, output: '{"type":"turn.failed"}\ntokens used\n1000' }), 'process-failure');
    assert.equal(classifyHarnessResult({ ...base, exitCode: 1, output: 'Usage limit exceeded\ntokens used\n1000' }), 'quota');
    assert.equal(classifyHarnessResult({ ...base, output: 'Not logged in' }), 'authentication');
    assert.equal(classifyHarnessResult({ ...base, signal: 'SIGTERM' }), 'process-failure');
    assert.equal(classifyHarnessResult({ ...base, cancelled: true }), 'cancelled');
});

test('remote Book address guard rejects mapped IPv4 and IPv6 private addresses', () => {
    for (const address of ['::', '::1', '0:0:0:0:0:0:0:1', 'fc00::1', 'fd12::123', 'fe80::1', 'febf::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '::ffff:7f00:1', '::ffff:ac10:1']) assert.equal(isPrivateBookAddress(address), true, address);
    for (const address of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '::ffff:8.8.8.8']) assert.equal(isPrivateBookAddress(address), false, address);
});

test('native startup deadline is cleared before the coding turn', async () => fixture(async directory => {
    let completed = false;
    const result = await runProcess(process.execPath, ['-e', "console.log(JSON.stringify({type:'ready'}));setTimeout(()=>console.log(JSON.stringify({type:'done'})),180);process.stdin.resume();process.stdin.on('end',()=>process.exit(0));"], {
        cwd: directory, startupTimeoutMs: 80,
        protocol: { start() {}, message(message, send, finish, ready) { if (message.type === 'ready') ready(); else { completed = true; finish(); } } },
    });
    assert.equal(result.exitCode, 0, result.spawnError);
    assert.equal(completed, true);
    assert.equal(result.spawnError, undefined);
}));

test('malformed protocol escalates termination when the owned provider ignores SIGTERM', { skip: process.platform === 'win32' }, async () => fixture(async directory => {
    const started = Date.now();
    const result = await runProcess(process.execPath, ['-e', "process.on('SIGTERM',()=>{});console.log('not json');setInterval(()=>{},1000);"], {
        cwd: directory, protocol: { start() {}, message() {} },
    });
    assert.match(result.spawnError, /JSON|Unexpected token/);
    assert.equal(result.signal, 'SIGKILL');
    assert.ok(Date.now() - started < 3500);
}));

test('Content-Length protocol handles split Unicode frames and rejects oversized declarations', async () => fixture(async directory => {
    let content;
    const result = await runProcess(process.execPath, ['-e', "const body=JSON.stringify({type:'ready',content:'Český 👋'});const packet=Buffer.from('Content-Length: '+Buffer.byteLength(body)+'\\r\\n\\r\\n'+body);process.stdout.write(packet.subarray(0,packet.length-2));setTimeout(()=>process.stdout.write(packet.subarray(packet.length-2)),20);process.stdin.resume();process.stdin.on('end',()=>process.exit(0));"], {
        cwd: directory, protocol: { framing: 'content-length', start() {}, message(message, send, finish, ready) { content = message.content; ready(); finish(); } },
    });
    assert.equal(result.exitCode, 0, result.spawnError);
    assert.equal(content, 'Český 👋');
    const invalid = await runProcess(process.execPath, ['-e', "process.stdout.write('Content-Length: 999999999\\r\\n\\r\\n');setInterval(()=>{},1000);"], { cwd: directory, protocol: { framing: 'content-length', start() {}, message() {} } });
    assert.match(invalid.spawnError, /invalid Content-Length/);
}));

test('seven adapters use argv, report usage and retain native defaults', async () => fixture(async (directory) => {
    const restore = await fakeProviders(directory);
    try {
        for (const definition of HARNESS_REGISTRY) {
            const payload = 'literal $(touch should-not-exist); "quoted"';
            const result = await runHarness({ harness: definition.name, projectPath: directory, prompt: payload, model: 'default' });
            assert.equal(result.outcome, 'success', definition.name + ': ' + result.output);
            assert.deepEqual(result.usage, { input_tokens: 11, output_tokens: 4 });
            const record = JSON.parse(await readFile(process.env.PTBK_TEST_RECORD, 'utf8'));
            assert.ok(record.input.includes(payload) || record.args.some(arg => arg.includes(payload)));
            if (definition.nativeDefault) assert.equal(record.args.includes('--model'), false);
            else assert.ok(record.args.includes(definition.defaultModel));
        }
        await assert.rejects(access(join(directory, 'should-not-exist')));
    } finally { restore(); }
}));

test('Gemini final stats and OpenCode step usage preserve provider reports without duplicate counting', async () => fixture(async directory => {
    const restore = await fakeProviders(directory);
    try {
        process.env.PTBK_TEST_RESULT = JSON.stringify({ type: 'result', status: 'success', stats: { total_tokens: 30, input_tokens: 20, output_tokens: 10, cached: 5, duration_ms: 40, tool_calls: 1 } });
        assert.deepEqual((await runHarness({ harness: 'gemini', projectPath: directory, prompt: 'Task' })).usage, { total_tokens: 30, input_tokens: 20, output_tokens: 10, cached: 5 });
        const step = (id, input, output) => ({ type: 'step_finish', part: { id, tokens: { input, output, cache: { read: 3, write: 0 } }, cost: 0.01 } });
        process.env.PTBK_TEST_RESULT = [step('one', 10, 2), step('one', 12, 3), step('two', 4, 1)].map(value => JSON.stringify(value)).join('\n');
        assert.deepEqual((await runHarness({ harness: 'opencode', projectPath: directory, prompt: 'Task' })).usage, { input: 16, output: 4, cache_read: 6, cache_write: 0, cost: 0.02 });
    } finally { restore(); }
}));

test('Cline uses disposable credential state without changing native model settings or leaking credentials', async () => fixture(async directory => {
    const restore = await fakeProviders(directory);
    try {
        const providerPath = join(directory, 'native-providers.json');
        const original = JSON.stringify({ providers: [{ apiKey: 'fixture-provider-credential' }], selectedModel: 'native-model' });
        await writeFile(providerPath, original);
        process.env.CLINE_PROVIDER_SETTINGS_PATH = providerPath;
        process.env.PTBK_TEST_CLINE_MUTATE = '1';
        const result = await runHarness({ harness: 'cline', projectPath: directory, prompt: 'Task' });
        assert.equal(result.outcome, 'success', result.output);
        assert.equal(await readFile(providerPath, 'utf8'), original);
        assert.equal(result.output.includes('fixture-provider-credential'), false);
        const record = JSON.parse(await readFile(process.env.PTBK_TEST_RECORD, 'utf8'));
        assert.notEqual(record.clineProvider, providerPath);
        assert.ok(record.clineProvider.includes('ptbk-coder/cline-'));
        assert.ok(record.args.includes('--config')); assert.ok(record.args.includes('--data-dir'));
        await assert.rejects(access(record.clineProvider));
    } finally { restore(); }
}));

test('OpenCode TEAM refuses native model ambiguity before primary inference and isolates advisor configuration', async () => fixture(async directory => {
    const restore = await fakeProviders(directory);
    try {
        await mkdir(join(directory, 'agents'));
        await writeFile(join(directory, 'agents', 'developer.book'), 'Developer\nFROM VOID\nTEAM {./lawyer.book}\n');
        await writeFile(join(directory, 'agents', 'lawyer.book'), 'Lawyer\nFROM VOID\nRULE Advise\n');
        const refused = await runHarness({ harness: 'opencode', projectPath: directory, prompt: 'Task', agentPath: 'agents/developer.book' });
        assert.equal(refused.outcome, 'configuration');
        assert.match(refused.output, /explicit --model/);
        await assert.rejects(access(process.env.PTBK_TEST_RECORD));
        process.env.OPENCODE_CONFIG_CONTENT = JSON.stringify({ plugin: ['unsafe-user-plugin'], mcp: { unsafe: {} } });
        const result = await runHarness({ harness: 'opencode', projectPath: directory, prompt: 'Advise', readOnly: true, model: 'anthropic/claude-sonnet-4-6' });
        assert.equal(result.outcome, 'success', result.output);
        const record = JSON.parse(await readFile(process.env.PTBK_TEST_RECORD, 'utf8'));
        const configuration = JSON.parse(record.opencode);
        assert.equal(configuration.plugin, undefined);
        assert.deepEqual(Object.keys(configuration.mcp), ['ptbk']);
        assert.deepEqual(configuration.permission, { '*': 'deny', 'ptbk_*': 'allow' });
    } finally { restore(); }
}));

test('unsupported effort is rejected before spawning a provider', async () => fixture(async directory => {
    const result = await runHarness({ harness: 'gemini', projectPath: directory, prompt: 'task', thinkingLevel: 'max' });
    assert.equal(result.outcome, 'configuration');
    assert.match(result.output, /does not support/);
}));

test('Codex prefers account login and never silently bills an API key', async () => fixture(async directory => {
    const restore = await fakeProviders(directory);
    try {
        process.env.OPENAI_API_KEY = 'fixture-api-secret-value';
        process.env.CODEX_API_KEY = 'fixture-second-secret-value';
        process.env.PTBK_OPENAI_CODEX_USE_API_KEY = '1';
        let result = await runHarness({ harness: 'openai-codex', projectPath: directory, prompt: 'task' });
        assert.equal(result.authentication, 'account');
        let record = JSON.parse(await readFile(process.env.PTBK_TEST_RECORD, 'utf8'));
        assert.equal(record.api, undefined); assert.equal(record.codexApi, undefined);
        process.env.PTBK_TEST_AUTH = 'Logged in using an API key';
        delete process.env.PTBK_OPENAI_CODEX_USE_API_KEY;
        result = await runHarness({ harness: 'openai-codex', projectPath: directory, prompt: 'task' });
        assert.equal(result.outcome, 'authentication');
        assert.match(result.output, /PTBK_OPENAI_CODEX_USE_API_KEY/);
        process.env.PTBK_OPENAI_CODEX_USE_API_KEY = '1';
        result = await runHarness({ harness: 'openai-codex', projectPath: directory, prompt: 'task' });
        assert.equal(result.authentication, 'api');
        record = JSON.parse(await readFile(process.env.PTBK_TEST_RECORD, 'utf8'));
        assert.equal(record.codexApi, 'fixture-second-secret-value');
    } finally { restore(); }
}));

test('dotenv secrets split across stream chunks never enter output', async () => fixture(async directory => {
    const secret = 'project-fixture-secret-723895';
    await writeFile(join(directory, '.env'), 'CUSTOM_SECRET=' + secret + '\n');
    let streamed = '';
    const script = 'process.stdout.write(' + JSON.stringify(secret.slice(0, 14)) + ');setTimeout(()=>process.stdout.write(' + JSON.stringify(secret.slice(14) + '\n') + '),30);';
    const result = await runProcess(process.execPath, ['-e', script], { cwd: directory, onOutput: chunk => streamed += chunk });
    assert.equal(result.exitCode, 0);
    assert.equal(result.output.includes(secret), false);
    assert.equal(streamed.includes(secret), false);
    assert.match(streamed, /REDACTED/);
    assert.equal(process.env.CUSTOM_SECRET, undefined);
    assert.match(redactSecrets('Bearer ' + secret), /REDACTED/);
}));

test('cancellation kills owned children while an unrelated process survives', async () => fixture(async directory => {
    const unrelated = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' });
    const controller = new AbortController();
    const marker = join(directory, 'leaked-child');
    const childCode = 'setTimeout(()=>require("node:fs").writeFileSync(' + JSON.stringify(marker) + ',"leaked"),700);';
    const code = 'require("node:child_process").spawn(process.execPath,["-e",' + JSON.stringify(childCode) + '],{stdio:"inherit"});console.log("child spawned");setInterval(()=>{},1000);';
    try {
        const result = await runProcess(process.execPath, ['-e', code], { cwd: directory, signal: controller.signal, onOutput: () => controller.abort() });
        assert.equal(result.cancelled, true);
        await new Promise(accept => setTimeout(accept, 800));
        await assert.rejects(access(marker));
        assert.doesNotThrow(() => process.kill(unrelated.pid, 0));
    } finally { unrelated.kill(); }
}));

test('Book inheritance retains declaring relative paths and distinct TEAM roles', async () => fixture(async directory => {
    await mkdir(join(directory, 'agents', 'base'), { recursive: true });
    await writeFile(join(directory, 'agents', 'base', 'parent.book'), 'Parent\nFROM VOID\nRULE Parent rule\nTEAM Ask {./advisor.book}\nKNOWLEDGE ./notes.txt\n');
    await writeFile(join(directory, 'agents', 'base', 'advisor.book'), 'Advisor\nFROM VOID\nRULE Advisor-only rule\n');
    await writeFile(join(directory, 'agents', 'base', 'notes.txt'), 'Knowledge text');
    await writeFile(join(directory, 'agents', 'developer.book'), 'Developer\nFROM {./base/parent.book}\nRULE Child rule\nTEAM Ask {./base/advisor.book}\n');
    const agent = await prepareAgent('agents/developer.book', directory);
    assert.match(agent.instructions, /Parent rule/); assert.match(agent.instructions, /Child rule/); assert.match(agent.instructions, /Knowledge text/);
    assert.equal(agent.instructions.includes('Advisor-only rule'), false);
    assert.equal(agent.team.length, 1);
    assert.equal(agent.team[0].path, await realpath(join(directory, 'agents', 'base', 'advisor.book')));
    assert.ok(agent.aliases.includes('Developer'));
    await writeFile(join(directory, 'agents', 'developer.book'), 'Developer\nFROM {./developer.book}\n');
    await assert.rejects(prepareAgent('agents/developer.book', directory), /Cyclic/);
}));

test('agent resolver rejects task Books and escaped symlink knowledge', async () => fixture(async directory => {
    await mkdir(join(directory, 'agents'));
    await writeFile(join(directory, 'agents', 'task.book'), 'Task title\nTASK\nMETA ID example\nSTATUS todo\nPROMPT work\n');
    await assert.rejects(prepareAgent('agents/task.book', directory), /Task Book/);
    await symlink('/etc/passwd', join(directory, 'agents', 'outside.txt'));
    await writeFile(join(directory, 'agents', 'developer.book'), 'Developer\nFROM VOID\nKNOWLEDGE ./outside.txt\n');
    await assert.rejects(prepareAgent('agents/developer.book', directory), /escapes/);
}));

test('final FROM and blank FROM suppress preceding ancestors; last model name wins', async () => fixture(async directory => {
    await mkdir(join(directory, 'agents', '.core'), { recursive: true });
    await writeFile(join(directory, 'agents', '.core', 'adam.book'), 'Adam\nFROM VOID\nRULE Adam baseline\n');
    await writeFile(join(directory, 'agents', 'parent.book'), 'Parent\nFROM VOID\nRULE Parent baseline\nMODEL NAME parent-model\n');
    await writeFile(join(directory, 'agents', 'developer.book'), 'Developer\nFROM ./missing.book\nFROM ./parent.book\nMODEL NAME child-model\nMODEL final-model\n');
    let agent = await prepareAgent('agents/developer.book', directory);
    assert.match(agent.instructions, /Parent baseline/);
    assert.equal(agent.instructions.includes('Adam baseline'), false);
    assert.equal(agent.model, 'final-model');
    await writeFile(join(directory, 'agents', 'developer.book'), 'Developer\nFROM ./missing.book\nFROM\nRULE Only child\n');
    agent = await prepareAgent('agents/developer.book', directory);
    assert.equal(agent.instructions.includes('baseline'), false);
    assert.match(agent.instructions, /Only child/);
}));

test('Book model config applies unless an explicit request overrides it', async () => fixture(async directory => {
    const restore = await fakeProviders(directory);
    try {
        await writeFile(join(directory, 'agent.book'), 'Agent\nFROM VOID\nMODEL NAME book-model\n');
        let result = await runHarness({ harness: 'openai-codex', projectPath: directory, prompt: 'Task', agentPath: 'agent.book' });
        assert.equal(result.outcome, 'success');
        let record = JSON.parse(await readFile(process.env.PTBK_TEST_RECORD, 'utf8'));
        assert.ok(record.args.includes('book-model'));
        result = await runHarness({ harness: 'openai-codex', projectPath: directory, prompt: 'Task', agentPath: 'agent.book', model: 'explicit-model' });
        record = JSON.parse(await readFile(process.env.PTBK_TEST_RECORD, 'utf8'));
        assert.ok(record.args.includes('explicit-model'));
        await rm(process.env.PTBK_TEST_RECORD);
        await writeFile(join(directory, 'agent.book'), 'Agent\nFROM VOID\nMODEL NAME book-model\nMODEL TEMPERATURE 0.2\n');
        result = await runHarness({ harness: 'openai-codex', projectPath: directory, prompt: 'Task', agentPath: 'agent.book' });
        assert.equal(result.outcome, 'configuration');
        assert.match(result.output, /MODEL parameters/);
        await assert.rejects(access(process.env.PTBK_TEST_RECORD));
    } finally { restore(); }
}));

test('TEAM has discovery, on-demand calls and shared limits', async () => fixture(async directory => {
    let calls = 0;
    const budget = { calls: 0, depth: 0, usage: {} };
    const tools = advisorTools([{ name: 'Lawyer', path: 'lawyer.book', declaringPath: 'developer.book' }], budget, async (member, question) => { calls++; return { output: member.name + ': ' + question }; });
    const bridge = await createToolBridge(directory, tools);
    try {
        assert.equal(calls, 0);
        async function rpc(method, params) {
            const response = await fetch(bridge.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
            return (await response.json()).result;
        }
        const discovery = await rpc('tools/list');
        assert.equal(discovery.tools[0].name, 'consult_Lawyer');
        const answer = await rpc('tools/call', { name: 'consult_Lawyer', arguments: { question: 'Review license' } });
        assert.equal(calls, 1); assert.match(answer.content[0].text, /Advisor: Lawyer/);
        budget.calls = 24;
        const exhausted = await rpc('tools/call', { name: 'consult_Lawyer', arguments: { question: 'Again' } });
        assert.equal(exhausted.isError, true); assert.equal(calls, 1);
        budget.calls = 0; budget.depth = 4;
        await assert.rejects(tools[0].invoke({ question: 'Again' }), /depth/);
        const denied = await fetch(bridge.url, { method: 'POST', headers: { Origin: 'https://evil.example' }, body: '{}' });
        assert.equal(denied.status, 403);
    } finally { await bridge.close(); }
    await assert.rejects(access(bridge.directory));
}));

test('tool bridge rejects symlinked runtime directories outside its project', async () => fixture(async directory => {
    const project = join(directory, 'project');
    const outside = join(directory, 'outside');
    await mkdir(project); await mkdir(outside);
    await symlink(outside, join(project, '.promptbook'));
    await assert.rejects(createToolBridge(project, []), /outside|escape|confine/i);
    await assert.rejects(access(join(outside, 'ptbk-coder')));
}));

test('planning read tools deny secrets, traversal and symlink escapes', async () => fixture(async directory => {
    await writeFile(join(directory, 'app.ts'), 'export const answer = 42;');
    await writeFile(join(directory, '.env'), 'CUSTOM_SECRET=fixture-secret');
    await symlink('/etc/passwd', join(directory, 'escape'));
    const tools = planningReadTools(directory);
    assert.deepEqual(tools.map(tool => tool.name), ['read_project', 'list_project']);
    assert.equal(await tools[0].invoke({ path: 'app.ts' }), 'export const answer = 42;');
    await assert.rejects(tools[0].invoke({ path: '.env' }), /denied/);
    await assert.rejects(tools[0].invoke({ path: '../outside' }), /escapes/);
    await assert.rejects(tools[0].invoke({ path: 'escape' }), /escapes/);
}));

test('planning fails closed for providers without the read-only capability', async () => fixture(async directory => {
    await assert.rejects(planConversation({ projectPath: directory }, { harness: 'claude-code' }), /requires.*openai-codex/);
    const restore = await fakeProviders(directory);
    try {
        await writeFile(join(directory, 'agents.book'), 'Developer\nFROM VOID\nRULE Plan');
        const result = await runHarness({ harness: 'openai-codex', projectPath: directory, agentPath: 'agents.book', prompt: 'Plan task', readOnly: true });
        assert.equal(result.outcome, 'success', result.output);
        const record = JSON.parse(await readFile(process.env.PTBK_TEST_RECORD, 'utf8'));
        assert.equal(record.threadParams.sandbox, 'read-only'); assert.ok(record.args.includes('shell_tool')); assert.ok(record.args.includes('hooks'));
        assert.ok(record.args.includes('project_root_markers=[]'));
        assert.equal(record.threadParams.config.mcp_servers.unwanted.enabled, false);
        assert.ok(record.methods.indexOf('mcpServerStatus/list') < record.methods.indexOf('turn/start'));
        assert.ok(record.cwd.includes('.promptbook/ptbk-coder/planner-'));
        await assert.rejects(access(record.cwd));
    } finally { restore(); }
}));

test('ignored provider bridge configuration cannot claim TEAM support', async () => fixture(async directory => {
    const restore = await fakeProviders(directory);
    try {
        process.env.PTBK_TEST_IGNORE_MCP = '1';
        for (const harness of ['openai-codex', 'claude-code', 'github-copilot']) {
            const result = await runHarness({ harness, projectPath: directory, prompt: 'Plan', readOnly: true });
            assert.equal(result.outcome, 'configuration');
            assert.match(result.output, /did not discover/);
            await assert.rejects(access(process.env.PTBK_TEST_RECORD));
        }
    } finally { restore(); }
}));

test('Copilot advisors expose only source-qualified ptbk tools before prompting', async () => fixture(async directory => {
    const restore = await fakeProviders(directory);
    try {
        const result = await runHarness({ harness: 'github-copilot', projectPath: directory, prompt: 'Read project', readOnly: true });
        assert.equal(result.outcome, 'success', result.output);
        const record = JSON.parse(await readFile(process.env.PTBK_TEST_RECORD, 'utf8'));
        assert.ok(record.methods.indexOf('session.mcp.listTools') < record.methods.indexOf('session.send'));
        assert.deepEqual(record.create.availableTools, ['mcp:ptbk-read_project', 'mcp:ptbk-list_project']);
        for (const field of ['enableConfigDiscovery', 'enableFileHooks', 'enableHostGitOperations', 'enableSessionStore', 'enableSkills', 'enableOnDemandInstructionDiscovery']) assert.equal(record.create[field], false, field);
        assert.deepEqual(record.create.memory, { enabled: false });
        assert.equal(record.args.some(argument => argument.includes('Read project')), false);
        assert.deepEqual(result.usage, { inputTokens: 11, outputTokens: 4 });
    } finally { restore(); }
}));

test('planner rejects external MCP tools before starting any model turn', async () => fixture(async directory => {
    const restore = await fakeProviders(directory);
    try {
        process.env.PTBK_TEST_EXPOSE_EXTRA_MCP = '1';
        const result = await runHarness({ harness: 'openai-codex', projectPath: directory, prompt: 'Plan', readOnly: true });
        assert.equal(result.outcome, 'configuration');
        assert.match(result.output, /external tools/);
        await assert.rejects(access(process.env.PTBK_TEST_RECORD));
    } finally { restore(); }
}));

test('Codex refuses account inference when native credit prohibition is unavailable', async () => fixture(async directory => {
    const restore = await fakeProviders(directory);
    try {
        process.env.PTBK_TEST_HELP = helpFlags.replace(' --no-credits', '');
        let result = await runHarness({ harness: 'openai-codex', projectPath: directory, prompt: 'Task' });
        assert.equal(result.outcome, 'configuration');
        assert.match(result.output, /cannot enforce credit-free/);
        await assert.rejects(access(process.env.PTBK_TEST_RECORD));
        result = await runHarness({ harness: 'openai-codex', projectPath: directory, prompt: 'Task', allowCredits: true });
        assert.equal(result.outcome, 'success');
        const record = JSON.parse(await readFile(process.env.PTBK_TEST_RECORD, 'utf8'));
        assert.ok(record.args.includes('forced_login_method="chatgpt"'));
        assert.equal(record.args.includes('--no-credits'), false);
    } finally { restore(); }
}));

test('only a provider with verified native pre-inference discovery can run TEAM', async () => fixture(async directory => {
    const restore = await fakeProviders(directory);
    try {
        await mkdir(join(directory, 'agents'));
        await writeFile(join(directory, 'agents', 'developer.book'), 'Developer\nFROM VOID\nTEAM Ask {./lawyer.book}\n');
        await writeFile(join(directory, 'agents', 'lawyer.book'), 'Lawyer\nFROM VOID\nRULE Advise on licenses\n');
        for (const { name } of HARNESS_REGISTRY) {
            const result = await runHarness({ harness: name, projectPath: directory, prompt: 'Task', agentPath: 'agents/developer.book', ...(name === 'opencode' ? { model: 'anthropic/claude-sonnet-4-6' } : {}) });
            if (['openai-codex', 'claude-code', 'github-copilot', 'gemini', 'opencode'].includes(name)) {
                assert.equal(result.outcome, 'success', result.output);
                const record = JSON.parse(await readFile(process.env.PTBK_TEST_RECORD, 'utf8'));
                assert.ok(record.input.includes('consult_Lawyer') || record.args.some((argument) => argument.includes('consult_Lawyer')));
                await rm(process.env.PTBK_TEST_RECORD);
            } else {
                assert.equal(result.outcome, 'configuration', name);
                assert.match(result.output, /before inference/);
                await assert.rejects(access(process.env.PTBK_TEST_RECORD));
            }
        }
    } finally { restore(); }
}));

test('Cline refuses unverified tools before any task can be submitted', async () => fixture(async directory => {
    const restore = await fakeProviders(directory);
    try {
        const tools = [{ name: 'inspect_only', description: 'Read-only inspection.', inputSchema: { type: 'object' }, invoke: async () => 'observed' }];
        const result = await runHarness({ harness: 'cline', projectPath: directory, prompt: 'Primary task', tools });
        assert.equal(result.outcome, 'configuration');
        assert.match(result.output, /before inference/);
        await assert.rejects(access(process.env.PTBK_TEST_RECORD));
        assert.equal(HARNESS_REGISTRY.find(entry => entry.name === 'cline').toolDiscovery, undefined);
    } finally { restore(); }
}));

test('planning saves only after exact preview and explicit human approval', async () => fixture(async directory => {
    const restore = await fakeProviders(directory);
    try {
        assert.equal((await runProcess('git', ['init'], { cwd: directory })).exitCode, 0);
        await mkdir(join(directory, 'agents'));
        await writeFile(join(directory, 'agents', 'developer.book'), 'Developer\nFROM VOID\nRULE Plan\n');
        await writeFile(join(directory, 'app.ts'), 'untouched application bytes\n');
        process.env.PTBK_TEST_PROPOSE = '1';
        const workspace = await resolveWorkspace({ path: directory }, true);
        const output = new PassThrough();
        let displayed = '';
        output.on('data', chunk => displayed += chunk);
        const result = await planConversation(workspace, { harness: 'openai-codex', prompt: 'Propose work', input: Readable.from(['/draft\nyes\n/exit\n']), output });
        assert.equal(result.saved.length, 1);
        const book = await readFile(result.saved[0], 'utf8');
        assert.match(book, /STATUS not-ready/);
        assert.match(displayed, /Review .*reviewed\.book/);
        assert.match(displayed, /Save these exact files/);
        assert.equal(await readFile(join(directory, 'app.ts'), 'utf8'), 'untouched application bytes\n');
        await rm(result.saved[0]);
        const unsaved = await planConversation(workspace, { harness: 'openai-codex', prompt: 'Propose work', input: Readable.from([]), output });
        assert.equal(unsaved.saved.length, 0);
        await assert.rejects(access(join(workspace.tasksPath, 'reviewed.book')));
    } finally { restore(); }
}));
