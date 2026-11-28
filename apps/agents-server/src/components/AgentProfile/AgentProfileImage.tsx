import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Props for agent profile image.
 */
type AgentProfileImageProps = {
    readonly src: string;
    readonly alt: string;
    readonly className?: string;
    readonly imageClassName?: string;
    readonly style?: React.CSSProperties;
};

/**
 * Default image sizing used by compact profile-image surfaces.
 */
const DEFAULT_AGENT_PROFILE_IMAGE_CLASS_NAME = 'agent-avatar-pixelated w-full h-full object-cover';

/**
 * Handles agent profile image.
 */
export function AgentProfileImage({ src, alt, className, imageClassName, style }: AgentProfileImageProps) {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let isMounted = true;
        let timeoutId: NodeJS.Timeout;
        let objectUrl: string | null = null;
        let retryCount = 0;

        const fetchImage = async () => {
            try {
                const response = await fetch(src);
                if (response.ok) {
                    const blob = await response.blob();
                    if (!isMounted) {
                        return;
                    }

                    objectUrl = URL.createObjectURL(blob);
                    setImageSrc(objectUrl);
                    setIsLoading(false);
                } else {
                    // Retry on non-200
                    if (isMounted && retryCount < 3) {
                        retryCount++;
                        timeoutId = setTimeout(fetchImage, 2000);
                    } else if (isMounted) {
                        setIsLoading(false);
                        setError(new Error(`Failed to load image after 3 retries (status ${response.status})`));
                    }
                }
            } catch (error) {
                console.warn('Failed to fetch image, retrying...', error);
                if (isMounted && retryCount < 3) {
                    retryCount++;
                    timeoutId = setTimeout(fetchImage, 2000);
                } else if (isMounted) {
                    setIsLoading(false);
                    setError(error instanceof Error ? error : new Error(String(error)));
                }
            }
        };

        const isExternal = (() => {
            try {
                return new URL(src, window.location.href).origin !== window.location.origin;
            } catch {
                return false;
            }
        })();

        if (isExternal) {
            setImageSrc(src);
            setIsLoading(false);
        } else {
            setIsLoading(true);
            fetchImage();
        }

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [src]);

    return (
        <div className={`relative ${className}`} style={style}>
            {/* Note: We apply style to the container, so backgroundImage works here */}

            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-white/50" />
                </div>
            )}

            {imageSrc && !error && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={imageSrc}
                    alt={alt}
                    className={imageClassName || DEFAULT_AGENT_PROFILE_IMAGE_CLASS_NAME}
                    // We don't pass style here because it is applied to container
                />
            )}

            {error && (
                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 font-bold uppercase">
                    {alt.charAt(0)}
                </div>
            )}
        </div>
    );
}
