# TODO – Miluj svůj hydrant

Pracovní poznámky mimo repozitář. Stav ke dni 2026-09-17.

## Krok 0: Zprovoznit prostředí

Nic z toho zatím na stroji není, bez toho se aplikace nerozběhne.

- [x] `npm install` (složka `node_modules/` neexistuje)
- [ ] `cp .env.example .env` a vyplnit reálné hodnoty (soubor `.env` zatím chybí)
- [ ] Nainstalovat PostgreSQL – `psql` ani `pg_isready` nejsou v PATH
      (Fedora: `sudo dnf install postgresql-server postgresql`,
      pak `sudo postgresql-setup --initdb` a `sudo systemctl enable --now postgresql`)
- [ ] Ověřit, že `npm run dev` nastartuje a `http://localhost:3000` odpoví

## Krok 1: Napsat schema.sql pořádně

Bez tabulek se nedá dělat nic dalšího. Přepsat komentáře na skutečné DDL:

```sql
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hydrants (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT,
    photo_path TEXT NOT NULL,
    city       TEXT,
    lat        DOUBLE PRECISION,
    lng        DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE likes (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hydrant_id INTEGER NOT NULL REFERENCES hydrants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, hydrant_id)   -- jeden lajk na uživatele
);

CREATE TABLE comments (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hydrant_id INTEGER NOT NULL REFERENCES hydrants(id) ON DELETE CASCADE,
    text       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`UNIQUE (user_id, hydrant_id)` u lajků řeší dvojité lajkování přímo v databázi,
nemusí se to hlídat v kódu.

Nahrání:
```bash
createdb miluj_svuj_hydrant
psql -d miluj_svuj_hydrant -f db/schema.sql
```

## Krok 2: Rozdělit routy a udělat layout

- [ ] `src/routes/hydrants.js` s `express.Router()`, v `server.js` jen `app.use('/', hydrantsRouter)`
- [ ] `src/views/partials/header.ejs` + `footer.ejs`, ať se `<html>` nekopíruje do každé šablony
- [ ] Základní CSS do `src/public/css/style.css`

Udělat dřív, než přibude druhá stránka.

## Krok 3: Registrace a přihlášení

První funkce ze seznamu v README – všechno ostatní na ní stojí.

```bash
npm install bcrypt express-session connect-pg-simple
```

- [ ] `bcrypt.hash(password, 12)` při registraci, `bcrypt.compare()` při loginu
- [ ] `express-session` se store `connect-pg-simple` (session v paměti zmizí při restartu)
- [ ] Middleware `requireLogin` v `src/middleware/auth.js` – přesměruje na `/login`,
      když chybí `req.session.userId`; použije se pak i u uploadu a komentářů
- [ ] Routy: `GET/POST /register`, `GET/POST /login`, `POST /logout`

`SESSION_SECRET` už v `.env.example` je.

## Krok 4: Upload fotky

```bash
npm install multer
```

- [ ] Multer cíl `src/uploads/`, limit velikosti cca 5 MB
- [ ] Filtr na `image/jpeg`, `image/png`, `image/webp`
- [ ] **Název souboru generovat vlastní** (`crypto.randomUUID()` + přípona),
      nikdy nepoužívat `file.originalname` – uživatel tam může poslat cokoliv
- [ ] Do `server.js`: `app.use('/uploads', express.static(path.join(__dirname, 'uploads')))`
- [ ] Formulář: fotka + nepovinný popisek + město + nepovinné souřadnice
      (souřadnice zatím textová pole, klikání do mapy až v kroku 5)

## Krok 5: Mapa (Leaflet)

Až budou v DB nějaké hydranty se souřadnicemi.

- [ ] `GET /api/hydrants` vrací JSON (`id, title, photo_path, lat, lng`)
- [ ] Stránka `/mapa` – Leaflet + OSM dlaždice, markery s popupem (náhled + odkaz na detail)
- [ ] Tutéž mapu pak použít i ve formuláři pro výběr polohy klikem

## Krok 6 a dál

Přímočaré, jakmile stojí kroky 1–4:

- [ ] Lajky – `POST /hydrants/:id/like`, v SQL `ON CONFLICT DO NOTHING`
- [ ] Komentáře – výpis a `POST` formulář na detailu hydrantu
- [ ] Admin účty – sloupec `is_admin` už ve schématu je, doplnit middleware a mazání obsahu
- [ ] Leaderboardy – `ORDER BY` počet lajků / počet nahraných hydrantů
- [ ] Nasazení přes Docker na domácí server (zmíněno v README)

## Návrh commitů

1. `db.js` cleanup (smazat mrtvé `DB_*` řádky) – malý samostatný commit
2. schema.sql + rozdělení rout + layout – jeden ucelený commit, připraví půdu pro autentizaci
3. dál po funkcích podle kroků výše
