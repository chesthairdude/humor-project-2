import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/adminData";
import { getStatisticsSnapshot } from "@/lib/adminStatistics";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSuperadmin();

  if (!auth.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!auth.isSuperadmin) {
    return NextResponse.json({ error: "Superadmin access required." }, { status: 403 });
  }

  const snapshot = await getStatisticsSnapshot();

  if (snapshot.error) {
    return NextResponse.json({ error: snapshot.error }, { status: 500 });
  }

  return NextResponse.json(snapshot.data, {
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=300"
    }
  });
}
