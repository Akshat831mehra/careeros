# Indian localities dataset

`indian-localities.json` is a generated prefix-search dataset of Indian cities,
towns, administrative seats and urban localities. It is **not** a hand-curated
list of popular cities.

Source: [GeoNames](https://www.geonames.org/) country file for India
(`https://download.geonames.org/export/dump/IN.zip`), licensed under
[Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).

Generation rules:

- feature class `P` (populated place)
- feature codes for administrative seats, `PPL`, `PPLL` and `PPLX` localities
- `PPL` entries require population >= 1000
- ASCII name, deduplicated case-insensitively (highest population wins)
- stored as `[name, population]` pairs, sorted by name

The autocomplete API uses the full OpenStreetMap providers (Photon and
Nominatim) alongside this dataset, so coverage is the union of all sources.
