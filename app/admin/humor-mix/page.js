"use client";

import ResourcePage from "@/components/admin/ResourcePage";
import { humorMixResource } from "@/lib/adminResources";

export default function AdminHumorMixPage() {
  return <ResourcePage {...humorMixResource} />;
}
