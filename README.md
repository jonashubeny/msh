# Miluj svůj hydrant

Webová galerie fotek hydrantů z celé České republiky – inspirováno instagramovým účtem
[@miluj_svuj_hydrant](https://www.instagram.com/milujsvujhydrant/). Uživatelé mohou fotky hydrantů prohlížet na mapě,
dávat jim lajky a psát komentáře. Po přihlášení může kdokoliv nahrát vlastní fotku hydrantu.

## Plánované funkce

- [ ] Registrace a přihlášení uživatelů
- [ ] Upload fotky hydrantu (po přihlášení)
- [ ] Poloha hydrantu – přesná (souřadnice) nebo jen město
- [ ] Mapa se všemi hydranty (OpenStreetMap / Leaflet)
- [ ] Lajky
- [ ] Komentáře
- [ ] Admin účty
- [ ] Leaderboardy

## Tech stack

- Node.js + Express
- Databáze: PostgreSQL
- Šablony: EJS (nebo dle vlastního výběru)
- Mapa: Leaflet.js + OpenStreetMap

## Struktura projektu

```
miluj-svuj-hydrant/
├── db/
│   └── schema.sql        # DDL všech tabulek, pouštěné přes psql
├── src/
│   ├── server.js         # vstupní bod aplikace
│   ├── routes/           # Express routy
│   ├── views/            # šablony stránek
│   ├── public/            # statické soubory (CSS, JS)
│   │   ├── css/
│   │   └── js/
│   └── uploads/          # nahrané fotky (mimo git)
├── todo/                 # pracovní poznámky k rozpracovaným krokům
├── .env.example
├── package.json
└── README.md
```

## Databáze

PostgreSQL, čtyři tabulky – celé DDL je v `db/schema.sql`.

| tabulka | obsah |
|---|---|
| `users` | účty: `username`, `email`, `password_hash`, `is_admin` |
| `hydrants` | jeden řádek = jedna nahraná fotka; `photo_path`, `city`, `lat`, `lng` |
| `likes` | kdo co lajkl; `UNIQUE (user_id, hydrant_id)` brání dvojitému lajku |
| `comments` | komentáře pod hydrantem |

Fotky samotné v databázi nejsou – soubor leží v `src/uploads/`, v `hydrants.photo_path`
je jen cesta k němu.

Všechny cizí klíče mají `ON DELETE CASCADE`: smazání uživatele odstraní i jeho hydranty,
lajky a komentáře.

## První spuštění (nový stroj)

```bash
npm install
cp .env.example .env          # a vyplnit DATABASE_URL a SESSION_SECRET
```

PostgreSQL (Fedora):

```bash
sudo dnf install postgresql-server postgresql
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql

sudo -u postgres createuser --interactive --pwprompt jonas
sudo -u postgres createdb -O jonas miluj_svuj_hydrant
```

Fedora má ve výchozím `pg_hba.conf` u TCP spojení metodu `ident`, se kterou se aplikace
nepřipojí (`FATAL: Ident authentication failed`). U řádků pro `127.0.0.1/32` a `::1/128`
je potřeba přepsat `ident` na `scram-sha-256`:

```bash
sudo nano /var/lib/pgsql/data/pg_hba.conf
sudo systemctl reload postgresql
```

Nahrání schématu a start:

```bash
psql -v ON_ERROR_STOP=1 -1 -d miluj_svuj_hydrant -f db/schema.sql
npm run dev
```

## Běžný start (po restartu počítače, návrat k projektu)

PostgreSQL je systemd služba spuštěná přes `enable`, takže **po restartu naběhne sám**
a nespouští se ručně. Stačí:

```bash
cd ~/_PROJEKTY/_MSH/msh
npm run dev
```

Aplikace poběží na `http://localhost:3000`.

Když si nejsi jistý stavem databáze:

```bash
pg_isready                          # "server přijímá spojení" = běží
sudo systemctl start postgresql     # jen když neběží
```

Data v databázi zůstávají mezi restarty, schéma se znovu nahrávat nemusí.

## Práce se schématem

Po každé úpravě `db/schema.sql` je potřeba soubor spustit – uložení v editoru
databázi nezmění:

```bash
psql -v ON_ERROR_STOP=1 -1 -d miluj_svuj_hydrant -f db/schema.sql
```

- `ON_ERROR_STOP=1` zastaví běh na první chybě (bez něj psql pokračuje a skončí úspěchem)
- `-1` pustí celý soubor v jedné transakci – buď projde všechno, nebo se nezmění nic

**Soubor začíná `DROP TABLE ... CASCADE`, takže každé spuštění smaže všechna data.**
To je záměr pro vývojovou fázi; před nasazením se tenhle řádek odstraní a změny schématu
se začnou dělat přes `ALTER TABLE` v migracích.

Kontrola, co v databázi doopravdy je:

```bash
psql -d miluj_svuj_hydrant -c '\dt'          # seznam tabulek
psql -d miluj_svuj_hydrant -c '\d hydrants'  # sloupce, indexy, cizí klíče
psql -d miluj_svuj_hydrant                    # interaktivní režim, konec přes \q
```

## Nasazení

Plánováno nasazení na domácí server přes Docker.
