import { writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';

/** Profile passed through the real pool launcher, including native paths containing spaces. */
const profile = process.argv.find((argument) => argument.startsWith('--user-data-dir=')).slice('--user-data-dir='.length);
/** Startup behavior selected by the regression fixture. */
const mode = process.argv.find((argument) => argument.startsWith('--fixture-mode=')).slice('--fixture-mode='.length);
if (mode === 'exit') {
    process.stderr.write('Fixture browser refused startup: password=fixture-startup-secret\n');
    process.exit(9);
}
/** Number of readiness probes made against this launched process. */
let requests = 0;
/** A real local DevTools discovery endpoint; no browser or account is needed. */
const server = createServer((_request, response) => {
    writeFileSync(join(profile, 'requests.txt'), String(++requests));
    if (mode === 'stderr' && requests < 3) {
        response.writeHead(503);
        response.end('starting');
        return;
    }
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ webSocketDebuggerUrl: mode === 'invalid' ? 'ws://example.test:1234/devtools/browser/wrong' : `ws://127.0.0.1:${server.address().port}/devtools/browser/fixture` }));
});
server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    if (mode === 'stderr') process.stderr.write(`DevTools listening on ws://127.0.0.1:${port}/devtools/browser/fixture\n`);
    else writeFileSync(join(profile, 'DevToolsActivePort'), `${port}\n/devtools/browser/fixture\n`);
});
