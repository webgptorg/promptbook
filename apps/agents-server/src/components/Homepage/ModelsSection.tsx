import Link from 'next/link';
import React from 'react';
import { Section } from './Section';
import { ModelCard } from './ModelCard';

type ModelInfo = {
    modelName: string;
    modelTitle?: string;
    modelDescription?: string;
};

type ModelsSectionProps = {
    /**
     * Full list of models to display.
     */
    models: ReadonlyArray<ModelInfo>;

    /**
     * Optional custom title for the section.
     * Defaults to `Models (X)` where X is the total number of models.
     */
    title?: string;

    /**
     * Optional maximum number of models to render.
     * If set and there are more models than this number, only the first `maxVisible`
     * models are shown.
     */
    maxVisible?: number;

    /**
     * When true and `maxVisible` is set and exceeded, renders a "View all models"
     * card linking to the admin models page.
     */
    showViewAllLink?: boolean;
};

export function ModelsSection(props: ModelsSectionProps) {
    const { models, title, maxVisible, showViewAllLink } = props;

    const totalCount = models.length;
    const visibleModels =
        typeof maxVisible === 'number'
            ? models.slice(0, Math.max(0, maxVisible))
            : models;

    const resolvedTitle = title ?? `Models (${totalCount})`;

    const hasMore =
        typeof maxVisible === 'number' ? totalCount > maxVisible : false;

    return (
        <Section title={resolvedTitle}>
            {visibleModels.map(({ modelName, modelTitle, modelDescription }) => (
                <ModelCard
                    key={modelName}
                    modelName={modelName}
                    modelTitle={modelTitle || modelName}
                    modelDescription={modelDescription}
                />
            ))}

            {showViewAllLink && hasMore && (
                <Link href="/admin/models">
                    <div className="h-full flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white/60 text-center p-4 hover:border-promptbook-blue-dark hover:bg-white transition-colors cursor-pointer">
                        <p className="text-sm font-medium text-gray-900">View all models</p>
                        <p className="text-xs text-gray-500 mt-1">
                            Showing {visibleModels.length} of {totalCount} models
                        </p>
                    </div>
                </Link>
            )}
        </Section>
    );
}
