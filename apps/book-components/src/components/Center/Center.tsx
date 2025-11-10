import { CSSProperties, ReactNode } from 'react';

export function Center({ children }: { children: ReactNode }) {
    const style: CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        maxWidth: '800px',
        margin: '0 auto',
    };

    return <div style={style}>{children}</div>;
}
