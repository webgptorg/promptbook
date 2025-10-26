import { IDestroyable, ITeardownLogic, Registration } from 'destroyable';
import { string_mime_type, string_url } from '../../types/typeAliases';

/**
 * Converts Blob, File or MediaSource to url using URL.createObjectURL
 *
 * @public exported from `@promptbook/browser`
 */
export class ObjectUrl extends Registration implements IDestroyable {
    private constructor(teardownLogic: ITeardownLogic, public readonly src: string_url) {
        super(teardownLogic);
    }

    /**
     * Creates ObjectUrl from multiple input types
     * Note: DO NOT forget to call destroy() when you are done with it
     */
    public static from(source: Blob | File | MediaSource | string, mimeType: string_mime_type): ObjectUrl {
        if (typeof source === 'string') {
            return ObjectUrl.fromString(source, mimeType);
        }

        if ((source instanceof Blob || source instanceof File) && source.type !== mimeType) {
            throw new Error(`Source type ${source.type} does not match given mimeType ${mimeType}`);
        }
        return ObjectUrl.fromBlob(source);
    }

    /**
     * Creates ObjectUrl from string
     * Note: DO NOT forget to call destroy() when you are done with it
     */
    public static fromString(source: string, mimeType: string_mime_type): ObjectUrl {
        return ObjectUrl.fromBlob(new Blob([source], { type: mimeType }));
    }

    /**
     * Creates ObjectUrl
     * DO NOT forget to call destroy() when you are done with it
     */
    public static fromBlob(source: Blob | File | MediaSource): ObjectUrl {
        const src = URL.createObjectURL(source) as string_url;

        return new ObjectUrl(() => {
            URL.revokeObjectURL(src);
        }, src);
    }

    /**
     * Creates ObjectUrl:
     * 1) With functionality for Blobs, Files or MediaSources
     * 2) Just a wrapper for string urls
     *
     * DO NOT forget to call destroy() when you are done with it
     */
    public static fromBlobOrUrl(source: Blob | File | MediaSource | URL | string_url): ObjectUrl {
        if (typeof source === 'string' || source instanceof URL /* <- TODO: Probably check isValidUrl */) {
            return new ObjectUrl(() => {
                // Note: Nothing to do here
            }, source.toString() as string_url);
        } else {
            return ObjectUrl.fromBlob(source);
        }
    }

    /**
     * Gets object url as string
     * @alias src
     */
    public get href(): string_url {
        return this.src;
    }

    /**
     * Gets object url as URL object
     */
    public get url(): URL {
        return new URL(this.src);
    }
}

/**
 * Note: [🔵] Code in this file should never be published outside of `@promptbook/browser`
 */
