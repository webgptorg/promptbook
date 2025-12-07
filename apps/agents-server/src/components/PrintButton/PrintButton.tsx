'use client';

import { OpenMojiIcon } from '../OpenMojiIcon/OpenMojiIcon';

export function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-105 print:hidden z-50 flex items-center justify-center gap-2 group"
            title="Print documentation"
        >
            <OpenMojiIcon icon="🖨️" className="text-2xl" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap">
                Print
            </span>
        </button>
    );
}
