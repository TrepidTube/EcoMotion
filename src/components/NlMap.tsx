import { CircleMarker, MapContainer, Polygon, Popup, TileLayer } from "react-leaflet"
import { NL_BOUNDS, NL_POLYGON, REGIONS, SIMA_STATIONS, type RegionId } from "../data/catalog"
import { AQ_LEVELS, aqLevel, pollutantLabel, pollutantUnit, type AqLevel, type SimaReading } from "../data/sima"
import "leaflet/dist/leaflet.css"

/** Colores oficiales de la escala SIMA (deben coincidir con --aq-* en index.css). */
const AQ_HEX: Record<AqLevel, string> = {
  none: "#9aa5b1",
  good: "#00e400",
  ok: "#ffff00",
  bad: "#ff7e00",
  verybad: "#ff0000",
  extreme: "#8f3f97",
}

export function NlMap({
  regionId,
  onSelect,
  byStation,
}: {
  regionId: RegionId
  onSelect: (id: RegionId) => void
  byStation: Map<string, SimaReading>
}) {
  return (
    <MapContainer bounds={NL_BOUNDS} className="nl-map" scrollWheelZoom={false} attributionControl>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polygon positions={NL_POLYGON} pathOptions={{ color: "#6b7c3a", weight: 2, fillColor: "#b3bb8a", fillOpacity: 0.12 }} />
      {REGIONS.filter((r) => r.id !== "estatal").map((r) => (
        <CircleMarker
          key={r.id}
          center={r.center}
          radius={regionId === r.id ? 16 : 11}
          pathOptions={{
            color: regionId === r.id ? "#2b3120" : "#6b7c3a",
            weight: regionId === r.id ? 3 : 2,
            fillColor: "#6b7c3a",
            fillOpacity: regionId === r.id ? 0.25 : 0.12,
            dashArray: "4 4",
          }}
          eventHandlers={{ click: () => onSelect(r.id) }}
        >
          <Popup>
            <strong>{r.name}</strong>
            <p>{r.blurb}</p>
          </Popup>
        </CircleMarker>
      ))}
      {SIMA_STATIONS.map((s) => {
        const reading = byStation.get(s.id)
        const level = aqLevel(reading?.index)
        return (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={7}
            pathOptions={{ color: "#1c1729", weight: 1.5, fillColor: AQ_HEX[level], fillOpacity: 0.95 }}
          >
            <Popup>
              <strong>SIMA · {s.name}</strong>
              <div>{s.municipality}</div>
              <div>
                {AQ_LEVELS[level].label}
                {reading ? ` · índice ${reading.index} (${pollutantLabel(reading.pollutant)})` : ""}
              </div>
              {reading?.concentration != null ? (
                <div>
                  {reading.concentration} {pollutantUnit(reading.pollutant)} · {reading.date}
                </div>
              ) : null}
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
