"use client";

import ResourcePage from "@/components/admin/ResourcePage";
import { llmResponsesResource } from "@/lib/adminResources";

export default function AdminLlmResponsesPage() {
  return <ResourcePage {...llmResponsesResource} />;
}
