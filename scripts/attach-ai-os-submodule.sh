#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/attach-ai-os-submodule.sh <target-project-dir> <framework-repo-path-or-url> [--ref <git-ref>] [--with-project-files] [--force-links]

Internal submodule fallback for teams that want explicit git pinning.
Public/default distribution remains:
  npx --yes github:royeedai/ai-os <target-project-dir> --with-project-files

Options:
  --ref <git-ref>       Checkout a specific branch, tag, or commit after adding the submodule
  --with-project-files  Create missing project-local files such as project-charter.md, tasks.yaml, acceptance.yaml, release-plan.md, memory.md, specs/, evals/
  --force-links         Replace existing root-level AGENTS.md and .agents with symlinks to the submodule
  -h, --help            Show this help message
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FRAMEWORK_VERSION="$(tr -d '[:space:]' < "${SOURCE_ROOT}/VERSION")"

TARGET_DIR=""
FRAMEWORK_REPO=""
FRAMEWORK_REF=""
WITH_PROJECT_FILES=0
FORCE_LINKS=0
SUBMODULE_PATH=".ai-os-core"

copy_template_if_missing() {
  local src="$1"
  local dst="$2"

  mkdir -p "$(dirname "${dst}")"
  if [[ -e "${dst}" ]]; then
    echo "keep existing project file: ${dst#${TARGET_DIR}/}"
    return 0
  fi

  cp "${src}" "${dst}"
  echo "created project file: ${dst#${TARGET_DIR}/}"
}

ensure_symlink() {
  local link_path="$1"
  local target_path="$2"

  if [[ -L "${link_path}" ]]; then
    local current_target
    current_target="$(readlink "${link_path}")"
    if [[ "${current_target}" == "${target_path}" ]]; then
      echo "keep existing symlink: ${link_path#${TARGET_DIR}/}"
      return 0
    fi
  fi

  if [[ -e "${link_path}" || -L "${link_path}" ]]; then
    if [[ "${FORCE_LINKS}" -ne 1 ]]; then
      echo "existing path blocks symlink: ${link_path}" >&2
      echo "rerun with --force-links to replace it" >&2
      exit 1
    fi
    rm -rf "${link_path}"
  fi

  ln -s "${target_path}" "${link_path}"
  echo "linked: ${link_path#${TARGET_DIR}/} -> ${target_path}"
}

create_project_files() {
  mkdir -p "${TARGET_DIR}/specs" "${TARGET_DIR}/evals" "${TARGET_DIR}/.ai-os-project"

  copy_template_if_missing \
    "${TARGET_DIR}/${SUBMODULE_PATH}/.agents/skills/project-planner/references/project-charter-template.md" \
    "${TARGET_DIR}/project-charter.md"

  copy_template_if_missing \
    "${TARGET_DIR}/${SUBMODULE_PATH}/.agents/skills/project-planner/references/risk-register-template.md" \
    "${TARGET_DIR}/risk-register.md"

  copy_template_if_missing \
    "${TARGET_DIR}/${SUBMODULE_PATH}/.agents/skills/task-orchestrator/references/tasks-template.yaml" \
    "${TARGET_DIR}/tasks.yaml"

  copy_template_if_missing \
    "${TARGET_DIR}/${SUBMODULE_PATH}/.agents/skills/acceptance-gate/references/acceptance-template.yaml" \
    "${TARGET_DIR}/acceptance.yaml"

  copy_template_if_missing \
    "${TARGET_DIR}/${SUBMODULE_PATH}/.agents/skills/release-manager/references/release-plan-template.md" \
    "${TARGET_DIR}/release-plan.md"

  copy_template_if_missing \
    "${TARGET_DIR}/${SUBMODULE_PATH}/.agents/skills/memory-manager/references/memory-template.md" \
    "${TARGET_DIR}/memory.md"
}

write_project_metadata() {
  local metadata_file="${TARGET_DIR}/.ai-os-project/framework.toml"

  mkdir -p "$(dirname "${metadata_file}")"

  cat > "${metadata_file}" <<EOF
mode = "submodule"
framework_path = "${SUBMODULE_PATH}"
framework_version = "${FRAMEWORK_VERSION}"
framework_source = "${FRAMEWORK_REPO}"
EOF

  if [[ -n "${FRAMEWORK_REF}" ]]; then
    cat >> "${metadata_file}" <<EOF
framework_ref = "${FRAMEWORK_REF}"
EOF
  fi
}

git_submodule_add() {
  local git_cmd=(git -C "${TARGET_DIR}")

  if [[ -d "${FRAMEWORK_REPO}" || -f "${FRAMEWORK_REPO}" ]]; then
    "${git_cmd[@]}" -c protocol.file.allow=always submodule add "${FRAMEWORK_REPO}" "${SUBMODULE_PATH}"
  else
    "${git_cmd[@]}" submodule add "${FRAMEWORK_REPO}" "${SUBMODULE_PATH}"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ref)
      if [[ $# -lt 2 ]]; then
        echo "--ref requires a value" >&2
        exit 1
      fi
      FRAMEWORK_REF="$2"
      shift 2
      ;;
    --with-project-files)
      WITH_PROJECT_FILES=1
      shift
      ;;
    --force-links)
      FORCE_LINKS=1
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
      if [[ -z "${TARGET_DIR}" ]]; then
        TARGET_DIR="$1"
      elif [[ -z "${FRAMEWORK_REPO}" ]]; then
        FRAMEWORK_REPO="$1"
      else
        echo "unexpected argument: $1" >&2
        usage >&2
        exit 1
      fi
      shift
      ;;
  esac
done

if [[ -z "${TARGET_DIR}" || -z "${FRAMEWORK_REPO}" ]]; then
  usage >&2
  exit 1
fi

TARGET_DIR="$(cd "${TARGET_DIR}" && pwd)"

if ! git -C "${TARGET_DIR}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "target project is not a git repository: ${TARGET_DIR}" >&2
  echo "initialize git first, then rerun this script" >&2
  exit 1
fi

if [[ -e "${TARGET_DIR}/${SUBMODULE_PATH}" ]]; then
  echo "submodule path already exists: ${TARGET_DIR}/${SUBMODULE_PATH}" >&2
  exit 1
fi

echo "Attaching AI-OS ${FRAMEWORK_VERSION} to ${TARGET_DIR}"
echo "Framework source: ${FRAMEWORK_REPO}"

git_submodule_add

if [[ -n "${FRAMEWORK_REF}" ]]; then
  git -C "${TARGET_DIR}/${SUBMODULE_PATH}" fetch --all --tags
  git -C "${TARGET_DIR}/${SUBMODULE_PATH}" checkout "${FRAMEWORK_REF}"
  echo "checked out framework ref: ${FRAMEWORK_REF}"
fi

ensure_symlink "${TARGET_DIR}/AGENTS.md" "${SUBMODULE_PATH}/AGENTS.md"
ensure_symlink "${TARGET_DIR}/.agents" "${SUBMODULE_PATH}/.agents"

if [[ "${WITH_PROJECT_FILES}" -eq 1 ]]; then
  create_project_files
fi

write_project_metadata

cat <<EOF

Attach complete.

Recommended next steps:
1. Review ${TARGET_DIR}/.ai-os-project/framework.toml
2. Commit the submodule pointer, symlinks, and any new project-local files
3. Start the project with /new-project
EOF
