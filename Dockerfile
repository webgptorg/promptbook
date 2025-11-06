# [🐋] Dockerfile

FROM node:22-slim

# Install the Promptbook CLI
WORKDIR /usr/app
RUN npm i ptbk@0.103.0-35

# Create empty books directory
RUN mkdir ./books


# Add `ptbk` to the path
ENV PATH="/usr/app/node_modules/.bin:${PATH}"