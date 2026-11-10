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
