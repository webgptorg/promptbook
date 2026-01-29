import { HomeIcon } from 'lucide-react';
import Link from 'next/link';
import { ErrorPage } from '../ErrorPage/ErrorPage';

export function NotFoundPage() {
    return (
        <ErrorPage
            title="Agent Not Found :("
            message="The agent you are looking for does not exist, but you can create your own!"
        >
            <div className="flex justify-center">
                <Link
                    href="/"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                    <HomeIcon className="inline w-5 h-5 mr-2" />
                    Home
                </Link>
            </div>
        </ErrorPage>
    );
}
