# [🐋] Dockerfile

FROM node:22-slim

# Install the Promptbook CLI
WORKDIR /usr/app
RUN npm i ptbk@0.86.1

# Add `ptbk` to the path
ENV PATH="/usr/app/node_modules/.bin:${PATH}"

# Add the README for Docker Hub
COPY README.md /README.md
