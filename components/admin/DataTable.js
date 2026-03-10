"use client";

export default function DataTable({ columns, data, onEdit, onDelete, loading }) {
  if (loading) {
    return <div className="admin-empty-state">Loading...</div>;
  }

  if (!data.length) {
    return <div className="admin-empty-state">No records found.</div>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
            {(onEdit || onDelete) ? <th style={{ width: 120 }}>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={row.id ?? index}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(row[column.key], row) : String(row[column.key] ?? "—")}
                </td>
              ))}
              {(onEdit || onDelete) ? (
                <td>
                  <div className="admin-table-actions">
                    {onEdit ? (
                      <button type="button" className="admin-button ghost" onClick={() => onEdit(row)}>
                        Edit
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button type="button" className="admin-button danger-ghost" onClick={() => onDelete(row)}>
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
