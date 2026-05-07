import fs from "fs";
import path from "path";

const SRC_URL =
  "https://raw.githubusercontent.com/flores-jacob/philippine-regions-provinces-cities-municipalities-barangays/master/philippine_provinces_cities_municipalities_and_barangays_2019v2.json";

const OUT_PATH = path.join(process.cwd(), "public", "data", "pangasinan_barangays.json");

const toDisplay = (s) =>
  String(s || "")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

async function main() {
  const res = await fetch(SRC_URL);
  if (!res.ok) throw new Error(`Failed to download source JSON: ${res.status}`);
  const all = await res.json();

  const muniList = all?.["01"]?.province_list?.["PANGASINAN"]?.municipality_list;
  if (!muniList) throw new Error("Pangasinan not found in source JSON");

  const out = {};
  for (const [muniKey, obj] of Object.entries(muniList)) {
    const muniName = toDisplay(muniKey);
    const brg = Array.isArray(obj?.barangay_list) ? obj.barangay_list.slice() : [];
    brg.sort((a, b) => String(a).localeCompare(String(b)));
    out[muniName] = brg;
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), "utf-8");
  console.log("✅ Wrote:", OUT_PATH);
  console.log("Municipalities:", Object.keys(out).length);
  console.log("Barangays:", Object.values(out).reduce((s, a) => s + a.length, 0));
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});