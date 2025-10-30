import { useQrCode } from './useQrCode';

type GenericQrCodeProps = {
    value: string | number;
    size?: number;
    className?: string;
};

/**
 * @public exported from `@promptbook/components`
 */
export function GenericQrCode({ value, size = 250, className }: GenericQrCodeProps) {
    const { canvasRef } = useQrCode(value);

    return (
        <div className={className}>
            <canvas ref={canvasRef} width={size} height={size} />
        </div>
    );
}
