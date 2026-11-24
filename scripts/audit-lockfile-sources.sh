#!/usr/bin/env bash
# Fail if the lockfile resolves anything from outside the npm registry.
# Git and URL dependencies skip registry integrity metadata and can run
# lifecycle scripts from an unreviewed commit at install time.
set -euo pipefail

LOCKFILE="${1:-pnpm-lock.yaml}"
REGISTRY="https://registry.npmjs.org/"

if [[ ! -f "$LOCKFILE" ]]; then
  echo "audit-lockfile-sources: $LOCKFILE not found" >&2
  exit 1
fi

git_hits="$(grep -nE '(specifier:|resolution:|version:).*(github:|git\+|git://|git@|type: git|repo:)' "$LOCKFILE" || true)"
tarball_hits="$(grep -nE 'tarball: ' "$LOCKFILE" | grep -vF "tarball: ${REGISTRY}" || true)"
url_hits="$(grep -nE '(specifier:|version:) *https?://' "$LOCKFILE" || true)"
# Registry packages are pinned by integrity hash. An entry without one cannot
# be verified at install time.
no_integrity_hits="$(grep -nE 'resolution: \{' "$LOCKFILE" | grep -v 'integrity: sha512-' || true)"

if [[ -z "$git_hits" && -z "$tarball_hits" && -z "$url_hits" && -z "$no_integrity_hits" ]]; then
  echo "audit-lockfile-sources: OK ($LOCKFILE)"
  exit 0
fi

{
  echo "ERROR: $LOCKFILE contains dependencies that do not come from $REGISTRY"
  echo "with a sha512 integrity hash."
  echo
  [[ -n "$git_hits" ]] && printf 'Git resolutions or specifiers:\n%s\n\n' "$git_hits"
  [[ -n "$tarball_hits" ]] && printf 'Tarballs outside the registry:\n%s\n\n' "$tarball_hits"
  [[ -n "$url_hits" ]] && printf 'URL specifiers:\n%s\n\n' "$url_hits"
  [[ -n "$no_integrity_hits" ]] && printf 'Resolutions without a sha512 integrity hash:\n%s\n' "$no_integrity_hits"
} >&2
exit 1
