import { Info } from 'lucide-react';
import { extractParametersFromFilename } from '../../../utils/normalization/extractParametersFromFilename';

/**
 * Variant of the images gallery parameter badges.
 */
type ImagesGalleryParametersBadgesVariant = 'TABLE' | 'GRID';

/**
 * Props for ImagesGalleryParametersBadges.
 */
type ImagesGalleryParametersBadgesProps = {
    /**
     * Image filename used to derive the technical parameters.
     */
    readonly filename: string;

    /**
     * Visual variant matching the table or grid view.
     */
    readonly variant: ImagesGalleryParametersBadgesVariant;
};

/**
 * Resolves the wrapper classes for one parameter badge list.
 */
function resolveImagesGalleryParametersContainerClassName(
    variant: ImagesGalleryParametersBadgesVariant,
): string {
    return variant === 'TABLE' ? 'flex flex-wrap gap-1' : 'mt-2 pt-2 border-t flex flex-wrap gap-1';
}

/**
 * Resolves the model badge classes for one parameters list.
 */
function resolveImagesGalleryModelBadgeClassName(variant: ImagesGalleryParametersBadgesVariant): string {
    return variant === 'TABLE'
        ? 'px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-gray-600 border'
        : 'px-1 py-0.5 rounded bg-gray-50 text-[9px] text-gray-500 border border-gray-100 flex items-center gap-1';
}

/**
 * Resolves the badge classes for one optional image parameter.
 */
function resolveImagesGalleryParameterBadgeClassName(
    variant: ImagesGalleryParametersBadgesVariant,
    parameter: 'size' | 'quality' | 'style',
): string {
    if (variant === 'TABLE') {
        return {
            size: 'px-1.5 py-0.5 rounded bg-blue-50 text-[10px] text-blue-600 border border-blue-100',
            quality: 'px-1.5 py-0.5 rounded bg-green-50 text-[10px] text-green-600 border border-green-100',
            style: 'px-1.5 py-0.5 rounded bg-orange-50 text-[10px] text-orange-600 border border-orange-100',
        }[parameter];
    }

    return {
        size: 'px-1 py-0.5 rounded bg-blue-50 text-[9px] text-blue-500 border border-blue-100',
        quality: 'px-1 py-0.5 rounded bg-green-50 text-[9px] text-green-500 border border-green-100',
        style: 'px-1 py-0.5 rounded bg-orange-50 text-[9px] text-orange-500 border border-orange-100',
    }[parameter];
}

/**
 * Renders the model badge content for one parameters list.
 */
function renderImagesGalleryModelBadgeContent(
    variant: ImagesGalleryParametersBadgesVariant,
    modelName: string,
): JSX.Element {
    if (variant === 'GRID') {
        return (
            <>
                <Info className="w-2 h-2" />
                {modelName}
            </>
        );
    }

    return <>{modelName}</>;
}

/**
 * Renders the technical parameter badges shared by the images gallery views.
 *
 * @private function of <ImagesGalleryClient/>
 */
export function ImagesGalleryParametersBadges({ filename, variant }: ImagesGalleryParametersBadgesProps) {
    const parameters = extractParametersFromFilename(filename);

    return (
        <div className={resolveImagesGalleryParametersContainerClassName(variant)}>
            <span
                className={resolveImagesGalleryModelBadgeClassName(variant)}
                title={variant === 'GRID' ? 'Model' : undefined}
            >
                {renderImagesGalleryModelBadgeContent(variant, parameters.modelName)}
            </span>
            {parameters.size && (
                <span className={resolveImagesGalleryParameterBadgeClassName(variant, 'size')}>
                    {parameters.size}
                </span>
            )}
            {parameters.quality && (
                <span className={resolveImagesGalleryParameterBadgeClassName(variant, 'quality')}>
                    {parameters.quality}
                </span>
            )}
            {parameters.style && (
                <span className={resolveImagesGalleryParameterBadgeClassName(variant, 'style')}>
                    {parameters.style}
                </span>
            )}
        </div>
    );
}
