
import { FC, PropsWithChildren } from 'react';

/**
 * Renders a container for the loading indicator.
 *
 * @param {object} props - The component props.
 * @param {number} props.animationDuration - The duration of the animation.
 * @param {boolean} props.isFinished - Whether the loading is finished.
 * @returns {JSX.Element} The rendered container.
 */
export const Container: FC<PropsWithChildren<{ animationDuration: number; isFinished: boolean }>> = ({
    children,
    animationDuration,
    isFinished,
}) => {
    return (
        <div
            style={{
                opacity: isFinished ? 0 : 1,
                pointerEvents: 'none',
                transition: `opacity ${animationDuration}ms linear`,
            }}
        >
            {children}
        </div>
    );
};
