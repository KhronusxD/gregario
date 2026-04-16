import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicWorkspace = {
  id: string;
  name: string;
  slug: string;
  denomination: string | null;
  address: string | null;
  logo_url: string | null;
  primary_color: string | null;
  welcome_message: string | null;
  verse_of_day: string | null;
};

export const getWorkspaceBySlug = cache(
  async (slug: string): Promise<PublicWorkspace | null> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("workspaces")
      .select(
        "id, name, slug, denomination, address, logo_url, primary_color, welcome_message, verse_of_day",
      )
      .eq("slug", slug)
      .maybeSingle();
    return (data as PublicWorkspace | null) ?? null;
  },
);
