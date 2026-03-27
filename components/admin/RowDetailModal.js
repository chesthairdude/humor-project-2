"use client";

function formatValue(value) {
  if (value === null || typeof value === "undefined") {
    return <span style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>—</span>;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

export default function RowDetailModal({ row, onClose, extraContent = null, topContent = null }) {
  if (!row) return null;

  return (
    <div
      className="admin-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{ backdropFilter: "blur(6px)", background: "rgba(0, 0, 0, 0.45)" }}
    >
      <div className="admin-row-detail-modal">
        <div className="admin-row-detail-header">
          <h2>{`Row Detail - ID ${row.id ?? "—"}`}</h2>
          <button type="button" className="admin-icon-button" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>

        <div className="admin-row-detail-body">
          {topContent}

          {Object.entries(row).map(([key, value]) => (
            <div key={key} className="admin-row-detail-item">
              <p className="admin-row-detail-key">{key}</p>
              <p className="admin-row-detail-value">{formatValue(value)}</p>
            </div>
          ))}

          {extraContent}
        </div>
      </div>
    </div>
  );
}
