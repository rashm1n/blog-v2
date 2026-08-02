# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

# Install dependencies first so this layer is cached when only source changes.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Build-time secrets for optional features (comments/analytics). Safe to leave
# unset — Comments.astro and the Umami script both no-op without them.
ARG GISCUS_REPO
ARG GISCUS_REPO_ID
ARG GISCUS_CATEGORY
ARG GISCUS_CATEGORY_ID
ARG UMAMI_WEBSITE_ID
ARG UMAMI_SCRIPT_URL
ENV GISCUS_REPO=$GISCUS_REPO \
    GISCUS_REPO_ID=$GISCUS_REPO_ID \
    GISCUS_CATEGORY=$GISCUS_CATEGORY \
    GISCUS_CATEGORY_ID=$GISCUS_CATEGORY_ID \
    UMAMI_WEBSITE_ID=$UMAMI_WEBSITE_ID \
    UMAMI_SCRIPT_URL=$UMAMI_SCRIPT_URL

RUN pnpm build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY docker/site.Caddyfile /etc/caddy/Caddyfile
