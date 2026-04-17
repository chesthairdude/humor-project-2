"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const PAGE_SIZE = 1000;

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

async function fetchAllRows(supabase, table, columns) {
  const rows = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return { data: [], error };
    }

    const batch = data ?? [];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      return { data: rows, error: null };
    }

    offset += PAGE_SIZE;
  }
}

function isoDayKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function formatDayLabel(dayKey) {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function createLastDayBuckets(days = 30) {
  const now = new Date();
  const buckets = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    buckets.push({
      key,
      label: formatDayLabel(key),
      count: 0
    });
  }

  return buckets;
}

function normalizeCaption(row) {
  return {
    id: row?.id,
    captionContent: row?.caption_content ?? row?.content ?? "—",
    imageId: row?.image_id ?? null,
    createdAt: row?.created_at ?? row?.created_datetime_utc ?? null,
    humorFlavorId: row?.humor_flavor_id ?? null
  };
}

function normalizeUser(row) {
  return {
    id: row?.id,
    email: row?.email ?? "Unknown",
    createdAt: row?.created_at ?? row?.created_datetime_utc ?? null
  };
}

function normalizeVote(row) {
  return {
    captionId: row?.caption_id,
    voteValue: Number(row?.vote_value ?? 0),
    createdAt: row?.created_at ?? row?.created_datetime_utc ?? null,
    userId: row?.profile_id ?? row?.user_id ?? null
  };
}

function buildStatistics(voteRows, captionRows, userRows) {
  const votes = (voteRows ?? []).map(normalizeVote).filter((row) => row.captionId);
  const captions = (captionRows ?? []).map(normalizeCaption).filter((row) => row.id);
  const users = (userRows ?? []).map(normalizeUser).filter((row) => row.id);

  const totalVotes = votes.length;
  const totalFunny = votes.filter((vote) => vote.voteValue === 1).length;
  const totalNotFunny = votes.filter((vote) => vote.voteValue === -1).length;
  const overallFunnyPercent = totalVotes ? Math.round((totalFunny / totalVotes) * 100) : 0;

  const captionMap = new Map(captions.map((caption) => [String(caption.id), caption]));
  const userMap = new Map(users.map((user) => [String(user.id), user]));
  const votesByCaption = {};

  votes.forEach((vote) => {
    const captionId = String(vote.captionId);
    if (!votesByCaption[captionId]) {
      votesByCaption[captionId] = { likes: 0, dislikes: 0, total: 0 };
    }

    if (vote.voteValue === 1) votesByCaption[captionId].likes += 1;
    if (vote.voteValue === -1) votesByCaption[captionId].dislikes += 1;
    votesByCaption[captionId].total += 1;
  });

  const captionStats = Object.entries(votesByCaption).map(([captionId, stats]) => {
    const funnyPercent = stats.total ? Math.round((stats.likes / stats.total) * 100) : 0;
    const caption = captionMap.get(captionId);

    return {
      captionId,
      ...stats,
      funnyPercent,
      captionContent: caption?.captionContent ?? "—",
      controversyScore: Math.abs(50 - funnyPercent)
    };
  });

  const mostVoted = [...captionStats]
    .sort((left, right) => right.total - left.total || right.likes - left.likes)
    .slice(0, 5);

  const funniest = [...captionStats]
    .filter((caption) => caption.total >= 20)
    .sort((left, right) => right.funnyPercent - left.funnyPercent || right.total - left.total)
    .slice(0, 5);

  const mostControversial = [...captionStats]
    .filter((caption) => caption.total >= 20)
    .sort((left, right) => left.controversyScore - right.controversyScore || right.total - left.total)
    .slice(0, 5);

  const dayBuckets = createLastDayBuckets(30);
  const dayBucketMap = new Map(dayBuckets.map((bucket) => [bucket.key, bucket]));

  votes.forEach((vote) => {
    const dayKey = isoDayKey(vote.createdAt);
    if (!dayKey || !dayBucketMap.has(dayKey)) return;
    dayBucketMap.get(dayKey).count += 1;
  });

  const votesByDay = dayBuckets;
  const maxVotesPerDay = Math.max(...votesByDay.map((bucket) => bucket.count), 0);

  const votesByUser = {};
  votes.forEach((vote) => {
    if (!vote.userId) return;
    const userId = String(vote.userId);
    votesByUser[userId] = (votesByUser[userId] ?? 0) + 1;
  });

  const mostActiveVoters = Object.entries(votesByUser)
    .map(([userId, count]) => ({
      userId,
      count,
      email: userMap.get(userId)?.email ?? "Unknown"
    }))
    .sort((left, right) => right.count - left.count || left.email.localeCompare(right.email))
    .slice(0, 5);

  const captionIdsWithVotes = new Set(Object.keys(votesByCaption));
  const unvotedCaptions = captions.filter((caption) => !captionIdsWithVotes.has(String(caption.id))).length;

  return {
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
    maxVotesPerDay
  };
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

function LoadingState({ message }) {
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
  const [state, setState] = useState({
    loading: true,
    error: "",
    votes: [],
    captions: [],
    users: []
  });

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function load() {
      const [votesResult, captionsResult, usersResult] = await Promise.all([
        fetchAllRows(
          supabase,
          "caption_votes",
          "id, caption_id, vote_value, created_datetime_utc, profile_id"
        ),
        fetchAllRows(
          supabase,
          "captions",
          "id, content, image_id, created_datetime_utc, humor_flavor_id"
        ),
        fetchAllRows(
          supabase,
          "profiles",
          "id, email, created_datetime_utc"
        )
      ]);

      if (!active) return;

      const errorMessage = votesResult.error?.message || captionsResult.error?.message || usersResult.error?.message || "";

      setState({
        loading: false,
        error: errorMessage,
        votes: votesResult.data ?? [],
        captions: captionsResult.data ?? [],
        users: usersResult.data ?? []
      });
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  if (state.loading) {
    return <LoadingState message="Loading caption vote analytics..." />;
  }

  if (state.error) {
    return <LoadingState message={state.error} />;
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
    maxVotesPerDay
  } = buildStatistics(state.votes, state.captions, state.users);

  return (
    <div style={containerStyle}>
      <div style={{ flexShrink: 0, marginBottom: "20px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Statistics</h1>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
          Caption voting analytics across all users
        </p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingBottom: "32px" }}>
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
            icon="💀"
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
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--stats-positive)" }}>😂 {totalFunny} funny</span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--stats-negative)" }}>
              {totalNotFunny} not funny 💀
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
