import Fastify, { type FastifyInstance } from "fastify";
import { healthRoutes } from "./routes/health";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
  });

  void app.register(healthRoutes);

  return app;
}
