import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type AISettings = {
  id: string;
  workspace_id: string;
  assistant_name: string | null;
  show_assistant_name: boolean;
  system_prompt: string | null;
  tone: "formal" | "profissional" | "acolhedor" | "amigavel" | "pastoral";
  autonomy: "supervisionado" | "semi_autonomo" | "autonomo";
  max_messages_per_conversation: number;
  escalate_if_no_reply_min: number;
  use_per_day_window: boolean;
  per_day_window: Record<string, { active: boolean; start: string; end: string }> | null;
  reply_outside_hours: boolean;
  pause_when_operator_replies: boolean;
  pause_when_human_on_mobile: boolean;
  resume_after_escalation_min: number | null;
  negative_rules: string[];
  reply_in_groups: boolean;
  enabled_groups: string[];
  auto_enable_for_new_contacts: boolean;
  debounce_seconds: number;
  allow_audio_transcription: boolean;
  allow_image_analysis: boolean;
  notify_active: boolean;
  notify_phone: string | null;
  ignored_auto_replies: string[];
};

const DEFAULTS: Omit<AISettings, "id" | "workspace_id"> = {
  assistant_name: "Assistente",
  show_assistant_name: true,
  system_prompt: null,
  tone: "acolhedor",
  autonomy: "semi_autonomo",
  max_messages_per_conversation: 25,
  escalate_if_no_reply_min: 0,
  use_per_day_window: false,
  per_day_window: null,
  reply_outside_hours: false,
  pause_when_operator_replies: true,
  pause_when_human_on_mobile: true,
  resume_after_escalation_min: null,
  negative_rules: [],
  reply_in_groups: false,
  enabled_groups: [],
  auto_enable_for_new_contacts: true,
  debounce_seconds: 8,
  allow_audio_transcription: true,
  allow_image_analysis: true,
  notify_active: false,
  notify_phone: null,
  ignored_auto_replies: [],
};

export async function loadAISettings(workspaceId: string): Promise<AISettings> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ai_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (data) return data as AISettings;

  const { data: created } = await supabase
    .from("ai_settings")
    .insert({ workspace_id: workspaceId, ...DEFAULTS } as never)
    .select("*")
    .single();

  return (created as AISettings) ?? { id: "", workspace_id: workspaceId, ...DEFAULTS };
}

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

export function isWithinBusinessHours(settings: AISettings, workspaceHours: { start: string | null; end: string | null }): boolean {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  let start: string | null = null;
  let end: string | null = null;

  if (settings.use_per_day_window && settings.per_day_window) {
    const day = DAYS[now.getDay()];
    const window = settings.per_day_window[day];
    if (!window?.active) return settings.reply_outside_hours;
    start = window.start;
    end = window.end;
  } else {
    start = workspaceHours.start;
    end = workspaceHours.end;
  }

  if (!start || !end) return true;

  const within = hhmm >= start && hhmm <= end;
  return settings.reply_outside_hours ? !within : within;
}
