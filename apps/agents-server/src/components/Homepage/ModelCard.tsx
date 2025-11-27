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
            <Card className="h-full flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-bold text-gray-900">{modelTitle}</h2>
                    <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-mono">
                        {modelName}
                    </span>
                </div>
                {modelDescription && (
                    <p className="text-gray-600 text-sm mt-2 flex-grow leading-relaxed">
                        {modelDescription}
                    </p>
                )}
            </Card>
        </Link>
    );
}
