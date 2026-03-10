"use client";

import ResourcePage from "@/components/admin/ResourcePage";
import { llmModelsResource } from "@/lib/adminResources";

export default function AdminLlmModelsPage() {
  return <ResourcePage {...llmModelsResource} />;
}
