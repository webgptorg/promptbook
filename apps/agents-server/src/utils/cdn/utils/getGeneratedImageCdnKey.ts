import { getSafeCdnPath } from './getSafeCdnPath';

const GENERATED_IMAGES_PREFIX = 'generated-images';

/**
 * Parameters for building a CDN key for generated images.
 */
export type GeneratedImageCdnKeyParams = {
    filename: string;
    pathPrefix?: string;
};

/**
 * Builds a CDN key for generated images that respects provider path length limits.
 */
export function getGeneratedImageCdnKey({ filename, pathPrefix }: GeneratedImageCdnKeyParams): string {
    return getSafeCdnPath({ pathname: `${GENERATED_IMAGES_PREFIX}/${filename}`, pathPrefix });
}
