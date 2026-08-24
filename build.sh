#!/usr/bin/env bash
# Build, tag and push the production app image (see Dockerfile,
# docker-compose.prod.yml).
#
# Usage:
#   ./build.sh [tag]
#
# Image name comes from DOCKER_IMAGE (env var or ./.env), same default as
# docker-compose.prod.yml. Tag resolution, in order: the [tag] argument,
# then $IMAGE_TAG if already exported, then IMAGE_TAG from ./.env, then
# "latest".
#
# Unless the resolved tag is already "latest", the image is also tagged and
# pushed as :latest (set ALSO_TAG_LATEST=false to skip that) — so a plain
# `docker compose pull app` on the prod host (which defaults to :latest)
# always gets the most recent build, while the specific tag stays around
# for pinning/rollback.
#
# Requires the registry login already done, e.g.:
#   gcloud auth configure-docker us-east1-docker.pkg.dev

set -euo pipefail
cd "$(dirname "$0")"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

DOCKER_IMAGE="${DOCKER_IMAGE:-us-east1-docker.pkg.dev/vitormarcelino/fin/app}"
IMAGE_TAG="${1:-${IMAGE_TAG:-latest}}"
ALSO_TAG_LATEST="${ALSO_TAG_LATEST:-true}"

image="${DOCKER_IMAGE}:${IMAGE_TAG}"
latest="${DOCKER_IMAGE}:latest"
tag_latest_too=false
if [ "${IMAGE_TAG}" != "latest" ] && [ "${ALSO_TAG_LATEST}" = "true" ]; then
  tag_latest_too=true
fi

echo "==> Building ${image}"
docker build -t "${image}" .

if [ "${tag_latest_too}" = "true" ]; then
  echo "==> Tagging ${latest}"
  docker tag "${image}" "${latest}"
fi

echo "==> Pushing ${image}"
docker push "${image}"

if [ "${tag_latest_too}" = "true" ]; then
  echo "==> Pushing ${latest}"
  docker push "${latest}"
fi

echo "==> Done: ${image}$([ "${tag_latest_too}" = "true" ] && echo " (+ ${latest})")"
