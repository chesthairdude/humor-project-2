"use client";

import ResourcePage from "@/components/admin/ResourcePage";
import { termsResource } from "@/lib/adminResources";

export default function AdminTermsPage() {
  return <ResourcePage {...termsResource} />;
}
