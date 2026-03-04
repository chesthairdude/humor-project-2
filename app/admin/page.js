import { countRows, fetchRows } from "@/lib/adminData";

export const dynamic = "force-dynamic";

function formatPct(value) {
  return `${Math.round(value * 100)}%`;
}

export default async function AdminDashboardPage() {
  const [profilesCount, imagesCount, captionsCount, recentImages, recentCaptions] = await Promise.all([
    countRows("profiles"),
    countRows("images"),
    countRows("captions"),
    fetchRows("images", 20),
    fetchRows("captions", 20)
  ]);

  const imageTotal = imagesCount.count;
  const captionTotal = captionsCount.count;
  const profileTotal = profilesCount.count;

  const captionCoverage = imageTotal ? Math.min(captionTotal / imageTotal, 1) : 0;
  const creatorDensity = profileTotal ? Math.min(imageTotal / profileTotal, 1) : 0;
  const recentImageRows = recentImages.rows;
  const recentCaptionRows = recentCaptions.rows;

  const freshnessSignal = (() => {
    const rows = [...recentImageRows, ...recentCaptionRows];
    const createdValues = rows
      .map((row) => row.created_at)
      .filter(Boolean)
      .map((v) => new Date(v).getTime())
      .filter((v) => Number.isFinite(v));

    if (!createdValues.length) return 0;

    const newest = Math.max(...createdValues);
    const ageHours = (Date.now() - newest) / (1000 * 60 * 60);
    if (ageHours <= 12) return 1;
    if (ageHours <= 24) return 0.75;
    if (ageHours <= 72) return 0.5;
    if (ageHours <= 168) return 0.25;
    return 0.1;
  })();

  const cards = [
    { label: "Profiles", value: profileTotal },
    { label: "Images", value: imageTotal },
    { label: "Captions", value: captionTotal }
  ];

  const pulses = [
    { label: "Caption coverage", value: formatPct(captionCoverage) },
    { label: "Creator density", value: formatPct(creatorDensity) },
    { label: "Freshness signal", value: formatPct(freshnessSignal) }
  ];

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <div className="grid cols-3">
        {cards.map((card) => (
          <article className="panel" key={card.label}>
            <p className="stats-number">{card.value.toLocaleString()}</p>
            <p className="stats-label">{card.label}</p>
          </article>
        ))}
      </div>

      <div className="grid cols-3">
        {pulses.map((pulse) => (
          <article className="panel" key={pulse.label}>
            <p className="kicker">Signal</p>
            <p className="stats-number">{pulse.value}</p>
            <p className="stats-label">{pulse.label}</p>
          </article>
        ))}
      </div>

      <div className="grid cols-2">
        <article className="panel">
          <h2 style={{ marginTop: 0 }}>Recent images</h2>
          <ul>
            {recentImageRows.slice(0, 8).map((row, idx) => (
              <li key={row.id ?? idx}>
                <code>{String(row.id ?? "(no id)")}</code>
                {row.created_at ? ` • ${new Date(row.created_at).toLocaleString()}` : ""}
              </li>
            ))}
          </ul>
          {recentImages.error ? <p className="error">{recentImages.error}</p> : null}
        </article>

        <article className="panel">
          <h2 style={{ marginTop: 0 }}>Recent captions</h2>
          <ul>
            {recentCaptionRows.slice(0, 8).map((row, idx) => (
              <li key={row.id ?? idx}>
                <code>{String(row.id ?? "(no id)")}</code>
                {row.created_at ? ` • ${new Date(row.created_at).toLocaleString()}` : ""}
              </li>
            ))}
          </ul>
          {recentCaptions.error ? <p className="error">{recentCaptions.error}</p> : null}
        </article>
      </div>
    </section>
  );
}
