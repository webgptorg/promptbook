import { CSSProperties } from 'react';

export function Code({ content }: { content: string }) {
    const style: CSSProperties = {
        backgroundColor: '#f5f5f5',
        padding: '15px',
        borderRadius: '5px',
        overflowX: 'auto',
        whiteSpace: 'pre-wrap',
        fontFamily: 'monospace',
    };

    return <pre style={style}>{content}</pre>;
}
