'use client';

import { Download, PrinterIcon } from 'lucide-react';
import Link from 'next/link';
import { OpenMojiIcon } from '../OpenMojiIcon/OpenMojiIcon';

/**
 * Handles docs toolbar.
 */
export function DocsToolbar() {
    return (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 mb-8 bg-white rounded-xl shadow-sm border border-gray-100 print:hidden dark:border-slate-700 dark:bg-slate-900/92 dark:shadow-slate-950/30">
            <div className="flex items-center gap-2">
                <OpenMojiIcon icon="📚" className="text-2xl" />
                <span className="font-semibold text-gray-700 dark:text-slate-100">Documentation</span>
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800 dark:focus:ring-offset-slate-950"
                    title="Print this page or save as PDF"
                >
                    <PrinterIcon className="w-4 h-4" />
                    Print / Save as PDF
                </button>

                <Link
                    href="/api/docs/book-language.md"
                    download="book-language.md"
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-100 dark:hover:bg-blue-500/25 dark:focus:ring-offset-slate-950"
                    title="Download raw Markdown documentation"
                >
                    <Download className="w-4 h-4" />
                    Download Markdown
                </Link>
            </div>
        </div>
    );
}
