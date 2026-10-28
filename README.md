# Family activities by U.S. metro area

Weekly per-metro counts of kids' and family activities across **42 U.S. metropolitan areas**: how many events, classes and places are listed, how many upcoming events are free, what a paid ticket typically costs, and which kinds of activities dominate. Published by [Grassy Knees](https://grassyknees.com), a free directory of kids' events and places, under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

- **Latest table:** [`data/family-activities-by-metro.csv`](data/family-activities-by-metro.csv) (also [JSON](data/family-activities-by-metro.json))
- **History:** one dated file per week in [`data/snapshots/`](data/snapshots/), same columns
- **Browse it:** [grassyknees.github.io/us-family-activities-by-metro](https://grassyknees.github.io/us-family-activities-by-metro/) (sortable table)
- **Schema:** [`datapackage.json`](datapackage.json) ([Frictionless Data](https://specs.frictionlessdata.io/data-package/))
- **Upstream:** [grassyknees.com/data](https://grassyknees.com/data)

## What it is and how it is collected

Grassy Knees lists family events, classes/programs and places for kids. Every listing is researched from the **organizer's own page** (a library calendar, a museum's events page, a parks department, a venue's site), not copied from aggregators, and each listing records the date it was last checked. Listings are **re-checked on a daily research run**: dates, prices and cancellations are confirmed against the organizer's page, and listings that have ended drop out.

This repository holds **totals only**. Each row is one metro area, and each number is a count, share or median computed over that metro's listings on the day of the snapshot. The individual listings are not part of the dataset and are not published here.

What the numbers mean, and what they do not:

- They count **what Grassy Knees lists**, not every kids' event in a metro. Coverage depth differs between metros (see finding 5), so compare **shares and medians** across metros rather than raw counts.
- "Next 30 days" is relative to the snapshot date. A snapshot taken before a holiday will show more seasonal events.
- Prices are the organizer's published price, usually one child's ticket. Free means free to attend.
- Metro areas are U.S. Census Bureau metropolitan statistical areas; `metro_population` is the Census Bureau's population estimate.

The weekly [GitHub Actions workflow](.github/workflows/snapshot.yml) runs [`scripts/snapshot.mjs`](scripts/snapshot.mjs), which downloads the current CSV and JSON from grassyknees.com, checks that the columns have not changed, writes the latest files and a dated snapshot, and recomputes the findings below.

## Columns

| Column | Type | Description |
|---|---|---|
| `metro_id` | string | Metro identifier. The metro's page is `https://grassyknees.com/<metro_id>`. |
| `metro` | string | Metropolitan statistical area name, e.g. `New York–Newark–Jersey City`. |
| `states` | string | States the metro spans, e.g. `NY / NJ`. |
| `metro_population` | integer | Census Bureau population estimate for the metro area. |
| `listings_current` | integer | Events, classes/programs and places that have not ended. |
| `events_next_30_days` | integer | Dated events taking place in the next 30 days. |
| `free_events_next_30_days` | integer | Of those, events that are free to attend. |
| `free_share_pct` | integer | `free_events_next_30_days / events_next_30_days`, whole percent. Empty if there are no upcoming events. |
| `programs` | integer | Current listings that are classes, camps or multi-session programs. |
| `places` | integer | Current listings that are places to visit (museums, parks, rinks, play spaces). |
| `outdoors` | integer | Current listings in the Outdoors category. |
| `arts_and_crafts` | integer | Arts & crafts. |
| `stem_and_discovery` | integer | STEM & discovery. |
| `sports_and_play` | integer | Sports & play. |
| `community` | integer | Community (festivals, library and community events). |
| `cooking` | integer | Cooking. |
| `other` | integer | Anything else. The seven category columns sum to `listings_current`. |
| `median_paid_event_price_usd` | number | Median published price of paid events in the next 30 days, in USD. Empty if none has a price. |
| `towns_with_listings` | integer | Distinct towns and neighborhoods in the current listings' addresses. |
| `last_checked` | date | Latest date a listing in the metro was checked against the organizer's page. |

The JSON file has the same rows under `rows`, plus `title`, `description`, `license`, `credit`, `lastChecked` and `generated`.

## Findings

<!-- findings:start -->
_Computed from the 2026-10-28 snapshot by `scripts/findings.mjs`._

1. **Where kids' events are most often free.** Across all 42 metros, 33.6% of the 7,041 dated events in the next 30 days are free. The highest free shares are in [Denver](https://grassyknees.com/denver) (69% of 369), [Raleigh](https://grassyknees.com/raleigh) (66% of 77) and [Cleveland](https://grassyknees.com/cleveland) (64% of 58); the lowest are in [Providence](https://grassyknees.com/providence) (17% of 52), [Pittsburgh](https://grassyknees.com/pittsburgh) (18% of 179) and [Philadelphia](https://grassyknees.com/philadelphia) (20% of 202). (Metros with at least 50 upcoming events.)
2. **What a paid kids' event costs.** The typical metro's median paid ticket is $19.25 (median of 42 metro medians; usually one child's ticket as the organizer lists it). The most expensive are [San Francisco](https://grassyknees.com/san-francisco) ($29.95), [Houston](https://grassyknees.com/houston) ($29) and [San Antonio](https://grassyknees.com/san-antonio) ($29); the cheapest are [Washington](https://grassyknees.com/washington-dc) ($10), [Raleigh](https://grassyknees.com/raleigh) ($11.50) and [Cincinnati](https://grassyknees.com/cincinnati) ($12).
3. **What kind of activities there are.** Community is the largest category: 32.9% of 14,988 current listings, ahead of Arts & crafts (24.8%) and Outdoors (13.7%). It leads (or ties) in 38 of 42 metros; the exceptions are [New York](https://grassyknees.com/new-york) (Arts & crafts), [Boston](https://grassyknees.com/boston) (Arts & crafts), [San Francisco](https://grassyknees.com/san-francisco) (Arts & crafts) and [Minneapolis](https://grassyknees.com/minneapolis) (Arts & crafts).
4. **Free-heavy metros are not necessarily cheaper.** Across the 41 metros with at least 50 upcoming events, there is no rank correlation between a metro's free-event share and its median paid ticket (Spearman's rho = -0.04). A metro with many free events does not reliably have cheaper paid ones.
5. **Read the counts as catalog coverage, not per-capita supply.** Current listings per 100,000 residents range from [Denver](https://grassyknees.com/denver) (25.2) down to [New York](https://grassyknees.com/new-york) (2.9), with a median of 10.2. Large metros are not proportionally larger in the catalog, so compare shares and medians across metros, not raw counts.
<!-- findings:end -->

## Quick start

```python
import pandas as pd
df = pd.read_csv("https://raw.githubusercontent.com/grassyknees/us-family-activities-by-metro/main/data/family-activities-by-metro.csv")
df.sort_values("free_share_pct", ascending=False).head()
```

```r
df <- read.csv("https://raw.githubusercontent.com/grassyknees/us-family-activities-by-metro/main/data/family-activities-by-metro.csv")
```

```sh
node scripts/snapshot.mjs     # refresh data/ and write data/snapshots/<today>.csv (Node 18+, no dependencies)
node scripts/findings.mjs     # print the findings for the current table
```

## Metro pages

Each row links to a metro page on grassyknees.com with that metro's current listings. The 15 largest metros:

| # | Metro area | States | `metro_id` |
|---|---|---|---|
| 1 | [New York–Newark–Jersey City](https://grassyknees.com/new-york) | NY / NJ | `new-york` |
| 2 | [Los Angeles–Long Beach–Anaheim](https://grassyknees.com/los-angeles) | CA | `los-angeles` |
| 3 | [Chicago–Naperville–Elgin](https://grassyknees.com/chicago) | IL / IN | `chicago` |
| 4 | [Dallas–Fort Worth–Arlington](https://grassyknees.com/dallas-fort-worth) | TX | `dallas-fort-worth` |
| 5 | [Houston–Pasadena–The Woodlands](https://grassyknees.com/houston) | TX | `houston` |
| 6 | [Atlanta–Sandy Springs–Roswell](https://grassyknees.com/atlanta) | GA | `atlanta` |
| 7 | [Washington–Arlington–Alexandria](https://grassyknees.com/washington-dc) | DC / VA / MD / WV | `washington-dc` |
| 8 | [Miami–Fort Lauderdale–West Palm Beach](https://grassyknees.com/miami) | FL | `miami` |
| 9 | [Philadelphia–Camden–Wilmington](https://grassyknees.com/philadelphia) | PA / NJ / DE / MD | `philadelphia` |
| 10 | [Phoenix–Mesa–Chandler](https://grassyknees.com/phoenix) | AZ | `phoenix` |
| 11 | [Boston–Cambridge–Newton](https://grassyknees.com/boston) | MA / NH | `boston` |
| 12 | [Riverside–San Bernardino–Ontario](https://grassyknees.com/riverside) | CA | `riverside` |
| 13 | [San Francisco–Oakland–Fremont](https://grassyknees.com/san-francisco) | CA | `san-francisco` |
| 14 | [Detroit–Warren–Dearborn](https://grassyknees.com/detroit) | MI | `detroit` |
| 15 | [Seattle–Tacoma–Bellevue](https://grassyknees.com/seattle) | WA | `seattle` |

All 42 metros are linked from the [table on the Pages site](https://grassyknees.github.io/us-family-activities-by-metro/).

## How to cite

> Grassy Knees. *Family activities by U.S. metro area* (snapshot YYYY-MM-DD). https://grassyknees.com/data. Licensed under CC BY 4.0.

Use the date of the snapshot file you used. GitHub's "Cite this repository" button reads [`CITATION.cff`](CITATION.cff). For a short credit line in an article or app: **Data: Grassy Knees (grassyknees.com), CC BY 4.0**, linked to https://grassyknees.com/data.

## License

The data in `data/` and `docs/data/` is licensed under the [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/) ([`LICENSE`](LICENSE)). You may share and adapt it for any purpose, including commercially, as long as you credit Grassy Knees (grassyknees.com) and link to the license. `metro_population` comes from the U.S. Census Bureau (public domain). The scripts and the Pages site are under the MIT License ([`LICENSE-CODE`](LICENSE-CODE)).

Questions or corrections: hello@grassyknees.com.
