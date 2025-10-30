import { useQrCode } from './useQrCode';

type BrandedQrCodeProps = {
    value: string | number;
    logoSrc: string;
    size?: number;
    className?: string;
};

/**
 * @public exported from `@promptbook/components`
 */
export function BrandedQrCode({ value, logoSrc, size = 250, className }: BrandedQrCodeProps) {
    const { canvasRef } = useQrCode(value, logoSrc);

    return (
        <div className={className}>
            <canvas ref={canvasRef} width={size} height={size} />
        </div>
    );
}
