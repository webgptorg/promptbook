'use client';

import 'leaflet/dist/leaflet.css';

import type { Feature, GeoJsonObject, GeoJsonProperties, Geometry } from 'geojson';
import type { Layer, LatLng, Map as LeafletMap, Path, PathOptions } from 'leaflet';
import L from 'leaflet';
import { Maximize2, X } from 'lucide-react';
import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';
import styles from './ChatMessageMap.module.css';

/**
 * Identifier used when rendering the OpenStreetMap tile layer.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
const DEFAULT_LAYER_ID = 'chat-message-map-layer';

/**
 * Style tokens used to make GeoJSON paths and polygons feel more modern.
 *
 * @private internal helper of `<ChatMessageMap/>`
 */
const GEOJSON_STYLE_PRESETS = {
    polygon: {
        color: '#38bdf8',
        weight: 2,
        opacity: 0.95,
        fillColor: 'rgba(59, 130, 246, 0.28)',
        fillOpacity: 0.35,
        dashArray: '6 8',
        lineCap: 'round',
        lineJoin: 'round',
    } as PathOptions,
    line: {
        color: '#67e8f9',
        weight: 3,
        opacity: 0.92,
        dashArray: '5 7',
        lineCap: 'round',
        lineJoin: 'round',
    } as PathOptions,
    highlight: {
        color: '#7dd3fc',
        weight: 4,
        fillOpacity: 0.55,
    } as Partial<PathOptions>,
    default: {
        color: '#6ee7b7',
        weight: 2.5,
        opacity: 0.9,
        dashArray: '4 6',
        lineCap: 'round',
        lineJoin: 'round',
    } as PathOptions,
} as const;

/**
 * Dimensions and anchor offsets for the custom point-of-interest markers.
 *
 * @private internal helper of `<ChatMessageMap/>`
 */
const POI_MARKER_CONFIG = {
    size: 38,
    anchor: [19, 19] as [number, number],
} as const;

/**
 * Offset used for map tooltips so labels sit above the features.
 *
 * @private internal helper of `<ChatMessageMap/>`
 */
const MAP_TOOLTIP_OFFSET: [number, number] = [0, -20];

/**
 * A strongly typed alias for GeoJSON features rendered inside the chat map.
 *
 * @private internal helper of `<ChatMessageMap/>`
 */
type ChatGeoJsonFeature = Feature<Geometry, GeoJsonProperties>;

/**
 * Props for `<ChatMessageMap/>`.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
type ChatMessageMapProps = {
    data: GeoJsonObject;
};

/**
 * Returns the preferred label for a GeoJSON feature by checking common property keys.
 *
 * @param feature - Feature to inspect for identifying properties.
 * @returns A trimmed string label or `null` when no candidate is available.
 *
 * @private internal helper of `<ChatMessageMap/>`
 */
function getGeoJsonFeatureLabel(feature: ChatGeoJsonFeature): string | null {
    const properties = feature.properties;
    if (properties && typeof properties === 'object') {
        const bag = properties as Record<string, unknown>;

        for (const key of ['name', 'title', 'label', 'description']) {
            const value = bag[key];
            if (typeof value === 'string' && value.trim().length > 0) {
                return value.trim();
            }
        }
    }

    if (typeof feature.id === 'string' && feature.id.trim().length > 0) {
        return feature.id.trim();
    }

    if (typeof feature.id === 'number') {
        return feature.id.toString();
    }

    return null;
}

/**
 * Provides a base style object for GeoJSON paths so polygons, lines, and fallbacks get distinct strokes.
 *
 * @param feature - Feature driving the style calculation.
 * @returns A fresh `PathOptions` instance describing stroke/fill tokens.
 *
 * @private internal helper of `<ChatMessageMap/>`
 */
function getGeoJsonFeatureStyle(feature?: ChatGeoJsonFeature | null): PathOptions {
    const geometryType = feature?.geometry?.type;

    if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
        return { ...GEOJSON_STYLE_PRESETS.polygon };
    }

    if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
        return { ...GEOJSON_STYLE_PRESETS.line };
    }

    return { ...GEOJSON_STYLE_PRESETS.default };
}

/**
 * Builds a highlighted style variant for hover states while respecting the base tokens.
 *
 * @param baseStyle - Style to ramp up for the hover effect.
 * @returns A new `PathOptions` instance with stronger stroke/fill emphasis.
 *
 * @private internal helper of `<ChatMessageMap/>`
 */
function getGeoJsonHighlightStyle(baseStyle: PathOptions): PathOptions {
    return {
        ...baseStyle,
        color: GEOJSON_STYLE_PRESETS.highlight.color ?? baseStyle.color,
        weight: Math.max(baseStyle.weight ?? 2, 1) * 1.3,
        fillOpacity: Math.min(0.6, (baseStyle.fillOpacity ?? 0.2) + 0.25),
    };
}

/**
 * Guards Leaflet layers that support `setStyle`.
 *
 * @param layer - Candidate Leaflet layer to check.
 * @returns `true` when the supplied layer exposes `Path` styling helpers.
 *
 * @private internal helper of `<ChatMessageMap/>`
 */
function isLeafletPathLayer(layer: Layer): layer is Path {
    return typeof (layer as Path).setStyle === 'function';
}

/**
 * Attaches tooltips, hover highlights, and accessibility helpers to GeoJSON layers.
 *
 * @param feature - Feature backing the Leaflet layer.
 * @param layer - Leaflet layer created for the feature.
 *
 * @private internal helper of `<ChatMessageMap/>`
 */
function decorateGeoJsonLayer(feature: ChatGeoJsonFeature, layer: Layer) {
    const label = getGeoJsonFeatureLabel(feature);
    if (label) {
        layer.bindTooltip(label, {
            direction: 'top',
            offset: MAP_TOOLTIP_OFFSET,
            className: styles.mapTooltip,
        });
    }

    if (!isLeafletPathLayer(layer)) {
        return;
    }

    const baseStyle = getGeoJsonFeatureStyle(feature);
    layer.on('mouseover', () => {
        layer.setStyle(getGeoJsonHighlightStyle(baseStyle));
    });
    layer.on('mouseout', () => {
        layer.setStyle(baseStyle);
    });
}

/**
 * Renders a custom point-of-interest marker for point features.
 *
 * @param feature - Feature describing the point.
 * @param latlng - Coordinates where the marker should appear.
 * @returns Leaflet marker with layered glow and optional initial text.
 *
 * @private internal helper of `<ChatMessageMap/>`
 */
function createPointOfInterestMarker(feature: ChatGeoJsonFeature, latlng: LatLng) {
    const label = getGeoJsonFeatureLabel(feature);
    const initial = label ? label.trim().charAt(0).toLocaleUpperCase() : '';
    const initialHtml = initial
        ? `<span class="${styles.poiMarkerInitial}" aria-hidden="true">${escapeHtml(initial)}</span>`
        : '';

    const icon = L.divIcon({
        className: styles.poiMarkerIcon,
        html: `
            <span class="${styles.poiMarkerPulse}" aria-hidden="true"></span>
            ${initialHtml}
        `.trim(),
        iconSize: [POI_MARKER_CONFIG.size, POI_MARKER_CONFIG.size],
        iconAnchor: POI_MARKER_CONFIG.anchor,
    });

    return L.marker(latlng, {
        icon,
        riseOnHover: true,
    });
}

/**
 * Escapes HTML-sensitive characters to keep raw GeoJSON properties safe when injected into markup.
 *
 * @param value - Source string to escape.
 * @returns Escaped string safe for insertion into HTML fragments.
 *
 * @private internal helper of `<ChatMessageMap/>`
 */
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Custom hook that renders a Leaflet map inside the provided container and keeps it synced with the geojson payload.
 *
 * @private internal helper of `<ChatMessageMap/>`
 */
function useLeafletGeoJsonMap(containerRef: RefObject<HTMLDivElement | null>, data: GeoJsonObject, enabled: boolean) {
    const leafletRef = useRef<LeafletMap | null>(null);
    const mapInvalidationTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        if (typeof window === 'undefined') {
            return;
        }

        const container = containerRef.current;
        if (!container) {
            return;
        }

        if (leafletRef.current) {
            leafletRef.current.remove();
            leafletRef.current = null;
        }

        const map = L.map(container, {
            center: [0, 0],
            zoom: 2,
            zoomControl: false,
            attributionControl: false,
        });

        const layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            id: DEFAULT_LAYER_ID,
        });

        layer.addTo(map);

        const geoJsonLayer = L.geoJSON(data, {
            style: getGeoJsonFeatureStyle,
            pointToLayer: (feature: ChatGeoJsonFeature, latlng: LatLng) => createPointOfInterestMarker(feature, latlng),
            onEachFeature: (feature: ChatGeoJsonFeature, layer: Layer) => decorateGeoJsonLayer(feature, layer),
        });

        geoJsonLayer.addTo(map);
        const bounds = geoJsonLayer.getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds, {
                padding: [16, 16],
            });
        } else {
            map.setView([0, 0], 2);
        }

        leafletRef.current = map;

        const scheduleMapInvalidation = () => {
            if (mapInvalidationTimeoutRef.current !== null) {
                window.clearTimeout(mapInvalidationTimeoutRef.current);
            }

            mapInvalidationTimeoutRef.current = window.setTimeout(() => {
                map.invalidateSize();
                mapInvalidationTimeoutRef.current = null;
            }, 0);
        };

        scheduleMapInvalidation();
        map.whenReady(scheduleMapInvalidation);

        return () => {
            if (mapInvalidationTimeoutRef.current !== null) {
                window.clearTimeout(mapInvalidationTimeoutRef.current);
                mapInvalidationTimeoutRef.current = null;
            }

            map.remove();
            leafletRef.current = null;
        };
    }, [containerRef, data, enabled]);
}

/**
 * Renders a Leaflet map for GeoJSON data inside the chat bubble and exposes a modal control for a larger view.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export function ChatMessageMap({ data }: ChatMessageMapProps) {
    const previewRef = useRef<HTMLDivElement | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useLeafletGeoJsonMap(previewRef, data, true);
    useLeafletGeoJsonMap(modalRef, data, isModalOpen);

    useEffect(() => {
        if (!isModalOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsModalOpen(false);
            }
        };

        if (typeof window === 'undefined') {
            return;
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isModalOpen]);

    const handleOpenModal = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    return (
        <>
            <div className={styles.mapContainer}>
                <div className={styles.mapControls}>
                    <button
                        type="button"
                        className={styles.mapControlButton}
                        title="Open map in modal"
                        aria-label="Open map in modal"
                        onClick={handleOpenModal}
                    >
                        <Maximize2 aria-hidden="true" />
                    </button>
                </div>
                <div ref={previewRef} className={styles.mapSurface} aria-label="Map preview" />
            </div>

            {isModalOpen && (
                <div
                    className={styles.mapModalBackdrop}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Expanded map view"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            handleCloseModal();
                        }
                    }}
                >
                    <div className={styles.mapModalContent}>
                        <div className={styles.mapModalHeader}>
                            <button
                                type="button"
                                className={styles.mapModalCloseButton}
                                title="Close map"
                                aria-label="Close map"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    handleCloseModal();
                                }}
                            >
                                <X aria-hidden="true" />
                            </button>
                        </div>
                        <div className={styles.mapModalBody}>
                            <div
                                ref={modalRef}
                                className={`${styles.mapSurface} ${styles.mapModalSurface}`}
                                aria-label="Expanded map preview"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
