# Shared docker-access helper for the preprod scripts.
# Respects an explicit DOCKER_SUDO ("" = run docker directly, e.g.
# DOCKER_SUDO="" or DOCKER_SUDO="sudo"); otherwise auto-detects: no sudo
# when `docker info` already works (rootless / docker-group membership),
# sudo only when it is actually needed. Source after cd-ing to the repo root.
if [ -z "${DOCKER_SUDO+x}" ]; then
  if docker info >/dev/null 2>&1; then DOCKER_SUDO=""; else DOCKER_SUDO="sudo"; fi
fi
SUDO="$DOCKER_SUDO"
COMPOSE="$SUDO docker compose --env-file .env.preprod -p places-preprod -f compose.yaml -f compose.preprod.yaml"
