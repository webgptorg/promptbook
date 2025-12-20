import {
    NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_VERCEL_BRANCH_URL,
    NEXT_PUBLIC_VERCEL_ENV,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_LOGIN,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_NAME,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    NEXT_PUBLIC_VERCEL_GIT_PREVIOUS_SHA,
    NEXT_PUBLIC_VERCEL_GIT_PROVIDER,
    NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID,
    NEXT_PUBLIC_VERCEL_GIT_REPO_ID,
    NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER,
    NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG,
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    NEXT_PUBLIC_VERCEL_TARGET_ENV,
    NEXT_PUBLIC_VERCEL_URL,
} from '@/config';
import { TechInfoCard } from '../Homepage/TechInfoCard';

/**
 * [♐️] Expose Vercel environment variables to indentify the deployment
 */
export default function VercelDeploymentCard() {
    return (
        <TechInfoCard title="Vercel Deployment">
            <p className="text-gray-600">NEXT_PUBLIC_SITE_URL: {NEXT_PUBLIC_SITE_URL}</p>
            <p className="text-gray-600">NEXT_PUBLIC_VERCEL_ENV: {NEXT_PUBLIC_VERCEL_ENV}</p>
            <p className="text-gray-600">NEXT_PUBLIC_VERCEL_TARGET_ENV: {NEXT_PUBLIC_VERCEL_TARGET_ENV}</p>
            <p className="text-gray-600">NEXT_PUBLIC_VERCEL_URL: {NEXT_PUBLIC_VERCEL_URL}</p>
            <p className="text-gray-600">NEXT_PUBLIC_VERCEL_BRANCH_URL: {NEXT_PUBLIC_VERCEL_BRANCH_URL}</p>
            <p className="text-gray-600">
                NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: {NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}
            </p>
            <p className="text-gray-600">NEXT_PUBLIC_VERCEL_GIT_PROVIDER: {NEXT_PUBLIC_VERCEL_GIT_PROVIDER}</p>
            <p className="text-gray-600">NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER: {NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER}</p>
            <p className="text-gray-600">NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG: {NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG}</p>
            <p className="text-gray-600">NEXT_PUBLIC_VERCEL_GIT_REPO_ID: {NEXT_PUBLIC_VERCEL_GIT_REPO_ID}</p>
            <p className="text-gray-600">NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: {NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA}</p>
            <p className="text-gray-600">
                NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE: {NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE}
            </p>
            <p className="text-gray-600">NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF: {NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}</p>
            <p className="text-gray-600">
                NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_NAME: {NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_NAME}
            </p>
            <p className="text-gray-600">
                NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_LOGIN: {NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_LOGIN}
            </p>
            <p className="text-gray-600">NEXT_PUBLIC_VERCEL_GIT_PREVIOUS_SHA: {NEXT_PUBLIC_VERCEL_GIT_PREVIOUS_SHA}</p>
            <p className="text-gray-600">
                NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID: {NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID}
            </p>
        </TechInfoCard>
    );
}
