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
  }
  const { app, oidcFailed } = await buildApp({ config });
  if (oidcFailed) {
    console.error(`Invalid OIDC config: ${oidcFailed.message}`);
    try {
      await observability.shutdown();
    } catch {
      /* ignore */
    }
    process.exit(1);
  }
  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    try {
      await observability.shutdown();
    } catch {
      /* ignore */
    }
    process.exit(1);
  }

  // Graceful shutdown: SIGTERM (docker stop / Arcane redeploy) and SIGINT
  // stop accepting new connections, drain in-flight requests via app.close()
  // (runs onClose hooks, e.g. sqlite), then flush OTEL. Watchdog forces exit
  // inside Docker's default 10s stop grace period.
  let shuttingDown = false;
  const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 9000);
  async function gracefulShutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    try {
      app.log.info({ signal }, "shutting down: draining connections");
    } catch {
      /* ignore */
    }
    // Drop idle keep-alive connections so close() doesn't hang on them;
    // in-flight requests still drain via server.close().
    try {
      (app.server as any)?.closeIdleConnections?.();
    } catch {
      /* ignore */
    }
    const force = setTimeout(() => {
      try {
        app.log.warn({ signal }, "graceful shutdown timed out, forcing exit");
      } catch {
        /* ignore */
      }
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    (force as any)?.unref?.();
    try {
      await app.close();
    } catch (err) {
      try {
        app.log.error({ err }, "error during app.close");
      } catch {
        /* ignore */
      }
    }
    try {
      await observability.shutdown();
    } catch {
      /* ignore */
    }
    clearTimeout(force);
    process.exit(0);
  }
  process.once("SIGTERM", () => void gracefulShutdown("SIGTERM"));
  process.once("SIGINT", () => void gracefulShutdown("SIGINT"));
}

void main();
