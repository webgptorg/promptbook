import { ConfigChecker } from 'configchecker';

const config = ConfigChecker.from({
    ...process.env,

    // Note: To expose env variables to the browser, using this seemingly strange syntax:
    //       @see https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables#exposing-environment-variables-to-the-browser
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,

    // Note: [🌇] Defa
    NEXT_PUBLIC_VERCEL_BRANCH_URL: process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF,
});

// Note: [♐️] Expose Vercel environment variables to indentify the deployment
export const NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF = config.get('NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF').value;
export const NEXT_PUBLIC_VERCEL_BRANCH_URL = config.get('NEXT_PUBLIC_VERCEL_BRANCH_URL').value;

/**
 * List of servers where agents can be hosted
 */
export const SERVERS = config.get('SERVERS').list().value;
