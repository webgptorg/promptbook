#!/usr/bin/env node
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';

/**
 * Narrow launcher for the platform's member-access suite. Runs the real AppConnection, TLS origin, gateway,
 * EngineApi and durable access state, without the project scheduler or its OS IPC listener. Useful on hosts that
 * support TCP but cannot create Unix sockets. The ordinary engine.mjs launcher remains the full-engine target.
 * Requires dist-conformance; no control transport or session shortcut is added to the production engine.
 * A private temporary file mailbox carries the conformance session request, never a public HTTP endpoint.
 */
const directory = process.env.PTBK_DATA_DIR;
if (!directory) throw new Error('PTBK_DATA_DIR is required.');
const mailbox = join(directory, 'conformance-access-control');
await mkdir(mailbox, {recursive:true, mode:0o700});

/** Publishes a private complete mailbox message atomically. */
async function publish(path, value) {
    const temporary = `${path}.${randomUUID()}.tmp`;
    await writeFile(temporary,JSON.stringify(value),{mode:0o600});
    await rename(temporary,path);
}

if (process.argv[2] === 'session') {
    const id = randomUUID();
    const request = join(mailbox,`${id}.request`), response = join(mailbox,`${id}.response`);
    const args = process.argv.slice(3);
    const subject = args[args.indexOf('--subject')+1];
    const permissions = args.includes('--permissions') ? args[args.indexOf('--permissions')+1].split(',').filter(Boolean) : [];
    await publish(request,subject==='owner'?{kind:'owner'}:{kind:'member',permissions});
    try {
        const deadline = Date.now()+30_000;
        while(Date.now()<deadline) {
            const result = await readFile(response,'utf8').catch(()=>undefined);
            if(result!==undefined) { process.stdout.write(`${result}\n`); process.exitCode=0; break; }
            await pause(50);
        }
        if(process.exitCode!==0) throw new Error('The access test session timed out.');
    } finally { await rm(request,{force:true}); await rm(response,{force:true}); }
} else {
    const { AppConnection } = await import('../../dist-conformance/app/connection.js');
    const { EngineApi } = await import('../../dist-conformance/app/api/engine-api.js');
    const api = new EngineApi({projectRoot:directory,stateDirectory:join(directory,'api'),engineId:()=>connection.view().engineId,hostname:()=>connection.view().hostname,dashboardUrl:()=>connection.view().dashboardUrl,security:()=>connection.securityFacts(),ui:()=>({})});
    const connection = new AppConnection({directory,env:process.env,onChange:()=>{},figures:()=>({agents:0,members:0,update:'none'}),
        log:(message)=>process.stderr.write(`${message}\n`),web:{certificateSource:'dev-ca',api:(request,actor,access)=>api.handle(request,actor,access),documents:async()=>new Response('Access conformance engine')}});
    await connection.start();
    let stopping=false;
    const stop=()=>{stopping=true};process.once('SIGTERM',stop);process.once('SIGINT',stop);
    try {
        while(!stopping) {
            for(const file of await readdir(mailbox)) {
                if(!/^[a-f0-9-]+\.request$/.test(file))continue;
                const path=join(mailbox,file);
                const subject=JSON.parse(await readFile(path,'utf8'));
                const result=await connection.conformanceSession(subject);
                if(!result)continue;
                await publish(join(mailbox,file.replace(/\.request$/,'.response')),result);
                await rm(path,{force:true});
            }
            await pause(50);
        }
    } finally {await connection.stop();}
}
