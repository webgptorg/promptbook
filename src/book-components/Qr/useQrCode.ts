import type { QRCodeRenderersOptions } from 'qrcode';
import QRCode from 'qrcode';
import { useEffect, useRef } from 'react';
import { string_url_image } from '../../types/typeAliases';

export type QrCodeOptions = QRCodeRenderersOptions & {
    value: string | number;

    logoSrc?: string_url_image;
};

/**
 *
 *
 * @private utility of QR code components
 */
export function useQrCode(options: QrCodeOptions) {
    const { value, logoSrc, ...restOptions } = options;
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) {
            console.log('!!! !canvasRef.current');
            return;
        }

        const canvas = canvasRef.current;
        QRCode.toCanvas(canvas, value.toString(), restOptions, (error) => {
            console.log('!!! QR code generated');

            if (error) {
                console.error(error);
                return;
            }

            if (!logoSrc) {
                console.log('!!! !logoSrc');
                return;
            }

            const ctx = canvas.getContext('2d');

            if (!ctx) {
                console.error('!!! Failed to get canvas 2D context');
                return;
            }

            const logo = new Image();
            logo.src = logoSrc;
            logo.onload = () => {
                console.log('!!! Logo loaded for QR code');
                const logoSize = canvas.width / 4;
                const logoX = (canvas.width - logoSize) / 2;
                const logoY = (canvas.height - logoSize) / 2;
                ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
            };
        });
    }, [value, logoSrc]);

    return { canvasRef };
}
