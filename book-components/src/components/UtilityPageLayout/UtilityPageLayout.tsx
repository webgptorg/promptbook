import { ReactNode } from 'react';

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
        <div className="bg-white rounded-lg shadow-md p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                <p className="text-gray-600 mt-2">{description}</p>
            </div>
            {children}
        </div>
    );
}
