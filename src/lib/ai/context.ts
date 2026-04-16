import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadKnowledgeForPrompt } from "./knowledge";

export type AgentContext = {
  workspace: {
    id: string;
    name: string;
    address: string | null;
    welcome_message: string | null;
    service_schedule: string | null;
    plan: string;
  };
  member: null | {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    neighborhood: string | null;
    city: string | null;
    status: string | null;
  };
  upcomingEvents: Array<{
    id: string;
    title: string;
    date: string;
    location: string | null;
    max_spots: number | null;
    spots_taken: number;
  }>;
  activeGroups: Array<{
    id: string;
    name: string;
    neighborhood: string | null;
    day_of_week: string | null;
    time: string | null;
    leader_name: string | null;
  }>;
  faqs: Array<{ question: string; answer: string }>;
  knowledgeBase: string;
  recentMessages: Array<{
    from_me: boolean;
    body: string;
    sent_by: string | null;
    type: string | null;
    transcription: string | null;
    ai_analysis: string | null;
    created_at: string;
  }>;
  iaMessageCount: number;
};

export async function loadAgentContext(params: {
  workspaceId: string;
  conversationId: string;
  phone: string;
}): Promise<AgentContext> {
  const supabase = createAdminClient();

  const [wsRes, memberRes, eventsRes, groupsRes, faqRes, msgsRes, knowledgeBase] = await Promise.all([
    supabase
      .from("workspaces")
      .select("id, name, address, welcome_message, service_schedule, plan")
      .eq("id", params.workspaceId)
      .maybeSingle(),
    supabase
      .from("members")
      .select("id, name, phone, email, neighborhood, city, status")
      .eq("workspace_id", params.workspaceId)
      .eq("phone", params.phone)
      .maybeSingle(),
    supabase
      .from("events")
      .select("id, title, date, location, max_spots, spots_taken")
      .eq("workspace_id", params.workspaceId)
      .eq("status", "published")
      .gte("date", new Date().toISOString())
      .order("date", { ascending: true })
      .limit(10),
    supabase
      .from("groups")
      .select("id, name, neighborhood, day_of_week, time, leader_name")
      .eq("workspace_id", params.workspaceId)
      .limit(20),
    supabase
      .from("whatsapp_faq")
      .select("question, answer")
      .eq("workspace_id", params.workspaceId)
      .eq("active", true),
    supabase
      .from("whatsapp_messages")
      .select("from_me, body, sent_by, type, transcription, ai_analysis, created_at")
      .eq("conversation_id", params.conversationId)
      .order("created_at", { ascending: false })
      .limit(50),
    loadKnowledgeForPrompt(params.workspaceId),
  ]);

  const msgs = ((msgsRes.data as AgentContext["recentMessages"]) ?? []).reverse();
  const iaCount = msgs.filter((m) => m.from_me && m.sent_by === "ia").length;

  return {
    workspace: (wsRes.data as AgentContext["workspace"]) ?? {
      id: params.workspaceId,
      name: "igreja",
      address: null,
      welcome_message: null,
      service_schedule: null,
      plan: "essencial",
    },
    member: (memberRes.data as AgentContext["member"]) ?? null,
    upcomingEvents: (eventsRes.data as AgentContext["upcomingEvents"]) ?? [],
    activeGroups: (groupsRes.data as AgentContext["activeGroups"]) ?? [],
    faqs: (faqRes.data as AgentContext["faqs"]) ?? [],
    knowledgeBase,
    recentMessages: msgs,
    iaMessageCount: iaCount,
  };
}
