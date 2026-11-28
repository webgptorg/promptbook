import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { UiLoader } from '../dist/app/web/ui-loader.js';
import { EngineApi } from '../dist/app/api/engine-api.js';
import { AccessStore, ALL_PERMISSIONS } from '../dist/app/web/access.js';
import { temporaryDirectory } from './helpers.mjs';

const HOUR = 3_600_000;
const NOW = Date.parse('2026-11-28T12:00:00Z');

/** Isolates scheduling from the already-tested signature verifier and release-store transport. */
async function fixture(t, policy = {kind:'auto'}) {
    const directory = await temporaryDirectory(t,'UI update timers');
    const loader = new UiLoader({directory,env:{},policy,releaseUrl:'https://store.example/',trust:{policy:{},provenance:{}}});
    let checks = 0;
    loader.checkOnce = async () => { checks++; loader.record('up-to-date','1.0.0'); };
    t.after(() => loader.stop());
    return {directory,loader,checks:() => checks};
}

test('UP-01/02: actual periodic deadlines advance and a thrown check cannot disable the next interval', async t => {
    const {loader,checks} = await fixture(t);
    t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:NOW});
    await loader.start(); await loader.running;
    assert.equal(checks(),1);
    assert.equal(Date.parse(loader.status('0'.repeat(64)).nextCheckAt),NOW+HOUR);
    t.mock.timers.tick(HOUR); await loader.running;
    assert.equal(checks(),2);
    const check = loader.checkOnce;
    loader.checkOnce = async () => { throw Error('disk failed'); };
    t.mock.timers.tick(HOUR); await loader.running;
    assert.equal(loader.status('0'.repeat(64)).lastUpdateCheck.outcome,'unavailable');
    assert.equal(Date.parse(loader.status('').nextCheckAt),NOW+3*HOUR);
    loader.checkOnce = check;
    t.mock.timers.tick(HOUR); await loader.running;
    assert.equal(checks(),3);
});

test('UP-03/04: an eligibility timer runs after sleep and does not consume the periodic timer', async t => {
    const {loader,checks} = await fixture(t);
    t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:NOW});
    await loader.start(); await loader.running;
    await loader.act('1.1.0',{kind:'delay-not-elapsed',eligibleAt:new Date(NOW+600_000)},null);
    const due = Date.parse(loader.status('').nextCheckAt);
    assert.ok(due >= NOW+600_000 && due <= NOW+605_000);
    t.mock.timers.tick(605_000); await loader.running;
    assert.equal(checks(),2);
    assert.equal(Date.parse(loader.status('').nextCheckAt),NOW+HOUR);
    t.mock.timers.tick(2*HOUR); await loader.running;
    assert.ok(checks()>=3);
    assert.ok(Date.parse(loader.status('').nextCheckAt)>Date.now());
    assert.ok(Date.parse(loader.status('').nextCheckAt)<=Date.now()+HOUR);
});

test('UP-05/07/10/11: check-now respects delay, manual policy and a shared rate limit; joins a running check', async t => {
    const {loader,checks} = await fixture(t);
    t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:NOW});
    let finish;
    loader.checkOnce = async () => {
        await new Promise(resolve => {finish=resolve;});
        loader.record('refused','1.1.0',{reason:'delay-not-elapsed',eligibleAt:new Date(NOW+600_000)});
    };
    const scheduled = loader.check();
    const requested = loader.checkNow();
    assert.equal((await loader.checkNow()).problem.code,'update-check-too-soon');
    finish(); await scheduled;
    const result = await requested;
    assert.equal(result.kind,'ok');
    assert.equal(result.data.reason,'delay-not-elapsed');
    assert.equal(result.data.eligibleAt,new Date(NOW+600_000).toISOString().replace('.000Z','Z'));
    assert.equal(loader.revision,1);
    assert.equal(checks(),0);
    const manual = await fixture(t,{kind:'manual'});
    await manual.loader.start();
    assert.equal(manual.loader.status('').nextCheckAt,null);
    assert.equal((await manual.loader.checkNow()).problem.code,'update-policy-manual');
    assert.equal(manual.checks(),0);
});

test('UP-08/12/13: the API enforces permissions, audits and emits updates to a setup-shell event stream', async t => {
    const {directory,loader} = await fixture(t);
    const access = await AccessStore.open(directory);
    const engine = new EngineApi({projectRoot:directory,stateDirectory:directory,engineId:()=> 'aaaaaaaaaaaaaaaaaaaaaaaaaa',hostname:()=> 'engine.example',dashboardUrl:()=>undefined,security:()=>undefined,ui:()=>loader.status('0'.repeat(64)),updates:loader});
    const actor = {memberId:'owner',sessionId:'session',displayName:'Owner',role:'owner',permissions:ALL_PERMISSIONS,stepUpFresh:true,client:{ip:'127.0.0.1',userAgent:'test'}};
    const call = (path,who=actor) => engine.handle(new Request('https://engine.example/api/v1'+path,{method:'POST'}),who,access);
    assert.equal((await call('/updates/ui/check',{...actor,permissions:[]})).status,403);
    assert.equal(loader.revision,0);
    const abort = new AbortController();
    const stream = engine.eventStream(abort.signal);
    const next = stream.next();
    const response = await call('/updates/ui/check');
    assert.equal(response.status,200);
    assert.equal((await response.json()).outcome,'up-to-date');
    assert.deepEqual((await next).value.event,{type:'updates.changed',uiVersion:null});
    abort.abort(); await stream.return();
    assert.equal((await call('/updates/ui/check')).status,429);
    const saved = JSON.parse(await readFile(join(directory,'access.json'),'utf8'));
    assert.ok(saved.audit.some(entry=>entry.action==='updates.ui-check' && entry.outcome==='denied'));
    assert.ok(saved.audit.some(entry=>entry.action==='updates.ui-check' && entry.outcome==='success'));
});

test('UP-09: a disabled loader records the same unavailable check it answers, without scheduling or fetching',async t=>{
    const directory=await temporaryDirectory(t,'disabled UI updates');
    const loader=await UiLoader.create({directory,env:{}});await loader.start();t.after(()=>loader.stop());
    const result=await loader.checkNow();assert.equal(result.kind,'ok');assert.equal(result.data.outcome,'unavailable');
    assert.deepEqual(loader.status('').lastUpdateCheck,result.data);assert.equal(loader.status('').nextCheckAt,null);assert.equal(loader.revision,1);
});
