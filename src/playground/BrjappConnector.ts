import createClient, { Client } from 'openapi-fetch';
import type { paths } from './brjapp-api-schema';

type BrjappOptions = {
    /**
     * Add user to these groups
     */
    readonly userGroups: Array<string>;

    /**
     * Add this amount of credits to new users
     */
    readonly initialCredits: number;
};

/**
 * Note: Credit = 1 Word to generate or read
 * Note: What we call here "user" is on BRJ.APP "customer"
 */
export class BrjappConnector {
    private readonly client: Client<paths>;

    constructor(private readonly apiKey: string, private options: BrjappOptions) {
        this.client = createClient<paths>({ baseUrl: 'https://brj.app/' });
    }

    /**
     * Login or register user
     *
     * @param options
     * @returns user token or null if user needs to verify email
     */
    public async loginOrRegister(options: {
        email: string;
        password: string;
        customerRealIp: string;
    }): Promise<{ isSuccess: boolean; message: string; token: string | null; isEmailVerificationRequired: boolean }> {
        const { email, password, customerRealIp } = options;
        const { client, apiKey } = this;

        const loginFetchResponse = await client.POST(`/api/v1/customer/login`, {
            params: {
                query: {
                    apiKey,
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

        if (loginFetchResponse.data?.success === true) {
            return {
                isSuccess: true,
                message: `Logged in as ${email}`,
                token: loginFetchResponse.data.identityId,
                isEmailVerificationRequired: false,
            };
        }

        // Note: User is not logged in, try find why

        // Error codes /api/v1/customer/login
        // E001	Customer login failed.
        // E002	Customer e-mail does not exist.
        // E003	Customer have not a registered account.
        // E004	Wrong e-mail or password.
        // E005	Customer account has been banned.
        // E006	Too many login attempts.
        // E007	Customer mail has not been authorized.

        // Customer login failed.
        if (
            loginFetchResponse.data === undefined ||
            loginFetchResponse.data.errorCode === 'E001' ||
            loginFetchResponse.data.errorCode === 'E004' ||
            loginFetchResponse.data.errorCode === 'E005' ||
            loginFetchResponse.data.errorCode === 'E006'
        ) {
            return {
                isSuccess: false,
                message: (loginFetchResponse.data?.message || 'Unknown error during login')
                    .split('Customer')
                    .join('User'),
                token: null,
                isEmailVerificationRequired: false,
            };
        } else if (loginFetchResponse.data.errorCode === 'E007') {
            return {
                isSuccess: false,
                message: `You need to verify your email ${email}`,
                token: null,
                isEmailVerificationRequired: true,
            };
        }

        // Note: User is not registered, try to register

        const registerFetchResponse = await client.POST(`/api/v1/customer/register-account`, {
            params: {
                query: {
                    apiKey,
                },
                headers: {
                    // 'Content-Type': 'application/json',
                },
            },
            body: {
                email,
                password,
                // returnUrl: '',
                // name: '',
                // firstName: '',
                // lastName: '',
                // phone: '',
                // companyName: '',
                // companyRegistrationNumber: '',
                // taxIdentificationNumber: '',
                // streetAddress: '',
                // city: '',
                // cityPart: '',
                // stateRegion: '',
                // postalCode: '',
                // country: '',
                newsletter: true,
                primaryLocale: 'en',
                groups: this.options.userGroups,
                customerRealIp,
                // referralId: '',
            },
        });

        if (!(registerFetchResponse.data?.success || false)) {
            return {
                isSuccess: false,
                message: (loginFetchResponse.data?.message || 'Unknown error during registration')
                    .split('Customer')
                    .join('User'),
                token: null,
                isEmailVerificationRequired: false,
            };
        }

        // Note: User is newly registered, add him initial credits

        await this.addInitailCredits(email);
        // <- TODO: Maybe not await, do it indipendently of return below

        return {
            isSuccess: true,
            message: `Registered as ${email}`,
            token: null,
            isEmailVerificationRequired: true,
        };
    }

    private async addInitailCredits(email: string): Promise<void> {
        console.log(`Addding initial credits ${this.options.initialCredits} to ${email}`);

        /*
        TODO: Implement
        const xxxFetchResponse = await client.POST(`/api/v1/shop/order/create`, {
            params: {
                query: {
                    apiKey,
                },
                headers: {
                    // 'Content-Type': 'application/json',
                },
            },
            body: {
                email,
                password,
                // returnUrl: '',
                // name: '',
                // firstName: '',
                // lastName: '',
                // phone: '',
                // companyName: '',
                // companyRegistrationNumber: '',
                // taxIdentificationNumber: '',
                // streetAddress: '',
                // city: '',
                // cityPart: '',
                // stateRegion: '',
                // postalCode: '',
                // country: '',
                newsletter: true,
                primaryLocale: 'en',
                groups: this.userGroups,
                customerRealIp,
                // referralId: '',
            },
        });
        */
    }

    /**
     *
     * @returns true if credits were spent, false if not enough credits or another error
     */
    public async spendCredits(options: {
        email: string;
        token: string;
        creditsAmount: number;
        customerRealIp: string;
    }): Promise<boolean> {
        const { email, creditsAmount, token, customerRealIp } = options;
        const { apiKey } = this;

        console.log(`Spending ${creditsAmount} credits of ${email}`);

        const spendFetchResponse = await fetch(`https://brj.app/api/v1/customer/credit-spend?apiKey=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                identityId: token,
                amount: creditsAmount,
                description: 'Use Promptbook from CLI',
                customerRealIp,
            }),
        }).then((response) => response.json());

        /*
        TODO: [🦇] @janbarasek `/api/v1/customer/credit-spend` has wrong Open API definition
        > const spendFetchResponse = await (client as TODO_any).POST(
        >     `/api/v1/customer/credit-spend`,
        >     {
        >         params: {
        >             query: {
        >                 apiKey,
        >             },
        >         },
        >         body: {
        >             identityId: token,
        >             amound: 100,
        >             description: 'Use Promptbook from CLI',
        >             customerRealIp: '84.246.166.22',
        >         },
        >     },
        > );
        */

        return spendFetchResponse.success;
    }
}
