'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect, useRef } from 'react';
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
 * Renders a Leaflet map for GeoJSON data inside the chat bubble.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export function ChatMessageMap({ data }: ChatMessageMapProps) {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const leafletRef = useRef<LeafletMap | null>(null);
    const mapInvalidationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!mapRef.current) {
            return;
        }

        if (leafletRef.current) {
            leafletRef.current.remove();
            leafletRef.current = null;
        }

        const map = L.map(mapRef.current, {
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
            pointToLayer: (feature, latlng) => {
                return L.circleMarker(latlng, {
                    radius: 6,
                    fillColor: '#f59e0b',
                    color: '#fbbf24',
                    weight: 2,
                    fillOpacity: 0.9,
                });
            },
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
    }, [data]);

    return (
        <div className={styles.mapContainer}>
            <div ref={mapRef} className={styles.mapSurface} aria-label="Map preview" />
        </div>
    );
}
