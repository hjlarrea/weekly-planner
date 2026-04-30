#!/bin/sh
set -eu

SITE_NAME_VALUE="${SITE_NAME:-Planner Semanal}"
SITE_NAME_ESCAPED="$(printf '%s' "$SITE_NAME_VALUE" | sed 's/\\/\\\\/g; s/"/\\"/g')"

cat > /usr/share/nginx/html/config.js <<EOF
window.APP_CONFIG = {
  siteName: "${SITE_NAME_ESCAPED}",
};
EOF

cat > /usr/share/nginx/html/manifest.json <<EOF
{
  "id": "/",
  "name": "${SITE_NAME_ESCAPED}",
  "short_name": "${SITE_NAME_ESCAPED}",
  "description": "Planner semanal familiar para actividades, traslados y organizacion diaria.",
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
