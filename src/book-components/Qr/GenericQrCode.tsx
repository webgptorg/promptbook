import { useQrCode } from './useQrCode';

/**
 * Props for generic qr code.
 */
type GenericQrCodeProps = {
    value: string | number;
    size?: number;
    className?: string;
};

/**
 * Handles generic qr code.
 *
 * @public exported from `@promptbook/components`
 */
export function GenericQrCode({ value, size = 250, className }: GenericQrCodeProps) {
    const { canvasRef } = useQrCode({ value });

    return (
        <div className={className}>
            <canvas ref={canvasRef} width={size} height={size} />
        </div>
    );
}
