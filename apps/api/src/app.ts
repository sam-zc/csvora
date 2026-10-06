import Fastify, { type FastifyInstance } from "fastify";
import { registerRoutes } from "./routes";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
  });

  void registerRoutes(app);

  return app;
}
