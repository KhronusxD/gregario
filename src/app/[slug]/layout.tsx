import { notFound } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/workspace";

export default async function MemberWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  return (
    <div
      className="min-h-screen bg-surface"
      style={{
        // @ts-expect-error custom CSS var
        "--ws-primary": workspace.primary_color ?? "#1A4731",
      }}
    >
      {children}
    </div>
  );
}
