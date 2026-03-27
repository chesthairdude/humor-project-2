"use client";

import { useEffect, useState } from "react";
import ConfirmDelete from "@/components/admin/ConfirmDelete";
import DataTable from "@/components/admin/DataTable";
import Modal from "@/components/admin/Modal";
import { createClient } from "@/lib/supabase/client";

function normalizeValue(field, value) {
  if (field.type === "checkbox") return Boolean(value);
  if (field.type === "number" || field.type === "select-number") {
    if (value === "" || value === null || typeof value === "undefined") return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return value;
}

function buildForm(fields, row = {}) {
  if (!fields.length) {
    return { ...row };
  }

  const next = {};

  fields.forEach((field) => {
    if (field.type === "checkbox") {
      next[field.key] = Boolean(row[field.key] ?? field.defaultValue ?? false);
      return;
    }

    if (field.type === "number" || field.type === "select-number") {
      const value = row[field.key];
      next[field.key] = value === null || typeof value === "undefined" ? "" : String(value);
      return;
    }

    next[field.key] = row[field.key] ?? field.defaultValue ?? "";
  });

  return next;
}

async function fetchOrdered(query, orderBy, ascending) {
  if (orderBy) {
    const ordered = await query.order(orderBy, { ascending });
    if (!ordered.error) return ordered;
  }

  const byId = await query.order("id", { ascending });
  if (!byId.error) return byId;

  return await query;
}

function matchesSearch(row, searchKeys, query) {
  if (!query) return true;
  const lowered = query.toLowerCase();

  return searchKeys.some((key) => {
    const value = row?.[key];
    if (value === null || typeof value === "undefined") return false;
    return String(value).toLowerCase().includes(lowered);
  });
}

function DefaultForm({ fields, form, setForm, extraData }) {
  return (
    <div className="admin-form">
      {fields.map((field) => {
        const options = field.getOptions ? field.getOptions(extraData) : field.options ?? [];

        if (field.type === "checkbox") {
          return (
            <div key={field.key} className="admin-field checkbox">
              <input
                id={field.key}
                type="checkbox"
                checked={Boolean(form[field.key])}
                onChange={(event) => {
                  setForm((current) => ({ ...current, [field.key]: event.target.checked }));
                }}
              />
              <label htmlFor={field.key}>{field.label}</label>
            </div>
          );
        }

        return (
          <div key={field.key} className="admin-field">
            <label htmlFor={field.key}>{field.label}</label>
            {field.type === "textarea" ? (
              <textarea
                id={field.key}
                value={form[field.key] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) => {
                  setForm((current) => ({ ...current, [field.key]: event.target.value }));
                }}
              />
            ) : field.type === "select" || field.type === "select-number" ? (
              <select
                id={field.key}
                value={form[field.key] ?? ""}
                onChange={(event) => {
                  setForm((current) => ({ ...current, [field.key]: event.target.value }));
                }}
              >
                <option value="">{field.placeholder ?? "Select an option"}</option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={field.key}
                type={field.type === "number" ? "number" : "text"}
                value={form[field.key] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) => {
                  setForm((current) => ({ ...current, [field.key]: event.target.value }));
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ResourcePage({
  title,
  description,
  table,
  singular,
  columns,
  formFields = [],
  searchKeys = [],
  canCreate = true,
  canEdit = true,
  canDelete = true,
  createLabel,
  orderBy = "created_datetime_utc",
  orderAscending = false,
  loadExtraData,
  getColumns,
  renderForm,
  onSave,
  onDelete,
  getDeleteLabel
}) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState([]);
  const [extraData, setExtraData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(buildForm(formFields));
  const [deleteTarget, setDeleteTarget] = useState(null);

  const activeColumns = typeof getColumns === "function" ? getColumns(extraData) : columns;

  async function load() {
    setLoading(true);
    setError("");

    const [rowsResult, extraResult] = await Promise.all([
      fetchOrdered(supabase.from(table).select("*"), orderBy, orderAscending),
      loadExtraData ? loadExtraData(supabase) : Promise.resolve({})
    ]);

    if (rowsResult.error) {
      setRows([]);
      setError(rowsResult.error.message);
    } else {
      setRows(rowsResult.data ?? []);
    }

    setExtraData(extraResult ?? {});
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(buildForm(formFields));
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm(buildForm(formFields, row));
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const payload = formFields.reduce((accumulator, field) => {
      accumulator[field.key] = normalizeValue(field, form[field.key]);
      return accumulator;
    }, {});

    const result = onSave
      ? await onSave({ supabase, form, payload, editing, extraData })
      : editing
        ? await supabase.from(table).update(payload).eq("id", editing.id)
        : await supabase.from(table).insert(payload);

    if (result?.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setModalOpen(false);
    await load();
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;

    setDeleting(true);
    setError("");

    const result = onDelete
      ? await onDelete({ supabase, row: deleteTarget })
      : await supabase.from(table).delete().eq("id", deleteTarget.id);

    if (result?.error) {
      setError(result.error.message);
      setDeleting(false);
      return;
    }

    setDeleting(false);
    setDeleteTarget(null);
    await load();
  }

  const filteredRows = rows.filter((row) => matchesSearch(row, searchKeys, query));

  return (
    <section className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>

      <div className="admin-toolbar">
        <input
          className="admin-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${title.toLowerCase()}...`}
        />
        <div className="admin-toolbar-actions">
          <p className="kicker admin-toolbar-count">{filteredRows.length} shown</p>
          {canCreate ? (
            <button type="button" className="admin-button primary" onClick={openCreate}>
              {createLabel ?? `New ${singular}`}
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="error admin-page-error">{error}</p> : null}

      <div className="admin-table-panel">
        <DataTable
          columns={activeColumns.map((column) => ({
            ...column,
            render: column.render
              ? (value, row) => column.render(value, row, { extraData })
              : undefined
          }))}
          data={filteredRows}
          loading={loading}
          onEdit={canEdit ? openEdit : undefined}
          onDelete={canDelete ? setDeleteTarget : undefined}
        />
      </div>

      {modalOpen ? (
        <Modal title={editing ? `Edit ${singular}` : `New ${singular}`} onClose={() => setModalOpen(false)}>
          {renderForm ? (
            renderForm({ form, setForm, editing, extraData })
          ) : (
            <DefaultForm fields={formFields} form={form} setForm={setForm} extraData={extraData} />
          )}
          <div className="admin-modal-actions">
            <button type="button" className="admin-button ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="admin-button primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </Modal>
      ) : null}

      {deleteTarget ? (
        <ConfirmDelete
          title={`Delete ${singular}`}
          message={`Delete "${getDeleteLabel ? getDeleteLabel(deleteTarget) : deleteTarget.id}"?`}
          loading={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </section>
  );
}
