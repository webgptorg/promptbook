'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocPage() {
    return (
        <div className="container mx-auto p-4 bg-white mt-16">
            <SwaggerUI url="/api/swagger" />
        </div>
    );
}
