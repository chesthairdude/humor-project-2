"use client";

import ResourcePage from "@/components/admin/ResourcePage";
import { allowedDomainsResource } from "@/lib/adminResources";

export default function AdminAllowedDomainsPage() {
  return <ResourcePage {...allowedDomainsResource} />;
}
