export type PlanId = "essencial" | "pastoral" | "rede";

export type FeatureKey =
  | "members"
  | "groups"
  | "treasury"
  | "events"
  | "content"
  | "prayer"
  | "whatsapp_faq"
  | "whatsapp_full"
  | "pastoral_ai"
  | "ministries"
  | "store"
  | "multi_congregation"
  | "white_label"
  | "multi_whatsapp";

export const PLAN_FEATURES: Record<PlanId, FeatureKey[]> = {
  essencial: ["members", "groups", "treasury", "events", "content", "prayer", "whatsapp_faq"],
  pastoral: [
    "members",
    "groups",
    "treasury",
    "events",
    "content",
    "prayer",
    "whatsapp_faq",
    "whatsapp_full",
    "pastoral_ai",
    "ministries",
    "store",
  ],
  rede: [
    "members",
    "groups",
    "treasury",
    "events",
    "content",
    "prayer",
    "whatsapp_faq",
    "whatsapp_full",
    "pastoral_ai",
    "ministries",
    "store",
    "multi_congregation",
    "white_label",
    "multi_whatsapp",
  ],
};

export function hasFeature(plan: string | null | undefined, feature: FeatureKey): boolean {
  if (!plan) return false;
  return PLAN_FEATURES[plan as PlanId]?.includes(feature) ?? false;
}

export const PLAN_CATALOG: Array<{
  id: PlanId;
  name: string;
  priceBRL: number;
  tagline: string;
  highlight?: boolean;
  bullets: string[];
  priceIdEnv: string;
}> = [
  {
    id: "essencial",
    name: "Essencial",
    priceBRL: 97,
    tagline: "Para igrejas de 50 a 300 membros",
    bullets: [
      "Secretaria, tesouraria e eventos",
      "WhatsApp IA com FAQ básico",
      "Grupos e oração",
      "Suporte por e-mail",
    ],
    priceIdEnv: "STRIPE_PRICE_ID_ESSENCIAL",
  },
  {
    id: "pastoral",
    name: "Pastoral",
    priceBRL: 197,
    tagline: "Para 300 a 1000 membros",
    highlight: true,
    bullets: [
      "Tudo do Essencial",
      "IA de pastoreio + alertas",
      "Ministérios e escalas",
      "Loja da igreja",
      "Suporte prioritário",
    ],
    priceIdEnv: "STRIPE_PRICE_ID_PASTORAL",
  },
  {
    id: "rede",
    name: "Rede",
    priceBRL: 397,
    tagline: "Para redes e 1000+ membros",
    bullets: [
      "Tudo do Pastoral",
      "Multi-congregação",
      "App white-label",
      "Múltiplos números de WhatsApp",
      "CSM dedicado",
    ],
    priceIdEnv: "STRIPE_PRICE_ID_REDE",
  },
];

export function getPlanFromPriceId(priceId: string): PlanId {
  const envMap: Array<[PlanId, string | undefined]> = [
    ["essencial", process.env.STRIPE_PRICE_ID_ESSENCIAL],
    ["pastoral", process.env.STRIPE_PRICE_ID_PASTORAL],
    ["rede", process.env.STRIPE_PRICE_ID_REDE],
  ];
  for (const [plan, id] of envMap) {
    if (id && id === priceId) return plan;
  }
  return "essencial";
}
