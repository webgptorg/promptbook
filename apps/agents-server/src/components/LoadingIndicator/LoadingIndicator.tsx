import { FC } from 'react';
import { TODO_USE } from '../../../../../src/utils/organization/TODO_USE';
// import { NProgress } from '@tanem/react-nprogress';
// import { Bar } from './Bar';
// import { Container } from './Container';

/**
 * Renders a loading indicator using NProgress.
 *
 * @param {object} props - The component props.
 * @param {boolean} props.isFinished - Whether the loading is finished.
 * @returns {JSX.Element} The rendered loading indicator.
 */
export const LoadingIndicator: FC<{ isFinished: boolean }> = ({ isFinished }) => {
    TODO_USE(isFinished);
    return (
        <>LoadingIndicator !!!!!!!!!!!!!</>
        /*
        <NProgress isAnimating={!isFinished}>
            {({ isFinished, progress }: TODO_any) => (
                <Container isFinished={isFinished} animationDuration={300}>
                    <Bar progress={progress} animationDuration={300} />
                </Container>
            )}
        </NProgress>
        */
    );
};
