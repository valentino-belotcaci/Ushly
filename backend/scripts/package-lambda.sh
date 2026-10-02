#!/usr/bin/env bash

set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACT_DIR="$BACKEND_DIR/artifacts"
PACKAGE_DIR="$ARTIFACT_DIR/lambda-package"
ZIP_PATH="$ARTIFACT_DIR/ushly-backend-lambda.zip"
LAMBDA_BUILD_IMAGE="public.ecr.aws/lambda/nodejs:22"

case "$PACKAGE_DIR" in
  "$BACKEND_DIR"/artifacts/*) ;;
  *)
    echo "Refusing to clean an unexpected package directory" >&2
    exit 1
    ;;
esac

rm -rf "$PACKAGE_DIR"
rm -f "$ZIP_PATH"
mkdir -p "$PACKAGE_DIR"

cp "$BACKEND_DIR/package.json" "$BACKEND_DIR/package-lock.json" "$PACKAGE_DIR/"
cp "$BACKEND_DIR/tsconfig.json" "$PACKAGE_DIR/"
cp -R "$BACKEND_DIR/src" "$PACKAGE_DIR/"
mkdir -p "$PACKAGE_DIR/prisma"
cp "$BACKEND_DIR/prisma/schema.prisma" "$PACKAGE_DIR/prisma/"

docker run --rm \
  --platform linux/amd64 \
  --entrypoint /bin/bash \
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp/lambda-build-home \
  --volume "$PACKAGE_DIR:/var/task" \
  --workdir /var/task \
  "$LAMBDA_BUILD_IMAGE" \
  -c 'npm ci && npm run build && npx prisma generate && npm prune --omit=dev'

rm -rf "$PACKAGE_DIR/src" "$PACKAGE_DIR/prisma"
rm -f "$PACKAGE_DIR/tsconfig.json"
find "$PACKAGE_DIR/dist" -type f -name '*.map' -delete
find "$PACKAGE_DIR/node_modules" -depth -type d \
  \( -name test -o -name tests -o -name __tests__ \) \
  -exec rm -rf {} +

(
  cd "$PACKAGE_DIR"
  zip -q -r "$ZIP_PATH" dist node_modules package.json package-lock.json
)

CONTENTS_PATH="$ARTIFACT_DIR/lambda-contents.txt"
unzip -Z1 "$ZIP_PATH" > "$CONTENTS_PATH"
trap 'rm -f "$CONTENTS_PATH"' EXIT

if grep -Eq '^(\.env($|\.)|tests?(/|$)|src/|prisma/)|/(tests?|__tests__)/' "$CONTENTS_PATH"; then
  echo "Lambda artifact contains a forbidden project file" >&2
  exit 1
fi

if ! grep -Fqx 'dist/lambda.js' "$CONTENTS_PATH"; then
  echo "Lambda artifact is missing dist/lambda.js" >&2
  exit 1
fi

if ! grep -q '^node_modules/\.prisma/client/' "$CONTENTS_PATH"; then
  echo "Lambda artifact is missing the generated Prisma Client" >&2
  exit 1
fi

if ! grep -Eq '^node_modules/\.prisma/client/libquery_engine-rhel-openssl-3\.0\.x\.so\.node$' "$CONTENTS_PATH"; then
  echo "Lambda artifact is missing the Amazon Linux compatible Prisma engine" >&2
  exit 1
fi

if ! grep -Eq '^node_modules/argon2/prebuilds/linux-x64/argon2\.glibc\.node$' "$CONTENTS_PATH"; then
  echo "Lambda artifact is missing the Linux x86-64 argon2 binary" >&2
  exit 1
fi

echo "Created $ZIP_PATH"
