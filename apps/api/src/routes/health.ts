import type { FastifyPluginAsync } from "fastify";
import type { HealthResponse } from "@csvora/schemas";

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Reply: HealthResponse }>(
    "/health",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["ok"] },
            },
            required: ["status"],
          },
        },
      },
    },
    async (_request, reply) => {
      const payload: HealthResponse = { status: "ok" };
      return reply.status(200).send(payload);
    },
  );
};
