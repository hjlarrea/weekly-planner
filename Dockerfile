FROM alpine/git:2.47.2 AS metadata

WORKDIR /src

COPY .git .git

RUN set -eu; \
  commit="$(git rev-parse --short HEAD)"; \
  tag="$(git tag --points-at HEAD | sed -n '1p')"; \
  version="${tag:-$commit}"; \
  printf 'window.APP_BUILD = {\n  version: "%s",\n  commit: "%s"\n};\n' "$version" "$commit" > /build-meta.js

FROM node:22-alpine AS site-builder

WORKDIR /src

COPY index.html styles.css app.js planner-core.mjs config.js sw.js manifest.json ./
COPY icons icons
COPY img img
COPY scripts scripts

ARG SITE_NAME="Planner Semanal"
ARG SITE_TITLE="Planner Semanal"
ARG SITE_DESCRIPTION="Planner semanal familiar para actividades, traslados y organizacion diaria."
ARG SITE_URL=""
ARG SITE_OG_IMAGE=""
ARG SITE_ROBOTS="index,follow"
ARG SITE_MENU_ENABLED="false"

RUN SITE_NAME="$SITE_NAME" \
  SITE_TITLE="$SITE_TITLE" \
  SITE_DESCRIPTION="$SITE_DESCRIPTION" \
  SITE_URL="$SITE_URL" \
  SITE_OG_IMAGE="$SITE_OG_IMAGE" \
  SITE_ROBOTS="$SITE_ROBOTS" \
  SITE_MENU_ENABLED="$SITE_MENU_ENABLED" \
  node ./scripts/build.mjs

FROM nginx:1.27-alpine

COPY --from=site-builder /src/dist /usr/share/nginx/html
COPY --from=metadata /build-meta.js /usr/share/nginx/html/build-meta.js
COPY docker-entrypoint.d/40-write-config.sh /docker-entrypoint.d/40-write-config.sh
COPY docker-nginx-mjs.conf /etc/nginx/conf.d/50-mjs.conf

EXPOSE 80
