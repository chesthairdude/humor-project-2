"use client";

import ResourcePage from "@/components/admin/ResourcePage";
import { humorFlavorStepsResource } from "@/lib/adminResources";

export default function AdminHumorFlavorStepsPage() {
  return <ResourcePage {...humorFlavorStepsResource} />;
}
