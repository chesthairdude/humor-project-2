"use client";

import ResourcePage from "@/components/admin/ResourcePage";
import { captionExamplesResource } from "@/lib/adminResources";

export default function AdminCaptionExamplesPage() {
  return <ResourcePage {...captionExamplesResource} />;
}
