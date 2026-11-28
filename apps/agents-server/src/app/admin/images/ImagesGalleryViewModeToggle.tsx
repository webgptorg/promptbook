import { Grid, LayoutList } from 'lucide-react';
import type { UseImagesGalleryState } from './useImagesGalleryState';

/**
 * Props for ImagesGalleryViewModeToggle.
 */
type ImagesGalleryViewModeToggleProps = Pick<UseImagesGalleryState, 'viewMode' | 'handleViewModeChange'>;

/**
 * Resolves the shared button class for one view-mode option.
 */
function getImagesGalleryViewModeButtonClassName(isActive: boolean): string {
    return `p-2 rounded-md transition-colors ${
        isActive ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'
    }`;
}

/**
 * Renders the table/grid view toggle used by the images gallery.
 *
 * @private function of <ImagesGalleryClient/>
 */
export function ImagesGalleryViewModeToggle({
    viewMode,
    handleViewModeChange,
}: ImagesGalleryViewModeToggleProps) {
    return (
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
            <button
                type="button"
                onClick={() => handleViewModeChange('TABLE')}
                className={getImagesGalleryViewModeButtonClassName(viewMode === 'TABLE')}
                title="Table View"
            >
                <LayoutList className="w-5 h-5" />
            </button>
            <button
                type="button"
                onClick={() => handleViewModeChange('GRID')}
                className={getImagesGalleryViewModeButtonClassName(viewMode === 'GRID')}
                title="Grid View"
            >
                <Grid className="w-5 h-5" />
            </button>
        </div>
    );
}
