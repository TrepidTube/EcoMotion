# EcoMotion

Web app **estatal de Nuevo León** para evaluar de forma independiente si se están gestionando el **SO₂, NO₂ y CO** con criterio de **salud**, no de mapa de colores del día.

## Qué hace

- Tendencia OLS y Mann–Kendall / Sen en ventanas de **5 años** y de **serie Sentinel-5P (~7–8 años)**.
- Recorte **solo a Nuevo León** (AMM, corredor Cadereyta–Pesquería, occidente, norte y sur).
- Dictamen autónomo frente a **OMS 2021** y **NOM-021/022/023-SSA1**.
- Complemento con la red **SIMA**: [mapa estatal](https://aire.nl.gob.mx/SIMA2017phpgoogle/mapaSimaprbBing_icars_alt.php).

## Datos

Solo productos de contaminación de aire de [Sentinel-5P en Earth Engine](https://developers.google.com/earth-engine/datasets/catalog/sentinel-5p?hl=es-419):

| Gas | Colección OFFL L3 | Banda |
| --- | --- | --- |
| NO₂ | `COPERNICUS/S5P/OFFL/L3_NO2` | `tropospheric_NO2_column_number_density` |
| SO₂ | `COPERNICUS/S5P/OFFL/L3_SO2` | `SO2_column_number_density` |
| CO | `COPERNICUS/S5P/OFFL/L3_CO` | `CO_column_number_density` |

Sentinel-5P **no cubre 10 años** (operativo desde 2018). La app no finge órbitas anteriores. Los 10 años de superficie deben salir de SIMA / INECC.

La serie empaquetada ancla la climatología de NO₂ del AMM a Goldberg et al., ACP 2026 (7.7×10¹⁵ molec cm⁻²). Para sustituirla por medias mensuales reales:

```bash
pip install earthengine-api
earthengine authenticate
python scripts/fetch_s5p_gee.py           # extracción completa
python scripts/fetch_s5p_gee.py --hourly  # deja corriendo la verificación cada hora
```

El extractor escribe `public/data/s5p_nl_monthly.csv` y `public/data/status.json`. La app consulta `status.json` **cada hora** (y al volver a la pestaña si ya pasó la hora); si `updated_at` cambió, descarga el CSV y sustituye la columna Sentinel-5P sin recompilar. Una hora es el paso más fino útil hoy: SIMA publica IMECA horario y la latencia de S5P NRTI es de ~3 h (OFFL tarda días). Sin feed publicado, la app lo indica y usa la serie empaquetada.

## Cómo correr

```bash
npm install
npm run dev
```

## SIMA en vivo (Índice AIRE y SALUD)

Cada estación, región y punto del mapa se colorea con la escala oficial de SIMA: 0–50 Buena (verde), 51–100 Aceptable (amarillo), 101–150 Mala (naranja), 151–200 Muy mala (rojo), >200 Extremadamente mala (morado), gris = sin dato/mantenimiento. Una región toma el **peor** índice de sus estaciones (criterio precautorio). Norte y Sur no tienen estación SIMA.

SIMA no tiene API ni CORS; las lecturas vienen incrustadas en su visor (`airemapbing/airebing_ns_copy.php`).

- En `npm run dev` / `npm run preview` la app lo consulta a través del proxy `/sima-live` de Vite.
- En hosting estático, publica el feed con el script (solo librería estándar):

```bash
python scripts/fetch_sima.py --hourly
```

Escribe `public/data/sima_now.json` y `public/data/sima_history.json` (2 semanas de lecturas horarias). La app usa la lectura más reciente entre el feed y el proxy, y repite la consulta cada hora.

## Exposición diaria (conteo de personas)

La sección **Exposición** cruza conteos horarios de sensores (cámaras, contadores, torniquetes) con el índice SIMA de su estación a esa misma hora. Resultado: cuántas personas pasaron cada día por zonas con aire Aceptable / Mala / Muy mala o peor (umbral seleccionable).

El operador publica `public/data/aforos.json` (u otra URL con `VITE_AFOROS_URL`):

```json
{
  "updated_at": "2026-10-14T19:05:00-06:00",
  "sensors": [
    { "id": "mty-macroplaza-01", "name": "Macroplaza norte", "station": "centro", "lat": 25.6714, "lng": -100.3096 }
  ],
  "counts": [
    { "sensor": "mty-macroplaza-01", "hour": "2026-10-14 19:00", "people": 1840 }
  ]
}
```

- `hour`: hora local en el mismo formato que SIMA (`YYYY-MM-DD HH:00`).
- `station`: clave SIMA (`centro`, `sureste`, `noreste`, `noroeste`, `suroeste`, `noroeste2`, `norte`, `noreste2`, `sureste2`, `suroeste2`, `sureste3`, `norte2`, `sur`, `este`, `noroeste3`). Si falta, se asigna la estación más cercana a `lat`/`lng`.
- Los conteos en horas sin índice SIMA (mantenimiento o sin historial) se reportan aparte, no como expuestos. Para cruzar horas pasadas hace falta `sima_history.json`: deja `fetch_sima.py --hourly` corriendo.
- Los sensores cuentan pasos, no personas únicas: una persona puede sumar en varias horas o puntos.
