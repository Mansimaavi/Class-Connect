#!/usr/bin/env bash
# Runs ON the EC2 host (sent by GitHub Actions through SSM Run Command).
# Pulls the new images, restarts the stack, waits for the API to report ready,
# and rolls back to the previous release if it doesn't.
set -euo pipefail

: "${AWS_REGION:?}" "${API_IMAGE:?}" "${WEB_IMAGE:?}" "${IMAGE_TAG:?}" "${DOMAIN:?}"
PARAM_PATH="${PARAM_PATH:-/classconnect/prod}"
APP_DIR=/opt/classconnect
cd "$APP_DIR"

compose() {
  docker compose --env-file release.env -f docker-compose.prod.yml "$@"
}

write_release() {
  cat > release.env <<EOF
AWS_REGION=${AWS_REGION}
API_IMAGE=${API_IMAGE}
WEB_IMAGE=${WEB_IMAGE}
IMAGE_TAG=$1
DOMAIN=${DOMAIN}
EOF
}

wait_until_ready() {
  for _ in $(seq 1 36); do
    if compose exec -T api wget -qO- http://127.0.0.1:5000/api/health/ready > /dev/null 2>&1; then
      return 0
    fi
    sleep 5
  done
  return 1
}

echo "==> Loading secrets from SSM Parameter Store (${PARAM_PATH})"
aws ssm get-parameters-by-path \
  --region "$AWS_REGION" \
  --path "$PARAM_PATH" \
  --recursive \
  --with-decryption \
  --query 'Parameters[*].[Name,Value]' \
  --output text |
  while IFS=$'\t' read -r name value; do
    # single quotes stop Compose from interpolating "$" inside secrets
    printf "%s='%s'\n" "${name##*/}" "$value"
  done > app.env.new
if [ ! -s app.env.new ]; then
  echo "No parameters found under ${PARAM_PATH}; run infra/aws/put-secrets.sh first." >&2
  exit 1
fi
chmod 600 app.env.new
mv app.env.new app.env

PREVIOUS_TAG=""
if [ -f release.env ]; then
  PREVIOUS_TAG="$(grep '^IMAGE_TAG=' release.env | cut -d= -f2)"
fi

echo "==> Logging in to ECR"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "${API_IMAGE%%/*}"

echo "==> Deploying ${IMAGE_TAG} (previous: ${PREVIOUS_TAG:-none})"
write_release "$IMAGE_TAG"
compose pull
compose up -d --remove-orphans

if wait_until_ready; then
  echo "==> Release ${IMAGE_TAG} is healthy"
  docker image prune -af --filter "until=168h" > /dev/null 2>&1 || true
  exit 0
fi

echo "!! Release ${IMAGE_TAG} did not become ready" >&2
compose logs --tail 80 api >&2 || true

if [ -n "$PREVIOUS_TAG" ] && [ "$PREVIOUS_TAG" != "$IMAGE_TAG" ]; then
  echo "==> Rolling back to ${PREVIOUS_TAG}" >&2
  write_release "$PREVIOUS_TAG"
  compose up -d --remove-orphans
  wait_until_ready && echo "==> Rolled back to ${PREVIOUS_TAG}" >&2
fi
exit 1
