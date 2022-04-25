#!/usr/bin/env bash

# directory of this script
__dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

activate_venv() {
  source "$__dir"/.venv/bin/activate 2> /dev/null # silence error output
}

create_venv() {
  echo 'Creating virtual environment for node...'
  python3 -m venv "$__dir"/.venv
  activate_venv
}

install_node() {
  local NODE_VERSION=14.19.1
  local FOUND_NODE_VERSION=$(node --version) || true

  if [ "$FOUND_NODE_VERSION" != v"$NODE_VERSION" ]
  then
    echo 'Installing node...'
    nodeenv --version &> /dev/null || pip install nodeenv
    nodeenv -n $NODE_VERSION -p
    # deactivate and reactivate seems to be needed to "refresh" node reference
    deactivate
    activate_venv
  fi
}

activate_venv || create_venv
install_node

build() {
  cd "$__dir" || exit
  npm install > /dev/null
  npx tsc
  echo 'Build complete.'
}

update() {
  cd "$__dir" || exit
  git pull --ff-only
  build
}

test() {
  cd "$__dir" || exit
  npx jest
}

run() {
  if [ -d "$__dir"/dist ]
  then
    node "$__dir"/dist "${@:1}"
  else
    echo 'Could not run, you need to build first.'
  fi
}

("$@") || exit $?
