import Link from 'next/link';
import React from 'react';
import { Card } from './Card';

type ModelCardProps = {
    modelName: string;
    modelTitle: string;
    modelDescription?: string;
};

export function ModelCard({ modelName, modelTitle, modelDescription }: ModelCardProps) {
    return (
        <Link href={`#[🐱‍🚀]`}>
            <Card>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">{modelTitle}</h2>
                <code>{modelName}</code>
                {modelDescription && <p className="text-gray-600 mt-2">{modelDescription}</p>}
            </Card>
        </Link>
    );
}
