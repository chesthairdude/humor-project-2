import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function toDayKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value ?? 0);
}

function formatDayLabel(dayKey) {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function emptyDayBuckets(days) {
  const buckets = [];
  const today = new Date();

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today.getTime() - index * DAY_MS);
    const key = date.toISOString().slice(0, 10);
    buckets.push({ key, label: formatDayLabel(key), value: 0 });
  }

  return buckets;
}

function buildDailySeries(rows, dateKey, days = 7) {
  const buckets = emptyDayBuckets(days);
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  rows.forEach((row) => {
    const key = toDayKey(row?.[dateKey]);
    if (!key || !bucketMap.has(key)) return;
    bucketMap.get(key).value += 1;
  });

  return buckets;
}

function buildTopList(rows, key, limit = 5) {
  const counts = new Map();

  rows.forEach((row) => {
    const value = row?.[key];
    if (!value) return;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

async function exactCount(supabase, table) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  return { value: error ? 0 : count ?? 0, error: error?.message ?? null };
}

async function recentRows(supabase, table, columns, limit = 500) {
  const byCreated = await supabase
    .from(table)
    .select(columns)
    .order("created_datetime_utc", { ascending: false })
    .limit(limit);

  if (!byCreated.error) return byCreated.data ?? [];

  const byId = await supabase
    .from(table)
    .select(columns)
    .order("id", { ascending: false })
    .limit(limit);

  return byId.data ?? [];
}

function StatCard({ label, value, note }) {
  return (
    <article className="admin-stats-card">
      <p className="admin-stats-kicker">{label}</p>
      <h2 className="admin-stats-value">{value}</h2>
      <p className="admin-stats-note">{note}</p>
    </article>
  );
}

function SparkBars({ title, subtitle, data, tone = "brand" }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <section className="admin-stats-panel">
      <div className="admin-stats-panel-header">
        <div>
          <p className="admin-stats-kicker">{title}</p>
          <h3>{subtitle}</h3>
        </div>
      </div>
      <div className="admin-stats-bars">
        {data.map((item) => (
          <div key={item.key} className="admin-stats-bar-col">
            <div className="admin-stats-bar-track">
              <div
                className={`admin-stats-bar-fill ${tone}`}
                style={{ height: `${Math.max(8, (item.value / maxValue) * 100)}%` }}
                title={`${item.label}: ${item.value}`}
              />
            </div>
            <p className="admin-stats-bar-value">{item.value}</p>
            <p className="admin-stats-bar-label">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RankedList({ title, subtitle, rows, valueFormatter = (value) => value }) {
  const maxValue = Math.max(...rows.map((row) => row.count), 1);

  return (
    <section className="admin-stats-panel">
      <div className="admin-stats-panel-header">
        <div>
          <p className="admin-stats-kicker">{title}</p>
          <h3>{subtitle}</h3>
        </div>
      </div>
      <div className="admin-stats-rank-list">
        {rows.length ? rows.map((row) => (
          <div key={row.value} className="admin-stats-rank-item">
            <div className="admin-stats-rank-copy">
              <p>{valueFormatter(row.value)}</p>
              <span>{row.count}</span>
            </div>
            <div className="admin-stats-rank-track">
              <div
                className="admin-stats-rank-fill"
                style={{ width: `${(row.count / maxValue) * 100}%` }}
              />
            </div>
          </div>
        )) : (
          <p className="admin-stats-empty">No recent data yet.</p>
        )}
      </div>
    </section>
  );
}

export default async function AdminStatsPage() {
  const supabase = await createClient();

  const [
    profileCount,
    imageCount,
    captionCount,
    requestCount,
    responseCount,
    images,
    captions,
    requests,
    responses,
    flavors
  ] = await Promise.all([
    exactCount(supabase, "profiles"),
    exactCount(supabase, "images"),
    exactCount(supabase, "captions"),
    exactCount(supabase, "caption_requests"),
    exactCount(supabase, "llm_model_responses"),
    recentRows(supabase, "images", "id, created_datetime_utc, is_public, is_common_use", 600),
    recentRows(supabase, "captions", "id, created_datetime_utc, humor_flavor_id", 1000),
    recentRows(supabase, "caption_requests", "id, created_datetime_utc", 600),
    recentRows(supabase, "llm_model_responses", "id, created_datetime_utc, processing_time_seconds", 1000),
    recentRows(supabase, "humor_flavors", "id, slug", 200)
  ]);

  const flavorMap = new Map((flavors ?? []).map((row) => [row.id, row.slug]));

  const imageSeries = buildDailySeries(images, "created_datetime_utc", 7);
  const captionSeries = buildDailySeries(captions, "created_datetime_utc", 7);
  const requestSeries = buildDailySeries(requests, "created_datetime_utc", 7);

  const recentFlavorLeaders = buildTopList(captions, "humor_flavor_id", 5).map((row) => ({
    ...row,
    value: flavorMap.get(row.value) ?? `Flavor ${row.value}`
  }));

  const publicImageCount = images.filter((row) => row.is_public).length;
  const commonUseCount = images.filter((row) => row.is_common_use).length;
  const avgResponseSeconds = responses.length
    ? responses.reduce((sum, row) => sum + Number(row.processing_time_seconds || 0), 0) / responses.length
    : 0;
  const captionYield = imageCount.value ? captionCount.value / imageCount.value : 0;
  const requestConversion = requestCount.value ? captionCount.value / requestCount.value : 0;

  return (
    <section className="admin-page admin-stats-page">
      <div className="admin-page-header">
        <div>
          <h1>Stats</h1>
          <p>Quick signals on content velocity, model throughput, and what the humor engine is doing lately.</p>
        </div>
      </div>

      <div className="admin-stats-grid">
        <StatCard
          label="Audience"
          value={formatCompactNumber(profileCount.value)}
          note={`${formatCompactNumber(imageCount.value)} images and ${formatCompactNumber(captionCount.value)} captions in the system`}
        />
        <StatCard
          label="Caption Yield"
          value={imageCount.value ? `${captionYield.toFixed(1)}x` : "0x"}
          note="Average captions generated per image in the current corpus"
        />
        <StatCard
          label="Request Conversion"
          value={requestCount.value ? `${(requestConversion * 100).toFixed(0)}%` : "0%"}
          note="Captions produced relative to recorded caption requests"
        />
        <StatCard
          label="Model Latency"
          value={`${avgResponseSeconds.toFixed(1)}s`}
          note={`${formatCompactNumber(responseCount.value)} LLM responses sampled from recent activity`}
        />
      </div>

      <div className="admin-stats-layout">
        <SparkBars
          title="Content Pulse"
          subtitle="Images uploaded in the last 7 days"
          data={imageSeries}
          tone="brand"
        />
        <SparkBars
          title="Caption Velocity"
          subtitle="Captions generated in the last 7 days"
          data={captionSeries}
          tone="gold"
        />
        <SparkBars
          title="Demand Signal"
          subtitle="Caption requests in the last 7 days"
          data={requestSeries}
          tone="rose"
        />
      </div>

      <div className="admin-stats-layout">
        <RankedList
          title="Flavor Leaderboard"
          subtitle="Most-used humor flavors in recent captions"
          rows={recentFlavorLeaders}
        />

        <section className="admin-stats-panel">
          <div className="admin-stats-panel-header">
            <div>
              <p className="admin-stats-kicker">Image Mix</p>
              <h3>How recent uploads are being marked</h3>
            </div>
          </div>
          <div className="admin-stats-split">
            <div className="admin-stats-split-card teal">
              <span>Public</span>
              <strong>{publicImageCount}</strong>
              <small>Recent image rows marked visible</small>
            </div>
            <div className="admin-stats-split-card amber">
              <span>Common Use</span>
              <strong>{commonUseCount}</strong>
              <small>Recent image rows reusable across prompts</small>
            </div>
          </div>
          <div className="admin-stats-mini-grid">
            <div className="admin-stats-mini">
              <span>Total Requests</span>
              <strong>{formatCompactNumber(requestCount.value)}</strong>
            </div>
            <div className="admin-stats-mini">
              <span>Total Responses</span>
              <strong>{formatCompactNumber(responseCount.value)}</strong>
            </div>
            <div className="admin-stats-mini">
              <span>Total Images</span>
              <strong>{formatCompactNumber(imageCount.value)}</strong>
            </div>
            <div className="admin-stats-mini">
              <span>Total Captions</span>
              <strong>{formatCompactNumber(captionCount.value)}</strong>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
