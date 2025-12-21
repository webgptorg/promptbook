import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type AgentProfileImageProps = {
    readonly src: string;
    readonly alt: string;
    readonly className?: string;
    readonly style?: React.CSSProperties;
};

export function AgentProfileImage({ src, alt, className, style }: AgentProfileImageProps) {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        let timeoutId: NodeJS.Timeout;
        let objectUrl: string | null = null;

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
                    if (isMounted) {
                        timeoutId = setTimeout(fetchImage, 2000);
                    }
                }
            } catch (error) {
                console.warn('Failed to fetch image, retrying...', error);
                if (isMounted) {
                    timeoutId = setTimeout(fetchImage, 2000);
                }
            }
        };

        setIsLoading(true);
        fetchImage();

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

            {imageSrc && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={imageSrc}
                    alt={alt}
                    className="w-full h-full object-cover"
                    // We don't pass style here because it is applied to container
                />
            )}
        </div>
    );
}
