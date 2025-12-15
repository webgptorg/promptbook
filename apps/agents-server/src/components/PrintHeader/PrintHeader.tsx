export function PrintHeader({ title }: { title?: string }) {
    return (
        <div className="hidden print:block mb-6 border-b-2 border-blue-600 pb-2">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-poppins">Agents Server</h1>
                    <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        Powered by <span className="font-semibold text-blue-600">Promptbook</span>
                    </div>
                </div>
                {title && <h2 className="text-lg font-semibold text-gray-700">{title}</h2>}
            </div>
            <div className="text-xs text-gray-400 mt-1 text-right">
                {new Date().toLocaleDateString()}
            </div>
        </div>
    );
}
