const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";

/*
  Location search.

  Uses Open-Meteo's geocoder rather than OpenWeatherMap's because it returns
  population, which is what lets real cities outrank identically-named hamlets
  (searching "London" should not lead with London, Ohio).

  It also handles the case geocoders are bad at: country names. Every geocoder
  indexes settlements, so "Netherlands" matches a village in Missouri and
  nothing else. When the query is recognisably a country we look up its capital
  instead and lead with that.
*/

// ISO 3166-1 alpha-2 -> capital city. Countries missing from this map simply
// fall through to the ordinary search, so partial coverage is never a
// regression - it just means that country isn't answered with its capital.
const CAPITALS = {
  AD: "Andorra la Vella", AE: "Abu Dhabi", AF: "Kabul", AG: "St John's",
  AL: "Tirana", AM: "Yerevan", AO: "Luanda", AR: "Buenos Aires", AT: "Vienna",
  AU: "Canberra", AZ: "Baku", BA: "Sarajevo", BB: "Bridgetown", BD: "Dhaka",
  BE: "Brussels", BF: "Ouagadougou", BG: "Sofia", BH: "Manama", BI: "Gitega",
  BJ: "Porto-Novo", BN: "Bandar Seri Begawan", BO: "La Paz", BR: "Brasilia",
  BS: "Nassau", BT: "Thimphu", BW: "Gaborone", BY: "Minsk", BZ: "Belmopan",
  CA: "Ottawa", CD: "Kinshasa", CF: "Bangui", CG: "Brazzaville", CH: "Bern",
  CI: "Yamoussoukro", CL: "Santiago", CM: "Yaounde", CN: "Beijing",
  CO: "Bogota", CR: "San Jose", CU: "Havana", CV: "Praia", CY: "Nicosia",
  CZ: "Prague", DE: "Berlin", DJ: "Djibouti", DK: "Copenhagen", DM: "Roseau",
  DO: "Santo Domingo", DZ: "Algiers", EC: "Quito", EE: "Tallinn", EG: "Cairo",
  ER: "Asmara", ES: "Madrid", ET: "Addis Ababa", FI: "Helsinki", FJ: "Suva",
  FM: "Palikir", FR: "Paris", GA: "Libreville", GB: "London", GD: "St. George's",
  GE: "Tbilisi", GH: "Accra", GM: "Banjul", GN: "Conakry", GQ: "Malabo",
  GR: "Athens", GT: "Guatemala City", GW: "Bissau", GY: "Georgetown",
  HN: "Tegucigalpa", HR: "Zagreb", HT: "Port-au-Prince", HU: "Budapest",
  ID: "Jakarta", IE: "Dublin", IL: "Jerusalem", IN: "New Delhi", IQ: "Baghdad",
  IR: "Tehran", IS: "Reykjavik", IT: "Rome", JM: "Kingston", JO: "Amman",
  JP: "Tokyo", KE: "Nairobi", KG: "Bishkek", KH: "Phnom Penh", KI: "Tarawa",
  KM: "Moroni", KN: "Basseterre", KP: "Pyongyang", KR: "Seoul", KW: "Kuwait City",
  KZ: "Astana", LA: "Vientiane", LB: "Beirut", LC: "Castries",
  LI: "Vaduz", LK: "Colombo", LR: "Monrovia", LS: "Maseru", LT: "Vilnius",
  LU: "Luxembourg", LV: "Riga", LY: "Tripoli", MA: "Rabat", MC: "Monaco",
  MD: "Chisinau", ME: "Podgorica", MG: "Antananarivo", MH: "Majuro",
  MK: "Skopje", ML: "Bamako", MM: "Naypyidaw", MN: "Ulaanbaatar", MR: "Nouakchott",
  MT: "Valletta", MU: "Port Louis", MV: "Male", MW: "Lilongwe", MX: "Mexico City",
  MY: "Kuala Lumpur", MZ: "Maputo", NA: "Windhoek", NE: "Niamey", NG: "Abuja",
  NI: "Managua", NL: "Amsterdam", NO: "Oslo", NP: "Kathmandu", NR: "Yaren",
  NZ: "Wellington", OM: "Muscat", PA: "Panama City", PE: "Lima",
  PG: "Port Moresby", PH: "Manila", PK: "Islamabad", PL: "Warsaw", PT: "Lisbon",
  PW: "Ngerulmud", PY: "Asuncion", QA: "Doha", RO: "Bucharest", RS: "Belgrade",
  RU: "Moscow", RW: "Kigali", SA: "Riyadh", SB: "Honiara", SC: "Victoria",
  SD: "Khartoum", SE: "Stockholm", SG: "Singapore", SI: "Ljubljana",
  SK: "Bratislava", SL: "Freetown", SM: "San Marino", SN: "Dakar",
  SO: "Mogadishu", SR: "Paramaribo", SS: "Juba", SV: "San Salvador",
  SY: "Damascus", SZ: "Mbabane", TD: "N'Djamena", TG: "Lome", TH: "Bangkok",
  TJ: "Dushanbe", TL: "Dili", TM: "Ashgabat", TN: "Tunis", TO: "Nuku'alofa",
  TR: "Ankara", TT: "Port of Spain", TV: "Funafuti", TW: "Taipei",
  TZ: "Dodoma", UA: "Kyiv", UG: "Kampala", US: "Washington", UY: "Montevideo",
  UZ: "Tashkent", VA: "Vatican City", VC: "Kingstown", VE: "Caracas",
  VN: "Hanoi", VU: "Port Vila", WS: "Apia", YE: "Sanaa", ZA: "Cape Town",
  ZM: "Lusaka", ZW: "Harare",

  // Territories and dependencies that get searched like countries.
  AW: "Oranjestad", BM: "Hamilton", CW: "Willemstad", FO: "Torshavn",
  GG: "Saint Peter Port", GI: "Gibraltar", GL: "Nuuk", GU: "Hagatna",
  HK: "Hong Kong", IM: "Douglas", JE: "Saint Helier", KY: "George Town",
  MO: "Macau", NC: "Noumea", PF: "Papeete", PR: "San Juan", PS: "Ramallah",
  RE: "Saint-Denis", VG: "Road Town", VI: "Charlotte Amalie", XK: "Pristina",
};

// Common ways people write countries that don't match the canonical name.
const ALIASES = {
  usa: "US", "u.s.": "US", "u.s.a.": "US", america: "US",
  uk: "GB", "u.k.": "GB", britain: "GB", "great britain": "GB", england: "GB",
  uae: "AE", holland: "NL", "the netherlands": "NL",
  "south korea": "KR", "north korea": "KP", "czech republic": "CZ",
  "ivory coast": "CI", burma: "MM", "cape verde": "CV", "east timor": "TL",
  swaziland: "SZ", macedonia: "MK", vatican: "VA",
  // Intl renders these with qualifiers or spellings people don't type.
  turkey: "TR", "hong kong": "HK", macau: "MO", macao: "MO",
  palestine: "PS", drc: "CD", "saudi arabia": "SA", russia: "RU",
};

const normalise = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/*
  Indexes one display name against a country code.

  Two wrinkles, both learned the hard way:

  - Names collide, because Intl still resolves withdrawn codes. "Germany" is
    both DD (East Germany) and DE, and DD sorts first - which silently broke
    searching for Germany. The tiebreak is to prefer whichever code we hold a
    capital for, since a code without one is no use to us anyway.

  - Some names carry qualifiers people don't type: "Myanmar (Burma)",
    "Congo - Kinshasa". Those get indexed under their plain form too.
*/
const variantsOf = (label) => {
  const keys = new Set();
  // Full name, plus the form without any qualifier.
  for (const form of [label, label.replace(/\(.*?\)/g, "").split(" - ")[0]]) {
    const base = normalise(form);
    if (!base) continue;

    // Nobody types "Antigua & Barbuda" or "St. Lucia" exactly as Intl spells
    // them. Order matters: dropping the periods first is what turns
    // "st. lucia" into "st lucia", which the saint/st swap can then act on.
    const forms = new Set([base]);
    for (const form of [...forms]) forms.add(form.replace(/\./g, ""));
    for (const form of [...forms]) forms.add(form.replace(/&/g, "and"));
    for (const form of [...forms]) forms.add(form.replace(/\bthe\s/g, ""));
    for (const form of [...forms]) {
      forms.add(form.replace(/\bst\s/g, "saint "));
      forms.add(form.replace(/\bsaint\s/g, "st "));
    }
    for (const variant of forms) {
      keys.add(variant.replace(/\s+/g, " ").trim());
    }
  }
  return [...keys].filter(Boolean);
};

const indexCountryName = (map, label, code) => {
  for (const key of variantsOf(label)) {
    const existing = map.get(key);
    if (!existing || (!CAPITALS[existing] && CAPITALS[code])) {
      map.set(key, code);
    }
  }
};

// The query gets the same rewrites as the index, so "Saint Vincent and the
// Grenadines" finds the entry Intl spells "St. Vincent & Grenadines".
const lookupCountry = (query) => {
  const index = getCountryIndex();
  for (const key of variantsOf(query)) {
    const code = index.get(key);
    if (code) return code;
  }
  return null;
};

// Built once per warm lambda: every resolvable region code, keyed by its
// English display name. Intl already ships this data, so there's no country
// name table to maintain here.
let countryIndex = null;
const getCountryIndex = () => {
  if (countryIndex) return countryIndex;
  countryIndex = new Map();

  const display = new Intl.DisplayNames(["en"], { type: "region" });
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const first of letters) {
    for (const second of letters) {
      const code = first + second;
      let label;
      try {
        label = display.of(code);
      } catch (error) {
        continue;
      }
      if (label && label !== code) indexCountryName(countryIndex, label, code);
    }
  }

  // Hand-written aliases are applied last so they always win.
  for (const [alias, code] of Object.entries(ALIASES)) {
    countryIndex.set(normalise(alias), code);
  }
  return countryIndex;
};

const SETTLEMENT = /^PPL/;

const shape = (result) => ({
  name: result.name,
  state: result.admin1 || "",
  country: result.country || "",
  countryCode: result.country_code || "",
  lat: result.latitude,
  lon: result.longitude,
  population: result.population || 0,
});

// Resolves to [] rather than throwing: the two lookups run concurrently, and a
// blip on the capital request shouldn't take the ordinary matches down with it.
async function search(name, countryCode, count) {
  const params = new URLSearchParams({
    name,
    count: String(count),
    language: "en",
    format: "json",
  });
  if (countryCode) params.set("countryCode", countryCode);

  let data;
  try {
    const response = await fetch(`${GEO_URL}?${params}`);
    if (!response.ok) return [];
    data = await response.json();
  } catch (error) {
    console.error(`Geocoding lookup failed for "${name}":`, error.message);
    return [];
  }
  return (data.results || [])
    // Drop museums, parks and other non-places the geocoder happily returns,
    // and anything without usable coordinates - the whole point of a match is
    // being able to fetch weather for it.
    .filter(
      (r) =>
        SETTLEMENT.test(r.feature_code || "") &&
        Number.isFinite(r.latitude) &&
        Number.isFinite(r.longitude)
    )
    .map(shape);
}

export default async function handler(req, res) {
  const query = (req.query.q || "").trim();
  if (query.length < 2) return res.status(200).json([]);

  try {
    const countryCode = lookupCountry(query);
    const capitalName = countryCode ? CAPITALS[countryCode] : null;

    const [matches, capitalMatches] = await Promise.all([
      search(query, null, 10),
      // Ask for a handful, not one: for places like Luxembourg the country
      // entry outranks the city, and it gets filtered out as a non-settlement.
      capitalName ? search(capitalName, countryCode, 5) : Promise.resolve([]),
    ]);

    // Biggest place first; an unknown population sorts last rather than first.
    matches.sort((a, b) => b.population - a.population);

    const results = [...capitalMatches.slice(0, 1), ...matches];
    const seen = new Set();
    const deduped = results.filter((place) => {
      const key = `${place.lat.toFixed(2)},${place.lon.toFixed(2)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.status(200).json(deduped.slice(0, 5));
  } catch (error) {
    console.error("Error fetching location matches:", error);
    res.status(500).json({ error: "Failed to fetch location matches" });
  }
}
