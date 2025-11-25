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

/**
 * [♐️] Vercel environment: "development" | "preview" | "production"
 */
export const NEXT_PUBLIC_VERCEL_ENV = config.get('NEXT_PUBLIC_VERCEL_ENV').value;

/**
 * [♐️] Target environment – can be system or custom
 */
export const NEXT_PUBLIC_VERCEL_TARGET_ENV = config.get('NEXT_PUBLIC_VERCEL_TARGET_ENV').value;

/**
 * [♐️] Deployment URL (without https://), e.g. "my-app-abc123.vercel.app"
 */
export const NEXT_PUBLIC_VERCEL_URL = config.get('NEXT_PUBLIC_VERCEL_URL').value;

/**
 * [♐️] Branch URL (without https://), only for branch deployments
 */
export const NEXT_PUBLIC_VERCEL_BRANCH_URL = config.get('NEXT_PUBLIC_VERCEL_BRANCH_URL').value;

/**
 * [♐️] Production domain of the project
 */
export const NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL = config.get('NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL').value;

/**
 * [♐️] Git provider (github | gitlab | bitbucket)
 */
export const NEXT_PUBLIC_VERCEL_GIT_PROVIDER = config.get('NEXT_PUBLIC_VERCEL_GIT_PROVIDER').value;

/**
 * [♐️] Repository owner (e.g. "hejny")
 */
export const NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER = config.get('NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER').value;

/**
 * [♐️] Repository slug (e.g. "my-project")
 */
export const NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG = config.get('NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG').value;

/**
 * [♐️] Repository internal ID
 */
export const NEXT_PUBLIC_VERCEL_GIT_REPO_ID = config.get('NEXT_PUBLIC_VERCEL_GIT_REPO_ID').value;

/**
 * [♐️] Git commit SHA (short or long)
 */
export const NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA = config.get('NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA').value;

/**
 * [♐️] Commit message used for this deployment
 */
export const NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE = config.get('NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE').value;

/**
 * [♐️] Branch name (ref), e.g. "main"
 */
export const NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF = config.get('NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF').value;

/**
 * Author name of the commit
 */
export const NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_NAME = config.get('NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_NAME').value;

/**
 * [♐️] Author login/username
 */
export const NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_LOGIN = config.get(
    'NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_LOGIN',
).value;

/**
 * [♐️] Previous deployment commit SHA (if exists)
 */
export const NEXT_PUBLIC_VERCEL_GIT_PREVIOUS_SHA = config.get('NEXT_PUBLIC_VERCEL_GIT_PREVIOUS_SHA').value;

/**
 * [♐️] Pull Request ID for PR-based deployments
 */
export const NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID = config.get('NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID').value;

/**
 * List of servers where agents can be hosted
 */
export const SERVERS = config.get('SERVERS').list().value;
