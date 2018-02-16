#!/bin/bash
version=$(./node_modules/.bin/semantic-release --dry-run --branch [secure]_dev | grep "next release version is " | sed -nE 's/(.*?(\bnext\srelease\sversion\sis\s)(.*?))$/\3/p')

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
  echo "Could not extract NEXT version from semantic-release dry-run ..."
fi
