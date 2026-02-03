
import Image from 'next/image';
import React from 'react';
import { Handle, Position } from 'reactflow';

type CustomNodeData = {
    label: string;
    image: string;
    onClick: () => void;
    isRemote?: boolean;
};

const CustomNode = ({ data }: { data: CustomNodeData }) => {
    return (
        <div
            onClick={data.onClick}
            style={{
                background: data.isRemote ? '#f0f0f0' : '#fff',
                border: '1px solid #ddd',
                padding: '10px',
                borderRadius: '5px',
                textAlign: 'center',
                cursor: 'pointer',
            }}
        >
            <Handle type="target" position={Position.Top} />
            <Image src={data.image} alt={data.label} width={50} height={50} style={{ borderRadius: '50%' }} />
            <div>{data.label}</div>
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
};

export { CustomNode };
