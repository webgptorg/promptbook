import { QRCodeRenderersOptions } from 'qrcode';
import { TODO_any } from '../../_packages/types.index';
import { string_data_url } from '../../types/typeAliases';

type PromptbookQrCodeProps = {
    value: string | number;

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

const PROMPTBOOK_LOGO_DATAURL: string_data_url = `data:image/png;base64,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`;
// <- TODO: [😺] Remove this and use actual img imported logo

/**
 * @public exported from `@promptbook/components`
 */
export function PromptbookQrCode(props: PromptbookQrCodeProps) {
    const { value, className, size = 250 } = props;

    const generateQRCode = async (canvasElement: HTMLCanvasElement, options: QRCodeRenderersOptions) => {
        const QRCodeGenerator = (await import('qrcode')).default;

        // Draw QR code first
        await new Promise<void>((resolve, reject) => {
            QRCodeGenerator.toCanvas(canvasElement, value.toString(), options, (error) => {
                if (error) {
                    console.error(error);
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        // Add logo after QR code is drawn
        const ctx = canvasElement.getContext('2d');
        if (!ctx) return;

        const logo = new Image();
        logo.src = PROMPTBOOK_LOGO_DATAURL;

        await new Promise<void>((resolve) => {
            logo.onload = () => {
                // Calculate the size of a single QR code module based on canvas dimensions and margin.
                // We still need to make an assumption about the number of modules per side,
                // as the library doesn't expose it directly after drawing.
                // For error correction level 'H', and a reasonable amount of data for a logo,
                // the version is likely between 7 and 15 (45x45 to 77x77 modules).
                // Let's use an estimated average or a value that has worked well.
                // A common size for a logo-inclusive QR code is version 7 (45 modules) or higher.
                // Let's estimate based on version 10 (57 modules) as a starting point,
                // as it was used in previous attempts and might be close.

                const estimatedModulesPerSide = 57; // Modules in the QR code pattern itself
                const totalModuleUnits = estimatedModulesPerSide + 2 * (options.margin || 0); // Total units including margin
                const moduleSize = canvasElement.width / totalModuleUnits; // Size of one module in canvas pixels

                // Define desired logo size in terms of modules (must be odd for centering) and calculate in pixels
                const desiredLogoModules = 15;
                const logoSize = desiredLogoModules * moduleSize;

                // Calculate the center of the QR code drawable area (excluding margin pixels)
                const marginPixels = (options.margin || 0) * moduleSize;
                const qrCodeDrawableSize = canvasElement.width - 2 * marginPixels;

                const qrCenterX = marginPixels + qrCodeDrawableSize / 2;
                const qrCenterY = marginPixels + qrCodeDrawableSize / 2;

                // Calculate logo position to be centered within the QR code drawable area, snapped to the module grid
                const logoX = qrCenterX - logoSize / 2;
                const logoY = qrCenterY - logoSize / 2;

                // Snap logo position and size to the nearest module boundary for better grid alignment
                const finalLogoX = Math.round(logoX / moduleSize) * moduleSize;
                const finalLogoY = Math.round(logoY / moduleSize) * moduleSize;
                const finalLogoSize = Math.round(logoSize / moduleSize) * moduleSize;

                // Recalculate hexagon position based on the snapped logo position and size
                const hexagonPaddingModules = 1; // Padding around the logo in terms of modules
                const hexagonSize = (desiredLogoModules + 2 * hexagonPaddingModules) * moduleSize; // Hexagon size including padding

                // Center the hexagon based on the snapped logo position, with padding
                const hexagonCenterX = finalLogoX + finalLogoSize / 2;
                const hexagonCenterY = finalLogoY + finalLogoSize / 2;

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();

                // Draw hexagon with corners pointing up
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI) / 3 + Math.PI / 6; // Added π/6 to rotate by 30 degrees
                    const x = hexagonCenterX + (hexagonSize / 2) * Math.cos(angle);
                    const y = hexagonCenterY + (hexagonSize / 2) * Math.sin(angle);
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.closePath();
                ctx.fill();

                // Draw logo at the snapped position and size
                ctx.drawImage(logo, finalLogoX, finalLogoY, finalLogoSize, finalLogoSize);
                resolve();
            };
            // Handle potential logo loading errors
            logo.onerror = (error) => {
                console.error('Error loading logo:', error);
                resolve(); // Resolve anyway to not block QR code rendering
            };
        });
    };

    /*
    const handleDownload = async () => {
        // Create a temporary canvas for high-res QR code
        const tempCanvas = document.createElement('canvas');
        const highResOptions: QRCodeRenderersOptions = {
            ...props,
            color: {
                dark: '#000080',
                light: '#FFFFFF',
            },
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 4096, // Even higher resolution for printing
            scale: undefined, // Let library determine scale based on width
        };
        delete (highResOptions as TODO_any).href;

        // Generate QR code with logo on the temporary canvas
        await generateQRCode(tempCanvas, highResOptions);

        // Create download link
        const pngUrl = tempCanvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `qrcode-${value
            .toString()
            .replace(/[^a-z0-9]/gi, '-')
            .toLowerCase()}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };
    */

    return (
        <div className={className}>
            <canvas
                width={size}
                height={size}
                ref={(canvasElement) => {
                    if (!canvasElement) {
                        return;
                    }

                    // Set canvas dimensions if size is specified
                    if (size) {
                        canvasElement.width = size;
                        canvasElement.height = size;
                    }

                    // Display options - keep original size for display
                    const displayOptions: QRCodeRenderersOptions = {
                        ...props,
                        color: {
                            dark: '#000080',
                            light: '#FFFFFF',
                        },
                        errorCorrectionLevel: 'H',
                        margin: 3,
                    };
                    delete (displayOptions as TODO_any).href;
                    delete (displayOptions as TODO_any).height; // Remove height as it's not a QRCode option

                    // Generate QR code with logo on the display canvas
                    /* not await */ generateQRCode(canvasElement, displayOptions);
                }}
            />
        </div>
    );
}
