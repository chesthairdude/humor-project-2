"use client";

import ResourcePage from "@/components/admin/ResourcePage";
import { whitelistedEmailsResource } from "@/lib/adminResources";

export default function AdminWhitelistedEmailsPage() {
  return <ResourcePage {...whitelistedEmailsResource} />;
}
