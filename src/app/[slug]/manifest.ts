import type { MetadataRoute } from "next";
import { notFound } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/workspace";

export default async function manifest({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<MetadataRoute.Manifest> {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  return {
    name: workspace.name,
    short_name: workspace.name.length > 12 ? workspace.name.slice(0, 12) : workspace.name,
    description: `App da ${workspace.name}`,
    start_url: `/${slug}/app`,
    display: "standalone",
    background_color: "#F8F7F4",
    theme_color: workspace.primary_color ?? "#1A4731",
    icons: workspace.logo_url
      ? [
          { src: workspace.logo_url, sizes: "192x192", type: "image/png" },
          { src: workspace.logo_url, sizes: "512x512", type: "image/png" },
        ]
      : [],
  };
}
