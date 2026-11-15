# Shared docker-access helper for the preprod scripts.
# Respects an explicit DOCKER_SUDO ("" = run docker directly, e.g.
# DOCKER_SUDO="" or DOCKER_SUDO="sudo"); otherwise auto-detects: no sudo
# when `docker info` already works (rootless / docker-group membership),
# sudo only when it is actually needed. Source after cd-ing to the repo root.
if [ -z "${DOCKER_SUDO+x}" ]; then
  if docker info >/dev/null 2>&1; then DOCKER_SUDO=""; else DOCKER_SUDO="sudo"; fi
fi
SUDO="$DOCKER_SUDO"
# shellcheck disable=SC2086
COMPOSE="$SUDO docker compose --env-file .env.preprod -p places-preprod -f compose.yaml -f compose.preprod.yaml"

# HTTP GET against the app. Two modes (HEALTHCHECK_MODE):
#   host (default) — curl the published port; for local use where the
#     script runs on the docker host.
#   exec — node fetch inside the app container via `docker compose exec`;
#     for CI runners whose localhost is NOT the docker host (e.g. a runner
#     container sharing the daemon). Set HEALTHCHECK_MODE=exec there.
# Sets HTTP_CODE / HTTP_BODY. Returns 0 on any HTTP response (even 4xx/5xx),
# nonzero only when the server cannot be reached at all.
HTTP_CODE=""
HTTP_BODY=""
http_get() { # $1 = path, e.g. /api/health
  local path="$1" rc=0 _out=""
  if [ "${HEALTHCHECK_MODE:-host}" = "exec" ]; then
    # shellcheck disable=SC2086
    if _out="$($COMPOSE exec -T places node -e 'fetch("http://localhost:"+(process.env.PORT||5173)+process.argv[1],{redirect:"manual"}).then(async r=>{const t=await r.text();console.log(r.status);console.log(t)}).catch(e=>{console.error("CONNECT_FAIL "+e.message);process.exit(7)})' "$path" 2>&1)"; then rc=0; else rc=$?; fi
    if [ "$rc" -ne 0 ]; then
      HTTP_CODE="000"; HTTP_BODY=""
      printf '%s\n' "$_out" >&2
      return 7
    fi
    HTTP_CODE="$(printf '%s\n' "$_out" | head -n 1)"
    HTTP_BODY="$(printf '%s\n' "$_out" | tail -n +2)"
  else
    local base="http://localhost:${HOST_PORT:-5174}" bodyfile
    bodyfile="$(mktemp)"
    if HTTP_CODE="$(curl -s -m 10 -o "$bodyfile" -w '%{http_code}' "$base$path" 2>/dev/null)"; then rc=0; else rc=$?; fi
    HTTP_BODY="$(cat "$bodyfile")"
    rm -f "$bodyfile"
    if [ "$rc" -ne 0 ]; then
      HTTP_CODE="000"; HTTP_BODY=""
      return 7
    fi
  fi
  return 0
}
