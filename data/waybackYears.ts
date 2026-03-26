/**
 * Esri World Imagery Wayback — one release per year.
 * Used by the Timeline feature to swap satellite imagery on the map.
 * Source: https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json
 */
export interface WaybackYear {
  year: number;
  releaseNum: number;
  date: string;           // human-readable date
  tileUrl: string;        // {z}/{y}/{x} template
}

const BASE = 'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile';

export const waybackYears: WaybackYear[] = [
  { year: 2014, releaseNum: 22692, date: '2014-10-01', tileUrl: `${BASE}/22692/{z}/{y}/{x}` },
  { year: 2015, releaseNum: 19930, date: '2015-05-13', tileUrl: `${BASE}/19930/{z}/{y}/{x}` },
  { year: 2016, releaseNum: 20443, date: '2016-03-02', tileUrl: `${BASE}/20443/{z}/{y}/{x}` },
  { year: 2017, releaseNum: 23264, date: '2017-10-25', tileUrl: `${BASE}/23264/{z}/{y}/{x}` },
  { year: 2018, releaseNum: 8249,  date: '2018-06-06', tileUrl: `${BASE}/8249/{z}/{y}/{x}`  },
  { year: 2019, releaseNum: 6036,  date: '2019-01-09', tileUrl: `${BASE}/6036/{z}/{y}/{x}`  },
  { year: 2020, releaseNum: 23001, date: '2020-01-08', tileUrl: `${BASE}/23001/{z}/{y}/{x}` },
  { year: 2021, releaseNum: 13534, date: '2021-06-30', tileUrl: `${BASE}/13534/{z}/{y}/{x}` },
  { year: 2022, releaseNum: 47471, date: '2022-12-31', tileUrl: `${BASE}/47471/{z}/{y}/{x}` },
  { year: 2023, releaseNum: 56102, date: '2023-12-07', tileUrl: `${BASE}/56102/{z}/{y}/{x}` },
  { year: 2024, releaseNum: 41468, date: '2024-01-18', tileUrl: `${BASE}/41468/{z}/{y}/{x}` },
  { year: 2025, releaseNum: 13192, date: '2025-12-18', tileUrl: `${BASE}/13192/{z}/{y}/{x}` },
  { year: 2026, releaseNum: 64001, date: '2026-02-26', tileUrl: `${BASE}/64001/{z}/{y}/{x}` },
];
