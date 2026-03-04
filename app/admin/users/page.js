import DataTable from "@/components/DataTable";
import { fetchRows } from "@/lib/adminData";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { rows, error } = await fetchRows("profiles", 250);

  return (
    <section className="panel">
      <h2 style={{ marginTop: 0 }}>Users / Profiles (read only)</h2>
      <p>Showing up to 250 rows from <code>profiles</code>.</p>
      {error ? <p className="error">{error}</p> : <DataTable rows={rows} />}
    </section>
  );
}
