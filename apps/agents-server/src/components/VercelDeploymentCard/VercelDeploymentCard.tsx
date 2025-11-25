import {
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
import Link from 'next/link';

export default function VercelDeploymentCard() {
    return (
        <Link
            href="#"
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-200 hover:border-blue-400"
        >
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Vercel Deployment</h2>

            <p className="text-gray-600">NEXT_PUBLIC_VERCEL_ENV: {NEXT_PUBLIC_VERCEL_ENV}</p>
            <p className="text-gray-600">NEXT_PUBLIC_VERCEL_TARGET_ENV: {NEXT_PUBLIC_VERCEL_TARGET_ENV}</p>
            <p className="text-gray-600">NEXT_PUBLIC_VERCEL_URL: {NEXT_PUBLIC_VERCEL_URL}</p>
            <p className="text-gray-600">NEXT_PUBLIC_VERCEL_BRANCH_URL: {NEXT_PUBLIC_VERCEL_BRANCH_URL}</p>
            <p className="text-gray-600">
                NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: {NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.href}
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
        </Link>
    );
}
