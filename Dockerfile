# Eine Datei, die Frontend + Backend baut und als eine App startet.
# Funktioniert identisch lokal und bei jedem Docker-Hoster (Render, Railway, Fly, ...).
FROM node:22-slim

# Build-Tools fuer das native better-sqlite3 (Fallback, falls kein Prebuild passt).
RUN apt-get update && apt-get install -y python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Frontend bauen ---
COPY frontend/package.json frontend/package-lock.json frontend/
RUN cd frontend && npm ci
COPY frontend frontend
RUN cd frontend && npm run build

# --- Backend bauen ---
COPY backend/package.json backend/package-lock.json backend/
RUN cd backend && npm ci
COPY backend backend
RUN cd backend && npm run build

ENV NODE_ENV=production
# Der Hoster setzt PORT selbst; lokal Standard 4000.
EXPOSE 4000

WORKDIR /app/backend
# Demo-Daten anlegen (idempotent), dann Server starten.
CMD ["sh", "-c", "node dist/db/seed.js && node dist/server.js"]
