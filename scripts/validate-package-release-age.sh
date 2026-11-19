#!/usr/bin/env bash
# Enforce minimumReleaseAge in CI.
#
# pnpm-workspace.yaml sets minimumReleaseAge, which makes pnpm refuse to
# resolve a version published more recently than that. CI installs with
# --frozen-lockfile, which skips resolution and so never applies the check.
# This script applies it to the lockfile instead: it finds the packages a
# branch adds to pnpm-lock.yaml and fails if any was published more recently
# than the threshold.
#
# The threshold and the exclude list are read from the base branch, so a pull
# request cannot relax the gate for the packages it adds.
set -euo pipefail

BASE_REF="${BASE_REF:-origin/main}"
LOCKFILE="${1:-pnpm-lock.yaml}"
WORKSPACE_YAML="${2:-pnpm-workspace.yaml}"
REGISTRY="https://registry.npmjs.org"

if ! git rev-parse --verify "$BASE_REF" &>/dev/null; then
  echo "validate-package-release-age: base ref $BASE_REF not found" >&2
  exit 1
fi

# The base branch has no lockfile or threshold until pnpm lands there.
if ! base_workspace_yaml="$(git show "${BASE_REF}:${WORKSPACE_YAML}" 2>/dev/null)"; then
  echo "validate-package-release-age: $BASE_REF has no $WORKSPACE_YAML, reading the threshold from this branch"
  base_workspace_yaml="$(cat "$WORKSPACE_YAML")"
fi

THRESHOLD_MINUTES="$(printf '%s\n' "$base_workspace_yaml" | grep -E '^minimumReleaseAge:' | awk '{print $2}' || true)"
if [[ -z "$THRESHOLD_MINUTES" ]]; then
  echo "validate-package-release-age: minimumReleaseAge not found in $WORKSPACE_YAML" >&2
  exit 1
fi
echo "validate-package-release-age: threshold ${THRESHOLD_MINUTES} min ($(( THRESHOLD_MINUTES / 60 ))h)"

# Exclude entries must be exact name@version.
EXCLUDE_LIST=()
in_exclude=false
while IFS= read -r line; do
  if [[ "$line" =~ ^minimumReleaseAgeExclude: ]]; then
    in_exclude=true
    continue
  fi
  if $in_exclude; then
    if [[ "$line" =~ ^[[:space:]]+-[[:space:]]+(.*) ]]; then
      val="${BASH_REMATCH[1]//\'/}"
      EXCLUDE_LIST+=("${val//\"/}")
    elif [[ "$line" =~ ^[^[:space:]] && ! "$line" =~ ^# ]]; then
      break
    fi
  fi
done <<< "$base_workspace_yaml"

if git cat-file -e "${BASE_REF}:${LOCKFILE}" 2>/dev/null; then
  if ! raw_diff="$(git diff "$BASE_REF" HEAD -- "$LOCKFILE" 2>&1)"; then
    echo "validate-package-release-age: git diff against $BASE_REF failed:" >&2
    echo "$raw_diff" >&2
    exit 1
  fi
else
  # No lockfile on the base branch: every package counts as added.
  raw_diff="$(sed 's/^/+/' "$LOCKFILE")"
fi

# Package keys sit two spaces deep under the top-level `packages:` map, as
# `name@version:` or `'@scope/name@version':`.
added_packages="$(
  printf '%s\n' "$raw_diff" \
    | grep -E '^\+  [^[:space:]].*@.*:[[:space:]]*$' \
    | sed -E 's/^\+  //; s/:[[:space:]]*$//' \
    | sort -u \
    || true
)"

if [[ -z "$added_packages" ]]; then
  echo "validate-package-release-age: no new packages, OK"
  exit 0
fi

now_minutes=$(( $(date +%s) / 60 ))
offenders=()
checked=0

while IFS= read -r pkg; do
  [[ -z "$pkg" ]] && continue
  pkg="${pkg//\'/}"

  # Split name@version and drop any peer suffix: pkg@1.2.3(peer@4.5.6).
  if [[ "$pkg" == @* ]]; then
    name="@$(echo "$pkg" | cut -d@ -f2)"
    version="$(echo "$pkg" | cut -d@ -f3 | cut -d'(' -f1)"
  else
    name="$(echo "$pkg" | cut -d@ -f1)"
    version="$(echo "$pkg" | cut -d@ -f2 | cut -d'(' -f1)"
  fi

  # A key that is not name@semver has no registry publish time. Sources other
  # than the registry are rejected by audit-lockfile-sources.sh, so fail here
  # too instead of skipping.
  if [[ -z "$name" || -z "$version" || "$version" == *[:/]* ]]; then
    echo "validate-package-release-age: cannot read '${pkg}' as name@version" >&2
    exit 1
  fi

  for excl in "${EXCLUDE_LIST[@]+"${EXCLUDE_LIST[@]}"}"; do
    if [[ "${name}@${version}" == "$excl" ]]; then
      echo "validate-package-release-age: skipping ${name}@${version} (in minimumReleaseAgeExclude)"
      continue 2
    fi
  done

  packument="$(curl -sf --retry 3 "${REGISTRY}/${name//\//%2F}" || true)"
  if [[ -z "$packument" ]]; then
    echo "validate-package-release-age: no registry response for ${name}" >&2
    exit 1
  fi

  publish_time="$(printf '%s' "$packument" | jq -r --arg v "$version" '.time[$v] // empty')"
  if [[ -z "$publish_time" ]]; then
    echo "validate-package-release-age: no publish time for ${name}@${version}" >&2
    exit 1
  fi

  publish_epoch="$(date -d "$publish_time" +%s 2>/dev/null || date -ju -f "%Y-%m-%dT%H:%M:%S" "${publish_time%%.*}" +%s 2>/dev/null || true)"
  if [[ -z "$publish_epoch" ]]; then
    echo "validate-package-release-age: cannot parse publish time '${publish_time}' for ${pkg}" >&2
    exit 1
  fi

  age_minutes=$(( now_minutes - publish_epoch / 60 ))
  if (( age_minutes < THRESHOLD_MINUTES )); then
    offenders+=( "${name}@${version} | published ${publish_time} | age ${age_minutes} min" )
  fi
  checked=$(( checked + 1 ))
done <<< "$added_packages"

if (( ${#offenders[@]} > 0 )); then
  {
    echo "ERROR: these packages were published less than ${THRESHOLD_MINUTES} minutes ago:"
    printf '  %s\n' "${offenders[@]}"
  } >&2
  exit 1
fi

echo "validate-package-release-age: OK, ${checked} new package(s) are older than the threshold"
