import { BrandedQrCode } from './BrandedQrCode';

type PromptbookQrCodeProps = {
    value: string | number;
    size?: number;
    className?: string;
};

/**
 * @public exported from `@promptbook/components`
 */
export function PromptbookQrCode({ value, size = 250, className }: PromptbookQrCodeProps) {
    return <BrandedQrCode value={value} logoSrc="/promptbook-logo.svg" size={size} className={className} />;
}
