#!/usr/bin/env bash
# Uploads the API's production settings to SSM Parameter Store as SecureStrings.
# The EC2 host reads them on every deploy, so nothing secret lives in git or in
# GitHub.
#
#   cp Backend/.env.example .env.production   # fill in real values
#   ./infra/aws/put-secrets.sh .env.production ap-south-1
set -euo pipefail

ENV_FILE=${1:?usage: put-secrets.sh <env-file> <aws-region> [parameter-path]}
REGION=${2:?usage: put-secrets.sh <env-file> <aws-region> [parameter-path]}
PARAM_PATH=${3:-/classconnect/prod}

count=0
while IFS= read -r line || [ -n "$line" ]; do
  # skip comments and blank lines
  [[ -z "${line// }" || "$line" =~ ^[[:space:]]*# ]] && continue
  key=${line%%=*}
  value=${line#*=}
  # strip optional surrounding quotes
  value=${value%\"}
  value=${value#\"}
  [ -z "$value" ] && continue

  aws ssm put-parameter \
    --region "$REGION" \
    --name "${PARAM_PATH}/${key}" \
    --type SecureString \
    --value "$value" \
    --overwrite > /dev/null
  echo "set ${PARAM_PATH}/${key}"
  count=$((count + 1))
done < "$ENV_FILE"

echo "Stored ${count} parameters under ${PARAM_PATH} in ${REGION}."
