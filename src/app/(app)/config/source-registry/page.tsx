"use client";

import { useState, useMemo } from "react";
import { MagnifyingGlassIcon, CheckIcon } from "@heroicons/react/24/outline";

/* ── static source registry — mirrors bias_registry.py seed data ── */

interface Source {
  id: string;
  name: string;
  region: string;
  ownership: string;
  lean: string;
  leanPos: number;   /* -1 (kremlin) .. +1 (state-aligned) */
  accuracy: number | null;
  volume: "very-high" | "high" | "medium" | "low";
  language: string;
  layer: string;
  notes: string;
}

const SOURCES: Source[] = [
  { id:"reuters",   name:"Reuters",             region:"UK",             ownership:"Private · Wire",          lean:"center",                leanPos:0,     accuracy:8.7, volume:"very-high", language:"EN",    layer:"L1", notes:"Core wire. Broad sourcing discipline; conservative verification." },
  { id:"ap",        name:"Associated Press",    region:"US",             ownership:"Non-profit · Wire",       lean:"center",                leanPos:0,     accuracy:8.6, volume:"very-high", language:"EN",    layer:"L1", notes:"Wire standard. Strong on incident reporting." },
  { id:"bbc",       name:"BBC News",            region:"UK",             ownership:"UK Public",               lean:"center-left (slight)",  leanPos:-0.1,  accuracy:8.1, volume:"high",      language:"EN",    layer:"L1", notes:"Editorial standards high; licence-funded model." },
  { id:"ft",        name:"Financial Times",     region:"UK",             ownership:"Private · Nikkei",        lean:"center",                leanPos:0,     accuracy:8.3, volume:"high",      language:"EN",    layer:"L1", notes:"Strong on markets + policy; thin on field reporting in MENA." },
  { id:"aj-en",     name:"Al Jazeera English",  region:"Qatar",          ownership:"Qatar State-linked",      lean:"qatar-aligned",         leanPos:-0.55, accuracy:6.1, volume:"high",      language:"EN",    layer:"L1", notes:"Useful regional access; flag ownership on GCC-sensitive stories." },
  { id:"national",  name:"The National",        region:"UAE",            ownership:"UAE State",               lean:"uae-aligned",           leanPos:0.5,   accuracy:6.4, volume:"medium",    language:"EN",    layer:"L1", notes:"Signals official UAE posture; editorial latitude is narrow." },
  { id:"asharq",    name:"Asharq Al-Awsat",     region:"Saudi / Pan-Arab",ownership:"Saudi-linked",          lean:"saudi-aligned",         leanPos:0.55,  accuracy:6.2, volume:"medium",    language:"AR/EN", layer:"L1", notes:"Pan-Arab daily; useful for Riyadh-aligned framing." },
  { id:"iran-intl", name:"Iran International",  region:"UK · Farsi",     ownership:"Private (Saudi-linked claims)", lean:"critical-of-tehran", leanPos:-0.2, accuracy:5.9, volume:"high", language:"FA/EN", layer:"L1", notes:"Strong on dissident-side coverage; weight for framing bias." },
  { id:"toi",       name:"Times of Israel",     region:"Israel",         ownership:"Private",                 lean:"israeli-center-right",  leanPos:0.35,  accuracy:6.8, volume:"medium",    language:"EN",    layer:"L1", notes:"Operational detail on IDF-adjacent stories." },
  { id:"dawn",      name:"Dawn",                region:"Pakistan",       ownership:"Private",                 lean:"center",                leanPos:0,     accuracy:7.0, volume:"medium",    language:"EN/UR", layer:"L1", notes:"Reliable on Pakistan–Gulf labour, remittance, security linkages." },
  { id:"tass",      name:"TASS",                region:"Russia",         ownership:"Russian State",           lean:"kremlin-aligned",       leanPos:-0.95, accuracy:4.8, volume:"high",      language:"RU/EN", layer:"L1", notes:"Official-line outlet. Treat as state posture, not reporting." },
  { id:"gdelt",     name:"GDELT (aggregator)",  region:"Global",         ownership:"Open dataset",            lean:"n/a · aggregator",      leanPos:0,     accuracy:null,volume:"very-high", language:"multi", layer:"L1", notes:"Our narrative substrate. We don't trust GDELT — we trust what it collects." },
  { id:"alpha-v",   name:"Alpha Vantage",       region:"US",             ownership:"Private · SaaS",          lean:"financial data",        leanPos:0,     accuracy:9.1, volume:"very-high", language:"EN",    layer:"L5/L7", notes:"Primary commodities (L5) + equities (L7) data provider." },
  { id:"oxr",       name:"Open Exchange Rates", region:"US",             ownership:"Private · SaaS",          lean:"financial data",        leanPos:0,     accuracy:9.3, volume:"very-high", language:"EN",    layer:"L6", notes:"FX rates; primary L6 currency layer source." },
  { id:"cf-radar",  name:"Cloudflare Radar",    region:"US",             ownership:"Cloudflare (public)",     lean:"technical",             leanPos:0,     accuracy:9.5, volume:"high",      language:"EN",    layer:"L10", notes:"BGP anomaly + traffic insights. Ground truth for connectivity layer." },
  { id:"ioda",      name:"IODA",                region:"US",             ownership:"CAIDA / Georgia Tech",    lean:"academic",              leanPos:0,     accuracy:9.2, volume:"medium",    language:"EN",    layer:"L10", notes:"Independent internet outage detection. Primary L10 cross-check." },
  { id:"firms",     name:"NASA FIRMS",          region:"US",             ownership:"NASA (open)",             lean:"scientific",            leanPos:0,     accuracy:9.6, volume:"medium",    language:"EN",    layer:"L8", notes:"VIIRS_SNPP_NRT thermal anomalies. Ground truth; cannot be faked." },
  { id:"worldbank", name:"World Bank Open Data",region:"Global",         ownership:"Intergovernmental",       lean:"western-multilateral",  leanPos:0.1,   accuracy:7.8, volume:"low",       language:"EN",    layer:"L9", notes:"Macro economic indicators; L9 baseline. Reporting lag 6–18 months." },
];

const LEAN_SCALE: { pos: number; label: string }[] = [
  { pos: -0.95, label: "Kremlin" },
  { pos: -0.55, label: "Qatar-state" },
  { pos: -0.2,  label: "Crit-Tehran" },
  { pos: 0,     label: "Center" },
  { pos: 0.35,  label: "Israeli C-R" },
  { pos: 0.5,   label: "UAE-state" },
  { pos: 0.55,  label: "Saudi" },
];

/* ── Arabic name map ── */
const ARABIC_NAMES: Record<string, string> = {
  'Reuters':               'رويترز',
  'Associated Press':      'أسوشيتد برس',
  'BBC News':              'بي بي سي',
  'Financial Times':       'فاينانشال تايمز',
  'Al Jazeera English':    'الجزيرة',
  'The National':          'ذا ناشيونال',
  'Asharq Al-Awsat':       'الشرق الأوسط',
  'Iran International':    'إيران إنترناشيونال',
  'Times of Israel':       'تايمز أوف إسرائيل',
  'Dawn':                  'دون',
  'TASS':                  'تاس',
  'GDELT (aggregator)':    'جيدلت',
};
function arabicFor(name: string): string { return ARABIC_NAMES[name] || ''; }

type SortKey = "accuracy" | "name" | "region" | "layer";

/* ── SourceAvatar ── */
const AVATAR_COLORS = ['#6b8fb5','#c8a26a','#7fa894','#a88cb5','#b08268','#8a94a2'];
function SourceAvatar({ name }: { name: string }) {
  const initials = name.split(/[ \-]/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const color = AVATAR_COLORS[name.length % AVATAR_COLORS.length];
  return (
    <div style={{
      width: 26, height: 26, borderRadius: 2,
      background: 'var(--bg-inset)', border: `1px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

/* ── AccuracyPill (circular SVG ring) ── */
function AccuracyPill({ value }: { value: number | null }) {
  if (value === null) return <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>n/a</span>;
  const color =
    value >= 8   ? 'var(--sig-positive)' :
    value >= 6.5 ? 'var(--accent)'       :
    value >= 5   ? 'var(--sig-warn)'     :
                   'var(--sig-critical)';
  const r = 11;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <svg width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r={r} fill="none" stroke="var(--line-2)" strokeWidth="1.5"/>
        <circle
          cx="14" cy="14" r={r} fill="none" stroke={color} strokeWidth="1.5"
          strokeDasharray={`${(value / 10) * circ} ${circ}`}
          transform="rotate(-90 14 14)"
          strokeLinecap="round"
        />
      </svg>
      <span className="mono" style={{ fontSize: 12.5, color: 'var(--fg-1)', fontWeight: 500, minWidth: 26 }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

/* ── LeanRail (also exported as LeanBar — same component) ── */
function LeanRail({ pos }: { pos: number }) {
  const pct = ((pos + 1) / 2) * 100; // map -1..+1 → 0..100
  const color =
    Math.abs(pos) > 0.6 ? "var(--sig-critical)" :
    Math.abs(pos) > 0.3 ? "var(--sig-warn)" :
    "var(--sig-positive)";
  return (
    <div
      style={{
        position: "relative",
        height: 4,
        background: "var(--bg-inset)",
        border: "1px solid var(--line-1)",
        borderRadius: 1,
      }}
    >
      {/* center tick */}
      <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--line-3)" }} />
      {/* marker */}
      <div
        style={{
          position: "absolute",
          left: `${pct}%`,
          top: -2,
          width: 6,
          height: 8,
          background: color,
          borderRadius: 1,
          transform: "translateX(-50%)",
        }}
      />
    </div>
  );
}

/* LeanBar is an alias of LeanRail for the table Lean column */
const LeanBar = LeanRail;

/* ── Volume pill ── */
const VOLUME_STYLE: Record<string, React.CSSProperties> = {
  "very-high": { background: "rgba(200,162,106,0.12)", color: "var(--accent)",    borderColor: "rgba(200,162,106,0.3)" },
  "high":      { background: "rgba(107,140,174,0.12)", color: "var(--sig-info)",  borderColor: "rgba(107,140,174,0.3)" },
  "medium":    { background: "var(--bg-3)",            color: "var(--fg-2)",      borderColor: "var(--line-2)" },
  "low":       { background: "var(--bg-inset)",        color: "var(--fg-4)",      borderColor: "var(--line-1)" },
};

function VolumePill({ volume }: { volume: Source["volume"] }) {
  const s = VOLUME_STYLE[volume];
  return (
    <span
      className="mono"
      style={{
        display: "inline-flex", alignItems: "center",
        padding: "1px 6px", borderRadius: 2,
        fontSize: 9.5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em",
        border: "1px solid",
        ...s,
      }}
    >
      {volume.replace("-", " ")}
    </span>
  );
}

/* ── Detail pane ── */
function DetailPane({ source, arabicPreview }: { source: Source; arabicPreview: boolean }) {
  const leanColor =
    Math.abs(source.leanPos) > 0.6 ? "var(--sig-critical)" :
    Math.abs(source.leanPos) > 0.3 ? "var(--sig-warn)" :
    "var(--sig-positive)";
  const arabic = arabicFor(source.name);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "20px 20px" }}>
      {/* Header */}
      <div>
        <div className="mono caps" style={{ color: "var(--accent)", marginBottom: 4 }}>{source.layer}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <SourceAvatar name={source.name} />
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--fg-1)" }}>{source.name}</h2>
            {arabicPreview && arabic && (
              <div style={{ fontSize: 13, color: "var(--fg-3)", direction: "rtl", fontFamily: "var(--font-sans)", marginTop: 2 }}>
                {arabic}
              </div>
            )}
          </div>
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 4 }}>
          {source.region} · {source.ownership}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--line-1)" }} />

      {/* Accuracy */}
      <div>
        <div className="mono caps" style={{ color: "var(--fg-4)", marginBottom: 8 }}>Accuracy score</div>
        <AccuracyPill value={source.accuracy} />
        <div className="mono" style={{ fontSize: 9.5, color: "var(--fg-4)", marginTop: 4 }}>
          Internal scoring — sourcing discipline + verification track record
        </div>
      </div>

      {/* Lean rail */}
      <div>
        <div className="mono caps" style={{ color: "var(--fg-4)", marginBottom: 8 }}>Editorial lean</div>
        <LeanRail pos={source.leanPos} />
        <div
          className="mono"
          style={{ fontSize: 10.5, fontWeight: 500, marginTop: 6, color: leanColor }}
        >
          {source.lean}
        </div>
      </div>

      {/* Volume + Language */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div className="mono caps" style={{ color: "var(--fg-4)", marginBottom: 6 }}>Volume</div>
          <VolumePill volume={source.volume} />
        </div>
        <div>
          <div className="mono caps" style={{ color: "var(--fg-4)", marginBottom: 6 }}>Language</div>
          <span className="mono" style={{ fontSize: 11, color: "var(--fg-1)" }}>{source.language}</span>
        </div>
      </div>

      {/* Notes */}
      <div>
        <div className="mono caps" style={{ color: "var(--fg-4)", marginBottom: 6 }}>Analyst notes</div>
        <p style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.6, margin: 0 }}>{source.notes}</p>
      </div>

      {/* Usage stats */}
      <div
        style={{
          background: "var(--bg-inset)",
          border: "1px solid var(--line-1)",
          padding: "10px 12px",
          borderRadius: 2,
        }}
      >
        <div
          className="mono caps"
          style={{ color: "var(--fg-4)", marginBottom: 4, fontSize: 9.5 }}
        >
          Used in recent briefings
        </div>
        <div style={{ fontSize: 11.5, color: "var(--fg-2)" }}>
          <span className="mono" style={{ color: "var(--accent)" }}>14 citations</span>
          {" "}across{" "}
          <span className="mono" style={{ color: "var(--accent)" }}>3 scenarios</span>
          {" "}in the last 7 days.
        </div>
      </div>
    </div>
  );
}

/* ── Table header cell ── */
function Th({ children, align = "left", onClick, sorted }: {
  children: React.ReactNode;
  align?: "left" | "right";
  onClick?: () => void;
  sorted?: boolean;
}) {
  return (
    <th
      onClick={onClick}
      style={{
        padding: "8px 12px",
        textAlign: align,
        fontSize: 9.5,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: sorted ? "var(--accent)" : "var(--fg-4)",
        fontFamily: "var(--font-mono)",
        background: "var(--bg-2)",
        borderBottom: "1px solid var(--line-2)",
        cursor: onClick ? "pointer" : "default",
        whiteSpace: "nowrap",
        userSelect: "none",
        position: "sticky",
        top: 0,
        zIndex: 1,
      }}
    >
      {children}{sorted ? " ↓" : ""}
    </th>
  );
}

/* ── Main page ── */
export default function SourceRegistryPage() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("accuracy");
  const [selectedId, setSelectedId] = useState<string>("reuters");
  const [arabicPreview, setArabicPreview] = useState(false);

  const filtered = useMemo(
    () =>
      SOURCES.filter(
        (s) =>
          !query ||
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.region.toLowerCase().includes(query.toLowerCase()) ||
          s.layer.toLowerCase().includes(query.toLowerCase())
      ).sort((a, b) => {
        if (sort === "accuracy")
          return (b.accuracy ?? -1) - (a.accuracy ?? -1);
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "region") return a.region.localeCompare(b.region);
        if (sort === "layer") return a.layer.localeCompare(b.layer);
        return 0;
      }),
    [query, sort]
  );

  const selected = SOURCES.find((s) => s.id === selectedId) ?? SOURCES[0];
  const toggleSort = (k: SortKey) => setSort(k);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-0)" }}>
      {/* Page header */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--line-2)",
          background: "var(--bg-1)",
          display: "flex", alignItems: "baseline", gap: 12,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-1)" }}>Source Registry</span>
        <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-4)" }}>
          Editorial sources · ownership &amp; accuracy
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 360px" }}>
        {/* ── Left: table ── */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, borderRight: "1px solid var(--line-2)" }}>
          {/* Filter bar */}
          <div
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 20px",
              borderBottom: "1px solid var(--line-2)",
              background: "var(--bg-1)",
            }}
          >
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "var(--bg-inset)", border: "1px solid var(--line-2)",
                padding: "5px 10px", borderRadius: 2, flex: 1, maxWidth: 360,
              }}
            >
              <MagnifyingGlassIcon style={{ width: 13, height: 13, color: "var(--fg-3)", flexShrink: 0 }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by name, region or layer…"
                style={{
                  background: "transparent", border: "none", outline: "none",
                  fontSize: 12, color: "var(--fg-1)", flex: 1, fontFamily: "var(--font-sans)",
                }}
              />
            </div>
            <span style={{ flex: 1 }} />
            <span className="mono caps" style={{ color: "var(--fg-4)" }}>Sort by</span>
            {(["accuracy", "name", "region", "layer"] as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => toggleSort(k)}
                className="mono"
                style={{
                  padding: "4px 10px", fontSize: 10.5,
                  background: sort === k ? "var(--bg-3)" : "transparent",
                  color: sort === k ? "var(--fg-1)" : "var(--fg-3)",
                  border: "1px solid",
                  borderColor: sort === k ? "var(--line-3)" : "var(--line-1)",
                  borderRadius: 2, cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {k}
              </button>
            ))}
            {/* Arabic preview toggle */}
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-2)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={arabicPreview}
                onChange={(e) => setArabicPreview(e.target.checked)}
                style={{ accentColor: "var(--accent)" }}
              />
              <span className="mono caps" style={{ fontSize: 9.5 }}>&#x0627;&#x0644;&#x0639;&#x0631;&#x0628;&#x064A;&#x0629; · preview</span>
            </label>
          </div>

          {/* Ownership guarantee strip */}
          <div
            style={{
              padding: "8px 20px",
              borderBottom: "1px solid var(--line-1)",
              background: "var(--bg-2)",
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <CheckIcon style={{ width: 13, height: 13, color: "var(--sig-positive)", flexShrink: 0 }} />
            <span className="mono caps" style={{ color: "var(--fg-2)", fontSize: 9.5 }}>
              Ownership &amp; bias labels — permanently visible
            </span>
            <span style={{ color: "var(--fg-4)", fontSize: 11 }}>
              Every article carries ownership type, bias lean, and accuracy score. Never hidden from the analyst.
            </span>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <Th onClick={() => toggleSort("name")} sorted={sort === "name"}>Source</Th>
                  <Th onClick={() => toggleSort("region")} sorted={sort === "region"}>Region</Th>
                  <Th>Ownership</Th>
                  <Th>Lean</Th>
                  <Th onClick={() => toggleSort("accuracy")} sorted={sort === "accuracy"} align="right">Accuracy</Th>
                  <Th align="right">Volume</Th>
                  <Th onClick={() => toggleSort("layer")} sorted={sort === "layer"}>Layer</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((src) => {
                  const isSelected = src.id === selectedId;
                  const arabic = arabicFor(src.name);
                  return (
                    <tr
                      key={src.id}
                      onClick={() => setSelectedId(src.id)}
                      style={{
                        background: isSelected ? "rgba(200,162,106,0.06)" : "transparent",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--line-1)",
                        transition: "background .1s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected)
                          (e.currentTarget as HTMLElement).style.background = "var(--bg-2)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected)
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {isSelected && (
                            <div style={{ width: 3, height: 16, background: "var(--accent)", borderRadius: 1, flexShrink: 0 }} />
                          )}
                          <SourceAvatar name={src.name} />
                          <div>
                            <div style={{ fontWeight: 500, color: "var(--fg-1)", fontSize: 12.5 }}>{src.name}</div>
                            {arabicPreview && arabic ? (
                              <div style={{ fontSize: 11, color: "var(--fg-3)", direction: "rtl", fontFamily: "var(--font-sans)" }}>
                                {arabic}
                              </div>
                            ) : (
                              <div className="mono" style={{ fontSize: 9.5, color: "var(--fg-4)", marginTop: 1 }}>{src.language}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 11.5, color: "var(--fg-2)" }}>{src.region}</td>
                      <td style={{ padding: "10px 12px", fontSize: 11, color: "var(--fg-3)", maxWidth: 180 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                          {src.ownership}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <LeanBar pos={src.leanPos} />
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <AccuracyPill value={src.accuracy} />
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <VolumePill volume={src.volume} />
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          className="mono"
                          style={{
                            fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em",
                            color: "var(--accent)",
                          }}
                        >
                          {src.layer}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "var(--fg-3)", fontSize: 12 }}>
                No sources match &ldquo;{query}&rdquo;
              </div>
            )}
          </div>

          {/* Footer count */}
          <div
            style={{
              padding: "8px 20px",
              borderTop: "1px solid var(--line-1)",
              background: "var(--bg-1)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-4)" }}>
              {filtered.length} of {SOURCES.length} sources
            </span>
            <span className="mono" style={{ fontSize: 10, color: "var(--fg-4)" }}>
              Click a row to inspect
            </span>
          </div>
        </div>

        {/* ── Right: detail pane ── */}
        <div style={{ overflowY: "auto", background: "var(--bg-1)" }}>
          {selected ? (
            <DetailPane source={selected} arabicPreview={arabicPreview} />
          ) : (
            <div style={{ padding: 40, color: "var(--fg-3)", fontSize: 12, textAlign: "center" }}>
              Select a source to inspect
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
