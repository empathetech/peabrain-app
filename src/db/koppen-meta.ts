// Köppen-Geiger code → human description, derived from the Beck 2023 legend.
// See public/data/koppen/attributions.md.

export const KOPPEN_DESCRIPTIONS: Record<string, string> = {
  Af: 'Tropical, rainforest',
  Am: 'Tropical, monsoon',
  Aw: 'Tropical, savannah',
  BWh: 'Arid, desert, hot',
  BWk: 'Arid, desert, cold',
  BSh: 'Arid, steppe, hot',
  BSk: 'Arid, steppe, cold',
  Csa: 'Temperate, dry summer, hot summer',
  Csb: 'Temperate, dry summer, warm summer',
  Csc: 'Temperate, dry summer, cold summer',
  Cwa: 'Temperate, dry winter, hot summer',
  Cwb: 'Temperate, dry winter, warm summer',
  Cwc: 'Temperate, dry winter, cold summer',
  Cfa: 'Temperate, no dry season, hot summer',
  Cfb: 'Temperate, no dry season, warm summer',
  Cfc: 'Temperate, no dry season, cold summer',
  Dsa: 'Cold, dry summer, hot summer',
  Dsb: 'Cold, dry summer, warm summer',
  Dsc: 'Cold, dry summer, cold summer',
  Dsd: 'Cold, dry summer, very cold winter',
  Dwa: 'Cold, dry winter, hot summer',
  Dwb: 'Cold, dry winter, warm summer',
  Dwc: 'Cold, dry winter, cold summer',
  Dwd: 'Cold, dry winter, very cold winter',
  Dfa: 'Cold, no dry season, hot summer',
  Dfb: 'Cold, no dry season, warm summer',
  Dfc: 'Cold, no dry season, cold summer',
  Dfd: 'Cold, no dry season, very cold winter',
  ET: 'Polar, tundra',
  EF: 'Polar, frost',
}

export function describeKoppen(code: string | null | undefined): string {
  if (!code) return 'Unknown climate'
  return KOPPEN_DESCRIPTIONS[code] ?? code
}
