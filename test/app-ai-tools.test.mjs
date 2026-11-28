import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { delimiter } from 'node:path';
import { test } from 'node:test';
import { ProjectAiTools } from '../dist/app/ai-tools.js';
import { EngineApi } from '../dist/app/api/engine-api.js';
import { AccessStore } from '../dist/app/web/access.js';
import { api } from '../dist/vendor/app-platform.js';
import { harnessPlugin } from '../dist/harness/registry.js';
import { accountHome, instanceEnvironment, nativeSetupTool } from '../dist/engine/harnesses.js';
import { verifyHarness } from '../dist/onboarding/verify-harness.js';
import { fakeHarness, temporaryDirectory, waitFor } from './helpers.mjs';

/** A real gateway session and strict HTTP binding around an explicitly injected provider port. */
async function fixture(t) {
    const root = await temporaryDirectory(t,'project AI tools');
    const access = await AccessStore.open(root);
    const client = {ip:'127.0.0.1',userAgent:'AI tools test'};
    const owner = await access.addMember({displayName:'Owner',role:'owner'});
    const makeSession = async (member=owner) => {
        const login = await access.signIn(member.id,null,client);
        return access.authenticate(login.token,client);
    };
    const actor = await makeSession();
    const commits = [];
    let signedIn = true;
    let tool = {type:'HARNESS',variant:'CLAUDE_CODE',name:'work-claude',isEnabled:true,authentication:'NATIVE',accountProfile:'old-private-profile'};
    const inspection = () => ({id:'claude-code',displayName:'Claude Code',installed:true,version:'2.1.330',authenticated:signedIn,authentication:signedIn?'account':'none',usable:signedIn,models:[],thinkingLevels:[],capabilities:{mcp:true,readOnly:true},summary:signedIn?'Signed in':'OAuth session expired and could not be refreshed',...(signedIn?{}:{problem:'signed-out'}),checkedAt:Date.now()});
    const plugin = {id:'claude-code',variant:'CLAUDE_CODE',displayName:'Claude Code',accountHomeVariable:'CLAUDE_CONFIG_DIR',
        setupApiKey:{reference:'PTBK_ANTHROPIC_API_KEY',label:'Anthropic API key',url:'https://console.anthropic.com/settings/keys'},inspect:async()=>inspection(),loginMethods:async()=>[]};
    let verifier = async (_plugin,context) => context.env.ANTHROPIC_API_KEY === 'accepted-key' || context.tool.authentication==='NATIVE' && signedIn
        ? {call:{}} : {diagnostic:'Provider refused '+context.env.ANTHROPIC_API_KEY};
    const backend = {
        targets:async()=>[
            {plugin,tool,context:{projectRoot:root,tool,env:{}},inspection:inspection(),configured:true},
            {plugin:{...plugin,id:'gemini',displayName:'Gemini CLI'},tool:{...tool,name:'gemini'},context:{projectRoot:root,env:{}},inspection:{...inspection(),installed:false},configured:false},
        ],
        prepare:(target,method,key)=>({projectRoot:root,tool:{...target.tool,authentication:method==='account'?'NATIVE':'API_KEY',accountProfile:'candidate-'+randomUUID()},env:{ANTHROPIC_API_KEY:key}}),
        commit:async(target,context,key)=>{assert.deepEqual(target.tool,tool,'obsolete configuration must not be replaced');commits.push({method:context.tool.authentication,key});tool=context.tool;signedIn=true;},
        discard:async()=>{},signOut:async()=>{signedIn=false;},
        verify:(...args)=>verifier(...args),
    };
    const tools = new ProjectAiTools(backend); t.after(()=>tools.stop());
    const engine = new EngineApi({projectRoot:root,stateDirectory:root,engineId:()=> 'aaaaaaaaaaaaaaaaaaaaaaaaaa',hostname:()=> 'engine.example',dashboardUrl:()=>undefined,security:()=>undefined,ui:()=>({}),aiTools:tools});
    const call = async (path,method='GET',body,who=actor) => {
        const response=await engine.handle(new Request('https://engine.example/api/v1'+path,{method,...(body===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)})}),who,access);
        const text=await response.text();return {status:response.status,body:text?JSON.parse(text):null};
    };
    return {root,access,actor,makeSession,tools,call,commits,backend,setVerifier:next=>{verifier=next;},expire:()=>{signedIn=false;}};
}

test('AT-01/02/03/04: tools are strict, a real check is coalesced, and an expired sign-in is visible',async t=>{
    const f=await fixture(t);
    const list=await f.call('/ai-tools');assert.equal(list.status,200);
    assert.deepEqual(list.body.items.map(x=>x.id),['claude-code','gemini-cli']);
    assert.equal(api.AiToolList.safeParse(list.body).success,true);
    const missing=list.body.items[1];assert.equal(missing.status,'not-installed');assert.deepEqual(missing.signInMethods,[]);assert.equal(missing.auth,null);
    assert.equal((await f.call('/ai-tools/gemini-cli/check','POST')).status,409);
    let finish;let calls=0;
    f.setVerifier(async()=>{calls++;await new Promise(resolve=>{finish=resolve;});return {call:{}};});
    assert.equal((await f.call('/ai-tools/claude-code/check','POST')).status,202);
    await waitFor(()=>finish);
    assert.equal((await f.call('/ai-tools/claude-code/check','POST')).body.checking,true);
    assert.equal(calls,1);finish();await waitFor(()=>!f.tools.checks.has('claude-code'));
    const ready=(await f.call('/ai-tools/claude-code')).body;assert.equal(ready.status,'signed-in');assert.ok(ready.checkedAt);
    f.expire();const expired=(await f.call('/ai-tools/claude-code')).body;assert.equal(expired.status,'needs-sign-in');assert.equal(expired.problem.code,'sign-in-expired');
    assert.deepEqual(f.tools.changedSince(0),['claude-code']);
});

test('AT-05/06: read/manage permissions and fresh step-up are independent; denials do not change credentials',async t=>{
    const f=await fixture(t);
    for(const path of ['/ai-tools','/ai-tools/claude-code'])assert.equal((await f.call(path,'GET',undefined,{...f.actor,permissions:[]})).status,403);
    const readOnly={...f.actor,permissions:['ai-tools.read']};
    assert.equal((await f.call('/ai-tools/claude-code/sign-ins','POST',{method:'api-key'},readOnly)).status,403);
    assert.equal((await f.call('/ai-tools/claude-code/credentials','DELETE',undefined,readOnly)).status,403);
    assert.equal((await f.call('/ai-tools/claude-code/sign-ins','POST',{method:'api-key'},{...f.actor,stepUpFresh:false})).status,401);
    assert.deepEqual(f.commits,[]);
    const saved=JSON.parse(await readFile(join(f.root,'access.json'),'utf8'));
    assert.ok(saved.audit.some(x=>x.action==='ai-tool.sign-in.start'&&x.outcome==='denied'));
});

test('AT-09/10/11: a refused key is never echoed or committed, prompts cannot be replayed and sessions are isolated',async t=>{
    const f=await fixture(t);
    const started=await f.call('/ai-tools/claude-code/sign-ins','POST',{method:'api-key'});assert.equal(started.status,201);
    const path='/ai-tools/claude-code/sign-ins/'+started.body.id;
    assert.equal(started.body.prompt.canGoBack,false);
    const other=await f.makeSession();assert.equal((await f.call(path,'GET',undefined,other)).status,404);
    const secret='private-rejected-key';
    const answer={promptId:started.body.prompt.id,action:'answer',answer:{kind:'secret',value:secret}};
    const refused=await f.call(path+'/answer','POST',answer);assert.equal(refused.status,200);assert.equal(refused.body.prompt.kind,'secret');
    assert.notEqual(refused.body.prompt.id,started.body.prompt.id);assert.ok(refused.body.prompt.error);assert.ok(!JSON.stringify(refused).includes(secret));assert.deepEqual(f.commits,[]);
    assert.equal((await f.call(path+'/answer','POST',answer)).status,409);
    const accepted=await f.call(path+'/answer','POST',{...answer,promptId:refused.body.prompt.id,answer:{kind:'secret',value:'accepted-key'}});
    assert.equal(accepted.status,200);assert.equal(accepted.body.status,'completed');assert.equal(accepted.body.tool.status,'signed-in');assert.equal(f.commits.length,1);
    assert.ok(!JSON.stringify(accepted).includes('accepted-key'));
    assert.ok(!(await readFile(join(f.root,'access.json'),'utf8')).includes(secret));
});

test('AT-11: cancel and session revocation while a check runs prevent a late credential promotion',async t=>{
    const f=await fixture(t);
    for(const revoke of [false,true]){
        const start=await f.call('/ai-tools/claude-code/sign-ins','POST',{method:'api-key'});const path='/ai-tools/claude-code/sign-ins/'+start.body.id;
        let finish;
        f.setVerifier(async()=>{await new Promise(resolve=>{finish=resolve;});return {call:{}};});
        const pending=f.call(path+'/answer','POST',{promptId:start.body.prompt.id,action:'answer',answer:{kind:'secret',value:'accepted-key'}});
        await waitFor(()=>finish);
        if(revoke)await f.access.revokeSessions(session=>session.id===f.actor.sessionId);else assert.equal((await f.call(path,'DELETE')).status,204);
        finish();await pending;
        assert.equal(f.commits.length,0);
    }
});

test('AT-12/14: signing out affects this project and an unadvertised engine refuses AI-tool routes',async t=>{
    const f=await fixture(t);
    const signedOut=await f.call('/ai-tools/claude-code/credentials','DELETE');assert.equal(signedOut.status,200);assert.equal(signedOut.body.status,'needs-sign-in');
    assert.equal((await f.call('/ai-tools/claude-code/credentials','DELETE')).status,200);
    const oldEngine=new EngineApi({projectRoot:f.root,stateDirectory:f.root,engineId:()=> 'aaaaaaaaaaaaaaaaaaaaaaaaaa',hostname:()=> 'engine.example',dashboardUrl:()=>undefined,security:()=>undefined,ui:()=>({})});
    const response=await oldEngine.handle(new Request('https://engine.example/api/v1/ai-tools'),f.actor,f.access);
    assert.equal(response.status,404);assert.equal((await response.json()).code,'capability-not-supported');
});

test('AT-07: a native Codex device sign-in is presented without Back and verified in a fresh private profile',async t=>{
    const f=await fixture(t);
    const fake=await fakeHarness(t,f.root);
    const env={...fake.env,FAKE_CODEX_AUTH_FILE:join(f.root,'signed-in')};
    const script=join(f.root,'fake bin','codex.mjs');
    await writeFile(script,(await readFile(script,'utf8')).replaceAll('https://auth.example.test/codex/device','https://auth.openai.com/codex/device').replace("print('Successfully logged in');","print('Successfully logged in'); await new Promise(resolve => setTimeout(resolve, 500));"));
    const plugin=harnessPlugin('openai-codex');
    let tool={...nativeSetupTool(plugin),accountProfile:'old-profile'};
    let context={projectRoot:f.root,tool,env:instanceEnvironment(plugin,tool,undefined,env)};
    f.backend.targets=async()=>[{plugin,tool,context,inspection:await plugin.inspect(context),configured:true}];
    f.backend.prepare=()=>{const next={...tool,accountProfile:'candidate-'+randomUUID()};return {projectRoot:f.root,tool:next,env:instanceEnvironment(plugin,next,undefined,env)};};
    f.backend.commit=async(_target,checked)=>{assert.notEqual(checked.env.CODEX_HOME,context.env.CODEX_HOME);tool=checked.tool;context=checked;};
    f.setVerifier(verifyHarness);
    const start=await f.call('/ai-tools/codex/sign-ins','POST',{method:'account'});assert.equal(start.status,201);
    const path='/ai-tools/codex/sign-ins/'+start.body.id;
    const waiting=await waitFor(async()=>{const result=await f.call(path);if(result.status!==200||result.body.status==='completed')throw Error(JSON.stringify({result,tool:await f.call('/ai-tools/codex')}));return result.body.prompt?.method==='device-code'&&result.body;},{timeoutMs:5000});
    assert.equal(waiting.prompt.canGoBack,false);assert.equal(waiting.prompt.userCode,'FAKE-C0DE');
    assert.equal(waiting.prompt.url,'https://auth.openai.com/codex/device');
    const done=await waitFor(async()=>{const result=await f.call(path);return result.body.status==='completed'&&result.body;},{timeoutMs:15_000});
    assert.equal(done.tool.status,'signed-in');
    assert.equal(context.env.CODEX_HOME,accountHome(plugin,tool.accountProfile,env));
});

test('AT-07/08: Claude OSC-8 return-code login retries a refusal with a new prompt and commits only its verified profile',{skip:process.platform==='win32'},async t=>{
    const f=await fixture(t);const plugin=harnessPlugin('claude-code');
    const env={...process.env,PATH:f.root+delimiter+process.env.PATH,PTBK_HOME:f.root};
    await writeFile(join(f.root,'claude'),`#!/bin/sh
case "$*" in
 --version) echo 2.1.330 ;;
 'auth login --help') echo 'claude auth login --claudeai' ;;
 'auth login --claudeai')
  mkdir -p "$CLAUDE_CONFIG_DIR"
  stty -echo
  printf '\\033]8;;https://claude.ai/oauth/authorize?state=fixture\\007Sign in\\033]8;;\\007\\n'
  read -r code && test "$code" = fixture-return && touch "$CLAUDE_CONFIG_DIR/ready" ;;
 'auth status --json')
  if test -f "$CLAUDE_CONFIG_DIR/ready"; then echo '{"loggedIn":true,"authMethod":"oauth"}'; else echo '{"loggedIn":false}'; fi ;;
 -p*) test -f "$CLAUDE_CONFIG_DIR/ready" && echo '{"type":"result","subtype":"success","result":"PONG"}' ;;
esac
`);await chmod(join(f.root,'claude'),0o755);
    let tool=nativeSetupTool(plugin,'existing');let context={projectRoot:f.root,tool,env:instanceEnvironment(plugin,tool,undefined,env)};
    f.backend.targets=async()=>[{plugin,tool,context,inspection:await plugin.inspect(context),configured:true}];
    f.backend.prepare=()=>{const next={...tool,accountProfile:'project-'+randomUUID()};return {projectRoot:f.root,tool:next,env:instanceEnvironment(plugin,next,undefined,env)};};
    f.backend.commit=async(_target,checked)=>{f.commits.push({profile:checked.tool.accountProfile});tool=checked.tool;context=checked;};f.setVerifier(verifyHarness);
    const start=await f.call('/ai-tools/claude-code/sign-ins','POST',{method:'account'});const path='/ai-tools/claude-code/sign-ins/'+start.body.id;
    const waiting=await waitFor(async()=>{const r=await f.call(path);return r.body.prompt?.method==='return-code'&&r.body;},{timeoutMs:10_000});
    const send=(prompt,value)=>f.call(path+'/answer','POST',{promptId:prompt.id,action:'answer',answer:{kind:'harness-login',returnCode:value}});
    await send(waiting.prompt,'rejected-private-code');
    const failed=await waitFor(async()=>{const r=await f.call(path);return r.body.prompt?.status==='failed'&&r.body;},{timeoutMs:10_000});
    assert.notEqual(failed.prompt.id,waiting.prompt.id);assert.ok(!JSON.stringify(failed).includes('rejected-private-code'));assert.equal(f.commits.length,0);
    await send(failed.prompt,null);
    const retry=await waitFor(async()=>{const r=await f.call(path);return r.body.prompt?.status==='waiting'&&r.body;},{timeoutMs:10_000});
    await send(retry.prompt,'fixture-return');
    const done=await waitFor(async()=>{const r=await f.call(path);return r.body.status==='completed'&&r.body;},{timeoutMs:10_000});
    assert.equal(done.tool.status,'signed-in');assert.equal(f.commits.length,1);
    const audit=JSON.parse(await readFile(join(f.root,'access.json'),'utf8')).audit;
    assert.ok(audit.some(entry=>entry.action==='ai-tool.sign-in.complete'&&entry.details?.method==='account'));
});
