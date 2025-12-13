'use client';

import Link from 'next/link';
import { OpenMojiIcon } from '../OpenMojiIcon/OpenMojiIcon';

export function DocsToolbar() {
    return (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 mb-8 bg-white rounded-xl shadow-sm border border-gray-100 print:hidden">
            <div className="flex items-center gap-2">
                <OpenMojiIcon icon="📚" className="text-2xl" />
                <span className="font-semibold text-gray-700">Documentation</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    title="Print this page or save as PDF"
                >
                    <OpenMojiIcon icon="🖨️" />
                    Print / Save as PDF
                </button>

                <Link
                    href="/api/docs/book.md"
                    download="book.md"
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    title="Download raw Markdown documentation"
                >
                    <OpenMojiIcon icon="⬇️" />
                    Download Markdown
                </Link>
            </div>
        </div>
    );
}
