import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 1000;

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
    captionContent: row?.content ?? "—"
  };
}

function normalizeUser(row) {
  return {
    id: row?.id,
    email: row?.email ?? "Unknown"
  };
}

function normalizeVote(row) {
  return {
    captionId: row?.caption_id,
    voteValue: Number(row?.vote_value ?? 0),
    createdAt: row?.created_datetime_utc ?? null,
    userId: row?.profile_id ?? null
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

  const topVoterIds = mostActiveVoters.map((voter) => voter.userId);
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
    maxVotesPerDay,
    topVoterIds
  };
}

export async function getStatisticsSnapshot() {
  const supabase = await createClient();
  const [votesResult, captionsResult] = await Promise.all([
    fetchAllRows(
      supabase,
      "caption_votes",
      "id, caption_id, vote_value, created_datetime_utc, profile_id"
    ),
    fetchAllRows(
      supabase,
      "captions",
      "id, content, image_id, created_datetime_utc, humor_flavor_id"
    )
  ]);

  const baseError = votesResult.error?.message || captionsResult.error?.message || "";
  if (baseError) {
    return { data: null, error: baseError };
  }

  const partialStats = buildStatistics(votesResult.data ?? [], captionsResult.data ?? [], []);
  let users = [];

  if (partialStats.topVoterIds.length) {
    const usersResult = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", partialStats.topVoterIds);

    if (usersResult.error) {
      return { data: null, error: usersResult.error.message };
    }

    users = usersResult.data ?? [];
  }

  const statistics = buildStatistics(votesResult.data ?? [], captionsResult.data ?? [], users);

  return {
    data: {
      ...statistics,
      fetchedAt: new Date().toISOString()
    },
    error: ""
  };
}
