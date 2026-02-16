'use client';

import 'leaflet/dist/leaflet.css';

import { Maximize2, X } from 'lucide-react';
import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';
import type { GeoJsonObject } from 'geojson';
import L from 'leaflet';
import type { Map as LeafletMap } from 'leaflet';
import styles from './ChatMessageMap.module.css';

/**
 * Identifier used when rendering the OpenStreetMap tile layer.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
const DEFAULT_LAYER_ID = 'chat-message-map-layer';

/**
 * Props for `<ChatMessageMap/>`.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
type ChatMessageMapProps = {
    data: GeoJsonObject;
};

/**
 * Custom hook that renders a Leaflet map inside the provided container and keeps it synced with the geojson payload.
 *
 * @private internal helper of `<ChatMessageMap/>`
 */
function useLeafletGeoJsonMap(containerRef: RefObject<HTMLDivElement>, data: GeoJsonObject, enabled: boolean) {
    const leafletRef = useRef<LeafletMap | null>(null);
    const mapInvalidationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            style: () => ({
                color: '#6EE7B7',
                weight: 3,
            }),
            pointToLayer: (_feature, latlng) =>
                L.circleMarker(latlng, {
                    radius: 6,
                    fillColor: '#f59e0b',
                    color: '#fbbf24',
                    weight: 2,
                    fillOpacity: 0.9,
                }),
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
