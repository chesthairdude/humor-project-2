"use client";

import ResourcePage from "@/components/admin/ResourcePage";
import { captionsResource } from "@/lib/adminResources";

export default function AdminCaptionsPage() {
  return <ResourcePage {...captionsResource} />;
}
