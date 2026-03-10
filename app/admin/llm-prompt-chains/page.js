"use client";

import ResourcePage from "@/components/admin/ResourcePage";
import { llmPromptChainsResource } from "@/lib/adminResources";

export default function AdminLlmPromptChainsPage() {
  return <ResourcePage {...llmPromptChainsResource} />;
}
