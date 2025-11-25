import Link from 'next/link';
import { ErrorPage } from '../ErrorPage/ErrorPage';

export function NotFoundPage() {
    return (
        <ErrorPage title="404 Not Found" message="The page you are looking for does not exist.">
            <div className="flex justify-center">
                <Link
                    href="/"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                    Go Home
                </Link>
            </div>
        </ErrorPage>
    );
}
