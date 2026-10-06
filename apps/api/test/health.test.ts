import { describe, expect, it } from "bun:test";
import type { HealthResponse } from "@csvora/schemas";
import { buildApp } from "../src/app";

describe("GET /health", () => {
  it("returns status ok", async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<HealthResponse>()).toEqual({ status: "ok" });
  });
});
