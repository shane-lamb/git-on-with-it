#!/usr/bin/env bash

# directory of this script
__dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

NODE_VERSION=$(grep nodejs "$__dir"/.tool-versions | cut -d ' ' -f2)
NODE_INSTALL_DIR="$__dir"/node_install
NODE_DIR="$NODE_INSTALL_DIR"/"$NODE_VERSION"

build() {
  echo "Building git-on-with-it..."
  cd "$__dir" || exit
  npm install > /dev/null
  npx tsc
  echo 'Done.'
}

install_node() {
  # return if node already installed
  if [ -d "$NODE_DIR" ]; then
    return 0
  fi

  echo "Installing NodeJS ($NODE_VERSION)..."

  mkdir -p "$NODE_DIR"

  architecture=$(uname -m)
  if [ "$architecture" = "x86_64" ]; then
      node_arch="x64"
  elif [ "$architecture" = "arm64" ]; then
      node_arch="arm64"
  else
      echo "Unsupported architecture: $architecture"
      return 1
  fi

  node_tarball="node-v${NODE_VERSION}-darwin-${node_arch}.tar.gz"
  node_url="https://nodejs.org/dist/v${NODE_VERSION}/${node_tarball}"

  curl -L "$node_url" | tar -xz -C "$NODE_DIR" --strip-components=1

  echo "Done."

  build
}

install_node

update() {
  cd "$__dir" || exit
  pull_result=$(git pull --ff-only)
  if [ "$pull_result" = "Already up to date." ]; then
    echo "No updates found."
    return 0
  fi
  echo "Updating..."
  install_node
  build
}

run() {
  if [ "$1" = "update" ]; then
    update
    return 0
  fi

  if [ "$1" = "build" ]; then
    build
    return 0
  fi

  "$NODE_DIR"/bin/node "$__dir"/dist "$@"
}

run "$@"
