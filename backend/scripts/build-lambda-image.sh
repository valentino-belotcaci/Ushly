#!/usr/bin/env bash

set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_TAG="${LAMBDA_IMAGE_TAG:-ushly:lambda}"

docker build \
  --platform linux/amd64 \
  --file "$BACKEND_DIR/Dockerfile.lambda" \
  --tag "$IMAGE_TAG" \
  "$BACKEND_DIR"

ENTRYPOINT="$(docker image inspect "$IMAGE_TAG" --format '{{json .Config.Entrypoint}}')"
COMMAND="$(docker image inspect "$IMAGE_TAG" --format '{{json .Config.Cmd}}')"
ARCHITECTURE="$(docker image inspect "$IMAGE_TAG" --format '{{.Architecture}}')"

if [[ "$ENTRYPOINT" != '["/lambda-entrypoint.sh"]' ]]; then
  echo "Unexpected Lambda image entrypoint: $ENTRYPOINT" >&2
  exit 1
fi

if [[ "$COMMAND" != '["dist/lambda.handler"]' ]]; then
  echo "Unexpected Lambda image command: $COMMAND" >&2
  exit 1
fi

if [[ "$ARCHITECTURE" != 'amd64' ]]; then
  echo "Unexpected Lambda image architecture: $ARCHITECTURE" >&2
  exit 1
fi

echo "Built Lambda image $IMAGE_TAG"
echo "Entrypoint: $ENTRYPOINT"
echo "Command: $COMMAND"
echo "Architecture: $ARCHITECTURE"
