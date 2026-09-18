import { createServerFn } from "@tanstack/react-start";

import { getAnthropic } from "@/lib/server/llm.server";
import { ExplainPlanInput, explainPlanWith } from "@/lib/server/plan";

// Server functions only: safe to import from routes (see weather.functions.ts).

export type { ExplainPlanInput } from "@/lib/server/plan";

/** Plain-language explanation of a day plan, for the "Approve today's plan" dialog. */
export const explainPlan = createServerFn({ method: "POST" })
  .validator(ExplainPlanInput)
  .handler(({ data }) => explainPlanWith(getAnthropic(), data));
