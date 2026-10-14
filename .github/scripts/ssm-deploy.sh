#!/usr/bin/env bash
# Runs on the GitHub Actions runner. Ships the deploy files to the EC2 host
# through SSM Run Command (no SSH keys or open port 22) and runs
# deploy/remote-deploy.sh there, then streams back the result.
set -euo pipefail

: "${AWS_REGION:?}" "${INSTANCE_ID:?}" "${API_IMAGE:?}" "${WEB_IMAGE:?}" "${IMAGE_TAG:?}" "${DOMAIN:?}"
PARAM_PATH="${PARAM_PATH:-/classconnect/prod}"
TIMEOUT_SECONDS=900

commands=("set -euo pipefail" "mkdir -p /opt/classconnect" "cd /opt/classconnect")

# Each file travels as base64 in small chunks so no single command gets too long.
ship() {
  local source=$1 target=$2
  commands+=(": > ${target}.b64")
  while IFS= read -r chunk; do
    commands+=("printf '%s' '${chunk}' >> ${target}.b64")
  done < <(base64 -w 1000 "$source")
  commands+=("base64 -d ${target}.b64 > ${target}" "rm -f ${target}.b64")
}

ship deploy/docker-compose.prod.yml docker-compose.prod.yml
ship deploy/Caddyfile Caddyfile
ship deploy/remote-deploy.sh remote-deploy.sh
commands+=("AWS_REGION='${AWS_REGION}' API_IMAGE='${API_IMAGE}' WEB_IMAGE='${WEB_IMAGE}' IMAGE_TAG='${IMAGE_TAG}' PARAM_PATH='${PARAM_PATH}' DOMAIN='${DOMAIN}' bash remote-deploy.sh")

parameters=$(printf '%s\n' "${commands[@]}" | jq -R . | jq -s '{commands: .}')

command_id=$(aws ssm send-command \
  --region "$AWS_REGION" \
  --instance-ids "$INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --comment "ClassConnect ${IMAGE_TAG:0:12}" \
  --timeout-seconds "$TIMEOUT_SECONDS" \
  --parameters "$parameters" \
  --query Command.CommandId \
  --output text)
echo "SSM command ${command_id} sent to ${INSTANCE_ID}"

status="Pending"
for _ in $(seq 1 $((TIMEOUT_SECONDS / 10))); do
  sleep 10
  status=$(aws ssm get-command-invocation --region "$AWS_REGION" --command-id "$command_id" --instance-id "$INSTANCE_ID" \
    --query Status --output text 2> /dev/null || echo "Pending")
  case "$status" in
    Pending | InProgress | Delayed) echo "… ${status}" ;;
    *) break ;;
  esac
done

aws ssm get-command-invocation --region "$AWS_REGION" --command-id "$command_id" --instance-id "$INSTANCE_ID" \
  --query '[StandardOutputContent, StandardErrorContent]' --output text || true

if [ "$status" != "Success" ]; then
  echo "::error::Deployment finished with status ${status}"
  exit 1
fi
echo "Deployment succeeded"
