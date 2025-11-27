import React from 'react';

type SectionProps = {
    title: string;
    children: React.ReactNode;
};

export function Section({ title, children }: SectionProps) {
    return (
        <section className="mt-16 first:mt-4 mb-4">
            <h2 className="text-3xl text-gray-900 mb-6 font-light">{title}</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {children}
            </div>
        </section>
    );
}
