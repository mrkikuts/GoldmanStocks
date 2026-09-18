import { createServerFn } from "@tanstack/react-start";

import { getAnthropic } from "@/lib/server/llm.server";
import { DraftOffersInput, draftOffersWith } from "@/lib/server/outreach";

// Server functions only: safe to import from routes (see weather.functions.ts).

/** Draft one repeat-work offer per opportunity — returned as drafts, never sent. */
export const draftOffers = createServerFn({ method: "POST" })
  .validator(DraftOffersInput)
  .handler(({ data }) => draftOffersWith(getAnthropic(), data));
