
import { FC } from 'react';

/**
 * Renders a loading bar.
 *
 * @param {object} props - The component props.
 * @param {number} props.animationDuration - The duration of the animation.
 * @param {number} props.progress - The progress of the loading.
 * @returns {JSX.Element} The rendered loading bar.
 */
export const Bar: FC<{ animationDuration: number; progress: number }> = ({ animationDuration, progress }) => {
    return (
        <div
            style={{
                background: '#29d',
                height: 4,
                left: 0,
                marginLeft: `${(-1 + progress) * 100}%`,
                position: 'fixed',
                top: 0,
                transition: `margin-left ${animationDuration}ms linear`,
                width: '100%',
                zIndex: 1031,
            }}
        >
            <div
                style={{
                    boxShadow: '0 0 10px #29d, 0 0 5px #29d',
                    display: 'block',
                    height: '100%',
                    opacity: 1,
                    position: 'absolute',
                    right: 0,
                    transform: 'rotate(3deg) translate(0px, -4px)',
                    width: 100,
                }}
            />
        </div>
    );
};
