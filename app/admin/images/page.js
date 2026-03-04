import DataTable from "@/components/DataTable";
import { fetchRows } from "@/lib/adminData";
import ImageCrudForms from "./ImageCrudForms";

export const dynamic = "force-dynamic";

export default async function AdminImagesPage() {
  const { rows, error } = await fetchRows("images", 250);

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <ImageCrudForms />
      <article className="panel">
        <h2 style={{ marginTop: 0 }}>Images table</h2>
        <p>Showing up to 250 rows from <code>images</code>.</p>
        {error ? <p className="error">{error}</p> : <DataTable rows={rows} />}
      </article>
    </section>
  );
}
