# Kostenlos hosten (Render.com)

Die App läuft als **eine** kostenlose Web-Instanz: Das Backend baut das Frontend
mit und liefert es unter derselben URL aus. Du bekommst also genau eine
öffentliche Adresse für Kasse, Admin-Bereich und API.

> Der Start ist selbstheilend: Fehlt der Build, kompiliert ein `prestart`-Hook
> Frontend und Backend automatisch — das Deployment funktioniert daher auch,
> wenn der Hosting-Anbieter nur „install + start" ausführt.

## Schritt für Schritt

1. Account bei <https://render.com> anlegen (kostenlos, GitHub-Login möglich).
2. Im Dashboard: **New ▸ Blueprint**.
3. Dieses Repository (`jojothaysen13-web/cash-register`) auswählen und den Branch
   wählen, auf dem die `render.yaml` liegt.
4. Render liest die `render.yaml` automatisch ein und legt den Web-Service
   `cash-register` an. Auf **Apply / Deploy** klicken.
5. Der erste Build dauert ein paar Minuten. Danach ist die App unter
   `https://cash-register-XXXX.onrender.com` erreichbar.

## Login nach dem Deploy

Beim Start werden automatisch Demo-Daten angelegt:

- Admin: `admin` / `admin123`
- Kassierer: `kassierer` / `kassierer123`
- Kundenkarten: `1001`, `1002` · Gutscheine: `GUTSCHEIN10`, `GUTSCHEIN25`

## Gut zu wissen (kostenloser Tarif)

- **Schläft nach ~15 Min Inaktivität ein.** Der erste Aufruf danach braucht
  ~30–50 Sekunden, bis der Dienst wieder hochgefahren ist.
- **Daten sind nicht dauerhaft.** Das Dateisystem (SQLite) wird bei jedem
  Neustart/Deploy zurückgesetzt; die Demo-Daten werden dann neu erzeugt. Für eine
  Übungs-/Demokasse ist das in Ordnung. Für dauerhafte Daten bräuchte es ein
  kostenpflichtiges Persistent Disk oder eine externe Postgres-Datenbank.
- **JWT-Secret** wird von Render automatisch sicher generiert.
- **Stripe** ist optional: ohne `STRIPE_SECRET_KEY` läuft der eingebaute
  Test-/Mock-Modus. Echtes Stripe kannst du im Render-Dashboard unter den
  Environment-Variablen aktivieren.

## Lokal das Production-Setup testen

```bash
cd frontend && npm install && npm run build
cd ../backend && npm install && npm run build
node dist/db/seed.js          # Demo-Daten anlegen
NODE_ENV=production node dist/server.js
# -> http://localhost:4000  (Frontend + API aus einer Quelle)
```
