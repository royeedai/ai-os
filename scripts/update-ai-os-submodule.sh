#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/update-ai-os-submodule.sh <target-project-dir> [--ref <git-ref>] [--remote]

Internal submodule updater. Public/default distribution remains GitHub + npx.

Options:
  --ref <git-ref>  Fetch and checkout a specific branch, tag, or commit in the framework submodule
  --remote         Update the submodule from its configured remote tracking branch
  -h, --help       Show this help message
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FRAMEWORK_VERSION="$(tr -d '[:space:]' < "${SOURCE_ROOT}/VERSION")"

TARGET_DIR=""
FRAMEWORK_REF=""
USE_REMOTE=0
SUBMODULE_PATH=".ai-os-core"

ensure_symlink() {
  local link_path="$1"
  local expected_target="$2"

  if [[ -L "${link_path}" ]]; then
    local current_target
    current_target="$(readlink "${link_path}")"
    if [[ "${current_target}" == "${expected_target}" ]]; then
      return 0
    fi
  fi

  echo "expected symlink missing or incorrect: ${link_path}" >&2
  echo "expected target: ${expected_target}" >&2
  echo "repair the symlink before updating" >&2
  exit 1
}

refresh_project_metadata() {
  local metadata_file="${TARGET_DIR}/.ai-os-project/framework.toml"
  local submodule_origin
  submodule_origin="$(git -C "${TARGET_DIR}/${SUBMODULE_PATH}" remote get-url origin)"

  mkdir -p "$(dirname "${metadata_file}")"

  cat > "${metadata_file}" <<EOF
mode = "submodule"
framework_path = "${SUBMODULE_PATH}"
framework_version = "${FRAMEWORK_VERSION}"
framework_source = "${submodule_origin}"
EOF

  if [[ -n "${FRAMEWORK_REF}" ]]; then
    cat >> "${metadata_file}" <<EOF
framework_ref = "${FRAMEWORK_REF}"
EOF
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
    --remote)
      USE_REMOTE=1
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
        echo "unexpected argument: $1" >&2
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

if [[ -n "${FRAMEWORK_REF}" && "${USE_REMOTE}" -eq 1 ]]; then
  echo "use either --ref or --remote, not both" >&2
  exit 1
fi

TARGET_DIR="$(cd "${TARGET_DIR}" && pwd)"

if ! git -C "${TARGET_DIR}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "target project is not a git repository: ${TARGET_DIR}" >&2
  exit 1
fi

if [[ ! -d "${TARGET_DIR}/${SUBMODULE_PATH}" ]]; then
  echo "missing framework submodule: ${TARGET_DIR}/${SUBMODULE_PATH}" >&2
  echo "run ./scripts/attach-ai-os-submodule.sh first" >&2
  exit 1
fi

ensure_symlink "${TARGET_DIR}/AGENTS.md" "${SUBMODULE_PATH}/AGENTS.md"
ensure_symlink "${TARGET_DIR}/.agents" "${SUBMODULE_PATH}/.agents"

echo "Updating AI-OS submodule in ${TARGET_DIR}"

if [[ -n "${FRAMEWORK_REF}" ]]; then
  git -C "${TARGET_DIR}/${SUBMODULE_PATH}" fetch --all --tags
  git -C "${TARGET_DIR}/${SUBMODULE_PATH}" checkout "${FRAMEWORK_REF}"
  echo "checked out framework ref: ${FRAMEWORK_REF}"
elif [[ "${USE_REMOTE}" -eq 1 ]]; then
  git -C "${TARGET_DIR}" submodule update --remote "${SUBMODULE_PATH}"
else
  git -C "${TARGET_DIR}/${SUBMODULE_PATH}" pull --ff-only
fi

refresh_project_metadata

cat <<EOF

Update complete.

Next steps:
1. Review changes inside ${SUBMODULE_PATH}
2. Run your normal project review flow
3. Commit the updated submodule pointer in the target project
EOF
