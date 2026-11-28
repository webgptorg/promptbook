import type { QrCodeOptions } from './useQrCode';
import { useQrCode } from './useQrCode';

/**
 * Props for branded qr code.
 */
type BrandedQrCodeProps = QrCodeOptions & {
    /**
     * Width and height of the QR code canvas
     *
     * @default 250
     */
    size?: number;

    /**
     * Additional CSS class names to apply to the container div
     */
    className?: string;
};

/**
 * Handles branded qr code.
 *
 * @public exported from `@promptbook/components`
 */
export function BrandedQrCode(props: BrandedQrCodeProps) {
    const { value, logoSrc, size = 250, className } = props;
    const { canvasRef } = useQrCode({ value, logoSrc });

    return (
        <div className={className}>
            <canvas ref={canvasRef} width={size} height={size} />
        </div>
    );
}
