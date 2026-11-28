#!/usr/bin/env node
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';

/**
 * Narrow launcher for the platform's access, UI-loader and pending onboarding suites. Runs the real connection,
 * TLS origin, gateway, API and durable state, without the project scheduler or its OS IPC listener. Useful on hosts that
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
    const runtime = new URL(process.argv.includes('--production') ? '../../dist/' : '../../dist-conformance/', import.meta.url);
    const { AppConnection } = await import(new URL('app/connection.js', runtime));
    const { EngineApi } = await import(new URL('app/api/engine-api.js', runtime));
    const { UiLoader } = await import(new URL('app/web/ui-loader.js', runtime));
    const { onboardingDocuments } = await import(new URL('app/web/onboarding-page.js', runtime));
    const loader = await UiLoader.create({directory,env:process.env,log:message=>process.stderr.write(message+'\n')});
    let onboarding;
    if (process.argv.includes('--onboarding')) {
        const { loadEngineIdentity } = await import(new URL('app/identity.js', runtime));
        const { projectAt } = await import(new URL('project/workspace.js', runtime));
        const { readOnboarding, saveOnboarding } = await import(new URL('onboarding/draft.js', runtime));
        const { OnboardingSession } = await import(new URL('onboarding/session.js', runtime));
        const { OnboardingUploads } = await import(new URL('onboarding/uploads.js', runtime));
        const identity = await loadEngineIdentity(directory,{create:true});
        const project = projectAt(directory);
        const draft = await readOnboarding(project) ?? {version:1,engineId:identity.engineId,step:'intent',promptId:randomUUID(),deferred:false};
        await saveOnboarding(project,draft);
        onboarding = new OnboardingSession(project,draft,new OnboardingUploads(join(directory,'uploads')),process.env,async()=>{throw new Error('This target does not publish a project.');});
    }
    const api = new EngineApi({onboarding,updates:loader,projectRoot:directory,stateDirectory:join(directory,'api'),engineId:()=>connection.view().engineId,hostname:()=>connection.view().hostname,dashboardUrl:()=>connection.view().dashboardUrl,security:()=>connection.securityFacts(),ui:()=>loader.status('0'.repeat(64))});
    const connection = new AppConnection({directory,env:process.env,onChange:()=>{},figures:()=>({agents:0,members:0,update:'none'}),
        log:(message)=>process.stderr.write(`${message}\n`),web:{certificateSource:'dev-ca',api:(request,actor,access)=>api.handle(request,actor,access),documents:async(request,actor)=>onboarding ? onboardingDocuments(request,actor,onboarding,loader,connection.view().engineId) : (await loader.serve(request)) ?? new Response('Access conformance engine')}});
    await connection.start();
    await loader.start();
    let stopping=false;
    const stop=()=>{stopping=true;};process.once('SIGTERM',stop);process.once('SIGINT',stop);
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
    } finally {await onboarding?.stop(); await loader.stop(); await connection.stop();}
}
