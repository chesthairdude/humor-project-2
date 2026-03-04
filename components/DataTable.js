export default function DataTable({ rows }) {
  if (!rows?.length) {
    return <p>No rows found.</p>;
  }

  const columns = Object.keys(rows[0]);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id ?? idx}>
              {columns.map((column) => (
                <td key={column}>
                  {typeof row[column] === "object" && row[column] !== null ? (
                    <code>{JSON.stringify(row[column], null, 2)}</code>
                  ) : (
                    String(row[column] ?? "")
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
