import { fetchRows } from "@/lib/adminData";
import ImageCrudForms from "./ImageCrudForms";

export const dynamic = "force-dynamic";

function pickImageUrl(row) {
  const preferred = ["image_url", "url", "src", "image", "image_src"];
  for (const key of preferred) {
    const value = row?.[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  for (const value of Object.values(row ?? {})) {
    if (typeof value !== "string") continue;
    const v = value.trim();
    if (!v) continue;
    if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("data:image/")) {
      return v;
    }
  }

  return null;
}

export default async function AdminImagesPage() {
  const { rows, error } = await fetchRows("images", 250);

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <ImageCrudForms />
      <article className="panel">
        <h2 style={{ marginTop: 0 }}>Images table</h2>
        <p>Showing up to 250 rows from <code>images</code>.</p>
        {error ? (
          <p className="error">{error}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>ID</th>
                  <th>Created</th>
                  <th>URL</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const imageUrl = pickImageUrl(row);
                  return (
                    <tr key={row.id ?? idx}>
                      <td>
                        {imageUrl ? (
                          <div style={{ width: 180, height: 110, background: "#f8fafc", borderRadius: 8 }}>
                            <img
                              src={imageUrl}
                              alt="Upload preview"
                              style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 8 }}
                            />
                          </div>
                        ) : (
                          <span>No preview</span>
                        )}
                      </td>
                      <td><code>{String(row.id ?? "")}</code></td>
                      <td>{row.created_at ? new Date(row.created_at).toLocaleString() : ""}</td>
                      <td style={{ maxWidth: 420, wordBreak: "break-all" }}>{imageUrl ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
