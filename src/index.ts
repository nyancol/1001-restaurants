// MUST stay first: starts the OTEL SDK before fastify/pino are loaded so
// auto-instrumentation patches apply. See observability/register.ts.
import { observability } from "./observability/register.js";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (err: any) {
    console.error(`Invalid config: ${err.message}`);
    process.exit(1);
  }
  if (observability.enabled) {
    console.info(
      `OTEL exporting to ${config.otelEndpoint} service=${config.otelServiceName} env=${config.otelEnvironment} version=${config.otelServiceVersion}`,
    );
    const shutdown = async (): Promise<void> => {
      try {
        await observability.shutdown();
      } catch {
        /* ignore */
      }
    };
    process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));
    process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
  }
  const { app, oidcFailed } = await buildApp({ config });
  if (oidcFailed) {
    console.error(`Invalid OIDC config: ${oidcFailed.message}`);
    process.exit(1);
  }
  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
