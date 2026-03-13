#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/init-ai-os.sh <target-project-dir> [--with-project-files] [--force-framework]

Legacy copy-mode fallback. Public/default distribution is:
  npx --yes github:royeedai/ai-os <target-project-dir> --with-project-files

Options:
  --with-project-files  Create missing project files under .ai-os-project/ such as
                        project-charter.md, risk-register.md, tasks.yaml, acceptance.yaml,
                        release-plan.md, memory.md, STATE.md, verification-matrix.yaml, specs/, evals/
  --with-scaffold       Deprecated alias for --with-project-files
  --force-framework     Overwrite existing framework-managed files: AGENTS.md and .agents/
  -h, --help            Show this help message
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FRAMEWORK_VERSION="$(tr -d '[:space:]' < "${SOURCE_ROOT}/VERSION")"
PROJECT_STATE_ROOT=".ai-os-project"

WITH_PROJECT_FILES=0
FORCE_FRAMEWORK=0
TARGET_DIR=""

sha256_file() {
  shasum -a 256 "$1" | awk '{print $1}'
}

managed_files() {
  (
    cd "${SOURCE_ROOT}"
    printf '%s\n' "AGENTS.md"
    find .agents -type f ! -name '.DS_Store' | sort
  )
}

copy_framework_file() {
  local rel_path="$1"
  local src="${SOURCE_ROOT}/${rel_path}"
  local dst="${TARGET_DIR}/${rel_path}"

  mkdir -p "$(dirname "${dst}")"

  cp "${src}" "${dst}"
  echo "copied: ${rel_path}"
}

copy_template_if_missing() {
  local src="$1"
  local dst="$2"

  mkdir -p "$(dirname "${dst}")"
  if [[ -e "${dst}" ]]; then
    echo "keep existing project file: ${dst#${TARGET_DIR}/}"
    return 0
  fi

  cp "${src}" "${dst}"
  echo "created scaffold: ${dst#${TARGET_DIR}/}"
}

write_manifest() {
  local meta_dir="${TARGET_DIR}/${PROJECT_STATE_ROOT}"
  local manifest="${meta_dir}/managed-files.tsv"

  mkdir -p "${meta_dir}"
  : > "${manifest}"

  while IFS= read -r rel_path; do
    printf '%s\t%s\n' "$(sha256_file "${TARGET_DIR}/${rel_path}")" "${rel_path}" >> "${manifest}"
  done < <(managed_files)

  printf '%s\n' "${FRAMEWORK_VERSION}" > "${meta_dir}/installed-version"
}

write_framework_metadata() {
  local meta_dir="${TARGET_DIR}/${PROJECT_STATE_ROOT}"
  local metadata_file="${meta_dir}/framework.toml"

  mkdir -p "${meta_dir}"
  cat > "${metadata_file}" <<EOF
mode = "copy-fallback"
framework_version = "${FRAMEWORK_VERSION}"
framework_source = "local-copy"
managed_files_manifest = "${PROJECT_STATE_ROOT}/managed-files.tsv"
EOF
}

create_scaffold() {
  mkdir -p "${TARGET_DIR}/${PROJECT_STATE_ROOT}/specs" "${TARGET_DIR}/${PROJECT_STATE_ROOT}/evals"

  copy_template_if_missing \
    "${SOURCE_ROOT}/.agents/templates/project/project-charter.md" \
    "${TARGET_DIR}/${PROJECT_STATE_ROOT}/project-charter.md"

  copy_template_if_missing \
    "${SOURCE_ROOT}/.agents/templates/project/risk-register.md" \
    "${TARGET_DIR}/${PROJECT_STATE_ROOT}/risk-register.md"

  copy_template_if_missing \
    "${SOURCE_ROOT}/.agents/templates/project/tasks.yaml" \
    "${TARGET_DIR}/${PROJECT_STATE_ROOT}/tasks.yaml"

  copy_template_if_missing \
    "${SOURCE_ROOT}/.agents/templates/project/acceptance.yaml" \
    "${TARGET_DIR}/${PROJECT_STATE_ROOT}/acceptance.yaml"

  copy_template_if_missing \
    "${SOURCE_ROOT}/.agents/templates/project/release-plan.md" \
    "${TARGET_DIR}/${PROJECT_STATE_ROOT}/release-plan.md"

  copy_template_if_missing \
    "${SOURCE_ROOT}/.agents/templates/project/memory.md" \
    "${TARGET_DIR}/${PROJECT_STATE_ROOT}/memory.md"

  copy_template_if_missing \
    "${SOURCE_ROOT}/.agents/templates/project/STATE.md" \
    "${TARGET_DIR}/${PROJECT_STATE_ROOT}/STATE.md"

  copy_template_if_missing \
    "${SOURCE_ROOT}/.agents/templates/project/verification-matrix.yaml" \
    "${TARGET_DIR}/${PROJECT_STATE_ROOT}/verification-matrix.yaml"

  copy_template_if_missing \
    "${SOURCE_ROOT}/.agents/templates/project/specs/example.spec.md" \
    "${TARGET_DIR}/${PROJECT_STATE_ROOT}/specs/example.spec.md"

  copy_template_if_missing \
    "${SOURCE_ROOT}/.agents/templates/project/evals/eval-example.md" \
    "${TARGET_DIR}/${PROJECT_STATE_ROOT}/evals/eval-example.md"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-project-files)
      WITH_PROJECT_FILES=1
      shift
      ;;
    --with-scaffold)
      WITH_PROJECT_FILES=1
      shift
      ;;
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

mkdir -p "${TARGET_DIR}"
TARGET_DIR="$(cd "${TARGET_DIR}" && pwd)"

if [[ "${FORCE_FRAMEWORK}" -ne 1 ]]; then
  if [[ -e "${TARGET_DIR}/AGENTS.md" || -e "${TARGET_DIR}/.agents" ]]; then
    echo "target project already contains framework files" >&2
    echo "use --force-framework to overwrite them, or use ./scripts/upgrade-ai-os.sh if the project was already initialized" >&2
    exit 1
  fi
fi

echo "Initializing AI-OS ${FRAMEWORK_VERSION} into ${TARGET_DIR}"

while IFS= read -r rel_path; do
  copy_framework_file "${rel_path}"
done < <(managed_files)

if [[ "${WITH_PROJECT_FILES}" -eq 1 ]]; then
  create_scaffold
fi

write_manifest
write_framework_metadata

cat <<EOF

Initialization complete.

Framework version: ${FRAMEWORK_VERSION}
Target project: ${TARGET_DIR}

Next steps:
1. Open ${TARGET_DIR}/${PROJECT_STATE_ROOT}/project-charter.md if you created project files.
2. Start with the /new-project workflow for a new project.
3. Keep ${PROJECT_STATE_ROOT}/framework.toml, installed-version, and managed-files.tsv in the target project so copy-mode upgrades can detect conflicts safely.
EOF
