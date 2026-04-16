import { requireMember } from "@/lib/auth/member-session";
import { BottomNav } from "@/components/member/BottomNav";

export default async function MemberAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireMember(slug);

  return (
    <div className="mx-auto min-h-screen max-w-md pb-24">
      <main>{children}</main>
      <BottomNav slug={slug} />
    </div>
  );
}
