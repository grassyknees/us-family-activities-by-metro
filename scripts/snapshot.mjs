#!/usr/bin/env node
// Fetches the current open-data files from grassyknees.com and writes:
//   data/family-activities-by-metro.csv / .json   latest copy
//   data/snapshots/YYYY-MM-DD.csv                  dated copy (UTC date of the run)
//   docs/data/family-activities-by-metro.json      copy the GitHub Pages site reads
//   README findings block + docs/data/findings.json
// Node 18+, no dependencies. Exits non-zero if the files are missing, malformed or the columns changed.
//
//   node scripts/snapshot.mjs [--date YYYY-MM-DD] [--base https://grassyknees.com]

import {writeFile, mkdir, copyFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {writeFindings} from "./findings.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const BASE = (arg("--base") || "https://grassyknees.com").replace(/\/$/, "");
const DATE = arg("--date") || new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(DATE)) throw new Error(`Bad --date ${DATE}`);

// Must match datapackage.json. A change here is a schema change: update datapackage.json and the README too.
export const COLUMNS = ["metro_id", "metro", "states", "metro_population", "listings_current", "events_next_30_days",
  "free_events_next_30_days", "free_share_pct", "programs", "places", "outdoors", "arts_and_crafts", "stem_and_discovery",
  "sports_and_play", "community", "cooking", "other", "median_paid_event_price_usd", "towns_with_listings", "last_checked"];

async function get(file) {
  const url = `${BASE}/data/${file}`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {headers: {"user-agent": "grassyknees-open-data snapshot (+https://github.com/grassyknees)"}});
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 5000 * attempt));
    }
  }
}

const [csv, jsonText] = await Promise.all([get("family-activities-by-metro.csv"), get("family-activities-by-metro.json")]);
const json = JSON.parse(jsonText);

// Sanity checks: same columns in both files, one row per metro, counts are counts.
const header = csv.split("\n")[0].trim().split(",");
if (header.join() !== COLUMNS.join()) throw new Error(`CSV columns changed:\n  got      ${header.join()}\n  expected ${COLUMNS.join()}`);
if (!Array.isArray(json.rows) || json.rows.length < 1) throw new Error("JSON has no rows");
for (const r of json.rows) {
  const keys = Object.keys(r);
  if (keys.join() !== COLUMNS.join()) throw new Error(`JSON columns changed for ${r.metro_id}: ${keys.join()}`);
  if (!(r.listings_current >= 0) || !(r.events_next_30_days >= r.free_events_next_30_days)) throw new Error(`Implausible row ${r.metro_id}`);
}
const csvRows = csv.trim().split("\n").length - 1;
if (csvRows !== json.rows.length) throw new Error(`CSV has ${csvRows} rows, JSON has ${json.rows.length}`);

const out = (p) => path.join(ROOT, p);
await mkdir(out("data/snapshots"), {recursive: true});
await mkdir(out("docs/data"), {recursive: true});
await writeFile(out("data/family-activities-by-metro.csv"), csv);
await writeFile(out("data/family-activities-by-metro.json"), JSON.stringify(json, null, 2) + "\n");
await writeFile(out(`data/snapshots/${DATE}.csv`), csv);
await copyFile(out("data/family-activities-by-metro.json"), out("docs/data/family-activities-by-metro.json"));
await writeFindings(json);

console.log(`Snapshot ${DATE}: ${json.rows.length} metros, latest check ${json.lastChecked}, from ${BASE}`);
