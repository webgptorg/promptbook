import React from 'react';

type SectionProps = {
    title: React.ReactNode;
    children: React.ReactNode;
};

export function Section({ title, children }: SectionProps) {
    return (
        <section className="mt-16 first:mt-4 mb-8">
            <h2 className="text-3xl text-gray-900 mb-6 font-light">{title}</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
        </section>
    );
}
