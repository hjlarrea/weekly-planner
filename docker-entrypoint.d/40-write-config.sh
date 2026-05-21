#!/bin/sh
set -eu

SITE_NAME_VALUE="${SITE_NAME:-Planner Semanal}"
SITE_TITLE_VALUE="${SITE_TITLE:-$SITE_NAME_VALUE}"
SITE_DESCRIPTION_VALUE="${SITE_DESCRIPTION:-Planner semanal familiar para actividades, traslados y organizacion diaria.}"
SITE_URL_VALUE="${SITE_URL:-}"
SITE_OG_IMAGE_VALUE="${SITE_OG_IMAGE:-}"
SITE_ROBOTS_VALUE="${SITE_ROBOTS:-index,follow}"
SITE_NAME_ESCAPED="$(printf '%s' "$SITE_NAME_VALUE" | sed 's/\\/\\\\/g; s/"/\\"/g')"
SITE_TITLE_ESCAPED="$(printf '%s' "$SITE_TITLE_VALUE" | sed 's/\\/\\\\/g; s/"/\\"/g')"
SITE_DESCRIPTION_ESCAPED="$(printf '%s' "$SITE_DESCRIPTION_VALUE" | sed 's/\\/\\\\/g; s/"/\\"/g')"
SITE_URL_ESCAPED="$(printf '%s' "$SITE_URL_VALUE" | sed 's/\\/\\\\/g; s/"/\\"/g')"
SITE_OG_IMAGE_ESCAPED="$(printf '%s' "$SITE_OG_IMAGE_VALUE" | sed 's/\\/\\\\/g; s/"/\\"/g')"
SITE_ROBOTS_ESCAPED="$(printf '%s' "$SITE_ROBOTS_VALUE" | sed 's/\\/\\\\/g; s/"/\\"/g')"

cat > /usr/share/nginx/html/config.js <<EOF
window.APP_CONFIG = {
  siteName: "${SITE_NAME_ESCAPED}",
  siteTitle: "${SITE_TITLE_ESCAPED}",
  siteDescription: "${SITE_DESCRIPTION_ESCAPED}",
  siteUrl: "${SITE_URL_ESCAPED}",
  siteOgImage: "${SITE_OG_IMAGE_ESCAPED}",
  siteRobots: "${SITE_ROBOTS_ESCAPED}",
  siteMenuEnabled: false,
};
EOF

cat > /usr/share/nginx/html/manifest.json <<EOF
{
  "id": "/",
  "name": "${SITE_NAME_ESCAPED}",
  "short_name": "${SITE_NAME_ESCAPED}",
  "description": "${SITE_DESCRIPTION_ESCAPED}",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#f8f3ea",
  "theme_color": "#b85c38",
  "lang": "es-AR",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
EOF
