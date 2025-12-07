import { DetailedHTMLProps, HTMLAttributes } from 'react';

type OpenMojiIconProps = DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement> & {
    icon: string;
};

/**
 * Renders an emoji using the OpenMoji black and white font
 */
export function OpenMojiIcon({ icon, className, style, ...rest }: OpenMojiIconProps) {
    return (
        <span
            className={className}
            style={{ ...style, fontFamily: '"OpenMojiBlack", sans-serif' }}
            {...rest}
        >
            {icon}
        </span>
    );
}
