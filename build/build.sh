#!/bin/bash
echo "Running Docker build script ..."

# check if there is a new release
# assume env variables were set by travis-ci script
echo "- previous NPM release: ${NPM_OLD} ..."
echo "- current NPM release: ${NPM_NEW} ..."

if [ ! -z "$NPM_NEW" -a "$NPM_NEW" != " " ]; then
  if [ "${NPM_NEW}" != "${NPM_OLD}" ]; then
    echo "- looks like we have a new release [${NPM_OLD} -> ${NPM_NEW}] - going to build Docker!"
    docker login -e $DOCKER_EMAIL -u $DOCKER_USERNAME -p $DOCKER_PASSWORD
    # build docker container
    echo "building new docker container ..."
    docker build -t godaddy/timings:${NPM_NEW} -t godaddy/timings:latest .

    # push docker container
    echo "pushing new docker container ..."
    docker push godaddy/timings
  else
    echo "- old NPM [${NPM_NEW}] matches new NPM [${NPM_OLD}] - NOT going to build Docker!"
  fi
else
  echo "- >> NPM release could not be determined! CANNOT build Docker! <<"
fi
