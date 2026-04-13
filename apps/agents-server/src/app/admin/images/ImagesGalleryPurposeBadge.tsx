import type { ImageWithAgent } from './actions';

/**
 * Props for ImagesGalleryPurposeBadge.
 */
type ImagesGalleryPurposeBadgeProps = {
    /**
     * Image purpose to render.
     */
    readonly purpose: Exclude<ImageWithAgent['purpose'], null>;

    /**
     * Additional classes applied to the badge.
     */
    readonly className?: string;
};

/**
 * Resolves the purpose-specific colors for one image badge.
 */
function getImagesGalleryPurposeBadgeColorClassName(
    purpose: Exclude<ImageWithAgent['purpose'], null>,
): string {
    return purpose === 'AVATAR' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800';
}

/**
 * Renders the purpose badge shared by the images gallery views.
 *
 * @private function of <ImagesGalleryClient/>
 */
export function ImagesGalleryPurposeBadge({ purpose, className = '' }: ImagesGalleryPurposeBadgeProps) {
    return (
        <span className={`${className} ${getImagesGalleryPurposeBadgeColorClassName(purpose)}`.trim()}>
            {purpose}
        </span>
    );
}
