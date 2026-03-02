#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
import { chromium } from 'playwright';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { networkInterfaces } from 'os';
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
    const publicHost = process.env.PLAYGROUND_BROWSER_PUBLIC_HOST;

    const browserServer = await chromium.launchServer({
        host: browserHost,
        port: browserPort,
        headless: false,
    });

    const wsEndpoint = browserServer.wsEndpoint();

    console.log('REMOTE_BROWSER_URL(bind) =', wsEndpoint);

    if (publicHost) {
        console.log('REMOTE_BROWSER_URL(public) =', replaceWsEndpointHost(wsEndpoint, publicHost));
    } else {
        for (const localIpAddress of getLocalIpv4Addresses()) {
            console.log(`REMOTE_BROWSER_URL(${localIpAddress}) =`, replaceWsEndpointHost(wsEndpoint, localIpAddress));
        }
    }

    await forEver();

    //========================================/

    console.info(`[ Done 🧸  Playground ]`);
}

/**
 * Returns all non-internal IPv4 addresses of this machine.
 */
function getLocalIpv4Addresses(): Array<string> {
    const allNetworkInterfaces = networkInterfaces();
    const localIpv4Addresses = new Set<string>();

    for (const networkInterface of Object.values(allNetworkInterfaces)) {
        if (!networkInterface) {
            continue;
        }

        for (const networkAddress of networkInterface) {
            if (networkAddress.family === 'IPv4' && !networkAddress.internal) {
                localIpv4Addresses.add(networkAddress.address);
            }
        }
    }

    return [...localIpv4Addresses];
}

/**
 * Rewrites the host in a Playwright ws endpoint while preserving path/token.
 */
function replaceWsEndpointHost(wsEndpoint: string, host: string): string {
    const url = new URL(wsEndpoint);
    url.hostname = host;
    return url.toString();
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
