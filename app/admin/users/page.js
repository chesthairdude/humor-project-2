"use client";

import ResourcePage from "@/components/admin/ResourcePage";
import { usersResource } from "@/lib/adminResources";

export default function AdminUsersPage() {
  return <ResourcePage {...usersResource} />;
}
