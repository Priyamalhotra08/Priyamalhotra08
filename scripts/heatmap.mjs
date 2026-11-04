// Builds a burgundy contribution heatmap SVG from Priya's REAL public GitHub
// contribution calendar. Runs daily in GitHub Actions (see .github/workflows/snake.yml).
import { writeFileSync, mkdirSync } from "node:fs";

const USER = process.env.GH_USER || "Priyamalhotra08";
const OUT = process.env.OUT || "dist/heatmap.svg";
const C = { mid: "#10070C", wine: "#190B12", burg: "#451126", acc: "#701A3D", rose: "#C77B9B", pale: "#E5B5C7", ivory: "#F8F0F3" };
const LEVEL = { NONE: "#22101a", FIRST_QUARTILE: C.burg, SECOND_QUARTILE: C.acc, THIRD_QUARTILE: C.rose, FOURTH_QUARTILE: C.pale };
const MONO = "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";
const SERIF = "Georgia,'Times New Roman',serif";

async function load() {
  if (process.env.MOCK) return JSON.parse(process.env.MOCK);
  const q = `query($u:String!){user(login:$u){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`;
  const r = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${process.env.GITHUB_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: q, variables: { u: USER } }),
  });
  const j = await r.json();
  if (!j.data) throw new Error(JSON.stringify(j));
  return j.data.user.contributionsCollection.contributionCalendar;
}

const cal = await load();
const days = cal.weeks.flatMap((w) => w.contributionDays);
let best = 0, run = 0, bestEnd = null, bestStart = null, curStart = null, active = 0;
for (const d of days) {
  if (d.contributionCount > 0) { active++; if (!run) curStart = d.date; run++; if (run > best) { best = run; bestStart = curStart; bestEnd = d.date; } }
  else run = 0;
}
const fmt = (s) => new Date(s + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

const W = 1000, cell = 13, gap = 3, x0 = 70, y0 = 112;
const weeks = cal.weeks;
const gridW = weeks.length * (cell + gap);
const ox = Math.round((W - gridW) / 2) + 20;
let cells = "", months = "", lastM = -1;
weeks.forEach((w, wi) => {
  w.contributionDays.forEach((d) => {
    const dow = new Date(d.date + "T00:00:00Z").getUTCDay();
    const x = ox + wi * (cell + gap), y = y0 + dow * (cell + gap);
    const delay = (wi * 0.025).toFixed(2);
    cells += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3" fill="${LEVEL[d.contributionLevel] || LEVEL.NONE}"><title>${d.contributionCount} on ${d.date}</title><animate attributeName="opacity" values="0;1" dur=".6s" begin="${delay}s" fill="freeze"/></rect>`;
  });
  const m = new Date(w.contributionDays[0].date + "T00:00:00Z").getUTCMonth();
  if (m !== lastM && wi < weeks.length - 2) {
    months += `<text x="${ox + wi * (cell + gap)}" y="${y0 - 10}" font-family="${MONO}" font-size="9" letter-spacing="1" fill="${C.rose}">${["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][m]}</text>`;
    lastM = m;
  }
});
const dlab = [["MON", 1], ["WED", 3], ["FRI", 5]].map(([t, i]) => `<text x="${ox - 10}" y="${y0 + i * (cell + gap) + 10}" text-anchor="end" font-family="${MONO}" font-size="8.5" fill="${C.rose}">${t}</text>`).join("");
const legend = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"].map((k, i) => `<rect x="${880 + i * 15}" y="246" width="11" height="11" rx="2" fill="${LEVEL[k]}"/>`).join("");
const today = new Date().toISOString().slice(0, 10);
const streak = best ? `LONGEST STREAK · ${best} DAY${best > 1 ? "S" : ""} · ${fmt(bestStart).toUpperCase()} — ${fmt(bestEnd).toUpperCase()}` : "LONGEST STREAK · STARTING NOW";

const H = 280;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${cal.totalContributions} GitHub contributions in the last year for ${USER}">
<defs>
<linearGradient id="hmbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.wine}"/><stop offset="1" stop-color="${C.mid}"/></linearGradient>
<radialGradient id="hmgl" cx=".5" cy="0" r=".8"><stop offset="0" stop-color="${C.acc}" stop-opacity=".45"/><stop offset="1" stop-color="${C.acc}" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" rx="18" fill="url(#hmbg)"/><rect width="${W}" height="${H}" rx="18" fill="url(#hmgl)"/>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="${C.burg}"/>
<text x="40" y="58" font-family="${SERIF}" font-size="40" fill="${C.ivory}">${cal.totalContributions}<tspan font-size="16" font-style="italic" fill="${C.pale}" dx="10">contributions in the last year</tspan></text>
<text x="960" y="44" text-anchor="end" font-family="${MONO}" font-size="9" letter-spacing="2" fill="${C.rose}">ACTIVE DAYS · ${active}</text>
<text x="960" y="62" text-anchor="end" font-family="${MONO}" font-size="9" letter-spacing="2" fill="${C.pale}">${esc(streak)}</text>
${months}${dlab}${cells}
<text x="40" y="256" font-family="${MONO}" font-size="8.5" fill="${C.rose}" opacity=".85">Source: public GitHub contribution calendar for @${USER} · snapshot ${today} · refreshed daily</text>
<text x="872" y="256" text-anchor="end" font-family="${MONO}" font-size="8.5" fill="${C.rose}">Less</text>${legend}<text x="960" y="256" font-family="${MONO}" font-size="8.5" fill="${C.rose}">More</text>
</svg>`;
mkdirSync(OUT.split("/").slice(0, -1).join("/") || ".", { recursive: true });
writeFileSync(OUT, svg);
console.log("wrote", OUT, cal.totalContributions, "contributions");
