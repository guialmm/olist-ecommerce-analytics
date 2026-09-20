import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { GeoPoint } from "../lib/api";

const BRAZIL_CENTER: [number, number] = [-14.2, -51.9];

interface HeatLayerProps {
  points: GeoPoint[];
}

/**
 * Camada de calor imperativa — react-leaflet não tem wrapper declarativo pra
 * leaflet.heat, e o plugin em si espera um global `L` (padrão de plugin
 * pré-ESM). Por isso o import é dinâmico: garante que `window.L` já foi
 * setado antes do plugin rodar, em vez de depender da ordem de hoisting
 * dos imports estáticos do módulo (que rodaria o plugin antes do L existir).
 */
function HeatLayer({ points }: HeatLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    let cancelled = false;
    let layer: L.HeatLayer | null = null;

    (window as typeof window & { L?: typeof L }).L = L;
    import("leaflet.heat").then(() => {
      if (cancelled) return;
      const maxOrders = Math.max(...points.map((p) => p.orders));
      const latLngs: L.HeatLatLngTuple[] = points.map((p) => [
        p.lat,
        p.lng,
        0.3 + (p.orders / maxOrders) * 0.7,
      ]);
      layer = L.heatLayer(latLngs, {
        radius: 14,
        blur: 18,
        max: 1,
        minOpacity: 0.35,
        gradient: { 0.2: "#1d4ed8", 0.4: "#3b82f6", 0.65: "#22d3ee", 0.85: "#facc15", 1: "#f97316" },
      }).addTo(map);
    });

    return () => {
      cancelled = true;
      layer?.remove();
    };
  }, [map, points]);

  return null;
}

interface Props {
  data: GeoPoint[];
}

export function GeoHeatmap({ data }: Props) {
  return (
    <div className="h-[420px] overflow-hidden rounded-lg">
      <MapContainer
        center={BRAZIL_CENTER}
        zoom={4}
        minZoom={3}
        maxBounds={[
          [-40, -80],
          [12, -25],
        ]}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          url="https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="&copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
        />
        <HeatLayer points={data} />
      </MapContainer>
    </div>
  );
}
