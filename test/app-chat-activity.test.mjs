import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { EngineApi, opaqueIdOf } from '../dist/app/api/engine-api.js';
import { ALL_PERMISSIONS } from '../dist/app/web/access.js';
import { Agenda } from '../dist/engine/agenda.js';
import { parseChatBook } from '../dist/chats/chat-book.js';
import { replyInChat } from '../dist/chats/conversation.js';
import { temporaryDirectory } from './helpers.mjs';

const startedAt='2026-11-13T12:00:00Z';
const endedAt='2026-11-13T12:02:00Z';
const step={kind:'tool',tool:'mcp__ptbk__create_task',text:'Write copy',level:'info'};

/** Full HTTP response validation over real Book parsing with controllable engine activity. */
async function fixture(t) {
    const root=await temporaryDirectory(t,'app chat activity');
    const book=parseChatBook(`CHAT Copywriter\nCHAT MEMBER @User\nCHAT MEMBER @Chatter\nLINK {Header task}\n\nCHAT MESSAGE @User ${startedAt}\nWrite copy\n\nCHAT MESSAGE @Chatter ${startedAt} progress\n- Read README.md\n\nLINK {Write copy}\nCHAT MESSAGE @Chatter ${endedAt} final\nDone\n`);
    const summary={name:book.name,title:book.name,path:'chat.book',members:book.members,agent:'@Chatter',status:'open',humanFacing:true,joinable:true,links:book.links,messages:book.messages.length,unread:0};
    const detail={summary,messages:book.messages,linkPositions:book.linkPositions,tasks:[{name:'Header task',ref:'{Header task}',state:'queued',receipts:['private internal receipt']},{name:'Write copy',ref:'{Write copy}',state:'completed',detail:'Finished',agent:'@Chatter',commit:'67b252ca',startedAt,endedAt,reopened:false},{name:'Origin only',ref:'{Origin only}',state:'waiting',createdAt:'2026-11-13T12:01:00Z',startedAt,endedAt,commit:'not-a-commit',reopened:true}]};
    let revision=0; const waiters=new Set();
    const audit=[];
    const agenda={snapshot:()=>({project:{name:'Fixture'},agents:[{name:'Chatter',key:'chatter',role:'ordinary'}]}),chatList:async()=>[summary],chatGet:async()=>detail,
        chatActivitySnapshot:async()=>new Map([[summary.name,{...detail,progressDigest:JSON.stringify(detail.messages.filter(m=>m.phase==='progress'))}]]),
        taskReadSnapshot:async()=>({tasks:[],inventory:[],active:[],results:[]}),chatRetry:()=> 'none',
        get currentRevision(){return revision},waitForChange:async(since,ms)=>{if(since!==revision)return;await new Promise(resolve=>{const done=()=>{clearTimeout(timer);waiters.delete(done);resolve()};const timer=setTimeout(done,ms);waiters.add(done)})}};
    const touch=()=>{revision++;for(const wake of [...waiters])wake()};
    const api=new EngineApi({agenda,projectRoot:root,stateDirectory:join(root,'api'),engineId:()=>undefined,hostname:()=> 'engine.test',dashboardUrl:()=>undefined,security:()=>undefined,ui:()=>({})});
    const actor={memberId:'owner',sessionId:'session',displayName:'Owner',role:'owner',permissions:[...ALL_PERMISSIONS],stepUpFresh:true};
    const access={recordAudit:async(...entry)=>audit.push(entry)};
    const call=async(path,method='GET',permissions=actor.permissions)=>{const response=await api.handle(new Request(`https://engine.test/api/v1${path}`,{method}),{...actor,permissions},access);return {status:response.status,body:await response.json()}};
    return {api,agenda,detail,summary,call,touch,audit,waiters};
}

test('App chat: strict messages, live work, task IDs, rechecks and chronological links agree in detail and lists',async t=>{
    const {detail,call}=await fixture(t);
    detail.live={sender:'@Chatter',startedAt,activity:[],steps:[step]};
    detail.recheck={chat:'Copywriter',cause:'',nextAt:endedAt,rounds:2};
    let got=await call('/chats/Copywriter');
    assert.equal(got.status,200,JSON.stringify(got));
    assert.equal(got.body.working[0].messageId,null);
    assert.deepEqual(got.body.working[0].steps,[step]);
    assert.equal(got.body.tasks[1].taskId,opaqueIdOf('writecopy'));
    assert.equal(got.body.tasks[1].agentId,'chatter');
    assert.equal(got.body.tasks[1].commit,'67b252ca');
    assert.equal(got.body.tasks[2].endedAt,null);
    assert.equal(got.body.tasks[2].commit,null);
    assert.ok(!JSON.stringify(got.body).includes('receipt'));
    assert.equal(got.body.recheck.cause,'The reply failed.');
    assert.deepEqual((await call('/chats')).body.items[0].working,got.body.working);
    assert.deepEqual((await call('/agents/chatter/chats')).body.items[0].tasks,got.body.tasks);
    let entries=(await call('/chats/Copywriter/entries')).body.items.reverse();
    assert.equal(entries.filter(e=>e.type==='message').length,3,'working alone creates no empty bubble');
    assert.deepEqual(entries.filter(e=>e.type==='message').map(e=>e.phase),[null,'progress','final']);
    assert.equal(entries.find(e=>e.phase==='progress').steps[0].tool,'Read');
    const order=entries.filter(e=>e.type!=='joined').map(e=>e.type==='linked'?e.task:e.id);
    assert.deepEqual(order,['Header task','Copywriter#1','Copywriter#2','Write copy','Origin only','Copywriter#3']);
    detail.live={...detail.live,text:'Streaming'};
    got=await call('/chats/Copywriter');
    assert.equal(got.body.working[0].messageId,'Copywriter#4');
    entries=(await call('/chats/Copywriter/entries')).body.items;
    assert.equal(entries[0].status,'streaming'); assert.equal(entries[0].phase,null); assert.deepEqual(entries[0].steps,[]);
});

test('App chat retry: unknown, no pending retry, permissions and duplicate requests use the same attempt',async t=>{
    const {call,agenda,detail,audit}=await fixture(t);
    assert.equal((await call('/chats/missing/retry','POST')).status,404);
    assert.equal((await call('/chats/Copywriter/retry','POST')).body.code,'nothing-to-retry');
    assert.equal((await call('/chats/Copywriter/retry','POST',[])).status,403);
    let attempts=0;let running=false;
    agenda.chatRetry=()=>{if(running)return 'running';running=true;attempts++;delete detail.recheck;return 'started'};
    assert.equal((await call('/chats/Copywriter/retry','POST')).status,200);
    assert.equal((await call('/chats/Copywriter/retry','POST')).status,200);
    assert.equal(attempts,1);
    assert.equal(audit.at(-1)[0],'chat.reply.retry');
});

test('App chat events: last throttled step wakes without another event, while task and progress changes emit immediately',async t=>{
    const {api,detail,touch,waiters}=await fixture(t);
    const stop=new AbortController();const stream=api.eventStream(stop.signal);
    t.after(async()=>{stop.abort();touch();await stream.return();for(const wake of [...waiters])wake()});
    let next=stream.next();await new Promise(r=>setTimeout(r,25));
    detail.live={sender:'@Chatter',startedAt,activity:[],steps:[step]};touch();
    assert.equal((await next).value.event.type,'chat.changed');
    const first=Date.now();
    next=stream.next();detail.live={...detail.live,steps:[{...step,text:'last private step'}]};touch();
    const delayed=await next;
    assert.ok(Date.now()-first>=900,'pure steps are limited to one hint per second');
    assert.deepEqual(delayed.value.event,{type:'chat.changed',chatId:'Copywriter'});
    next=stream.next();detail.tasks[0]={...detail.tasks[0],state:'running',detail:'private work'};touch();
    const at=Date.now();assert.equal((await next).value.event.type,'chat.changed');assert.ok(Date.now()-at<900);
    next=stream.next();detail.messages[1]={...detail.messages[1],text:'changed progress with same message count'};touch();
    assert.deepEqual((await next).value.event,{type:'chat.changed',chatId:'Copywriter'});
});

test('Agenda chat activity: one inventory read uses retained results beyond the recent twenty, reopened tasks and exact active times',async()=>{
    const summaries=[{name:'One',links:['{Old task}','{Running}']},{name:'Two',links:['{Old task}']}];
    let reads=0;
    const snapshot={inventory:[{ref:'{Old task}',title:'Old task',readiness:'done',source:''},{ref:'{Running}',title:'Running',readiness:'active',source:''}],tasks:[{key:'oldtask',reopened:true},{key:'running',reopened:false}],results:[...Array.from({length:25},(_,n)=>({taskRef:`{Other ${n}}`,endedAt})),{taskRef:'{Old task}',startedAt,endedAt,commit:'67b252ca',summary:'Retained'}]};
    const fake={chatSummaries:summaries,taskReadSnapshot:async(history)=>{reads++;assert.equal(history,true);return snapshot},chats:{list:async()=>[]},activeViews:()=>[{taskTitle:'Running',kind:'task',phase:'executing',startedAt,agent:{name:'Chatter'}}],taskControlStore:{receiptsOf:()=>[]},timeZone:'UTC',chatRecheckViews:()=>[],liveReplies:new Map()};
    const activities=await Agenda.prototype.chatActivitySnapshot.call(fake,summaries);
    assert.equal(reads,1);
    assert.equal(activities.get('One').tasks[0].commit,'67b252ca');
    assert.equal(activities.get('Two').tasks[0].reopened,true);
    assert.equal(activities.get('One').tasks[1].startedAt,startedAt);
    assert.equal(activities.get('One').tasks[1].endedAt,undefined);
});

test('chat working state starts before agent resolution and clears even when routing throws',async()=>{
    const book=parseChatBook(`CHAT Name\nCHAT MEMBER @User\nCHAT MEMBER @Chatter\nCHAT MESSAGE @User ${startedAt}\nHello\n`);
    const live=[];
    const context={chats:{find:async()=>({chat:book})},catalog:{},onLive:(name,value)=>live.push({name,value})};
    await assert.rejects(replyInChat(context,'Name'));
    assert.equal(live[0].name,'Name');assert.deepEqual(live[0].value.steps,[]);assert.equal(live[0].value.sender,'@Chatter');assert.equal(live.at(-1).value,undefined);
});
