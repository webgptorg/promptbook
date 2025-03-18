import createClient, { Client } from 'openapi-fetch';
import { keepUnused } from '../utils/organization/keepUnused';
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
     * TODO: [🧠] Probbably better name for this method
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

        console.log(`Logging in as ${email}`);

        if (password === '') {
            // TODO: Do more password validation
            return {
                isSuccess: false,
                message: `Password is required`,
                token: null,
                isEmailVerificationRequired: false,
            };
        }

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
        console.log(`User ${email} not logged in, try find why:`, loginFetchResponse.data?.errorCode);

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
        console.log(`User ${email} not registered, try to register`);

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

        console.log('registerFetchResponse', registerFetchResponse);

        if (!(registerFetchResponse.data?.success || false)) {
            return {
                isSuccess: false,
                message: (registerFetchResponse.data?.message || 'Unknown error during registration')
                    .split('Customer')
                    .join('User'),
                token: null,
                isEmailVerificationRequired: false,
            };
        }

        // Note: User is newly registered, add him initial credits

        await this.addInitailCredits({ email, customerRealIp });
        // <- TODO: [🧠] Maybe not await, do it indipendently of return below

        return {
            isSuccess: true,
            message: `Registered as ${email}`,
            token: null,
            isEmailVerificationRequired: true,
        };
    }

    private async addInitailCredits(options: {
        email: string;
        customerRealIp: string;
    }): Promise<{ isSuccess: boolean; message: string }> {
        const { email, customerRealIp } = options;
        const { client, apiKey } = this;

        console.log(`Addding initial credits ${this.options.initialCredits} to ${email}`);

        // TODO: Verify if user already has initial credits

        // Note: [🦮] Look for more options of `/api/v1/shop/order/create`
        const createOrderFetchResponse = await client.POST(`/api/v1/shop/order/create`, {
            params: {
                query: {
                    apiKey,
                },
            },
            body: {
                customerRealIp,
                customer: {
                    email,
                },
                items: [
                    {
                        label: 'Initial words',
                        price: 0, // TODO
                        vat: 21, // <- TODO: Put in the configuration
                        count: 1,
                        creditAmount: this.options.initialCredits,
                    },
                ],
                orderGroupId: 'initial-credits',
                forceIgnoreNegativeCreditBalance: false,
            },
        });

        if (createOrderFetchResponse.data?.orderNumber) {
            return {
                isSuccess: true,
                message: 'Initial credits added',
            };
        } else {
            return {
                isSuccess: false,
                message: 'Failed to add initial credits',
            };
        }
    }

    public async buyCredits(options: {
        email: string;
        customerRealIp: string;
    }): Promise<{ isSuccess: boolean; message: string; payLink: string | null }> {
        const { email, customerRealIp } = options;
        const { client, apiKey } = this;

        console.log(`Buying credits for ${email}`);

        // TODO: Verify if user already has initial credits

        // Note: [🦮] Look for more options of `/api/v1/shop/order/create`
        const createOrderFetchResponse = await client.POST(`/api/v1/shop/order/create`, {
            params: {
                query: {
                    apiKey,
                },
            },
            body: {
                customerRealIp,
                customer: {
                    email,
                },
                items: [
                    {
                        label: 'Buy words',
                        // TODO: !!!! Pricing plans
                        price: 25,
                        vat: 21, // <- TODO: Put in the configuration
                        count: 1,
                        creditAmount: this.options.initialCredits,
                    },
                ],
                currency: 'USD', // <- TODO: !!!! Pricing plans
                orderGroupId: 'credit-buy',
                forceIgnoreNegativeCreditBalance: false,
            },
        });

        if (createOrderFetchResponse.data?.orderNumber) {
            return {
                isSuccess: true,
                message: `Order created, ${createOrderFetchResponse.data.links.payLink}`,
                payLink: createOrderFetchResponse.data.links.payLink,
            };
        } else {
            return {
                isSuccess: false,
                message: 'Failed to create order',
                payLink: null,
            };
        }
    }

    /**
     *
     * @returns true if credits were spent, false if not enough credits or another error
     */
    public async spendCredits(options: {
        email: string;
        token: string;
        creditsAmount: number;
        description: string;
        customerRealIp: string;
    }): Promise<{ isSuccess: boolean; message: string }> {
        const { email, token, creditsAmount, description, customerRealIp } = options;
        const { apiKey } = this;

        keepUnused(email);
        // <- TODO: Maybe do not require email to call method `spendCredits`

        // console.log(`Spending ${creditsAmount} credits of ${email}`);

        const spendFetchResponse = await fetch(`https://brj.app/api/v1/customer/credit-spend?apiKey=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                identityId: token,
                amount: creditsAmount,
                description,
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

        const isSuccess = spendFetchResponse.success;

        return {
            isSuccess,
            message: isSuccess
                ? `Spended ${creditsAmount} credits for "${description}"`
                : `Failed to spend ${creditsAmount} credits`,
        };
    }
}
