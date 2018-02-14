#!/bin/bash
version=$(npm view timings version)

if [ -n "${version}" ]; then
  echo "found version: $version"
  search='("api_version":[[:space:]]*").+(")'
  replace="\1${version/v/}\2"
  sed -i -r "s/${search}/${replace}/g" "package.json"
  git config user.name "verkurkie"
  git config user.email "mverkerk@godaddy.com"
  git add .
  git commit -m "Set custom version field to ${version}"
  git push --quiet "https://${GH_TOKEN}@${GH_REF}" origin:master > /dev/null 2>&1
else
  echo "Could not find GIT version ..."
fi
