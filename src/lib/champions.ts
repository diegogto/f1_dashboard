// F1 Champions lookup helper
// Maps years (1950-2025) to WDC (World Drivers' Champion) and WCC (World Constructors' Champion)

const WDC_MAP: Record<number, string[]> = {
  1950: ['Farina'],
  1951: ['Fangio'],
  1952: ['Ascari'],
  1953: ['Ascari'],
  1954: ['Fangio'],
  1955: ['Fangio'],
  1956: ['Fangio'],
  1957: ['Fangio'],
  1958: ['Hawthorn', 'Hawthorne'],
  1959: ['Brabham'],
  1960: ['Brabham'],
  1961: ['Phil Hill'],
  1962: ['Graham Hill'],
  1963: ['Clark'],
  1964: ['Surtees'],
  1965: ['Clark'],
  1966: ['Brabham'],
  1967: ['Hulme'],
  1968: ['Graham Hill'],
  1969: ['Stewart'],
  1970: ['Rindt'],
  1971: ['Stewart'],
  1972: ['Fittipaldi'],
  1973: ['Stewart'],
  1974: ['Fittipaldi'],
  1975: ['Lauda'],
  1976: ['Hunt'],
  1977: ['Lauda'],
  1978: ['Andretti'],
  1979: ['Scheckter'],
  1980: ['Alan Jones'],
  1981: ['Piquet'],
  1982: ['Keke Rosberg'],
  1983: ['Piquet'],
  1984: ['Lauda'],
  1985: ['Prost'],
  1986: ['Prost'],
  1987: ['Piquet'],
  1988: ['Senna'],
  1989: ['Prost'],
  1990: ['Senna'],
  1991: ['Senna'],
  1992: ['Mansell'],
  1993: ['Prost'],
  1994: ['Michael Schumacher'],
  1995: ['Michael Schumacher'],
  1996: ['Damon Hill'],
  1997: ['Jacques Villeneuve'],
  1998: ['Häkkinen', 'Hakkinen'],
  1999: ['Häkkinen', 'Hakkinen'],
  2000: ['Michael Schumacher'],
  2001: ['Michael Schumacher'],
  2002: ['Michael Schumacher'],
  2003: ['Michael Schumacher'],
  2004: ['Michael Schumacher'],
  2005: ['Alonso'],
  2006: ['Alonso'],
  2007: ['Räikkönen', 'Raikkonen'],
  2008: ['Hamilton'],
  2009: ['Button'],
  2010: ['Vettel'],
  2011: ['Vettel'],
  2012: ['Vettel'],
  2013: ['Vettel'],
  2014: ['Hamilton'],
  2015: ['Hamilton'],
  2016: ['Nico Rosberg'],
  2017: ['Hamilton'],
  2018: ['Hamilton'],
  2019: ['Hamilton'],
  2020: ['Hamilton'],
  2021: ['Max Verstappen'],
  2022: ['Max Verstappen'],
  2023: ['Max Verstappen'],
  2024: ['Max Verstappen'],
  2025: ['Norris'],
}

const WCC_MAP: Record<number, string[]> = {
  1958: ['Vanwall'],
  1959: ['Cooper'],
  1960: ['Cooper'],
  1961: ['Ferrari'],
  1962: ['BRM', 'B.R.M.'],
  1963: ['Lotus'],
  1964: ['Ferrari'],
  1965: ['Lotus'],
  1966: ['Brabham'],
  1967: ['Brabham'],
  1968: ['Lotus'],
  1969: ['Matra'],
  1970: ['Lotus'],
  1971: ['Tyrrell'],
  1972: ['Lotus'],
  1973: ['Lotus'],
  1974: ['McLaren'],
  1975: ['Ferrari'],
  1976: ['Ferrari'],
  1977: ['Ferrari'],
  1978: ['Lotus'],
  1979: ['Ferrari'],
  1980: ['Williams'],
  1981: ['Williams'],
  1982: ['Ferrari'],
  1983: ['Ferrari'],
  1984: ['McLaren'],
  1985: ['McLaren'],
  1986: ['Williams'],
  1987: ['Williams'],
  1988: ['McLaren'],
  1989: ['McLaren'],
  1990: ['McLaren'],
  1991: ['McLaren'],
  1992: ['Williams'],
  1993: ['Williams'],
  1994: ['Williams'],
  1995: ['Benetton'],
  1996: ['Williams'],
  1997: ['Williams'],
  1998: ['McLaren'],
  1999: ['Ferrari'],
  2000: ['Ferrari'],
  2001: ['Ferrari'],
  2002: ['Ferrari'],
  2003: ['Ferrari'],
  2004: ['Ferrari'],
  2005: ['Renault'],
  2006: ['Renault'],
  2007: ['Ferrari'],
  2008: ['Ferrari'],
  2009: ['Brawn'],
  2010: ['Red Bull'],
  2011: ['Red Bull'],
  2012: ['Red Bull'],
  2013: ['Red Bull'],
  2014: ['Mercedes'],
  2015: ['Mercedes'],
  2016: ['Mercedes'],
  2017: ['Mercedes'],
  2018: ['Mercedes'],
  2019: ['Mercedes'],
  2020: ['Mercedes'],
  2021: ['Mercedes'],
  2022: ['Red Bull'],
  2023: ['Red Bull'],
  2024: ['McLaren'],
  2025: ['McLaren'],
}

function cleanString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s]/g, '')     // Alphanumeric + spaces only
    .trim()
}

export function isDriverChampion(year: number | null, driverName: string | null): boolean {
  if (!year || !driverName) return false
  const champions = WDC_MAP[year]
  if (!champions) return false
  const cleanDriver = cleanString(driverName)
  return champions.some(champ => {
    const cleanChamp = cleanString(champ)
    return cleanDriver.includes(cleanChamp)
  })
}

export function isTeamChampion(year: number | null, teamName: string | null): boolean {
  if (!year || !teamName) return false
  const champions = WCC_MAP[year]
  if (!champions) return false
  const cleanTeam = cleanString(teamName)
  return champions.some(champ => {
    const cleanChamp = cleanString(champ)
    return cleanTeam.includes(cleanChamp)
  })
}
