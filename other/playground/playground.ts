#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import createClient from 'openapi-fetch';
import { join } from 'path';
import type { paths } from './brjapp-api-schema';

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

    const BRJAPP_API_KEY = 'PRODdh003eNKaec7PoO1AzU244tsL4WO'; // <-

    const client = createClient<paths>({ baseUrl: 'https://brj.app/' });

    // const email = `john.snow.${Math.round(Math.random() * 1000)}@ptbk.io`;
    // const email = 'john.snow.existing@ptbk.io';
    const email = 'john.snow.non-existing@ptbk.io';

    const password = 'xxxasfg12awrý';
    const customerRealIp = '84.246.166.22';

    // ------
    /**/
    const loginFetchResponse = await client.POST(`/api/v1/customer/login`, {
        params: {
            query: {
                apiKey: BRJAPP_API_KEY,
            },
            headers: {
                // 'Content-Type': 'application/json',
            },
        },
        body: {
            email,
            password,
            customerRealIp,
        },
    });

    const isLoginSuccess = loginFetchResponse.data?.success || false;

    console.log('loginFetchResponse', loginFetchResponse);
    console.log('loginFetchResponse.data', loginFetchResponse.data);
    console.log('email', email);
    console.log('isSuccess', isLoginSuccess);

    /**/
    // ------

    /*/
    const registerFetchResponse = await client.POST(`/api/v1/customer/register-account`, {
        params: {
            query: {
                apiKey: BRJAPP_API_KEY,
            },
            headers: {
                // 'Content-Type': 'application/json',
            },
        },
        body: {
            email,
            password,
            returnUrl: '',
            name: '',
            firstName: '',
            lastName: '',
            phone: '',
            companyName: '',
            companyRegistrationNumber: '',
            taxIdentificationNumber: '',
            streetAddress: '',
            city: '',
            cityPart: '',
            stateRegion: '',
            postalCode: '',
            country: '',
            newsletter: true,
            primaryLocale: 'en',
            groups: ['cli'],
            customerRealIp,
            // referralId: '',
        },
    });
    const isRegisterSuccess = registerFetchResponse.data?.success || false;

    console.log('registerFetchResponse', registerFetchResponse);
    console.log('registerFetchResponse.data', registerFetchResponse.data);
    console.log('email', email);
    console.log('isSuccess', isRegisterSuccess);
    /**/

    //========================================/
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
