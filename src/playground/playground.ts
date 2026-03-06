#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
import https from 'https';
import localtunnel from 'localtunnel';
import { chromium } from 'playwright';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { join } from 'path';
import { forEver } from 'waitasecond';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

playground()
    .catch((error) => {
        console.error(colors.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function playground() {
    console.info(`🧸  Playground`);

    // Do here stuff you want to test
    //========================================>

    const browserHost = process.env.PLAYGROUND_BROWSER_HOST || '0.0.0.0';
    const browserPort = Number(process.env.PLAYGROUND_BROWSER_PORT || 3000);
    const tunnelSubdomain = process.env.PLAYGROUND_BROWSER_TUNNEL_SUBDOMAIN;

    const browserServer = await chromium.launchServer({
        host: browserHost,
        port: browserPort,
        headless: false,
    });

    const wsEndpoint = browserServer.wsEndpoint();

    // Detect public IPv4 address and report direct remote browser URL
    const publicIp = await getPublicIpV4();
    const directUrl = replaceWsEndpointOrigin(wsEndpoint, `http://${publicIp}:${browserPort}`);
    console.log('(direct) REMOTE_BROWSER_URL=', directUrl);

    // Also set up localtunnel and report tunneled URL
    const tunnel = await localtunnel({
        port: browserPort,
        subdomain: tunnelSubdomain,
    });

    console.log('(tunnel) REMOTE_BROWSER_URL=', replaceWsEndpointOrigin(wsEndpoint, tunnel.url));

    await forEver();

    //========================================/

    console.info(`[ Done 🧸  Playground ]`);
}

/**
 * Rewrites the origin in a Playwright ws endpoint while preserving path/token.
 */
function replaceWsEndpointOrigin(wsEndpoint: string, publicUrl: string): string {
    const wsUrl = new URL(wsEndpoint);
    const tunnelUrl = new URL(publicUrl);

    wsUrl.protocol = tunnelUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl.host = tunnelUrl.host;

    return wsUrl.toString();
}

/**
 * Fetches the public IPv4 address of the current device via api.ipify.org.
 */
function getPublicIpV4(): Promise<string> {
    return new Promise((resolve, reject) => {
        https
            .get('https://api.ipify.org', (res) => {
                let data = '';
                res.on('data', (chunk: Buffer) => (data += chunk.toString()));
                res.on('end', () => resolve(data.trim()));
            })
            .on('error', reject);
    });
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
