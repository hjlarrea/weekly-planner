FROM alpine/git:2.47.2 AS metadata

WORKDIR /src

COPY .git .git

RUN set -eu; \
  commit="$(git rev-parse --short HEAD)"; \
  tag="$(git tag --points-at HEAD | sed -n '1p')"; \
  version="${tag:-$commit}"; \
  printf 'window.APP_BUILD = {\n  version: "%s",\n  commit: "%s"\n};\n' "$version" "$commit" > /build-meta.js

FROM nginx:1.27-alpine

COPY index.html /usr/share/nginx/html/index.html
COPY styles.css /usr/share/nginx/html/styles.css
COPY app.js /usr/share/nginx/html/app.js
COPY planner-core.mjs /usr/share/nginx/html/planner-core.mjs
COPY config.js /usr/share/nginx/html/config.js
COPY sw.js /usr/share/nginx/html/sw.js
COPY icons /usr/share/nginx/html/icons
COPY manifest.json /usr/share/nginx/html/manifest.json
COPY --from=metadata /build-meta.js /usr/share/nginx/html/build-meta.js
COPY docker-entrypoint.d/40-write-config.sh /docker-entrypoint.d/40-write-config.sh
COPY docker-nginx-mjs.conf /etc/nginx/conf.d/50-mjs.conf

EXPOSE 80
