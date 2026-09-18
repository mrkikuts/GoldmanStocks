import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod/v4";

import type { Offer, OfferStatus } from "@/lib/types";

import {
  assertNotRefused,
  FALLBACK_BETA,
  MODEL,
  toLlmError,
} from "./llm.server";

/** Opportunities from outreach.findOpportunities(), as sent by the dashboard. */
export const DraftOffersInput = z.object({
  opportunities: z
    .array(
      z.object({
        clientId: z.string(),
        projectId: z.string(),
        client: z.string(),
        contact: z.string(),
        what: z.string(),
        value: z.number(),
        dueDate: z.string(),
        items: z.array(z.string()),
      }),
    )
    .min(1)
    .max(20),
});
export type DraftOffersInput = z.infer<typeof DraftOffersInput>;

const OfferDrafts = z.object({
  offers: z.array(
    z.object({
      projectId: z.string(),
      subject: z.string(),
      body: z.string(),
    }),
  ),
});

const SYSTEM = `You draft short repeat-work offers from a Baltic landscaping company to its \
existing maintenance clients. Each offer goes to the named contact person, explains which \
plants are coming due and when (from the items given), proposes booking the work, and states \
the estimated price in euros exactly as given. Friendly, professional, under 120 words, in \
English. Sign off with "Best regards," and "[Your name]" on the next line — the owner fills \
in the name and reviews every draft before anything is sent. Return one offer per \
opportunity, using its projectId. Don't invent facts, discounts or dates.`;

/**
 * Draft one offer per opportunity. Returns `draft` offers only — nothing is sent;
 * the boss approves or dismisses each one.
 */
export async function draftOffersWith(
  client: Anthropic,
  input: DraftOffersInput,
  now = new Date(),
): Promise<Offer[]> {
  let parsed: z.infer<typeof OfferDrafts> | null;
  try {
    const message = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: betaZodOutputFormat(OfferDrafts),
      },
      system: SYSTEM,
      messages: [
        { role: "user", content: JSON.stringify(input.opportunities) },
      ],
    });
    assertNotRefused(message);
    parsed = message.parsed_output;
  } catch (error) {
    throw toLlmError(error);
  }
  if (!parsed) throw toLlmError(new Error("unparseable offer drafts"));

  const createdAt = now.toISOString();
  return input.opportunities.flatMap((opportunity): Offer[] => {
    const draft = parsed.offers.find(
      (o) => o.projectId === opportunity.projectId,
    );
    if (!draft) return [];
    return [
      {
        id: crypto.randomUUID(),
        clientId: opportunity.clientId,
        projectId: opportunity.projectId,
        what: opportunity.what,
        value: opportunity.value,
        dueDate: opportunity.dueDate,
        subject: draft.subject,
        body: draft.body,
        status: "draft",
        createdAt,
        approvedAt: null,
      },
    ];
  });
}

// ─── Persistence (the `offers` table) — wired to track A's client at integration ─

type OfferRow = {
  id: string;
  client_id: string;
  project_id: string;
  what: string;
  value: number;
  due_date: string;
  subject: string;
  body: string;
  status: OfferStatus;
  created_at: string;
  approved_at: string | null;
};

const toRow = (o: Offer): OfferRow => ({
  id: o.id,
  client_id: o.clientId,
  project_id: o.projectId,
  what: o.what,
  value: o.value,
  due_date: o.dueDate,
  subject: o.subject,
  body: o.body,
  status: o.status,
  created_at: o.createdAt,
  approved_at: o.approvedAt,
});

const fromRow = (r: OfferRow): Offer => ({
  id: r.id,
  clientId: r.client_id,
  projectId: r.project_id,
  what: r.what,
  value: Number(r.value),
  dueDate: r.due_date,
  subject: r.subject,
  body: r.body,
  status: r.status,
  createdAt: r.created_at,
  approvedAt: r.approved_at,
});

export async function saveOffers(db: SupabaseClient, offers: Offer[]) {
  const { data, error } = await db
    .from("offers")
    .insert(offers.map(toRow))
    .select();
  if (error) throw error;
  return (data as OfferRow[]).map(fromRow);
}

/** Approve or dismiss a draft. Approving records when; it never sends anything. */
export async function setOfferStatus(
  db: SupabaseClient,
  id: string,
  status: OfferStatus,
  now = new Date(),
) {
  const { data, error } = await db
    .from("offers")
    .update({
      status,
      approved_at: status === "approved" ? now.toISOString() : null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data as OfferRow);
}

export async function listDraftOffers(db: SupabaseClient) {
  const { data, error } = await db
    .from("offers")
    .select()
    .eq("status", "draft")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as OfferRow[]).map(fromRow);
}
