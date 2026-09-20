import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Airport } from './airports';

export interface SatMapHandle {
  setProgress(t: number): void;
  dispose(): void;
}

/** Esri World Imagery — attribution is required and shown on the map. */
const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  // the online view is a zoomable satellite globe
  projection: { type: 'globe' },
  sky: {
    'sky-color': '#0b1020',
    'horizon-color': '#6f86b8',
    'fog-color': '#0b0d0f',
    'sky-horizon-blend': 0.6,
    'horizon-fog-blend': 0.6,
    'fog-ground-blend': 0.4,
  },
  sources: {
    esri: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 18,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
    hillshade: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 14,
      attribution: 'Hillshade © Esri',
    },
    labels: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 14,
      attribution: 'Reference © Esri',
    },
  },
  layers: [
    { id: 'esri', type: 'raster', source: 'esri' },
    { id: 'hillshade', type: 'raster', source: 'hillshade', paint: { 'raster-opacity': 0.35 } },
    { id: 'labels', type: 'raster', source: 'labels', paint: { 'raster-opacity': 0.8 } },
  ],
};

/** great-circle interpolation, in degrees */
function geodesic(from: Airport, to: Airport, steps = 128): [number, number][] {
  const rad = Math.PI / 180;
  const φ1 = from.lat * rad;
  const λ1 = from.lon * rad;
  const φ2 = to.lat * rad;
  const λ2 = to.lon * rad;
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((φ2 - φ1) / 2) ** 2 +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2,
      ),
    );
  if (d === 0) return [[from.lon, from.lat]];
  return Array.from({ length: steps + 1 }, (_, i) => {
    const f = i / steps;
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);
    const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
    const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
    const z = a * Math.sin(φ1) + b * Math.sin(φ2);
    return [Math.atan2(y, x) / rad, Math.atan2(z, Math.hypot(x, y)) / rad] as [number, number];
  });
}

export async function createSatMap(
  host: HTMLElement,
  route: { from: Airport; to: Airport },
): Promise<SatMapHandle> {
  const map = new maplibregl.Map({
    container: host,
    style: STYLE,
    center: [route.from.lon, route.from.lat],
    zoom: 2.4,
    attributionControl: { compact: true },
    interactive: true,
  });
  const line = geodesic(route.from, route.to);
  const marker = new maplibregl.Marker({ color: '#a78bfa' }).setLngLat(line[0]).addTo(map);

  await new Promise<void>((resolve) => map.on('load', () => resolve()));
  map.addSource('route', {
    type: 'geojson',
    data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } },
  });
  map.addLayer({
    id: 'route',
    type: 'line',
    source: 'route',
    paint: { 'line-color': '#a78bfa', 'line-width': 2.5, 'line-opacity': 0.9 },
  });

  return {
    setProgress(t) {
      const at = line[Math.min(line.length - 1, Math.round(t * (line.length - 1)))];
      marker.setLngLat(at);
      map.easeTo({ center: at, duration: 600 });
    },
    dispose() {
      marker.remove();
      map.remove();
    },
  };
}
