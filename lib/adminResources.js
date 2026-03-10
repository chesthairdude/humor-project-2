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
    { key: "id", label: "ID" },
    { key: "email", label: "Email" },
    {
      key: "is_superadmin",
      label: "Superadmin",
      render: (value) => yesNo(value)
    },
    {
      key: "created_datetime_utc",
      label: "Created",
      render: (value) => formatDateTime(value)
    }
  ]
};

export const imagesResource = {
  title: "Images",
  singular: "Image",
  table: "images",
  description: "Upload images to storage and manage image metadata.",
  searchKeys: ["id", "url", "image_description", "additional_context"],
  createLabel: "+ New Image",
  formFields: [],
  columns: [
    {
      key: "url",
      label: "Preview",
      render: (value) => (
        value ? <img className="admin-thumbnail" src={value} alt="Image preview" /> : "—"
      )
    },
    { key: "id", label: "ID" },
    {
      key: "url",
      label: "URL",
      render: (value) => <span className="admin-long-text">{value ?? "—"}</span>
    },
    {
      key: "created_datetime_utc",
      label: "Created",
      render: (value) => formatDateTime(value)
    }
  ],
  renderForm: ({ form, setForm }) => (
    <div className="admin-form">
      <div className="admin-field">
        <label htmlFor="image-file">File</label>
        <input
          id="image-file"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setForm((current) => ({ ...current, file }));
          }}
        />
      </div>

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

      {form.url ? (
        <div className="admin-field">
          <label>Preview</label>
          <img src={form.url} alt="Current preview" style={{ width: 120, borderRadius: 16, border: "1px solid var(--glass-border)" }} />
        </div>
      ) : null}

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
    </div>
  ),
  onSave: async ({ supabase, form, editing }) => {
    let imageUrl = form.url?.trim();

    if (form.file) {
      const path = `${Date.now()}-${form.file.name}`;
      const uploadResult = await supabase.storage.from("images").upload(path, form.file);
      if (uploadResult.error) return uploadResult;

      const publicUrlResult = supabase.storage.from("images").getPublicUrl(uploadResult.data.path);
      imageUrl = publicUrlResult.data.publicUrl;
    }

    if (!imageUrl) {
      return { error: { message: "Provide an image URL or upload a file." } };
    }

    const payload = {
      url: imageUrl,
      image_description: form.image_description?.trim() || null,
      additional_context: form.additional_context?.trim() || null,
      is_common_use: Boolean(form.is_common_use),
      is_public: Boolean(form.is_public)
    };

    return editing
      ? supabase.from("images").update(payload).eq("id", editing.id)
      : supabase.from("images").insert(payload);
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
    { key: "id", label: "ID" },
    { key: "slug", label: "Slug" },
    { key: "description", label: "Description" },
    {
      key: "created_datetime_utc",
      label: "Created",
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
    { key: "id", label: "ID" },
    {
      key: "humor_flavor_id",
      label: "Flavor",
      render: (value, _row, { extraData }) => extraData.humorFlavorMap?.[value] ?? value ?? "—"
    },
    { key: "order_by", label: "Step" },
    { key: "description", label: "Description" },
    {
      key: "llm_model_id",
      label: "LLM Model",
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
    { key: "id", label: "ID" },
    {
      key: "humor_flavor_id",
      label: "Flavor",
      render: (value, _row, { extraData }) => extraData.humorFlavorMap?.[value] ?? value ?? "—"
    },
    { key: "caption_count", label: "Caption Count" },
    {
      key: "created_datetime_utc",
      label: "Created",
      render: (value) => formatDateTime(value)
    }
  ]
};

export const termsResource = {
  title: "Terms",
  singular: "Term",
  table: "terms",
  description: "Manage term definitions, examples, and priorities.",
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
    { key: "id", label: "ID" },
    { key: "term", label: "Term" },
    { key: "definition", label: "Definition" },
    { key: "example", label: "Example" },
    { key: "priority", label: "Priority" },
    {
      key: "term_type_id",
      label: "Type",
      render: (value, _row, { extraData }) => extraData.termTypeMap?.[value] ?? value ?? "—"
    },
    {
      key: "created_datetime_utc",
      label: "Created",
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
    { key: "id", label: "ID" },
    {
      key: "content",
      label: "Caption",
      render: (value) => <span className="admin-long-text">{truncate(value, 120)}</span>
    },
    { key: "image_id", label: "Image ID" },
    {
      key: "humor_flavor_id",
      label: "Flavor",
      render: (value, _row, { extraData }) => extraData.humorFlavorMap?.[value] ?? value ?? "—"
    },
    {
      key: "created_datetime_utc",
      label: "Created",
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
    { key: "id", label: "ID" },
    { key: "image_id", label: "Image ID" },
    { key: "profile_id", label: "Profile ID" },
    {
      key: "created_datetime_utc",
      label: "Created",
      render: (value) => formatDateTime(value)
    }
  ]
};

export const captionExamplesResource = {
  title: "Caption Examples",
  singular: "Caption Example",
  table: "caption_examples",
  description: "Manage reusable caption exemplars and explanations.",
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
    { key: "id", label: "ID" },
    {
      key: "caption",
      label: "Caption",
      render: (value) => <span className="admin-long-text">{truncate(value, 100)}</span>
    },
    {
      key: "explanation",
      label: "Explanation",
      render: (value) => <span className="admin-long-text">{truncate(value, 100)}</span>
    },
    { key: "priority", label: "Priority" },
    {
      key: "created_datetime_utc",
      label: "Created",
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
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    {
      key: "llm_provider_id",
      label: "Provider",
      render: (value, _row, { extraData }) => extraData.providerMap?.[value] ?? value ?? "—"
    },
    { key: "provider_model_id", label: "Provider Model ID" },
    {
      key: "is_temperature_supported",
      label: "Temp",
      render: (value) => yesNo(value)
    },
    {
      key: "created_datetime_utc",
      label: "Created",
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
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    {
      key: "created_datetime_utc",
      label: "Created",
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
  columns: [
    { key: "id", label: "ID" },
    { key: "caption_request_id", label: "Caption Request ID" },
    {
      key: "created_datetime_utc",
      label: "Created",
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
    { key: "id", label: "ID" },
    {
      key: "llm_model_id",
      label: "Model",
      render: (value, _row, { extraData }) => extraData.modelMap?.[value] ?? value ?? "—"
    },
    {
      key: "llm_prompt_chain_id",
      label: "Prompt Chain",
      render: (value) => (value ? `Chain #${value}` : "—")
    },
    {
      key: "humor_flavor_id",
      label: "Flavor",
      render: (value, _row, { extraData }) => extraData.humorFlavorMap?.[value] ?? value ?? "—"
    },
    {
      key: "llm_model_response",
      label: "Response",
      render: (value) => <span className="admin-long-text">{truncate(value, 120)}</span>
    },
    { key: "processing_time_seconds", label: "Seconds" },
    {
      key: "created_datetime_utc",
      label: "Created",
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
    { key: "id", label: "ID" },
    { key: "apex_domain", label: "Domain" },
    {
      key: "created_datetime_utc",
      label: "Created",
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
    { key: "id", label: "ID" },
    { key: "email_address", label: "Email" },
    {
      key: "created_datetime_utc",
      label: "Created",
      render: (value) => formatDateTime(value)
    }
  ],
  getDeleteLabel: (row) => row.email_address ?? row.id
};
