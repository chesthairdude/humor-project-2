"use client";

function inferColumnWidth(column) {
  if (column.width) return column.width;

  const key = column.key ?? "";

  if (key === "id") return "60px";
  if (key.includes("created")) return "110px";
  if (key.includes("priority")) return "80px";
  if (key.includes("type")) return "100px";
  if (key.includes("seconds") || key.includes("count") || key.includes("temp")) return "90px";
  if (key.includes("email")) return "220px";
  if (key.includes("url") || key.includes("domain")) return "240px";
  if (key.includes("name") || key.includes("term") || key.includes("slug") || key.includes("provider")) return "150px";
  if (
    key.includes("description") ||
    key.includes("definition") ||
    key.includes("example") ||
    key.includes("content") ||
    key.includes("response")
  ) {
    return "25%";
  }

  return "140px";
}

export default function DataTable({
  columns,
  data,
  onEdit,
  onDelete,
  loading,
  onRowClick,
  actionLayout = "row",
  actionWidth = "100px",
  overflowX = "auto"
}) {
  if (loading) {
    return <div className="admin-empty-state">Loading...</div>;
  }

  if (!data.length) {
    return <div className="admin-empty-state">No records found.</div>;
  }

  return (
    <div
      className={overflowX === "hidden" ? "admin-table-wrap admin-table-wrap-no-x" : "admin-table-wrap"}
    >
      <table className="admin-table">
        <colgroup>
          {columns.map((column) => (
            <col key={column.key} style={{ width: inferColumnWidth(column) }} />
          ))}
          {(onEdit || onDelete) ? <col style={{ width: actionWidth }} /> : null}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
            {(onEdit || onDelete) ? <th style={{ width: actionWidth }}>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={row.id ?? index}
              className={onRowClick ? "admin-table-row admin-table-row-clickable" : "admin-table-row"}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} className="admin-table-cell">
                  {column.render ? column.render(row[column.key], row) : String(row[column.key] ?? "—")}
                </td>
              ))}
              {(onEdit || onDelete) ? (
                <td className="admin-table-cell" style={actionLayout === "column" ? { padding: "8px 12px", width: actionWidth } : undefined}>
                  <div className={actionLayout === "column" ? "admin-table-actions admin-table-actions-column" : "admin-table-actions"}>
                    {onEdit ? (
                      <button
                        type="button"
                        className={actionLayout === "column" ? "admin-table-action-button admin-table-action-button-edit" : "admin-button ghost"}
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(row);
                        }}
                      >
                        Edit
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button
                        type="button"
                        className={actionLayout === "column" ? "admin-table-action-button admin-table-action-button-delete" : "admin-button danger-ghost"}
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(row);
                        }}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
