import assert from 'node:assert/strict';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { Agenda } from '../dist/engine/agenda.js';
import { printJson } from '../dist/cli/common.js';
import { temporaryDirectory } from './helpers.mjs';

test('a daemon resolves its worker from the build that launched it, including a conformance build beside dist',async t=>{
    const root=await temporaryDirectory(t,'selected engine build');
    await writeFile(join(root,'package.json'),JSON.stringify({name:'ptbk',version:'0.119.0-140',type:'module'}));
    const directory=join(root,'dist-conformance','common');await mkdir(directory,{recursive:true});
    const module=join(directory,'version.js');await copyFile(new URL('../dist/common/version.js',import.meta.url),module);
    const running=await import(pathToFileURL(module));
    assert.equal(running.engineModule('service/worker.js'),join(root,'dist-conformance','service','worker.js'));
    assert.equal(running.ENGINE_ROOT,root);
});

test('machine output is one compact JSON record, including escaped newlines in string values',()=>{
    const original=process.stdout.write;let printed='';
    process.stdout.write=value=>{printed+=value;return true;};
    try{printJson({a:1,b:'line\nbreak'});}finally{process.stdout.write=original;}
    assert.equal(printed,'{"a":1,"b":"line\\nbreak"}\n');
});

test('a failed chat waits without a timer for credentials; one verified sign-in resumes it once',async()=>{
    let replies=0;
    const fake={chatRechecks:new Map(),stopRequested:false,touch:()=>{},log:()=>{},saveChatRechecks:async()=>{},queueChatReply:()=>{replies++;}};
    fake.armChatRecheck=(...args)=>Agenda.prototype.armChatRecheck.call(fake,...args);
    fake.startChatRecheck=(...args)=>Agenda.prototype.startChatRecheck.call(fake,...args);
    const schedule={cause:'OAuth session expired',rounds:1,nextAt:new Date().toISOString(),scheduledAt:new Date().toISOString(),conditions:'unchanged',aiToolId:'claude-code'};
    fake.armChatRecheck('Blocked chat',schedule);
    assert.equal([...fake.chatRechecks.values()][0].timer,undefined);
    fake.startChatRecheck([...fake.chatRechecks.keys()][0],'manual retry');assert.equal(replies,0);
    Agenda.prototype.resumeAiToolChats.call(fake,'claude-code');
    await new Promise(resolve=>setTimeout(resolve,15));assert.equal(replies,1);
    Agenda.prototype.resumeAiToolChats.call(fake,'claude-code');
    await new Promise(resolve=>setTimeout(resolve,15));assert.equal(replies,1);
});


test('an unrelated signed-out tool never turns a network or model-routing failure into a credential wait',()=>{
    const fake={pool:{all:()=>[{tool:{name:'work-claude',variant:'CLAUDE_CODE',isEnabled:true},inspection:{problem:'signed-out'}}]}};
    const identify=cause=>Agenda.prototype.aiToolNeedingSignIn.call(fake,cause);
    assert.equal(identify('Codex provider timed out'),undefined);
    assert.equal(identify('Router has no concrete MODEL'),undefined);
    assert.equal(identify('OAuth session expired · ptbk tool enable work-claude'),'claude-code');
    assert.equal(identify('Claude Code has no usable sign-in'),'claude-code');
    assert.equal(identify('No usable harness supports read-only turns.'),'claude-code');
});
