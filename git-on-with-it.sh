#!/usr/bin/env bash

# directory of this script
__dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

activate_venv() {
  source "$__dir"/.venv/bin/activate 2> /dev/null # silence error output
}

create_venv() {
  echo 'Running first time setup...'
  python3 -m venv "$__dir"/.venv
  activate_venv
  pip install nodeenv
  nodeenv -n 14.19.1 -p
  # deactivate and reactivate seems to be needed to "refresh" node
  deactivate
  activate_venv
}

activate_venv || create_venv

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
  node "$__dir"/dist "${@:1}"
}

("$@") || exit $?
