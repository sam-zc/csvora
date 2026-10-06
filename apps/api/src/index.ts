import { buildApp } from "./app";

const app = buildApp();
const port = Number(process.env["PORT"] ?? 3001);
const host = process.env["HOST"] ?? "0.0.0.0";

async function start(): Promise<void> {
  try {
    await app.listen({ port, host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

const signals: readonly NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
for (const signal of signals) {
  process.on(signal, () => {
    app.log.info({ signal }, "Shutting down gracefully");
    void app.close().then(
      () => {
        process.exit(0);
      },
      (err) => {
        app.log.error(err, "Error during shutdown");
        process.exit(1);
      },
    );
  });
}

void start();
