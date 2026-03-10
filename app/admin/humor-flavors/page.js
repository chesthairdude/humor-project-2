"use client";

import ResourcePage from "@/components/admin/ResourcePage";
import { humorFlavorsResource } from "@/lib/adminResources";

export default function AdminHumorFlavorsPage() {
  return <ResourcePage {...humorFlavorsResource} />;
}
