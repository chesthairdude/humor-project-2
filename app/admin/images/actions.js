"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function parseJsonPayload(value) {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { data: null, error: "Payload must be a JSON object." };
    }
    return { data: parsed, error: null };
  } catch {
    return { data: null, error: "Invalid JSON payload." };
  }
}

export async function createImage(_prevState, formData) {
  const payload = String(formData.get("create_payload") || "");
  const parsed = parseJsonPayload(payload);

  if (parsed.error) {
    return { ok: false, message: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("images").insert(parsed.data);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/images");
  return { ok: true, message: "Image created." };
}

export async function updateImage(_prevState, formData) {
  const id = String(formData.get("image_id") || "").trim();
  const payload = String(formData.get("update_payload") || "");

  if (!id) {
    return { ok: false, message: "Image id is required." };
  }

  const parsed = parseJsonPayload(payload);
  if (parsed.error) {
    return { ok: false, message: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("images").update(parsed.data).eq("id", id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/images");
  return { ok: true, message: "Image updated." };
}

export async function deleteImage(_prevState, formData) {
  const id = String(formData.get("delete_image_id") || "").trim();

  if (!id) {
    return { ok: false, message: "Image id is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("images").delete().eq("id", id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/images");
  return { ok: true, message: "Image deleted." };
}
