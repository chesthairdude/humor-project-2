"use client";

import ResourcePage from "@/components/admin/ResourcePage";
import { llmProvidersResource } from "@/lib/adminResources";

export default function AdminLlmProvidersPage() {
  return <ResourcePage {...llmProvidersResource} />;
}
