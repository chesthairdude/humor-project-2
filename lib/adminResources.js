function mapById(rows, labelKey) {
  return (rows ?? []).reduce((accumulator, row) => {
    accumulator[row.id] = row[labelKey];
    return accumulator;
  }, {});
}

async function loadTable(supabase, table, orderBy = "id") {
  const ordered = await supabase.from(table).select("*").order(orderBy, { ascending: true });
  if (!ordered.error) return ordered.data ?? [];

  const plain = await supabase.from(table).select("*");
  return plain.data ?? [];
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function yesNo(value) {
  return value ? "Yes" : "No";
}

function truncate(value, limit = 72) {
  if (!value) return "—";
  const stringValue = String(value);
  if (stringValue.length <= limit) return stringValue;
  return `${stringValue.slice(0, limit)}...`;
}

function renderPromptText(value) {
  return value ? value : <span style={{ fontStyle: "italic", color: "var(--text-tertiary)" }}>—</span>;
}

const ALMOST_CRACKD_API_BASE = "https://api.almostcrackd.ai";
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic"
]);

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function parseApiResponse(response, fallbackMessage) {
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    return {
      data: null,
      error: payload?.message ?? payload?.error ?? fallbackMessage
    };
  }

  return { data: payload, error: null };
}

async function getAccessToken(supabase) {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return { token: null, error: error.message };
  }

  const token = data.session?.access_token ?? null;
  if (!token) {
    return { token: null, error: "No Supabase access token is available for this session." };
  }

  return { token, error: null };
}

async function generatePresignedUrl(token, contentType) {
  const response = await fetch(`${ALMOST_CRACKD_API_BASE}/pipeline/generate-presigned-url`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ contentType })
  });

  return parseApiResponse(response, "Unable to generate a presigned upload URL.");
}

async function uploadFileToPresignedUrl(presignedUrl, file, onProgress) {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open("PUT", presignedUrl);
    request.setRequestHeader("Content-Type", file.type);

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.((event.loaded / event.total) * 100);
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve({ error: null });
        return;
      }

      resolve({ error: "Unable to upload the image bytes to the presigned URL." });
    };

    request.onerror = () => {
      resolve({ error: "Unable to upload the image bytes to the presigned URL." });
    };

    request.send(file);
  });
}

async function registerPipelineImage(token, imageUrl) {
  const response = await fetch(`${ALMOST_CRACKD_API_BASE}/pipeline/upload-image-from-url`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      imageUrl,
      isCommonUse: false
    })
  });

  return parseApiResponse(response, "Unable to register the uploaded image with the caption pipeline.");
}

async function generatePipelineCaptions(token, imageId) {
  const response = await fetch(`${ALMOST_CRACKD_API_BASE}/pipeline/generate-captions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ imageId })
  });

  return parseApiResponse(response, "Unable to generate captions for the uploaded image.");
}

async function waitForPipelineImageRow(supabase, imageId) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data, error } = await supabase.from("images").select("*").eq("id", imageId).maybeSingle();

    if (data) {
      return { data, error: null };
    }

    if (error && error.code !== "PGRST116") {
      return { data: null, error: error.message };
    }

    await sleep(500);
  }

  return {
    data: null,
    error: "The image was uploaded to the pipeline, but the images row was not available to the admin panel yet."
  };
}

export const usersResource = {
  title: "Users",
  singular: "User",
  table: "profiles",
  description: "Read-only access to superadmin and profile records.",
  searchKeys: ["id", "email", "first_name", "last_name"],
  canCreate: false,
  canEdit: false,
  canDelete: false,
  columns: [
    { key: "id", label: "ID", width: "60px" },
    { key: "email", label: "Email", width: "240px" },
    {
      key: "is_superadmin",
      label: "Superadmin",
      width: "100px",
      render: (value) => yesNo(value)
    },
    {
      key: "created_datetime_utc",
      label: "Created",
      width: "110px",
      render: (value) => formatDateTime(value)
    }
  ]
};

export const imagesResource = {
  title: "Images",
  singular: "Image",
  table: "images",
  description: "Upload images to storage and manage image metadata.",
  pageSize: 100,
  searchKeys: ["id", "url", "image_description", "additional_context"],
  createLabel: "+ New Image",
  formFields: [],
  columns: [
    {
      key: "url",
      label: "Preview",
      width: "84px",
      render: (value) => (
        value ? <img className="admin-thumbnail" src={value} alt="Image preview" /> : "—"
      )
    },
    { key: "id", label: "ID", width: "60px" },
    {
      key: "url",
      label: "URL",
      width: "35%",
      render: (value) => <span className="admin-long-text">{value ?? "—"}</span>
    },
    {
      key: "created_datetime_utc",
      label: "Created",
      width: "110px",
      render: (value) => formatDateTime(value)
    }
  ],
  renderRowDetailTop: ({ row }) => (
    row?.url ? (
      <div className="admin-row-detail-image-block">
        <p className="admin-row-detail-section-title">Expanded Image</p>
        <img className="admin-row-detail-image" src={row.url} alt={`Image ${row.id ?? ""}`} />
      </div>
    ) : null
  ),
  renderForm: ({ form, setForm, editing }) => (
    <div className="admin-form">
      {!editing ? (
        <>
          <div className="admin-field">
            <label htmlFor="image-file">File</label>
            <input
              id="image-file"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setForm((current) => ({
                  ...current,
                  file,
                  sourceUrl: file ? "" : current.sourceUrl ?? ""
                }));
              }}
            />
          </div>

          <div className="admin-field">
            <label htmlFor="image-source-url">Or Image URL</label>
            <input
              id="image-source-url"
              type="url"
              value={form.sourceUrl ?? ""}
              placeholder="https://..."
              onChange={(event) => {
                const nextUrl = event.target.value;
                setForm((current) => ({
                  ...current,
                  sourceUrl: nextUrl,
                  file: nextUrl.trim() ? null : current.file ?? null
                }));
              }}
            />
          </div>

          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.5 }}>
            The image will be sent through the Crackd caption pipeline. The saved URL and generated description will be populated automatically.
          </p>
        </>
      ) : (
        <div className="admin-field">
          <label htmlFor="image-url">Image URL</label>
          <input
            id="image-url"
            type="text"
            value={form.url ?? ""}
            placeholder="https://..."
            onChange={(event) => {
              setForm((current) => ({ ...current, url: event.target.value }));
            }}
          />
        </div>
      )}

      {form.url ? (
        <div className="admin-field">
          <label>Preview</label>
          <img src={form.url} alt="Current preview" style={{ width: 120, borderRadius: 16, border: "1px solid var(--glass-border)" }} />
        </div>
      ) : null}

      {editing ? (
        <>
          <div className="admin-field">
            <label htmlFor="image-description">Image Description</label>
            <textarea
              id="image-description"
              value={form.image_description ?? ""}
              onChange={(event) => {
                setForm((current) => ({ ...current, image_description: event.target.value }));
              }}
            />
          </div>

          <div className="admin-field">
            <label htmlFor="image-context">Additional Context</label>
            <textarea
              id="image-context"
              value={form.additional_context ?? ""}
              onChange={(event) => {
                setForm((current) => ({ ...current, additional_context: event.target.value }));
              }}
            />
          </div>

          <div className="admin-field checkbox">
            <input
              id="image-common"
              type="checkbox"
              checked={Boolean(form.is_common_use)}
              onChange={(event) => {
                setForm((current) => ({ ...current, is_common_use: event.target.checked }));
              }}
            />
            <label htmlFor="image-common">Common use</label>
          </div>

          <div className="admin-field checkbox">
            <input
              id="image-public"
              type="checkbox"
              checked={Boolean(form.is_public)}
              onChange={(event) => {
                setForm((current) => ({ ...current, is_public: event.target.checked }));
              }}
            />
            <label htmlFor="image-public">Public</label>
          </div>
        </>
      ) : null}
    </div>
  ),
  onSave: async ({ supabase, form, editing, setProgress }) => {
    if (editing) {
      const payload = {
        url: form.url?.trim() || null,
        image_description: form.image_description?.trim() || null,
        additional_context: form.additional_context?.trim() || null,
        is_common_use: Boolean(form.is_common_use),
        is_public: Boolean(form.is_public)
      };

      return supabase.from("images").update(payload).eq("id", editing.id);
    }

    if (!form.file) {
      const sourceUrl = form.sourceUrl?.trim() || "";
      if (!sourceUrl) {
        return { error: { message: "Select an image file or paste an image URL." } };
      }
    }

    const { token, error: tokenError } = await getAccessToken(supabase);
    if (tokenError) {
      return { error: { message: tokenError } };
    }

    setProgress?.({ value: 5, label: "Starting pipeline..." });

    let pipelineImageUrl = form.sourceUrl?.trim() || "";

    if (form.file) {
      if (!SUPPORTED_IMAGE_TYPES.has(form.file.type)) {
        return {
          error: {
            message: "Unsupported image type. Use JPEG, PNG, WEBP, GIF, or HEIC."
          }
        };
      }

      const presignedResult = await generatePresignedUrl(token, form.file.type);
      if (presignedResult.error) {
        return { error: { message: presignedResult.error } };
      }

      setProgress?.({ value: 15, label: "Uploading image..." });

      const uploadResult = await uploadFileToPresignedUrl(presignedResult.data.presignedUrl, form.file, (value) => {
        setProgress?.({
          value: 15 + value * 0.55,
          label: "Uploading image..."
        });
      });
      if (uploadResult.error) {
        return { error: { message: uploadResult.error } };
      }

      pipelineImageUrl = presignedResult.data.cdnUrl;
    }

    setProgress?.({ value: 75, label: "Registering image..." });

    const registerResult = await registerPipelineImage(token, pipelineImageUrl);
    if (registerResult.error) {
      return { error: { message: registerResult.error } };
    }

    const imageId = registerResult.data?.imageId;
    if (!imageId) {
      return { error: { message: "The pipeline did not return an imageId." } };
    }

    setProgress?.({ value: 88, label: "Generating captions..." });

    const captionsResult = await generatePipelineCaptions(token, imageId);
    if (captionsResult.error) {
      return { error: { message: captionsResult.error } };
    }

    setProgress?.({ value: 95, label: "Finalizing image..." });

    const imageRowResult = await waitForPipelineImageRow(supabase, imageId);
    if (imageRowResult.error) {
      return { error: { message: imageRowResult.error } };
    }

    if (form.file && imageRowResult.data?.url !== pipelineImageUrl) {
      const { error } = await supabase.from("images").update({ url: pipelineImageUrl }).eq("id", imageId);
      if (error) {
        return { error };
      }
    }

    setProgress?.({ value: 100, label: "Complete" });
    return { data: imageRowResult.data, error: null };
  },
  getDeleteLabel: (row) => row.url ?? row.id
};

export const humorFlavorsResource = {
  title: "Humor Flavors",
  singular: "Humor Flavor",
  table: "humor_flavors",
  description: "Read-only access to available flavor definitions.",
  searchKeys: ["id", "slug", "description"],
  canCreate: false,
  canEdit: false,
  canDelete: false,
  columns: [
    { key: "id", label: "ID", width: "60px" },
    { key: "slug", label: "Slug", width: "160px" },
    { key: "description", label: "Description", width: "40%" },
    {
      key: "created_datetime_utc",
      label: "Created",
      width: "110px",
      render: (value) => formatDateTime(value)
    }
  ]
};

export const humorFlavorStepsResource = {
  title: "Humor Flavor Steps",
  singular: "Humor Flavor Step",
  table: "humor_flavor_steps",
  description: "Read-only pipeline steps for each humor flavor.",
  searchKeys: ["id", "description", "order_by", "humor_flavor_id", "llm_model_id"],
  canCreate: false,
  canEdit: false,
  canDelete: false,
  loadExtraData: async (supabase) => {
    const [flavors, models] = await Promise.all([
      loadTable(supabase, "humor_flavors"),
      loadTable(supabase, "llm_models")
    ]);

    return {
      humorFlavorMap: mapById(flavors, "slug"),
      llmModelMap: mapById(models, "name")
    };
  },
  columns: [
    { key: "id", label: "ID", width: "60px" },
    {
      key: "humor_flavor_id",
      label: "Flavor",
      width: "160px",
      render: (value, _row, { extraData }) => extraData.humorFlavorMap?.[value] ?? value ?? "—"
    },
    { key: "order_by", label: "Step", width: "80px" },
    { key: "description", label: "Description", width: "35%" },
    {
      key: "llm_model_id",
      label: "LLM Model",
      width: "180px",
      render: (value, _row, { extraData }) => extraData.llmModelMap?.[value] ?? value ?? "—"
    }
  ]
};

export const humorMixResource = {
  title: "Humor Mix",
  singular: "Humor Mix Row",
  table: "humor_flavor_mix",
  description: "Adjust flavor mix weights without creating or deleting rows.",
  searchKeys: ["id", "caption_count", "humor_flavor_id"],
  canCreate: false,
  canDelete: false,
  formFields: [
    {
      key: "caption_count",
      label: "Caption Count",
      type: "number"
    }
  ],
  loadExtraData: async (supabase) => {
    const flavors = await loadTable(supabase, "humor_flavors");
    return {
      humorFlavorMap: mapById(flavors, "slug")
    };
  },
  columns: [
    { key: "id", label: "ID", width: "60px" },
    {
      key: "humor_flavor_id",
      label: "Flavor",
      width: "180px",
      render: (value, _row, { extraData }) => extraData.humorFlavorMap?.[value] ?? value ?? "—"
    },
    { key: "caption_count", label: "Caption Count", width: "120px" },
    {
      key: "created_datetime_utc",
      label: "Created",
      width: "110px",
      render: (value) => formatDateTime(value)
    }
  ]
};

export const termsResource = {
  title: "Terms",
  singular: "Term",
  table: "terms",
  description: "Manage term definitions, examples, and priorities.",
  tableOptions: {
    actionLayout: "column",
    actionWidth: "80px",
    overflowX: "hidden"
  },
  searchKeys: ["id", "term", "definition", "example"],
  createLabel: "+ New Term",
  formFields: [
    { key: "term", label: "Term", type: "text" },
    { key: "definition", label: "Definition", type: "textarea" },
    { key: "example", label: "Example", type: "textarea" },
    { key: "priority", label: "Priority", type: "number" },
    {
      key: "term_type_id",
      label: "Term Type",
      type: "select-number",
      getOptions: (extraData) => extraData.termTypeOptions ?? []
    }
  ],
  loadExtraData: async (supabase) => {
    const termTypes = await loadTable(supabase, "term_types");
    return {
      termTypeMap: mapById(termTypes, "name"),
      termTypeOptions: termTypes.map((row) => ({ value: String(row.id), label: row.name }))
    };
  },
  columns: [
    { key: "id", label: "ID", width: "50px" },
    { key: "term", label: "Term", width: "120px" },
    { key: "definition", label: "Definition", width: "22%" },
    { key: "example", label: "Example", width: "22%" },
    { key: "priority", label: "Priority", width: "70px" },
    {
      key: "term_type_id",
      label: "Type",
      width: "100px",
      render: (value, _row, { extraData }) => extraData.termTypeMap?.[value] ?? value ?? "—"
    },
    {
      key: "created_datetime_utc",
      label: "Created",
      width: "90px",
      render: (value) => formatDateTime(value)
    }
  ],
  getDeleteLabel: (row) => row.term ?? row.id
};

export const captionsResource = {
  title: "Captions",
  singular: "Caption",
  table: "captions",
  description: "Read-only caption output with image and flavor references.",
  pageSize: 100,
  searchKeys: ["id", "content", "image_id", "profile_id"],
  canCreate: false,
  canEdit: false,
  canDelete: false,
  loadExtraData: async (supabase) => {
    const flavors = await loadTable(supabase, "humor_flavors");
    return {
      humorFlavorMap: mapById(flavors, "slug")
    };
  },
  columns: [
    { key: "id", label: "ID", width: "60px" },
    {
      key: "content",
      label: "Caption",
      width: "40%",
      render: (value) => <span className="admin-long-text">{truncate(value, 120)}</span>
    },
    { key: "image_id", label: "Image ID", width: "100px" },
    {
      key: "humor_flavor_id",
      label: "Flavor",
      width: "140px",
      render: (value, _row, { extraData }) => extraData.humorFlavorMap?.[value] ?? value ?? "—"
    },
    {
      key: "created_datetime_utc",
      label: "Created",
      width: "110px",
      render: (value) => formatDateTime(value)
    }
  ]
};

export const captionRequestsResource = {
  title: "Caption Requests",
  singular: "Caption Request",
  table: "caption_requests",
  description: "Read-only queue of caption generation requests.",
  searchKeys: ["id", "image_id", "profile_id"],
  canCreate: false,
  canEdit: false,
  canDelete: false,
  columns: [
    { key: "id", label: "ID", width: "60px" },
    { key: "image_id", label: "Image ID", width: "100px" },
    { key: "profile_id", label: "Profile ID", width: "120px" },
    {
      key: "created_datetime_utc",
      label: "Created",
      width: "110px",
      render: (value) => formatDateTime(value)
    }
  ]
};

export const captionExamplesResource = {
  title: "Caption Examples",
  singular: "Caption Example",
  table: "caption_examples",
  description: "Manage reusable caption exemplars and explanations.",
  tableOptions: {
    actionLayout: "column",
    actionWidth: "80px",
    overflowX: "hidden"
  },
  searchKeys: ["id", "caption", "image_description", "explanation"],
  createLabel: "+ New Example",
  formFields: [
    { key: "caption", label: "Caption", type: "textarea" },
    { key: "image_description", label: "Image Description", type: "textarea" },
    { key: "explanation", label: "Explanation", type: "textarea" },
    { key: "priority", label: "Priority", type: "number" },
    { key: "image_id", label: "Image ID", type: "text" }
  ],
  columns: [
    { key: "id", label: "ID", width: "60px" },
    {
      key: "caption",
      label: "Caption",
      width: "30%",
      render: (value) => <span className="admin-long-text">{truncate(value, 100)}</span>
    },
    {
      key: "explanation",
      label: "Explanation",
      width: "30%",
      render: (value) => <span className="admin-long-text">{truncate(value, 100)}</span>
    },
    { key: "priority", label: "Priority", width: "70px" },
    {
      key: "created_datetime_utc",
      label: "Created",
      width: "120px",
      render: (value) => formatDateTime(value)
    }
  ],
  getDeleteLabel: (row) => row.caption ?? row.id
};

export const llmModelsResource = {
  title: "LLM Models",
  singular: "LLM Model",
  table: "llm_models",
  description: "Manage models and their provider mappings.",
  tableOptions: {
    actionLayout: "column",
    actionWidth: "80px",
    overflowX: "hidden"
  },
  searchKeys: ["id", "name", "provider_model_id"],
  createLabel: "+ New Model",
  formFields: [
    { key: "name", label: "Name", type: "text" },
    {
      key: "llm_provider_id",
      label: "Provider",
      type: "select-number",
      getOptions: (extraData) => extraData.providerOptions ?? []
    },
    { key: "provider_model_id", label: "Provider Model ID", type: "text" },
    { key: "is_temperature_supported", label: "Supports Temperature", type: "checkbox" }
  ],
  loadExtraData: async (supabase) => {
    const providers = await loadTable(supabase, "llm_providers");
    return {
      providerMap: mapById(providers, "name"),
      providerOptions: providers.map((row) => ({ value: String(row.id), label: row.name }))
    };
  },
  columns: [
    { key: "id", label: "ID", width: "50px" },
    { key: "name", label: "Name", width: "160px" },
    {
      key: "llm_provider_id",
      label: "Provider",
      width: "100px",
      render: (value, _row, { extraData }) => extraData.providerMap?.[value] ?? value ?? "—"
    },
    { key: "provider_model_id", label: "Provider Model ID", width: "200px" },
    {
      key: "is_temperature_supported",
      label: "Temp",
      width: "60px",
      render: (value) => yesNo(value)
    },
    {
      key: "created_datetime_utc",
      label: "Created",
      width: "120px",
      render: (value) => formatDateTime(value)
    }
  ],
  getDeleteLabel: (row) => row.name ?? row.id
};

export const llmProvidersResource = {
  title: "LLM Providers",
  singular: "LLM Provider",
  table: "llm_providers",
  description: "Manage provider records used by model configs.",
  searchKeys: ["id", "name"],
  createLabel: "+ New Provider",
  formFields: [{ key: "name", label: "Name", type: "text" }],
  columns: [
    { key: "id", label: "ID", width: "60px" },
    { key: "name", label: "Name", width: "220px" },
    {
      key: "created_datetime_utc",
      label: "Created",
      width: "110px",
      render: (value) => formatDateTime(value)
    }
  ],
  getDeleteLabel: (row) => row.name ?? row.id
};

export const llmPromptChainsResource = {
  title: "LLM Prompt Chains",
  singular: "LLM Prompt Chain",
  table: "llm_prompt_chains",
  description: "Read-only prompt chain records tied to caption requests.",
  searchKeys: ["id", "caption_request_id"],
  canCreate: false,
  canEdit: false,
  canDelete: false,
  onRowSelect: async ({ supabase, row }) => {
    const { data, error } = await supabase
      .from("llm_model_responses")
      .select("id, llm_system_prompt, llm_user_prompt, created_datetime_utc")
      .eq("llm_prompt_chain_id", row.id)
      .order("created_datetime_utc", { ascending: false })
      .limit(10);

    console.log("[PROMPT CHAINS] responses:", data, error);

    if (error) {
      throw error;
    }

    return data ?? [];
  },
  renderRowDetailExtra: ({ detailData, detailLoading, detailError }) => (
    <div className="admin-row-detail-extra">
      <p className="admin-row-detail-section-title">Associated Prompts from llm_model_responses</p>

      {detailLoading ? (
        <p className="admin-row-detail-empty">Loading prompts...</p>
      ) : null}

      {!detailLoading && detailError ? (
        <p className="admin-row-detail-empty error">{detailError}</p>
      ) : null}

      {!detailLoading && !detailError && Array.isArray(detailData) && detailData.length === 0 ? (
        <p className="admin-row-detail-empty">No responses found for this prompt chain.</p>
      ) : null}

      {!detailLoading && !detailError && Array.isArray(detailData)
        ? detailData.map((response, index) => (
            <div key={response.id ?? index} className="admin-row-detail-prompt-card">
              <p className="admin-row-detail-prompt-meta">
                {`Response #${index + 1} - ${formatDateTime(response.created_datetime_utc)}`}
              </p>

              <p className="admin-row-detail-prompt-label system">System Prompt</p>
              <p className="admin-row-detail-prompt-value">{renderPromptText(response.llm_system_prompt)}</p>

              <p className="admin-row-detail-prompt-label user">User Prompt</p>
              <p className="admin-row-detail-prompt-value">{renderPromptText(response.llm_user_prompt)}</p>
            </div>
          ))
        : null}
    </div>
  ),
  columns: [
    { key: "id", label: "ID", width: "60px" },
    { key: "caption_request_id", label: "Caption Request ID", width: "140px" },
    {
      key: "created_datetime_utc",
      label: "Created",
      width: "110px",
      render: (value) => formatDateTime(value)
    }
  ]
};

export const llmResponsesResource = {
  title: "LLM Responses",
  singular: "LLM Response",
  table: "llm_model_responses",
  description: "Read-only responses returned by provider models.",
  searchKeys: ["id", "llm_model_response", "profile_id", "caption_request_id"],
  canCreate: false,
  canEdit: false,
  canDelete: false,
  loadExtraData: async (supabase) => {
    const [models, flavors] = await Promise.all([
      loadTable(supabase, "llm_models"),
      loadTable(supabase, "humor_flavors")
    ]);

    return {
      modelMap: mapById(models, "name"),
      humorFlavorMap: mapById(flavors, "slug")
    };
  },
  columns: [
    { key: "id", label: "ID", width: "60px" },
    {
      key: "llm_model_id",
      label: "Model",
      width: "160px",
      render: (value, _row, { extraData }) => extraData.modelMap?.[value] ?? value ?? "—"
    },
    {
      key: "llm_prompt_chain_id",
      label: "Prompt Chain",
      width: "120px",
      render: (value) => (value ? `Chain #${value}` : "—")
    },
    {
      key: "humor_flavor_id",
      label: "Flavor",
      width: "140px",
      render: (value, _row, { extraData }) => extraData.humorFlavorMap?.[value] ?? value ?? "—"
    },
    {
      key: "llm_model_response",
      label: "Response",
      width: "35%",
      render: (value) => <span className="admin-long-text">{truncate(value, 120)}</span>
    },
    { key: "processing_time_seconds", label: "Seconds", width: "90px" },
    {
      key: "created_datetime_utc",
      label: "Created",
      width: "110px",
      render: (value) => formatDateTime(value)
    }
  ]
};

export const allowedDomainsResource = {
  title: "Allowed Domains",
  singular: "Allowed Domain",
  table: "allowed_signup_domains",
  description: "Manage approved signup apex domains.",
  searchKeys: ["id", "apex_domain"],
  createLabel: "+ New Domain",
  formFields: [{ key: "apex_domain", label: "Domain", type: "text", placeholder: "columbia.edu" }],
  columns: [
    { key: "id", label: "ID", width: "60px" },
    { key: "apex_domain", label: "Domain", width: "240px" },
    {
      key: "created_datetime_utc",
      label: "Created",
      width: "110px",
      render: (value) => formatDateTime(value)
    }
  ],
  getDeleteLabel: (row) => row.apex_domain ?? row.id
};

export const whitelistedEmailsResource = {
  title: "Whitelisted Emails",
  singular: "Whitelisted Email",
  table: "whitelist_email_addresses",
  description: "Manage individual whitelisted email addresses.",
  searchKeys: ["id", "email_address"],
  createLabel: "+ New Email",
  formFields: [{ key: "email_address", label: "Email", type: "text", placeholder: "user@example.com" }],
  columns: [
    { key: "id", label: "ID", width: "60px" },
    { key: "email_address", label: "Email", width: "240px" },
    {
      key: "created_datetime_utc",
      label: "Created",
      width: "110px",
      render: (value) => formatDateTime(value)
    }
  ],
  getDeleteLabel: (row) => row.email_address ?? row.id
};
