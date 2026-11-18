import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseChatBook, appendChatMessage, replaceChatMessage } from '../dist/chats/chat-book.js';
import { appendMessageAudio } from '../dist/chats/message-audio.js';
import { legacyReplySteps, stepOfEvent } from '../dist/chats/reply-steps.js';
import { parseStreamJson, summarizeToolInput } from '../dist/harness/shared.js';
import { plugin as codex } from '../dist/harness/plugins/openai-codex/index.js';
import { ChatStore } from '../dist/chats/store.js';
import { projectAt } from '../dist/project/workspace.js';
import { temporaryDirectory } from './helpers.mjs';

const step = {kind:'tool',tool:'mcp__ptbk__create_task',text:'Write the copy',level:'info'};
const message = {sender:'@Chatter',at:'2026-11-13T12:01:00Z',text:'- mcp__ptbk__create_task Write the copy\n\nStreamed text',phase:'progress',steps:[step]};

test('chat steps: structured progress survives restart and replacement without leaking into text, audio or LINK positions', async t => {
    let source = appendChatMessage('CHAT Example\nCHAT MEMBER @Chatter\nLINK {Header task}\n',message);
    source = appendMessageAudio(source,0,[{path:'chats/_assets/voice.wav',status:'complete'}]);
    source += 'LINK {Write the copy}\n';
    source = appendChatMessage(source,{sender:'@Chatter',at:'2026-11-13T12:02:00Z',text:'Done',phase:'final'});
    source = replaceChatMessage(source,0,{...message,steps:[step,{kind:'note',tool:null,text:'Checked',level:'info'}]});
    const parsed = parseChatBook(source);
    assert.equal(parsed.messages.length,2);
    assert.equal(parsed.messages[0].text,message.text);
    assert.equal(parsed.messages[0].steps.length,2);
    assert.equal(parsed.messages[0].audio[0].path,'chats/_assets/voice.wav');
    assert.deepEqual(parsed.linkPositions,[{reference:'{Header task}',afterMessage:0},{reference:'{Write the copy}',afterMessage:1}]);
    assert.equal((source.match(/^CHAT MESSAGE STEPS /gm)||[]).length,1);
    assert.equal(parsed.diagnostics.length,0,JSON.stringify(parsed.diagnostics));
    const project = projectAt(await temporaryDirectory(t,'saved chat steps'));
    const writer = new ChatStore(project,{timeZone:'UTC'});
    const created = await writer.create({name:'Saved steps',members:['@User','@Chatter'],status:'open'});
    await writer.upsertProgress(created.chat.name,message);
    await writer.upsertProgress(created.chat.name,{...message,text:'Updated',steps:[step]});
    const reader = new ChatStore(project,{timeZone:'UTC'});
    const stored = await reader.find(created.chat.name);
    assert.equal(stored.chat.messages.length,1);
    assert.deepEqual(stored.chat.messages[0].steps,[step]);
});

test('chat steps: legacy bullets stop at streamed text, unfinished notes stay errors and metadata is bounded',()=>{
    const steps=legacyReplySteps('- thinking: Check docs\n- Read README.md\n- mcp__ptbk__create_task Write the copy\n- command exited with 1\n\nAnswer\n- This is answer text\n\n(unfinished reply: Connection lost)');
    assert.deepEqual(steps.map(s=>s.kind),['reasoning','tool','tool','note','note']);
    assert.equal(steps.at(-1).level,'error');
    assert.equal(stepOfEvent({type:'partial',text:'answer'}),undefined);
    const redacted=stepOfEvent({type:'activity',tool:'mcp__SECRET__run',detail:'SECRET\n'+ 'x'.repeat(600),text:'old line'},s=>s.replaceAll('SECRET','[REDACTED]'));
    assert.ok(!JSON.stringify(redacted).includes('SECRET'));
    assert.equal(redacted.text.length,500);
    assert.equal(stepOfEvent({type:'activity',text:'command exited with 2'}).level,'warning');
    assert.equal(stepOfEvent({type:'turn-failed',text:'Failed'}).level,'error');
    const book=parseChatBook(appendChatMessage('CHAT C\n',{...message,steps:Array.from({length:210},(_,n)=>({...step,text:String(n)}))}));
    assert.equal(book.messages[0].steps.length,200);
    assert.equal(book.messages[0].steps[0].text,'10');
});

test('harnesses: tool names and details originate in source events while readable activity stays compatible',()=>{
    assert.equal(summarizeToolInput({title:'New task'}),'New task');
    const state={pendingText:''};
    const events=parseStreamJson(JSON.stringify({type:'assistant',message:{content:[{type:'tool_use',name:'Read',input:{file_path:'README.md'}}]}}),state);
    assert.deepEqual(events[0],{type:'activity',tool:'Read',detail:'README.md',text:'Read README.md'});
    const shell=codex.parseLine(JSON.stringify({type:'item.started',item:{type:'command_execution',command:'ls docs'}}),state)[0];
    assert.equal(shell.tool,'shell'); assert.equal(shell.detail,'ls docs');
    const mcp=codex.parseLine(JSON.stringify({type:'item.started',item:{type:'mcp_tool_call',server:'ptbk',tool:'create_task',arguments:{title:'Write copy'}}}),state)[0];
    assert.equal(mcp.tool,'mcp__ptbk__create_task'); assert.equal(mcp.detail,'Write copy');
});
