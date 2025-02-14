# [🐋] Dockerfile

FROM node:22-slim
  # <- TODO: !!!!!! Verify that node:22-slim is working

#Install some dependencies

WORKDIR /usr/app
COPY ./books /usr/app/books
RUN npm i ptbk

# Add `ptbk` to the path
ENV PATH="/usr/app/node_modules/.bin:${PATH}"
