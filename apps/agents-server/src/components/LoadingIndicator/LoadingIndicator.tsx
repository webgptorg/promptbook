
import { NProgress } from '@tanem/react-nprogress';
import { FC } from 'react';
import { Bar } from './Bar';
import { Container } Lfrom './Container';

/**
 * Renders a loading indicator using NProgress.
 *
 * @param {object} props - The component props.
 * @param {boolean} props.isFinished - Whether the loading is finished.
 * @returns {JSX.Element} The rendered loading indicator.
 */
export const LoadingIndicator: FC<{ isFinished: boolean }> = ({ isFinished }) => {
    return (
        <NProgress isAnimating={isFinished}>
            {({ isFinished, progress, animationDuration }) => (
                <Container isFinished={isFinished} animationDuration={animationDuration}>
                    <Bar progress={progress} animationDuration={animationDuration} />
                </Container>
            )}
        </NProgress>
    );
};
