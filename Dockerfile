FROM node:8.4

LABEL Description="timings"

ENV NODE_ENV production
ENV PORT 80
EXPOSE 80

WORKDIR /src

# Install dependencies first, add code later: docker is caching by layers
COPY package.json /src/package.json

# Docker base image is already NODE_ENV=production
RUN cd /src
RUN npm install

# Add source files
COPY . /src/
# RUN touch /src/.config.js

# Silent start because we want to have our log format as the first log
CMD ["npm", "start"]
