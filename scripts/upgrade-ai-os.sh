#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/upgrade-ai-os.sh <target-project-dir> [--force-framework]

Legacy copy-mode upgrader. Use this only for projects originally initialized by
./scripts/init-ai-os.sh. Public/default distribution is GitHub + npx.

Options:
  --force-framework  Overwrite framework-managed files even if the target project modified them
  -h, --help         Show this help message
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FRAMEWORK_VERSION="$(tr -d '[:space:]' < "${SOURCE_ROOT}/VERSION")"

FORCE_FRAMEWORK=0
TARGET_DIR=""

sha256_file() {
  shasum -a 256 "$1" | awk '{print $1}'
}

managed_files() {
  (
    cd "${SOURCE_ROOT}"
    printf '%s\n' "agent.md"
    find .agents -type f ! -name '.DS_Store' | sort
  )
}

manifest_checksum() {
  local manifest="$1"
  local rel_path="$2"
  awk -F '\t' -v target="${rel_path}" '$2 == target { print $1 }' "${manifest}"
}

copy_framework_file() {
  local rel_path="$1"
  local src="${SOURCE_ROOT}/${rel_path}"
  local dst="${TARGET_DIR}/${rel_path}"

  mkdir -p "$(dirname "${dst}")"
  cp "${src}" "${dst}"
  echo "updated: ${rel_path}"
}

write_manifest() {
  local meta_dir="${TARGET_DIR}/.ai-os-project"
  local manifest="${meta_dir}/managed-files.tsv"

  mkdir -p "${meta_dir}"
  : > "${manifest}"

  while IFS= read -r rel_path; do
    printf '%s\t%s\n' "$(sha256_file "${TARGET_DIR}/${rel_path}")" "${rel_path}" >> "${manifest}"
  done < <(managed_files)

  printf '%s\n' "${FRAMEWORK_VERSION}" > "${meta_dir}/installed-version"
}

write_framework_metadata() {
  local meta_dir="${TARGET_DIR}/.ai-os-project"
  local metadata_file="${meta_dir}/framework.toml"

  mkdir -p "${meta_dir}"
  cat > "${metadata_file}" <<EOF
mode = "copy-fallback"
framework_version = "${FRAMEWORK_VERSION}"
framework_source = "local-copy"
managed_files_manifest = ".ai-os-project/managed-files.tsv"
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force-framework)
      FORCE_FRAMEWORK=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      if [[ -n "${TARGET_DIR}" ]]; then
        echo "target project directory already set: ${TARGET_DIR}" >&2
        usage >&2
        exit 1
      fi
      TARGET_DIR="$1"
      shift
      ;;
  esac
done

if [[ -z "${TARGET_DIR}" ]]; then
  usage >&2
  exit 1
fi

TARGET_DIR="$(cd "${TARGET_DIR}" && pwd)"
CURRENT_META_DIR="${TARGET_DIR}/.ai-os-project"
LEGACY_META_DIR="${TARGET_DIR}/.ai-os"
MANIFEST="${CURRENT_META_DIR}/managed-files.tsv"
INSTALLED_VERSION_FILE="${CURRENT_META_DIR}/installed-version"
USED_LEGACY_METADATA=0

if [[ ! -f "${MANIFEST}" ]]; then
  MANIFEST="${LEGACY_META_DIR}/managed-files.tsv"
  INSTALLED_VERSION_FILE="${LEGACY_META_DIR}/installed-version"
  USED_LEGACY_METADATA=1
fi

if [[ ! -f "${MANIFEST}" ]]; then
  echo "missing .ai-os-project/managed-files.tsv (or legacy .ai-os/managed-files.tsv)" >&2
  echo "run ./scripts/init-ai-os.sh on the target project first" >&2
  exit 1
fi

INSTALLED_VERSION="unknown"
if [[ -f "${INSTALLED_VERSION_FILE}" ]]; then
  INSTALLED_VERSION="$(tr -d '[:space:]' < "${INSTALLED_VERSION_FILE}")"
fi

TMP_SOURCE_LIST="$(mktemp "${TMPDIR:-/tmp}/ai-os-source-files.XXXXXX")"
trap 'rm -f "${TMP_SOURCE_LIST}"' EXIT
managed_files > "${TMP_SOURCE_LIST}"

CONFLICTS=()

if [[ "${FORCE_FRAMEWORK}" -ne 1 ]]; then
  while IFS= read -r rel_path; do
    old_checksum="$(manifest_checksum "${MANIFEST}" "${rel_path}" || true)"
    target_file="${TARGET_DIR}/${rel_path}"

    if [[ -z "${old_checksum}" ]]; then
      continue
    fi

    if [[ ! -f "${target_file}" ]]; then
      CONFLICTS+=("${rel_path} (missing locally)")
      continue
    fi

    current_checksum="$(sha256_file "${target_file}")"
    if [[ "${current_checksum}" != "${old_checksum}" ]]; then
      CONFLICTS+=("${rel_path}")
    fi
  done < "${TMP_SOURCE_LIST}"
fi

if [[ "${#CONFLICTS[@]}" -gt 0 ]]; then
  echo "upgrade aborted: local modifications were detected in framework-managed files" >&2
  echo "installed version: ${INSTALLED_VERSION}" >&2
  echo "target version: ${FRAMEWORK_VERSION}" >&2
  echo >&2
  printf '  - %s\n' "${CONFLICTS[@]}" >&2
  echo >&2
  echo "resolve the conflicts manually or rerun with --force-framework" >&2
  exit 2
fi

echo "Upgrading AI-OS from ${INSTALLED_VERSION} to ${FRAMEWORK_VERSION} in ${TARGET_DIR}"

STALE_FILES=()
while IFS=$'\t' read -r _ rel_path; do
  if ! grep -Fxq "${rel_path}" "${TMP_SOURCE_LIST}"; then
    STALE_FILES+=("${rel_path}")
  fi
done < "${MANIFEST}"

while IFS= read -r rel_path; do
  copy_framework_file "${rel_path}"
done < "${TMP_SOURCE_LIST}"

write_manifest
write_framework_metadata

cat <<EOF

Upgrade complete.

Previous version: ${INSTALLED_VERSION}
Current version: ${FRAMEWORK_VERSION}
Target project: ${TARGET_DIR}
EOF

if [[ "${USED_LEGACY_METADATA}" -eq 1 ]]; then
  echo
  echo "Legacy metadata was detected in .ai-os/."
  echo "New metadata has been written to .ai-os-project/."
  echo "Review and remove the old .ai-os/ directory manually when it is no longer needed."
fi

if [[ "${#STALE_FILES[@]}" -gt 0 ]]; then
  echo
  echo "These previously managed files no longer exist in the framework source."
  echo "They were left untouched and should be reviewed manually:"
  printf '  - %s\n' "${STALE_FILES[@]}"
fi
