"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "admin-statistics-snapshot-v1";

const containerStyle = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden",
  padding: "24px 32px 0",
  boxSizing: "border-box"
};

const panelStyle = {
  padding: "20px 24px",
  borderRadius: "14px",
  background: "var(--glass-bg)",
  backdropFilter: "blur(32px)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--glass-shadow)"
};

function readStoredSnapshot() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStoredSnapshot(snapshot) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // no-op if storage is unavailable
  }
}

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "14px",
        background: "var(--glass-bg)",
        backdropFilter: "blur(32px)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--glass-shadow)",
        minWidth: 0
      }}
    >
      <p style={{ fontSize: "20px", margin: "0 0 8px 0" }}>{icon}</p>
      <p
        style={{
          fontSize: "10px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--text-tertiary)",
          margin: "0 0 6px 0"
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: "28px",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: color ?? "var(--text-primary)",
          margin: 0,
          lineHeight: 1
        }}
      >
        {Number(value ?? 0).toLocaleString()}
      </p>
      {sub ? (
        <p style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "6px", marginBottom: 0 }}>{sub}</p>
      ) : null}
    </div>
  );
}

function RankTable({ title, icon, rows, valueKey, valueSuffix = "", valueColor }) {
  return (
    <div style={{ ...panelStyle, minWidth: 0 }}>
      <p
        style={{
          fontSize: "12px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--text-tertiary)",
          margin: "0 0 16px 0"
        }}
      >
        {icon} {title}
      </p>
      {rows.length ? rows.map((row, index) => (
        <div
          key={row.captionId}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "8px 0",
            borderBottom: index < rows.length - 1 ? "1px solid var(--glass-border)" : "none",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", flex: 1, minWidth: 0 }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--text-tertiary)",
                flexShrink: 0,
                marginTop: "2px"
              }}
            >
              #{index + 1}
            </span>
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-primary)",
                lineHeight: 1.4,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical"
              }}
            >
              {row.captionContent}
            </span>
          </div>
          <span style={{ fontSize: "13px", fontWeight: 700, color: valueColor ?? "var(--stats-accent)", flexShrink: 0 }}>
            {row[valueKey]}
            {valueSuffix}
          </span>
        </div>
      )) : (
        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>No vote data yet.</p>
      )}
    </div>
  );
}

function StatusState({ message }) {
  return (
    <div style={containerStyle}>
      <div style={{ flexShrink: 0, marginBottom: "20px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Statistics</h1>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
          Caption voting analytics across all users
        </p>
      </div>
      <div style={{ ...panelStyle, color: "var(--text-secondary)" }}>{message}</div>
    </div>
  );
}

export default function StatisticsPage() {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const cachedSnapshot = readStoredSnapshot();

    if (cachedSnapshot) {
      setSnapshot(cachedSnapshot);
    }

    async function loadLatest() {
      try {
        const response = await fetch("/api/admin/statistics", {
          method: "GET",
          cache: "no-store"
        });

        const payload = await response.json();

        if (!active) return;

        if (!response.ok) {
          setError(payload?.error ?? "Unable to load analytics.");
          return;
        }

        writeStoredSnapshot(payload);
        setSnapshot(payload);
        setError("");
      } catch {
        if (!active) return;
        if (!cachedSnapshot) {
          setError("Unable to load analytics.");
        }
      }
    }

    loadLatest();

    return () => {
      active = false;
    };
  }, []);

  if (!snapshot && !error) {
    return <StatusState message="Loading caption vote analytics..." />;
  }

  if (!snapshot && error) {
    return <StatusState message={error} />;
  }

  const {
    totalVotes,
    totalFunny,
    totalNotFunny,
    overallFunnyPercent,
    unvotedCaptions,
    mostVoted,
    funniest,
    mostControversial,
    mostActiveVoters,
    votesByDay,
    maxVotesPerDay,
    fetchedAt
  } = snapshot;

  return (
    <div style={containerStyle}>
      <div style={{ flexShrink: 0, marginBottom: "20px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Statistics</h1>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
          Caption voting analytics across all users
        </p>
        {fetchedAt ? (
          <p style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "6px", marginBottom: 0 }}>
            Snapshot: {new Date(fetchedAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingBottom: "32px" }}>
        {error ? (
          <div style={{ ...panelStyle, marginBottom: "16px", color: "var(--text-secondary)" }}>
            Showing cached analytics. Refresh is temporarily failing: {error}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
            flexShrink: 0
          }}
        >
          <StatCard label="Total Votes Cast" value={totalVotes} icon="🗳️" />
          <StatCard
            label="Funny Votes"
            value={totalFunny}
            icon="😂"
            color="var(--stats-positive)"
            sub={`${overallFunnyPercent}% of all votes`}
          />
          <StatCard
            label="Not Funny Votes"
            value={totalNotFunny}
            icon="😐"
            color="var(--stats-negative)"
            sub={`${Math.max(0, 100 - overallFunnyPercent)}% of all votes`}
          />
          <StatCard label="Unvoted Captions" value={unvotedCaptions} icon="📭" sub="captions with 0 votes" />
        </div>

        <div style={{ ...panelStyle, marginBottom: "24px" }}>
          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-tertiary)",
              margin: "0 0 10px 0"
            }}
          >
            Overall Funny vs Not Funny
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--stats-positive)" }}>
              😂 {totalFunny} funny ({overallFunnyPercent}%)
            </span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--stats-negative)" }}>
              {totalNotFunny} not funny 😐 ({Math.max(0, 100 - overallFunnyPercent)}%)
            </span>
          </div>
          <div
            style={{
              height: "12px",
              width: "100%",
              borderRadius: "999px",
              background: "color-mix(in srgb, var(--stats-negative) 28%, var(--stats-bg))",
              overflow: "hidden",
              border: "1px solid var(--glass-border)"
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${overallFunnyPercent}%`,
                background: "linear-gradient(90deg, var(--stats-positive), var(--stats-positive-soft))",
                borderRadius: "999px",
                transition: "width 0.75s cubic-bezier(0.34, 1.56, 0.64, 1)"
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
            marginBottom: "24px"
          }}
        >
          <RankTable title="Most Voted" icon="🔥" rows={mostVoted} valueKey="total" valueSuffix=" votes" />
          <RankTable
            title="Funniest"
            icon="😂"
            rows={funniest}
            valueKey="funnyPercent"
            valueSuffix="%"
            valueColor="var(--stats-positive)"
          />
          <RankTable
            title="Most Controversial"
            icon="⚖️"
            rows={mostControversial}
            valueKey="funnyPercent"
            valueSuffix="% funny"
            valueColor="var(--stats-warning)"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "16px",
            marginBottom: "24px"
          }}
        >
          <div style={{ ...panelStyle, minWidth: 0 }}>
            <p
              style={{
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-tertiary)",
                margin: "0 0 16px 0"
              }}
            >
              👤 Most Active Voters
            </p>
            {mostActiveVoters.length ? mostActiveVoters.map((voter, index) => (
              <div
                key={voter.userId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  padding: "8px 0",
                  borderBottom: index < mostActiveVoters.length - 1 ? "1px solid var(--glass-border)" : "none"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-tertiary)", width: "16px" }}>#{index + 1}</span>
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {voter.email}
                  </span>
                </div>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--stats-accent)", flexShrink: 0 }}>
                  {voter.count} votes
                </span>
              </div>
            )) : (
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>No voter activity yet.</p>
            )}
          </div>

          <div style={{ ...panelStyle, minWidth: 0 }}>
            <p
              style={{
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-tertiary)",
                margin: "0 0 16px 0"
              }}
            >
              📅 Votes Per Day (Last 30 Days)
            </p>
            {votesByDay.map((day) => (
              <div key={day.key} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ fontSize: "10px", color: "var(--text-tertiary)", width: "56px", flexShrink: 0 }}>{day.label}</span>
                <div
                  style={{
                    flex: 1,
                    height: "8px",
                    borderRadius: "999px",
                    background: "var(--stats-bg)",
                    overflow: "hidden"
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${maxVotesPerDay ? (day.count / maxVotesPerDay) * 100 : 0}%`,
                      background: "linear-gradient(90deg, var(--stats-accent), var(--stats-accent-soft))",
                      borderRadius: "999px",
                      transition: "width 0.25s ease"
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--text-secondary)",
                    width: "24px",
                    textAlign: "right",
                    flexShrink: 0
                  }}
                >
                  {day.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
