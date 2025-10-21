import { ReactNode } from 'react';
import { Header } from '../Header/Header';

export function UtilityPageLayout({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Header backHref="/" backTitle="Promptbook utilities gallery" />
            <div className="bg-white rounded-lg shadow-md p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                    <p className="text-gray-600 mt-2">{description}</p>
                </div>
                {children}
            </div>
        </div>
    );
}
