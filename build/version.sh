#!/bin/bash
version=$(git describe --always --tag --abbrev=0)

if [ -n "${version}" ]; then
  echo "found version: $version"
  search='("api_version":[[:space:]]*").+(")'
  replace="\1${version/v/}\2"
  sed -i -r "s/${search}/${replace}/g" "package.json"
  git add .
  git commit -m "Set custom version field to ${version}"
  git push origin
else
  echo "Could not find GIT version ..."
fi
