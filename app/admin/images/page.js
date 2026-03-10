"use client";

import ResourcePage from "@/components/admin/ResourcePage";
import { imagesResource } from "@/lib/adminResources";

export default function AdminImagesPage() {
  return <ResourcePage {...imagesResource} />;
}
