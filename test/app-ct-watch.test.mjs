import assert from 'node:assert/strict';
import { X509Certificate } from 'node:crypto';
import { test } from 'node:test';
import { CertificateTransparencyWatch, certificatePublicKeyHash, publicCtSource } from '../dist/app/web/ct-watch.js';
import { createLocalCa, issueLocalLeaf } from '../dist/app/web/x509.js';

/** Genuine independent certificates for one engine origin, including another key and another hostname. */
async function certificates() {
    const {ca} = await createLocalCa('CT watcher test');
    const own = await issueLocalLeaf(ca,'engine.example');
    const other = await issueLocalLeaf(ca,'engine.example');
    const unrelated = await issueLocalLeaf(ca,'another.example');
    return {own,other,unrelated,key:certificatePublicKeyHash(new X509Certificate(own.certificatePem))};
}

test('CT: only the actual public key and DNS name establish trust; duplicates never duplicate the alert',async()=>{
    const {own,other,key}=await certificates();const logs=[];
    let found=[Buffer.from(own.certificatePem)];
    const watch=new CertificateTransparencyWatch({hostname:'engine.example',knownKeys:()=>[key],source:async()=>found,changed:()=>{},log:(text,level)=>logs.push({text,level})});
    await watch.check();assert.equal(watch.view().result,'ok');
    found=[Buffer.from(own.certificatePem),Buffer.from(other.certificatePem),Buffer.from(other.certificatePem)];
    await watch.check();const result=watch.view();assert.equal(result.result,'unexpected-certificate');assert.equal(result.unexpectedCertificates.length,1);
    assert.equal(result.unexpectedCertificates[0].sha256,new X509Certificate(other.certificatePem).fingerprint256.replaceAll(':','').toLowerCase());
    assert.ok(logs.some(log=>log.level==='error'));
    watch.stop();
});

test('CT: every known renewal key stays legitimate; malformed or unrelated certificates never yield ok',async()=>{
    const {own,other,unrelated,key}=await certificates();let found=[Buffer.from(other.certificatePem)];
    const keys=[key,certificatePublicKeyHash(new X509Certificate(other.certificatePem))];
    const watch=new CertificateTransparencyWatch({hostname:'engine.example',knownKeys:()=>keys,source:async()=>found,changed:()=>{}});
    await watch.check();assert.equal(watch.view().result,'ok');
    for(const bytes of [Buffer.from(unrelated.certificatePem),Buffer.from('invalid certificate')]){found=[bytes];await watch.check();assert.equal(watch.view().result,'failed');}
    found=[Buffer.from(own.certificatePem)];await watch.check();assert.equal(watch.view().result,'ok');watch.stop();
});

test('CT: no scan before an own key exists, one scan per hour, concurrent scans join and stop discards late results',async t=>{
    const {own,key}=await certificates();let keys=[];let calls=0;let finish;
    const watch=new CertificateTransparencyWatch({hostname:'engine.example',knownKeys:()=>keys,source:async()=>{calls++;await new Promise(resolve=>{finish=resolve;});return [Buffer.from(own.certificatePem)];},changed:()=>{}});
    t.mock.timers.enable({apis:['setInterval']});watch.start();assert.equal(calls,0);
    keys=[key];watch.observe();assert.equal(calls,1);
    const joined=watch.check();assert.equal(calls,1);finish();await joined;assert.equal(watch.view().result,'ok');
    t.mock.timers.tick(3_600_000);assert.equal(calls,2);const pending=watch.check();watch.stop();finish();await pending;
    assert.equal(watch.view().result,'ok');
});


test('CT transport searches the exact identity and covering wildcard; partial index failures cannot report a clean scan',async()=>{
    const {own,other,key}=await certificates();const queries=[];let rejectWildcard=false;
    const source=publicCtSource({},async({url})=>{
        const parsed=new URL(url);queries.push(parsed);const identity=parsed.searchParams.get('q');
        if(identity){
            assert.equal(parsed.searchParams.get('match'),'=');assert.equal(parsed.searchParams.get('exclude'),'expired');
            if(identity==='*.example'&&rejectWildcard)return {status:503,headers:{},body:Buffer.from('unavailable')};
            return {status:200,headers:{},body:Buffer.from(JSON.stringify([{id:identity==='engine.example'?1:2,not_after:'2099-01-01T00:00:00'}]))};
        }
        return {status:200,headers:{},body:Buffer.from(parsed.searchParams.get('d')==='1'?own.certificatePem:other.certificatePem)};
    });
    const watch=new CertificateTransparencyWatch({hostname:'engine.example',knownKeys:()=>[key],source,changed:()=>{}});
    await watch.check();assert.deepEqual(queries.filter(q=>q.searchParams.has('q')).map(q=>q.searchParams.get('q')),['engine.example','*.example']);
    assert.equal(watch.view().result,'unexpected-certificate');
    rejectWildcard=true;await watch.check();assert.equal(watch.view().result,'failed');watch.stop();
});
