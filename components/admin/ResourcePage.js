"use client";

import { useEffect, useState } from "react";
import ConfirmDelete from "@/components/admin/ConfirmDelete";
import DataTable from "@/components/admin/DataTable";
import Modal from "@/components/admin/Modal";
import RowDetailModal from "@/components/admin/RowDetailModal";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_PAGE_SIZE = 100;

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

function buildSearchFilter(searchKeys, query) {
  if (!query || !searchKeys.length) return null;

  const escapedQuery = query.replaceAll(",", "\\,");
  const filterableKeys = searchKeys.filter((key) => {
    return !(
      key === "id" ||
      key.endsWith("_id") ||
      key.includes("priority") ||
      key.includes("count") ||
      key.includes("seconds") ||
      key.includes("order_by")
    );
  });

  if (!filterableKeys.length) return null;

  return filterableKeys.map((key) => `${key}.ilike.%${escapedQuery}%`).join(",");
}

async function fetchOrdered(query, orderBy, ascending, range) {
  if (orderBy) {
    const ordered = await query.order(orderBy, { ascending }).range(range.from, range.to);
    if (!ordered.error) return ordered;
  }

  const byId = await query.order("id", { ascending }).range(range.from, range.to);
  if (!byId.error) return byId;

  return await query.range(range.from, range.to);
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
  getDeleteLabel,
  tableOptions,
  onRowSelect,
  renderRowDetailTop,
  renderRowDetailExtra,
  pageSize = DEFAULT_PAGE_SIZE
}) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [extraData, setExtraData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [saveProgress, setSaveProgress] = useState(null);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(buildForm(formFields));
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [rowDetailData, setRowDetailData] = useState(null);
  const [rowDetailLoading, setRowDetailLoading] = useState(false);
  const [rowDetailError, setRowDetailError] = useState("");
  const [page, setPage] = useState(1);

  const activeColumns = typeof getColumns === "function" ? getColumns(extraData) : columns;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  async function load() {
    setLoading(true);
    setError("");

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const searchFilter = buildSearchFilter(searchKeys, query.trim());
    let rowsQuery = supabase.from(table).select("*", { count: "exact" });

    if (searchFilter) {
      rowsQuery = rowsQuery.or(searchFilter);
    }

    const [rowsResult, extraResult] = await Promise.all([
      fetchOrdered(rowsQuery, orderBy, orderAscending, { from, to }),
      loadExtraData ? loadExtraData(supabase) : Promise.resolve({})
    ]);

    if (rowsResult.error) {
      setRows([]);
      setTotalRows(0);
      setError(rowsResult.error.message);
    } else {
      setRows(rowsResult.data ?? []);
      setTotalRows(rowsResult.count ?? 0);
    }

    setExtraData(extraResult ?? {});
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [page, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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

  async function handleRowSelect(row) {
    setSelectedRow(row);
    setRowDetailData(null);
    setRowDetailError("");

    if (!onRowSelect) return;

    setRowDetailLoading(true);

    try {
      const detailData = await onRowSelect({ supabase, row, extraData });
      setRowDetailData(detailData ?? null);
    } catch (error) {
      setRowDetailError(error?.message ?? "Unable to load row detail.");
    } finally {
      setRowDetailLoading(false);
    }
  }

  function handleRowDetailClose() {
    setSelectedRow(null);
    setRowDetailData(null);
    setRowDetailLoading(false);
    setRowDetailError("");
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaveProgress(null);

    const payload = formFields.reduce((accumulator, field) => {
      accumulator[field.key] = normalizeValue(field, form[field.key]);
      return accumulator;
    }, {});

    const result = onSave
      ? await onSave({
          supabase,
          form,
          payload,
          editing,
          extraData,
          setProgress: (progress) => setSaveProgress(progress)
        })
      : editing
        ? await supabase.from(table).update(payload).eq("id", editing.id)
        : await supabase.from(table).insert(payload);

    if (result?.error) {
      setError(result.error.message);
      setSaving(false);
      setSaveProgress(null);
      return;
    }

    setSaving(false);
    setSaveProgress(null);
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

  const pageStart = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = totalRows === 0 ? 0 : pageStart + rows.length - 1;

  return (
    <section className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>{title}</h1>
          <p>{`${description} Click each row to expand.`}</p>
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
          <p className="kicker admin-toolbar-count">
            {totalRows === 0 ? "0 shown" : `${pageStart}-${pageEnd} of ${totalRows}`}
          </p>
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
          data={rows}
          loading={loading}
          onEdit={canEdit ? openEdit : undefined}
          onDelete={canDelete ? setDeleteTarget : undefined}
          onRowClick={handleRowSelect}
          actionLayout={tableOptions?.actionLayout}
          actionWidth={tableOptions?.actionWidth}
          overflowX={tableOptions?.overflowX}
        />
      </div>

      <div className="admin-pagination">
        <p className="admin-pagination-copy">
          {totalRows === 0 ? "No records" : `Page ${page} of ${totalPages}`}
        </p>
        <div className="admin-pagination-actions">
          <button
            type="button"
            className="admin-button ghost"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={loading || page <= 1}
          >
            Previous
          </button>
          <button
            type="button"
            className="admin-button ghost"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={loading || page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {modalOpen ? (
        <Modal title={editing ? `Edit ${singular}` : `New ${singular}`} onClose={() => setModalOpen(false)}>
          {renderForm ? (
            renderForm({ form, setForm, editing, extraData })
          ) : (
            <DefaultForm fields={formFields} form={form} setForm={setForm} extraData={extraData} />
          )}
          {saving && saveProgress ? (
            <div className="admin-save-progress">
              <div className="admin-save-progress-copy">
                <span>{saveProgress.label ?? "Processing..."}</span>
                <span>{`${Math.max(0, Math.min(100, Math.round(saveProgress.value ?? 0)))}%`}</span>
              </div>
              <div className="admin-save-progress-track">
                <div
                  className="admin-save-progress-bar"
                  style={{ width: `${Math.max(0, Math.min(100, saveProgress.value ?? 0))}%` }}
                />
              </div>
            </div>
          ) : null}
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

      <RowDetailModal
        row={selectedRow}
        onClose={handleRowDetailClose}
        topContent={
          selectedRow && typeof renderRowDetailTop === "function"
            ? renderRowDetailTop({
                row: selectedRow,
                detailData: rowDetailData,
                detailLoading: rowDetailLoading,
                detailError: rowDetailError
              })
            : null
        }
        extraContent={
          selectedRow && typeof renderRowDetailExtra === "function"
            ? renderRowDetailExtra({
                row: selectedRow,
                detailData: rowDetailData,
                detailLoading: rowDetailLoading,
                detailError: rowDetailError
              })
            : null
        }
      />
    </section>
  );
}
