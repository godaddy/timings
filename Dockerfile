FROM node:18.12.1-slim
RUN apt-get update && apt-get upgrade -y

LABEL Description="timings"

ENV NODE_ENV production
EXPOSE 80

WORKDIR /src

# Install dependencies first, add code later: docker is caching by layers
COPY package.json /src/package.json

# Docker base image is already NODE_ENV=production
RUN cd /src
RUN npm install

# Add source files
COPY . /src/

# Silent start because we want to have our log format as the first log
CMD ["npm", "start"]
