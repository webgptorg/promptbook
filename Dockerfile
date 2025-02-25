# [🐋] Dockerfile

FROM node:22-slim

# Install the Promptbook CLI
WORKDIR /usr/app
RUN npm i ptbk@0.86.5

# Add `ptbk` to the path
ENV PATH="/usr/app/node_modules/.bin:${PATH}"

# Add the README for Docker Hub
WORKDIR /
COPY README.md /README.md
# <- TODO: !!! Make README for Docker Hub working
#    @see https://hub.docker.com/r/hejny/promptbook

