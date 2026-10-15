export const POLLUTANTS = ["NO2", "SO2", "CO"] as const
export type Pollutant = (typeof POLLUTANTS)[number]

export const WINDOWS = {
  fiveYear: { id: "fiveYear", label: "5 años", start: "2021-10", end: "2026-09" },
  fullS5P: { id: "fullS5P", label: "Serie Sentinel-5P (~7–8 años)", start: "2019-01", end: "2026-09" },
} as const

export type WindowId = keyof typeof WINDOWS

/** Nuevo León — polígono simplificado (solo análisis estatal). */
export const NL_BOUNDS: [[number, number], [number, number]] = [
  [23.15, -101.25],
  [27.82, -98.35],
]

export const NL_POLYGON: [number, number][] = [
  [27.78, -99.85],
  [27.65, -100.15],
  [27.2, -100.55],
  [26.55, -101.05],
  [25.85, -101.2],
  [24.95, -101.05],
  [24.15, -100.55],
  [23.35, -100.25],
  [23.18, -99.85],
  [23.55, -99.15],
  [24.25, -98.55],
  [25.15, -98.42],
  [25.95, -98.55],
  [26.65, -98.95],
  [27.35, -99.35],
  [27.78, -99.85],
]

export type RegionId =
  | "estatal"
  | "amm"
  | "industrial_este"
  | "occidente"
  | "norte"
  | "sur"

export type Region = {
  id: RegionId
  name: string
  blurb: string
  center: [number, number]
  populationShare: number
  healthPriority: "alta" | "media" | "base"
}

export const REGIONS: Region[] = [
  {
    id: "estatal",
    name: "Nuevo León (estatal)",
    blurb: "Promedio ponderado por población. No es un promedio mundial ni nacional.",
    center: [25.67, -100.31],
    populationShare: 1,
    healthPriority: "alta",
  },
  {
    id: "amm",
    name: "Área Metropolitana de Monterrey",
    blurb: "Mayor densidad poblacional y exposición crónica. Prioridad del sector salud.",
    center: [25.686, -100.316],
    populationShare: 0.82,
    healthPriority: "alta",
  },
  {
    id: "industrial_este",
    name: "Corredor Cadereyta–Pesquería",
    blurb: "Refinación y carga industrial. Punto crítico histórico de SO₂.",
    center: [25.59, -99.99],
    populationShare: 0.06,
    healthPriority: "alta",
  },
  {
    id: "occidente",
    name: "Occidente (Santa Catarina–García)",
    blurb: "Tráfico de carga, cemento y cañón. NO₂ y CO de combustión.",
    center: [25.73, -100.52],
    populationShare: 0.07,
    healthPriority: "alta",
  },
  {
    id: "norte",
    name: "Norte (Sabinas Hidalgo–Anáhuac)",
    blurb: "Menor densidad. Contraste rural para verificar si el problema es metropolitano.",
    center: [26.5, -100.18],
    populationShare: 0.025,
    healthPriority: "media",
  },
  {
    id: "sur",
    name: "Sur (Linares–Galeana)",
    blurb: "Fondo regional. Sirve como control espacial del estado.",
    center: [24.85, -99.85],
    populationShare: 0.025,
    healthPriority: "base",
  },
]

export type SimaStation = {
  /** Clave que usa SIMA en su feed (`Estacion`, en minúsculas). */
  id: string
  /** Nombre de zona en SIMA. */
  name: string
  municipality: string
  lat: number
  lng: number
  region: RegionId
}

/** Las 15 estaciones del visor oficial SIMA (aire.nl.gob.mx/airemapbing). */
export const SIMA_STATIONS: SimaStation[] = [
  { id: "centro", name: "Centro", municipality: "Monterrey", lat: 25.6760139, lng: -100.338553, region: "amm" },
  { id: "sureste", name: "Sureste", municipality: "Guadalupe", lat: 25.6654972, lng: -100.243653, region: "amm" },
  { id: "noreste", name: "Noreste", municipality: "San Nicolás", lat: 25.74503, lng: -100.25317, region: "amm" },
  { id: "noroeste", name: "Noroeste", municipality: "Monterrey", lat: 25.7629306, lng: -100.369578, region: "amm" },
  { id: "suroeste", name: "Suroeste", municipality: "Santa Catarina", lat: 25.6794444, lng: -100.467831, region: "occidente" },
  { id: "noroeste2", name: "Noroeste 2", municipality: "García", lat: 25.8004639, lng: -100.585011, region: "occidente" },
  { id: "norte", name: "Norte", municipality: "Escobedo", lat: 25.7988361, lng: -100.327164, region: "amm" },
  { id: "noreste2", name: "Noreste 2", municipality: "Apodaca", lat: 25.777475, lng: -100.1882, region: "amm" },
  { id: "sureste2", name: "Sureste 2", municipality: "Juárez", lat: 25.646126, lng: -100.095616, region: "industrial_este" },
  { id: "suroeste2", name: "Suroeste 2", municipality: "San Pedro", lat: 25.665275, lng: -100.412853, region: "amm" },
  { id: "sureste3", name: "Sureste 3", municipality: "Cadereyta", lat: 25.6008639, lng: -99.9953028, region: "industrial_este" },
  { id: "norte2", name: "Norte 2", municipality: "San Nicolás", lat: 25.7297583, lng: -100.310019, region: "amm" },
  { id: "sur", name: "Sur", municipality: "Monterrey", lat: 25.6169806, lng: -100.273936, region: "amm" },
  { id: "este", name: "Este", municipality: "Pesquería", lat: 25.7905557, lng: -100.0785278, region: "industrial_este" },
  { id: "noroeste3", name: "Noroeste 3", municipality: "García", lat: 25.785, lng: -100.46361112, region: "occidente" },
]

export const SIMA_MAP_URL =
  "https://aire.nl.gob.mx/SIMA2017phpgoogle/mapaSimaprbBing_icars_alt.php"

export const SIMA_HOME_URL = "https://aire.nl.gob.mx/map_calidad.html"

export const S5P_COLLECTIONS = {
  NO2: {
    id: "COPERNICUS/S5P/OFFL/L3_NO2",
    band: "tropospheric_NO2_column_number_density",
    unit: "mol/m²",
    start: "2018-06-28",
    catalog:
      "https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S5P_OFFL_L3_NO2",
  },
  SO2: {
    id: "COPERNICUS/S5P/OFFL/L3_SO2",
    band: "SO2_column_number_density",
    unit: "mol/m²",
    start: "2018-12-05",
    catalog:
      "https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S5P_OFFL_L3_SO2",
  },
  CO: {
    id: "COPERNICUS/S5P/OFFL/L3_CO",
    band: "CO_column_number_density",
    unit: "mol/m²",
    start: "2018-06-28",
    catalog:
      "https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S5P_OFFL_L3_CO",
  },
} as const

export const GUIDELINES: Record<
  Pollutant,
  {
    name: string
    omsAnnual: number | null
    oms24h: number | null
    nomAnnual: number | null
    nom24h: number | null
    nom1h: number | null
    nom8h: number | null
    unit: string
    health: string
  }
> = {
  NO2: {
    name: "Dióxido de nitrógeno",
    omsAnnual: 10,
    oms24h: 25,
    nomAnnual: 39.5,
    nom24h: null,
    nom1h: 199,
    nom8h: null,
    unit: "µg/m³",
    health:
      "Asma, EPOC, infecciones respiratorias e inflamación crónica. Niños, personas mayores y trabajadores al aire libre son el grupo de mayor riesgo.",
  },
  SO2: {
    name: "Dióxido de azufre",
    omsAnnual: null,
    oms24h: 40,
    nomAnnual: null,
    nom24h: 105,
    nom1h: 196,
    nom8h: null,
    unit: "µg/m³",
    health:
      "Broncoconstricción, visitas a urgencias por asma y irritación de vías aéreas. El pico industrial (Cadereyta) importa más que el promedio estatal.",
  },
  CO: {
    name: "Monóxido de carbono",
    omsAnnual: null,
    oms24h: 4000,
    nomAnnual: null,
    nom24h: null,
    nom1h: 29800,
    nom8h: 10300,
    unit: "µg/m³",
    health:
      "Reduce el transporte de oxígeno (carboxihemoglobina). Riesgo cardiovascular, gestantes y personas con cardiopatía isquémica.",
  },
}
