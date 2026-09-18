/// <reference types="bun" />
import OpenAI from "openai";
import { describe, expect, test } from "bun:test";

import { LlmError, MODEL, toLlmError } from "./llm.server";
import { draftOffersWith, type DraftOffersInput } from "./outreach";
import { explainPlanWith, type ExplainPlanInput } from "./plan";

type Call = Record<string, unknown> & {
  response_format?: Record<string, unknown>;
};

/** A stand-in client that records requests and replies with `reply` (or throws it). */
function fakeClient(reply: unknown) {
  const calls: Call[] = [];
  const respond = async (params: Call) => {
    calls.push(params);
    if (reply instanceof Error) throw reply;
    return reply;
  };
  const client = {
    chat: { completions: { create: respond, parse: respond } },
  } as unknown as OpenAI;
  return { client, calls };
}

/** An SDK error instance without going through its constructor. */
function sdkError<T extends object>(ErrorClass: { prototype: T }): T {
  return Object.create(ErrorClass.prototype) as T;
}

const plan: ExplainPlanInput = {
  date: "2026-09-21",
  weather: { tempC: 14, note: "1 watering task skipped" },
  workers: [
    {
      name: "Liis Tamm",
      role: "Gardener",
      hours: 3,
      km: 0,
      stops: [
        {
          start: 8,
          duration: 3,
          title: "Lawn mowing",
          client: "Hotel Nordic Grand",
          site: "Front entrance",
        },
      ],
      skipped: [
        {
          start: 8,
          duration: 2,
          title: "Watering round",
          client: "Hotel Nordic Grand",
          site: "Terrace beds",
          weatherNote: "Skipped — 9 mm rain overnight",
        },
      ],
    },
  ],
};

const opportunities: DraftOffersInput = {
  opportunities: [
    {
      clientId: "c4",
      projectId: "p4",
      client: "Riga Green Offices",
      contact: "Ilze Berzina",
      what: "hedge clipping due by 2026-09-20",
      value: 860,
      dueDate: "2026-09-20",
      items: ["Box hedge (Reception garden) — hedge clipping due 2026-09-20"],
    },
    {
      clientId: "c2",
      projectId: "p2",
      client: "Hotel Nordic Grand",
      contact: "Peeter Lill",
      what: "lawn mowing due by 2026-09-22",
      value: 290,
      dueDate: "2026-09-22",
      items: ["Main lawn (Front entrance) — lawn mowing due 2026-09-22"],
    },
  ],
};

describe("explainPlan", () => {
  test("asks the configured model and returns the text", async () => {
    const { client, calls } = fakeClient({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Liis mows at the hotel; watering is off after rain.",
          },
        },
      ],
    });
    const text = await explainPlanWith(client, plan);
    expect(text).toBe("Liis mows at the hotel; watering is off after rain.");
    expect(calls[0]?.["model"]).toBe(MODEL);
    expect(
      String(calls[0]?.["messages"] && JSON.stringify(calls[0]["messages"])),
    ).toContain("Skipped — 9 mm rain overnight");
  });

  test("a refusal becomes a readable error", async () => {
    const { client } = fakeClient({
      choices: [
        { message: { role: "assistant", refusal: "no", content: null } },
      ],
    });
    await expect(explainPlanWith(client, plan)).rejects.toThrow("declined");
  });

  test("SDK errors are mapped to readable messages", async () => {
    const { client } = fakeClient(sdkError(OpenAI.RateLimitError));
    await expect(explainPlanWith(client, plan)).rejects.toThrow("rate-limited");
    expect(toLlmError(sdkError(OpenAI.AuthenticationError)).message).toContain(
      "API key was rejected",
    );
    expect(toLlmError(new Error("boom"))).toBeInstanceOf(LlmError);
  });
});

describe("draftOffers", () => {
  test("uses structured output and returns one draft per opportunity", async () => {
    const { client, calls } = fakeClient({
      choices: [
        {
          message: {
            role: "assistant",
            parsed: {
              offers: [
                {
                  projectId: "p2",
                  subject: "Lawn mowing next week",
                  body: "Dear Peeter, …",
                },
                {
                  projectId: "p4",
                  subject: "Box hedge clipping",
                  body: "Dear Ilze, …",
                },
              ],
            },
          },
        },
      ],
    });
    const now = new Date("2026-09-18T09:00:00Z");
    const offers = await draftOffersWith(client, opportunities, now);

    expect(calls[0]?.["model"]).toBe(MODEL);
    expect(calls[0]?.["response_format"]).toBeDefined();
    expect(offers.map((o) => o.projectId)).toEqual(["p4", "p2"]); // input order
    expect(offers[0]).toMatchObject({
      clientId: "c4",
      value: 860,
      subject: "Box hedge clipping",
      status: "draft",
      approvedAt: null,
      createdAt: now.toISOString(),
    });
  });

  test("drafts are never marked approved or sent", async () => {
    const { client } = fakeClient({
      choices: [
        {
          message: {
            role: "assistant",
            parsed: { offers: [{ projectId: "p4", subject: "s", body: "b" }] },
          },
        },
      ],
    });
    const offers = await draftOffersWith(client, opportunities);
    expect(offers.every((o) => o.status === "draft")).toBe(true);
  });

  test("unparseable output and refusals are readable errors", async () => {
    const unparsed = fakeClient({
      choices: [{ message: { role: "assistant", parsed: null } }],
    });
    await expect(
      draftOffersWith(unparsed.client, opportunities),
    ).rejects.toThrow(LlmError);
    const refused = fakeClient({
      choices: [
        { message: { role: "assistant", refusal: "no", parsed: null } },
      ],
    });
    await expect(
      draftOffersWith(refused.client, opportunities),
    ).rejects.toThrow("declined");
  });
});
