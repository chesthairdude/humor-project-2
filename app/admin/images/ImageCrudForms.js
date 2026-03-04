"use client";

import { useActionState } from "react";
import { createImage, deleteImage, updateImage } from "./actions";

const initialState = { ok: false, message: "" };

function Message({ state }) {
  if (!state?.message) return null;
  return <p className={state.ok ? "" : "error"}>{state.message}</p>;
}

export default function ImageCrudForms() {
  const [createState, createFormAction, createPending] = useActionState(createImage, initialState);
  const [updateState, updateFormAction, updatePending] = useActionState(updateImage, initialState);
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteImage, initialState);

  return (
    <div className="grid cols-3">
      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Create image row</h3>
        <form className="inline" action={createFormAction}>
          <label htmlFor="create_payload">JSON payload</label>
          <textarea
            id="create_payload"
            name="create_payload"
            defaultValue={'{"image_url":"https://..."}'}
            required
          />
          <button type="submit" disabled={createPending}>
            {createPending ? "Creating..." : "Create"}
          </button>
          <Message state={createState} />
        </form>
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Update image row</h3>
        <form className="inline" action={updateFormAction}>
          <label htmlFor="image_id">Image id</label>
          <input id="image_id" name="image_id" required />
          <label htmlFor="update_payload">JSON payload</label>
          <textarea
            id="update_payload"
            name="update_payload"
            defaultValue={'{"image_url":"https://updated..."}'}
            required
          />
          <button className="warn" type="submit" disabled={updatePending}>
            {updatePending ? "Updating..." : "Update"}
          </button>
          <Message state={updateState} />
        </form>
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Delete image row</h3>
        <form className="inline" action={deleteFormAction}>
          <label htmlFor="delete_image_id">Image id</label>
          <input id="delete_image_id" name="delete_image_id" required />
          <button className="danger" type="submit" disabled={deletePending}>
            {deletePending ? "Deleting..." : "Delete"}
          </button>
          <Message state={deleteState} />
        </form>
      </section>
    </div>
  );
}
