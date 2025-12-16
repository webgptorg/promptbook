'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function SwaggerPage() {
  return (
    <div className="swagger-container bg-white min-h-screen">
      <SwaggerUI url="/swagger.json" />
    </div>
  );
}
