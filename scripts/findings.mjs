// Computes the README / Pages findings from the current table. Every number here comes from the rows passed in;
// nothing is hard-coded, so the findings move with each weekly snapshot.
//
//   node scripts/findings.mjs            print the findings as Markdown
//   node scripts/findings.mjs --write    also rewrite the README block and docs/data/findings.json

import {readFile, writeFile, mkdir} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://grassyknees.com";
export const CATEGORY_COLUMNS = {
  outdoors: "Outdoors", arts_and_crafts: "Arts & crafts", stem_and_discovery: "STEM & discovery",
  sports_and_play: "Sports & play", community: "Community", cooking: "Cooking", other: "Other",
};

const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
const usd = (n) => "$" + (Number.isInteger(n) ? n : n.toFixed(2));
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const ranks = (xs) => {
  // average ranks, for Spearman's rho with ties
  const idx = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]), r = new Array(xs.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
};
const pearson = (x, y) => {
  const n = x.length, mx = x.reduce((a, b) => a + b) / n, my = y.reduce((a, b) => a + b) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
};
const shortName = (r) => r.metro.split("–")[0];
const link = (r) => `[${shortName(r)}](${SITE}/${r.metro_id})`;
const list = (items) => items.length < 2 ? items.join("") : items.slice(0, -1).join(", ") + " and " + items.at(-1);

export function computeFindings(rows, {minEvents = 50} = {}) {
  const out = [];
  const totalEvents = rows.reduce((a, r) => a + r.events_next_30_days, 0);
  const totalFree = rows.reduce((a, r) => a + r.free_events_next_30_days, 0);

  // 1. Free-event share
  const withEvents = rows.filter((r) => r.events_next_30_days >= minEvents)
    .map((r) => ({r, share: r.free_events_next_30_days / r.events_next_30_days}))
    .sort((a, b) => b.share - a.share);
  const fmtShare = ({r, share}) => `${link(r)} (${Math.round(share * 100)}% of ${r.events_next_30_days})`;
  out.push({
    id: "free-share",
    title: "Where kids' events are most often free",
    text: `Across all ${rows.length} metros, ${pct(totalFree, totalEvents)}% of the ${totalEvents.toLocaleString("en-US")} dated events in the next 30 days are free. ` +
      `The highest free shares are in ${list(withEvents.slice(0, 3).map(fmtShare))}; the lowest are in ${list(withEvents.slice(-3).reverse().map(fmtShare))}. ` +
      `(Metros with at least ${minEvents} upcoming events.)`,
  });

  // 2. Median paid ticket
  const priced = rows.filter((r) => typeof r.median_paid_event_price_usd === "number")
    .sort((a, b) => b.median_paid_event_price_usd - a.median_paid_event_price_usd);
  const fmtPrice = (r) => `${link(r)} (${usd(r.median_paid_event_price_usd)})`;
  out.push({
    id: "ticket-price",
    title: "What a paid kids' event costs",
    text: `The typical metro's median paid ticket is ${usd(median(priced.map((r) => r.median_paid_event_price_usd)))} (median of ${priced.length} metro medians; usually one child's ticket as the organizer lists it). ` +
      `The most expensive are ${list(priced.slice(0, 3).map(fmtPrice))}; the cheapest are ${list(priced.slice(-3).reverse().map(fmtPrice))}.`,
  });

  // 3. Category mix
  const catTotals = Object.keys(CATEGORY_COLUMNS).map((c) => [c, rows.reduce((a, r) => a + r[c], 0)]).sort((a, b) => b[1] - a[1]);
  const catSum = catTotals.reduce((a, [, n]) => a + n, 0);
  const topCount = (c) => rows.filter((r) => Object.keys(CATEGORY_COLUMNS).every((o) => r[c] >= r[o])).length;
  const [first, second, third] = catTotals;
  const leaderNot = rows.filter((r) => Object.keys(CATEGORY_COLUMNS).some((o) => r[o] > r[first[0]]))
    .map((r) => `${link(r)} (${CATEGORY_COLUMNS[Object.keys(CATEGORY_COLUMNS).reduce((a, b) => (r[b] > r[a] ? b : a))]})`);
  out.push({
    id: "category-mix",
    title: "What kind of activities there are",
    text: `${CATEGORY_COLUMNS[first[0]]} is the largest category: ${pct(first[1], catSum)}% of ${catSum.toLocaleString("en-US")} current listings, ahead of ${CATEGORY_COLUMNS[second[0]]} (${pct(second[1], catSum)}%) and ${CATEGORY_COLUMNS[third[0]]} (${pct(third[1], catSum)}%). ` +
      `It leads (or ties) in ${topCount(first[0])} of ${rows.length} metros` + (leaderNot.length ? `; the exceptions are ${list(leaderNot)}.` : "."),
  });

  // 4. Free share vs. ticket price
  const both = rows.filter((r) => r.events_next_30_days >= minEvents && typeof r.median_paid_event_price_usd === "number");
  const rho = pearson(ranks(both.map((r) => r.free_events_next_30_days / r.events_next_30_days)), ranks(both.map((r) => r.median_paid_event_price_usd)));
  const strength = Math.abs(rho) < 0.1 ? "no" : Math.abs(rho) < 0.3 ? "only a weak" : Math.abs(rho) < 0.5 ? "a moderate" : "a strong";
  out.push({
    id: "free-vs-price",
    title: rho <= -0.3 ? "Free-heavy metros tend to have cheaper paid tickets" : rho >= 0.3 ? "Free-heavy metros tend to have pricier paid tickets" : "Free-heavy metros are not necessarily cheaper",
    text: `Across the ${both.length} metros with at least ${minEvents} upcoming events, there is ${strength} rank correlation between a metro's free-event share and its median paid ticket (Spearman's rho = ${rho.toFixed(2)}). ` +
      (Math.abs(rho) < 0.3 ? "A metro with many free events does not reliably have cheaper paid ones." : "The relationship is across metros, not a rule for any one of them."),
    rho: Math.round(rho * 1000) / 1000,
  });

  // 5. Coverage depth (a caveat users need before comparing metros)
  const dens = rows.map((r) => ({r, d: (r.listings_current / r.metro_population) * 1e5})).sort((a, b) => b.d - a.d);
  const fmtD = ({r, d}) => `${link(r)} (${d.toFixed(1)})`;
  out.push({
    id: "coverage-depth",
    title: "Read the counts as catalog coverage, not per-capita supply",
    text: `Current listings per 100,000 residents range from ${fmtD(dens[0])} down to ${fmtD(dens.at(-1))}, with a median of ${median(dens.map((x) => x.d)).toFixed(1)}. ` +
      `Large metros are not proportionally larger in the catalog, so compare shares and medians across metros, not raw counts.`,
  });
  return out;
}

export function findingsMarkdown(findings, asOf) {
  return `_Computed from the ${asOf} snapshot by \`scripts/findings.mjs\`._\n\n` +
    findings.map((f, i) => `${i + 1}. **${f.title}.** ${f.text}`).join("\n") + "\n";
}

const START = "<!-- findings:start -->", END = "<!-- findings:end -->";
export async function writeFindings(json) {
  const findings = computeFindings(json.rows);
  const asOf = json.lastChecked || json.generated?.slice(0, 10);
  const readmePath = path.join(ROOT, "README.md");
  const readme = await readFile(readmePath, "utf8");
  const a = readme.indexOf(START), b = readme.indexOf(END);
  if (a < 0 || b < a) throw new Error("README.md is missing the findings markers");
  await writeFile(readmePath, readme.slice(0, a + START.length) + "\n" + findingsMarkdown(findings, asOf) + readme.slice(b));
  await mkdir(path.join(ROOT, "docs/data"), {recursive: true});
  await writeFile(path.join(ROOT, "docs/data/findings.json"), JSON.stringify({asOf, findings}, null, 2) + "\n");
  return findings;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const json = JSON.parse(await readFile(path.join(ROOT, "data/family-activities-by-metro.json"), "utf8"));
  if (process.argv.includes("--write")) await writeFindings(json);
  process.stdout.write(findingsMarkdown(computeFindings(json.rows), json.lastChecked));
}
