#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import createClient from 'openapi-fetch';
import { join } from 'path';
import { keepUnused } from '../utils/organization/keepUnused';
import type { paths } from './brjapp-api-schema';
import { BrjappConnector } from './BrjappConnector';

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

    const brjappConnector = new BrjappConnector(BRJAPP_API_KEY, {
        userGroups: ['cli'],
        initialCredits: 500000,
    });

    // const email = `john.snow.${Math.round(Math.random() * 1000)}@ptbk.io`;
    const email = 'john.snow.existing1@ptbk.io';
    //const email = 'john.snow.non-existing@ptbk.io';

    const password = 'xxxasfg12awrý';
    const customerRealIp = '84.246.166.22';

    keepUnused(client);
    keepUnused(brjappConnector);
    keepUnused(email);
    keepUnused(password);
    keepUnused(customerRealIp);
    // ------
    /*/




    const { isSuccess, message, token, isEmailVerificationRequired } = await brjappConnector.loginOrRegister({
        email,
        password,
        customerRealIp,
    });

    if (isSuccess) {
        console.info(colors.green(message));
    } else {
        console.info(colors.red(message));
    }

    if (isEmailVerificationRequired) {
        console.info(colors.cyan(`Visit your email ${email} and click on the link to verify your email`));
    }

    console.log({ isSuccess, message, token, isEmailVerificationRequired });

/**/
    // ------
    /*/
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

    // ------

    /*/
    // Adding (initial/payed) credits:

    const createOrderFetchResponse = await client.POST(`/api/v1/shop/order/create`, {
        params: {
            query: {
                apiKey: BRJAPP_API_KEY,
            },
        },
        body: {
            customer: {
                email,
                name: 'Jan Barášek',
                firstName: 'Jan',
                lastName: 'Barášek',
                phone: '+420 777123456',
                companyName: 'BRJ',
                companyRegistrationNumber: '05103118',
                taxIdentificationNumber: 'CZ9609040727',
                streetAddress: 'R. Novotného 1505',
                city: 'Kladno',
                cityPart: 'Kročehlavy',
                stateRegion: 'Středočeský kraj',
                postalCode: '272 01',
                country: 'Česká republika',
                newsletter: false,
                primaryLocale: 'cs',
                groups: [''],
            },
            // copyCustomers: ['janbarasek@gmail.com'],
            // cartId: 'b411056d304d9y6mHe2SoMFBL2Apxfnb',
            items: [
                {
                    label: 'Cheese burger',
                    price: 1,
                    vat: 1,
                    count: 1,
                    sale: 10,
                    unit: 'ks',
                    productCode: 'burger',
                    variantCode: 'cheese-burger',
                    eventCode: '2WRp6X5rSqQa321EjHB2mxZz74u74H84',
                    creditAmount: 100,
                    specialActions: 'lifetimeSubscriptions;addCredit:15',
                },
            ],
            orderGroupId: 'branch-vinohrady',
            locale: 'cs',
            currency: 'CZK',
            sale: 1,
            paymentMethod: 'credits',
            deliveryPrice: 1,
            paymentPrice: 1,
            expirationDate: '2024-05-01T10:00:00.000Z',
            dueDate: '2024-05-01T10:00:00.000Z',
            internalNotice: '',
            publicNotice: '',
            // tags: {'^(.*)$': null,},
            // returnUrl: 'https://gymroom.cz/rezervace/dekujeme',
            // notificationUrl: '',
            // formData: {
            //     code: '',
            //     data: {
            //         '^(.*)$': null,
            //     },
            // },
            forceIgnoreNegativeCreditBalance: false,
        },
    });

    console.log('createOrderFetchResponse', createOrderFetchResponse);

    /**/

    //========================================/
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
