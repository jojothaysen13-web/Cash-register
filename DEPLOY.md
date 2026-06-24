# Kostenlos hosten

Die ganze App (Frontend + Backend) steckt in **einer `Dockerfile`** und läuft als
**ein** Container unter **einer** öffentlichen URL. Dadurch baut und startet jeder
Hoster die App exakt gleich – keine Build-Einstellungen, keine Stolperfallen.

## Render.com (empfohlen, kostenlos)

1. Bei <https://render.com> mit GitHub einloggen (kostenlos).
2. **New ▸ Blueprint**.
3. Repository `cash-register` auswählen → **Apply**.

Render liest die `render.yaml`, baut die `Dockerfile` und startet die App. Nach
ein paar Minuten ist sie unter `https://cash-register-XXXX.onrender.com` erreichbar.

> Alternativ ohne Blueprint: **New ▸ Web Service** → Repo wählen → Render erkennt
> die `Dockerfile` automatisch → **Create Web Service**.

## Login nach dem Deploy

Beim Start werden automatisch Demo-Daten angelegt:

- Admin: `admin` / `admin123`
- Kassierer: `kassierer` / `kassierer123`
- Kundenkarten: `1001`, `1002` · Gutscheine: `GUTSCHEIN10`, `GUTSCHEIN25`

## Gut zu wissen (kostenloser Tarif)

- **Schläft nach ~15 Min Inaktivität ein.** Der erste Aufruf danach braucht
  ~30–50 Sekunden, bis der Dienst wieder hochgefahren ist.
- **Daten sind nicht dauerhaft** (SQLite im Container); die Demo-Daten werden bei
  jedem Neustart neu erzeugt. Für eine Übungs-/Demokasse ist das in Ordnung.
- **JWT-Secret** wird automatisch sicher generiert.
- **Stripe** ist optional: ohne `STRIPE_SECRET_KEY` läuft der eingebaute Testmodus.

## Lokal testen (mit Docker)

```bash
docker build -t cash-register .
docker run -p 4000:4000 cash-register
# -> http://localhost:4000
```

Funktioniert genauso auf jedem anderen Docker-Hoster (Railway, Fly.io, ...).
