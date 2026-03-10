"use client";

export default function Modal({ title, onClose, children }) {
  return (
    <div
      className="admin-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="admin-modal panel">
        <div className="admin-modal-header">
          <h2>{title}</h2>
          <button type="button" className="admin-icon-button" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
