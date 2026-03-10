"use client";

import ResourcePage from "@/components/admin/ResourcePage";
import { captionRequestsResource } from "@/lib/adminResources";

export default function AdminCaptionRequestsPage() {
  return <ResourcePage {...captionRequestsResource} />;
}
