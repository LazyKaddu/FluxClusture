#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-}"
TAG="${2:-}"
GITOPS_DIR="${3:-.}"
REPO="${4:-lazykaddu/flux-cluster-server}"

if [[ -z "$ENV" || -z "$TAG" ]]; then
  echo "Usage: $0 <dev|staging|production> <image-tag> [gitops-dir] [image-repo]"
  exit 1
fi

VALUES_FILE="${GITOPS_DIR}/environments/${ENV}/values.yaml"

if [[ ! -f "$VALUES_FILE" ]]; then
  if [[ -f "${GITOPS_DIR}/values.yaml" ]]; then
    VALUES_FILE="${GITOPS_DIR}/values.yaml"
    echo "Notice: environments/${ENV}/values.yaml not found, falling back to ${VALUES_FILE}"
  else
    echo "Error: Neither environments/${ENV}/values.yaml nor ${GITOPS_DIR}/values.yaml exist"
    exit 1
  fi
fi

if command -v yq >/dev/null 2>&1; then
  yq -i ".image.repository = \"$REPO\" | .image.tag = \"$TAG\"" "$VALUES_FILE"
elif command -v python3 >/dev/null 2>&1; then
  python3 -c "
import sys, re

path = sys.argv[1]
repo = sys.argv[2]
tag = sys.argv[3]

with open(path, 'r') as f:
    content = f.read()

# In-place regex substitution preserving structure and comments
content = re.sub(r'(repository:\s*).*', r'\g<1>' + repo, content)
content = re.sub(r'(tag:\s*).*', r'\g<1>\"' + tag + '\"', content)

with open(path, 'w') as f:
    f.write(content)
" "$VALUES_FILE" "$REPO" "$TAG"
else
  echo "Error: Neither yq nor python3 found to update YAML."
  exit 1
fi

echo "Successfully updated $VALUES_FILE with image.repository=$REPO and image.tag=$TAG"
