import type { FastifyPluginAsync } from "fastify";
import { healthResponseSchema, type HealthResponse } from "@csvora/schemas";

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Reply: HealthResponse }>("/health", async (_request, reply) => {
    const payload: HealthResponse = { status: "ok" };
    healthResponseSchema.parse(payload);
    return reply.status(200).send(payload);
  });
};
