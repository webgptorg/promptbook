import QRCode from 'qrcode';
import { useEffect, useRef } from 'react';

/**
 *
 *
 * @private utility of QR code components
 */
export function useQrCode(value: string | number, logoSrc?: string) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            QRCode.toCanvas(canvas, value.toString(), (error) => {
                if (error) {
                    console.error(error);
                } else if (logoSrc) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        const logo = new Image();
                        logo.src = logoSrc;
                        logo.onload = () => {
                            const logoSize = canvas.width / 4;
                            const logoX = (canvas.width - logoSize) / 2;
                            const logoY = (canvas.height - logoSize) / 2;
                            ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
                        };
                    }
                }
            });
        }
    }, [value, logoSrc]);

    return { canvasRef };
}
