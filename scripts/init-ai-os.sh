#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/init-ai-os.sh <target-project-dir> [--with-scaffold] [--force-framework]

Copy-mode fallback. Prefer ./scripts/attach-ai-os-submodule.sh when the target project is a git repository.

Options:
  --with-scaffold    Create missing project scaffold files such as project-charter.md,
                     tasks.yaml, acceptance.yaml, release-plan.md, memory.md, specs/, evals/
  --force-framework  Overwrite existing framework-managed files: agent.md and .agents/
  -h, --help         Show this help message
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FRAMEWORK_VERSION="$(tr -d '[:space:]' < "${SOURCE_ROOT}/VERSION")"

WITH_SCAFFOLD=0
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
  local meta_dir="${TARGET_DIR}/.ai-os"
  local manifest="${meta_dir}/managed-files.tsv"

  mkdir -p "${meta_dir}"
  : > "${manifest}"

  while IFS= read -r rel_path; do
    printf '%s\t%s\n' "$(sha256_file "${TARGET_DIR}/${rel_path}")" "${rel_path}" >> "${manifest}"
  done < <(managed_files)

  printf '%s\n' "${FRAMEWORK_VERSION}" > "${meta_dir}/installed-version"
}

create_scaffold() {
  mkdir -p "${TARGET_DIR}/specs" "${TARGET_DIR}/evals"

  copy_template_if_missing \
    "${SOURCE_ROOT}/.agents/skills/project-planner/references/project-charter-template.md" \
    "${TARGET_DIR}/project-charter.md"

  copy_template_if_missing \
    "${SOURCE_ROOT}/.agents/skills/project-planner/references/risk-register-template.md" \
    "${TARGET_DIR}/risk-register.md"

  copy_template_if_missing \
    "${SOURCE_ROOT}/.agents/skills/task-orchestrator/references/tasks-template.yaml" \
    "${TARGET_DIR}/tasks.yaml"

  copy_template_if_missing \
    "${SOURCE_ROOT}/.agents/skills/acceptance-gate/references/acceptance-template.yaml" \
    "${TARGET_DIR}/acceptance.yaml"

  copy_template_if_missing \
    "${SOURCE_ROOT}/.agents/skills/release-manager/references/release-plan-template.md" \
    "${TARGET_DIR}/release-plan.md"

  copy_template_if_missing \
    "${SOURCE_ROOT}/.agents/skills/memory-manager/references/memory-template.md" \
    "${TARGET_DIR}/memory.md"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-scaffold)
      WITH_SCAFFOLD=1
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
  if [[ -e "${TARGET_DIR}/agent.md" || -e "${TARGET_DIR}/.agents" ]]; then
    echo "target project already contains framework files" >&2
    echo "use --force-framework to overwrite them, or use ./scripts/upgrade-ai-os.sh if the project was already initialized" >&2
    exit 1
  fi
fi

echo "Initializing AI-OS ${FRAMEWORK_VERSION} into ${TARGET_DIR}"

while IFS= read -r rel_path; do
  copy_framework_file "${rel_path}"
done < <(managed_files)

if [[ "${WITH_SCAFFOLD}" -eq 1 ]]; then
  create_scaffold
fi

write_manifest

cat <<EOF

Initialization complete.

Framework version: ${FRAMEWORK_VERSION}
Target project: ${TARGET_DIR}

Next steps:
1. Open ${TARGET_DIR}/project-charter.md if you created scaffold files.
2. Start with the /new-project workflow for a new project.
3. Keep .ai-os/installed-version and .ai-os/managed-files.tsv in the target project so upgrades can detect conflicts safely.
EOF
