import type Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import {
  assertNotRefused,
  FALLBACK_BETA,
  getAnthropic,
  MODEL,
  toLlmError,
} from "./llm.server";

const Stop = z.object({
  start: z.number(),
  duration: z.number(),
  title: z.string(),
  client: z.string(),
  site: z.string(),
  weatherNote: z.string().optional(),
});

/** The day's plan as the dashboard shows it — built from planner.proposeDay(). */
export const ExplainPlanInput = z.object({
  date: z.string(),
  weather: z.object({ tempC: z.number().nullable(), note: z.string() }),
  workers: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      hours: z.number(),
      km: z.number(),
      stops: z.array(Stop),
      skipped: z.array(Stop),
    }),
  ),
});
export type ExplainPlanInput = z.infer<typeof ExplainPlanInput>;

const SYSTEM = `You brief the owner of a Baltic landscaping company on today's crew plan, which \
was generated from each plant's care schedule and the live weather forecast.

Write 3–5 plain sentences, no lists, headings or markdown. Say who goes where and why the \
order makes sense, call out every change the weather caused (skipped or moved jobs), and \
flag anything the owner should check before approving: idle workers, long drives, or days \
over 7 hours. Use only the facts in the plan; don't invent jobs, times or weather.`;

/** Plain-language explanation of a day plan, for the "Approve today's plan" card. */
export async function explainPlanWith(
  client: Anthropic,
  plan: ExplainPlanInput,
): Promise<string> {
  try {
    const message = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4096,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "low" }, // a short summary of data we hand over
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(plan) }],
    });
    assertNotRefused(message);
    const text = message.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("")
      .trim();
    if (!text) throw new Error("empty response");
    return text;
  } catch (error) {
    throw toLlmError(error);
  }
}

export const explainPlan = createServerFn({ method: "POST" })
  .validator(ExplainPlanInput)
  .handler(({ data }) => explainPlanWith(getAnthropic(), data));
