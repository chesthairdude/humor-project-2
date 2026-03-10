"use client";

import Modal from "@/components/admin/Modal";

export default function ConfirmDelete({ title, message, onCancel, onConfirm, loading }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p style={{ marginTop: 0, color: "var(--text-secondary)" }}>{message}</p>
      <div className="admin-modal-actions">
        <button type="button" className="admin-button ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button type="button" className="admin-button danger" onClick={onConfirm} disabled={loading}>
          {loading ? "Deleting..." : "Delete"}
        </button>
      </div>
    </Modal>
  );
}
