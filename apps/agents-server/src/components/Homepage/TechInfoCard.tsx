import Link from 'next/link';
import React from 'react';
import { Card } from './Card';

/**
 * Props for tech info card.
 */
type TechInfoCardProps = {
    title: string;
    children: React.ReactNode;
    href?: string;
};

/**
 * Handles tech info card.
 */
export function TechInfoCard({ title, children, href = '#' }: TechInfoCardProps) {
    return (
        <Link href={href}>
            <Card>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h2>
                {children}
            </Card>
        </Link>
    );
}
