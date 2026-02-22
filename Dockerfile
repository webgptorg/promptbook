# [🐋] Dockerfile

FROM node:22-slim

# Install the Promptbook CLI
WORKDIR /usr/app
RUN npm i ptbk@0.111.0-10

RUN npm i @eslint/eslintrc@3 @next/bundle-analyzer@16.0.1 @rollup/plugin-json@6.1.0 @rollup/plugin-typescript@8.3.0 @rollup/plugin-url@8.0.2 @testing-library/react@16.3.0 @types/crypto-js@4.2.2 @types/express@5.0.5 @types/jest@29.5.14 @types/js-yaml@4.0.9 @types/jsdom@21.1.7 @types/katex@0.16.7 @types/mime-types@2.1.4 @types/node@20 @types/papaparse@5.3.16 @types/prettier@2.7.3 @types/prompts@2.4.9 @types/qrcode@1.5.6 @types/react@19 @types/react-dom@19 @types/readline-sync@1.4.8 @types/showdown@2.0.6 @types/swagger-ui-express@4.1.8 @typescript-eslint/eslint-plugin@6.21.0 @typescript-eslint/parser@6.21.0 autoprefixer@10.4.21 cspell@9.0.2 deno@2.2.15 eslint@8.57.1 eslint-config-next@15.4.7 jest@29.7.0 jest-environment-jsdom@30.2.0 js-yaml@4.1.0 llamaindex@0.12.0 locate-app@2.5.0 lucide-react@0.536.0 mermaid@11.9.0 next@15.4.7 openapi-typescript@7.6.1 organize-imports-cli@0.10.0 playwright@1.56.1 postcss@8.5.6 prettier@2.8.8 react@19.1.0 react-dom@19.1.0 readline-sync@1.4.10 rollup@2.79.2 rollup-plugin-polyfill-node@0.13.0 rollup-plugin-postcss@4.0.2 rollup-plugin-visualizer@5.13.1 tailwindcss@3.4.18 ts-jest@29.1.5 tsconfig-paths-webpack-plugin@4.2.0 tslib@2.3.1 type-fest@4.41.0 typescript@5.2.2 use-state-with-deps@1.1.3 yaml@2.3.4
# <- TODO: [🐱‍🚀] Move the dependencies inside package.json and remove this line
# TODO: [🐱‍🚀] Docker image with Podman https://chatgpt.com/c/691b2212-d6a4-832a-a2d4-e25d6543aa95

# Create empty books directory
RUN mkdir ./books


# Add `ptbk` to the path
ENV PATH="/usr/app/node_modules/.bin:${PATH}"


# TODO: [🚑] This file should be meybe in `/packages/docker/...`
# TODO