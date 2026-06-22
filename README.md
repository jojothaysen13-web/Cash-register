# Cash-register

Nachstellung von Smithstoys Kasse zum üben.

Ein Kassensystem (POS) mit zwei Bereichen: einem Kassierer-Interface (Barcode-Scan,
Warenkorb, Zahlung, Tagesabschluss) und einem Admin-Bereich (folgt in Phase 2).

## Status: Phase 1 (MVP)

Umgesetzt:
- Login (JWT, Rollen `cashier`/`admin`)
- Barcode-Erfassung (Scanner-Eingabefeld + manuelle Suche als Fallback)
- Warenkorb mit Mengenänderung und Fehlerprävention (z. B. Bestandsprüfung)
- Zahlungsabwicklung: Bargeld (mit Rückgeldberechnung), Karte, Gutschein
- Tagesabschluss mit Soll-/Ist-Differenz

Bewusste Vereinfachungen für diese Phase:
- **SQLite** statt PostgreSQL (dateibasiert, kein Serverbetrieb nötig)
- **Produktsuche per SQL** statt Elasticsearch (für den Katalogumfang einer Einzelkasse ausreichend)
- **Karte**: echte Stripe-PaymentIntent-Integration, die aktiv wird, sobald
  `STRIPE_SECRET_KEY` / `VITE_STRIPE_PUBLISHABLE_KEY` gesetzt sind. Ohne Schlüssel läuft
  ein deterministischer Testmodus (Testkarte endet auf `0002` → Ablehnung, alles andere →
  Erfolg), damit die App ohne echtes Stripe-Konto lauffähig bleibt.
- **Split-Payment, Mobile-Payments, Multi-Laden, Admin-Dashboard**: laut Phasenplan erst
  ab Phase 2/3.

## Tech-Stack

- Frontend: React 18 + TypeScript + Vite + TailwindCSS 4
- Backend: Node.js + Express + TypeScript + SQLite (`better-sqlite3`)
- Cache: Redis (optional — Caching/Scan-Debounce; App läuft auch ohne Redis weiter,
  dann direkt gegen die DB)
- Zahlungen: Stripe (PaymentIntents) mit Mock-Fallback

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run seed   # legt Demo-Benutzer, Produkte und Gutscheine an
npm run dev    # http://localhost:4000
```

Demo-Zugänge nach dem Seed:
- Kassierer: `kassierer` / `kassierer123`
- Admin: `admin` / `admin123`

Redis ist optional. Falls installiert, einfach lokal starten (`redis-server`) — die
`REDIS_URL` aus `.env.example` zeigt standardmäßig auf `localhost:6379`. Ohne laufendes
Redis fällt der Server automatisch auf direkte DB-Zugriffe zurück.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev    # http://localhost:5173
```

## Projektstruktur

```
backend/
  src/
    config/     DB, Redis, Env-Konfiguration
    db/         SQLite-Schema + Seed-Skript
    middleware/ Auth (JWT), Error-Handling
    modules/    auth, products, sales, payments, closing
frontend/
  src/
    api/        Fetch-Client pro Domäne
    store/      Zustand (Auth, Warenkorb)
    components/ BarcodeScanner, Cart, PaymentModal, ProtectedRoute
    pages/      Login, POS (Kasse), Tagesabschluss, Admin-Platzhalter
```
