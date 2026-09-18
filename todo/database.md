# TODO – Databáze

Doplněk k `main.md`, rozepsaný jen na databázi. Stav ke dni 2026-09-18.

## Stav

- [x] `npm install` proběhl, `node_modules/` je na místě
- [x] `.env` existuje a má `DATABASE_URL`
- [x] `src/db.js` vytváří `Pool` a exportuje ho – víc zatím netřeba
- [ ] **PostgreSQL není nainstalovaný** – `psql`, `createdb` ani `pg_isready` nejsou v PATH
- [ ] `db/schema.sql` obsahuje jen komentáře, žádné `CREATE TABLE`

Dokud neběží server Postgresu, nemá smysl psát žádnou routu, která sahá do databáze.

---

## K čemu databáze v téhle aplikaci je

Databáze je **jediné místo, kde data přežijí restart serveru**. Všechno ostatní (proměnné v Node.js, session v paměti) po restartu zmizí.

Jedna věc tam ale nepatří: **samotné fotky**. Soubor se uloží na disk do `src/uploads/`, do databáze jde jen **cesta k němu** (`photo_path`). Databáze je na krátké hodnoty, filesystem na binární data.

---

## Co musí databáze obsahovat

Čtyři tabulky (plus pátá, kterou nevytváříš ručně – viz session níže).

| tabulka | co v ní je | proč existuje |
|---|---|---|
| `users` | username, email, password_hash, is_admin, created_at | kdo se může přihlásit a kdo je admin |
| `hydrants` | user_id, title, photo_path, city, lat, lng, created_at | jeden řádek = jedna nahraná fotka hydrantu |
| `likes` | user_id, hydrant_id, created_at | kdo co lajkl; `UNIQUE (user_id, hydrant_id)` |
| `comments` | user_id, hydrant_id, text, created_at | komentáře pod hydrantem |

Vztahy mezi nimi:

- **`users` → `hydrants`** je 1:N – jeden uživatel má víc hydrantů, hydrant patří právě jednomu uživateli.
- **`users` ↔ `hydrants` přes `likes`** je M:N – tzv. spojovací tabulka. Uživatel lajkuje víc hydrantů, hydrant má víc lajkujících. Právě proto jsou lajky vlastní tabulka a ne sloupec `like_count` v `hydrants`: potřebuješ vědět **kdo** lajkl, ne jen kolik jich je (jinak nezabráníš dvojitému lajku a neukážeš „už jsi lajkl").
- **`comments`** je 1:N z obou stran (patří jednomu uživateli a jednomu hydrantu).

Všechny cizí klíče mají `ON DELETE CASCADE`, takže smazání uživatele nebo hydrantu za sebou uklidí.

### Session tabulka

`connect-pg-simple` (krok 3 v `main.md`) si ukládá session do vlastní tabulky `session`. Tu **nepiš do `schema.sql`** – knihovna si ji vytvoří sama, když jí předáš `createTableIfMissing: true`. Jen o ní věz, ať tě nepřekvapí v `\dt`.

---

## Jak to má fungovat – co který dotaz dělá

Tohle je mapa toho, co bude aplikace do databáze posílat. Nemusíš to psát teď, ale schéma musí všechny tyhle případy unést.

**Registrace** – nejdřív bcrypt hash, pak jeden `INSERT`:
```sql
INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id;
```
Nekontroluj předem `SELECT`em, jestli je username volný – mezi kontrolou a vložením se může vklínit jiný požadavek. Nech to spadnout na `UNIQUE` a odchyť chybu: Postgres vrátí kód `23505` a v `err.constraint` název (`users_username_key` / `users_email_key`), podle toho poznáš, které pole hlásit ve formuláři.

**Přihlášení** – vytáhni hash a porovnej ho v Node.js, nikdy neposílej heslo do SQL:
```sql
SELECT id, password_hash, is_admin FROM users WHERE username = $1;
```

**Upload hydrantu** – nejdřív ulož soubor, pak řádek. `lat`/`lng`/`title`/`city` můžou být `NULL`.
```sql
INSERT INTO hydrants (user_id, title, photo_path, city, lat, lng)
VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
```

**Výpis na hlavní stránce** – potřebuješ jméno autora a počet lajků:
```sql
SELECT h.id, h.title, h.photo_path, h.city, h.created_at,
       u.username,
       COUNT(l.id) AS likes
FROM hydrants h
JOIN users u ON u.id = h.user_id
LEFT JOIN likes l ON l.hydrant_id = h.id
GROUP BY h.id, u.username
ORDER BY h.created_at DESC;
```
`JOIN` na `users` je obyčejný, protože autor existuje vždycky. `LEFT JOIN` na `likes` musí být „left", jinak by ti z výpisu vypadly hydranty s nula lajky.

**Lajk** – dvojitý klik neřeš v kódu, vyřeší ho databáze:
```sql
INSERT INTO likes (user_id, hydrant_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;
-- odlajkování:
DELETE FROM likes WHERE user_id = $1 AND hydrant_id = $2;
```

**Mapa** (`GET /api/hydrants`) – jen ty, co mají souřadnice:
```sql
SELECT id, title, photo_path, lat, lng FROM hydrants WHERE lat IS NOT NULL AND lng IS NOT NULL;
```

**Leaderboard** – `GROUP BY` + `ORDER BY` přes spočítaný sloupec:
```sql
SELECT u.username, COUNT(h.id) AS pocet
FROM users u LEFT JOIN hydrants h ON h.user_id = u.id
GROUP BY u.id ORDER BY pocet DESC LIMIT 10;
```

---

## Kroky

### 1. Rozběhnout Postgres
- [ ] `sudo dnf install postgresql-server postgresql`
- [ ] `sudo postgresql-setup --initdb`
- [ ] `sudo systemctl enable --now postgresql`
- [ ] `pg_isready` vrátí „accepting connections"
- [ ] Založit databázového uživatele a databázi:
      `sudo -u postgres createuser --interactive --pwprompt jonas`
      `sudo -u postgres createdb -O jonas miluj_svuj_hydrant`
- [ ] Zkontrolovat, že `DATABASE_URL` v `.env` odpovídá tomu, co jsi právě založil

### 2. Napsat `db/schema.sql`
- [ ] Na začátek `DROP TABLE IF EXISTS comments, likes, hydrants, users CASCADE;`
      (aby šel soubor pouštět opakovaně – **maže to data**, před nasazením pryč)
- [ ] Čtyři `CREATE TABLE` v pořadí `users` → `hydrants` → `likes` → `comments`
      (cizí klíč nemůže odkazovat na tabulku, která ještě neexistuje)
- [ ] Indexy na cizí klíče až na konec souboru:
      `CREATE INDEX ON hydrants (user_id);`
      `CREATE INDEX ON likes (hydrant_id);`
      `CREATE INDEX ON comments (hydrant_id);`
- [ ] Zvážit přejmenování sloupce `comments.text` na `body` – `text` je zároveň název typu

### 3. Nahrát a ověřit
- [ ] `psql -d miluj_svuj_hydrant -f db/schema.sql` proběhne bez chyby
- [ ] `\dt` ukáže čtyři tabulky
- [ ] `\d hydrants` ukáže cizí klíče a `DEFAULT nextval(...)` u `id`
- [ ] Ručně vyzkoušet, že constrainty drží: duplicitní username spadne,
      `user_id = 999` spadne, `DELETE FROM users` smaže i hydranty

### 4. Ověřit spojení z aplikace
- [ ] Dočasně v `server.js`: `const { rows } = await pool.query('SELECT now()')` a vypsat do konzole
- [ ] `npm run dev` nastartuje a nespadne na „ECONNREFUSED" ani „password authentication failed"
- [ ] Ten dočasný dotaz zase smazat

### 5. Testovací data
- [ ] `db/seed.sql` s pár uživateli a hydranty, ať je na čem vyvíjet výpisy a mapu
- [ ] Heslo v seedu musí být **bcrypt hash**, ne plaintext – jinak se tím účtem nepřihlásíš

---

## Pravidla, kterých se držet

- **Nikdy neskládej SQL ze stringů.** Vždycky `pool.query('... WHERE id = $1', [id])`. Zřetězení (`'WHERE id = ' + id`) je SQL injection a `pg` parametry umí, takže není důvod.
- **Nepiš `client.connect()` u každého dotazu.** `pool.query()` si spojení půjčí a zase vrátí. Vlastního klienta (`pool.connect()`) potřebuješ jen na transakci – a nezapomenout `client.release()` v `finally`.
- **Pool nezavírej** při každém požadavku. Žije po celou dobu běhu serveru, `src/db.js` je správně tak, jak je.
- **Čas ať doplňuje databáze** (`DEFAULT now()`), ne Node.js.
- **Do databáze nikdy nejde heslo**, jen bcrypt hash. A hash se nikdy nevypisuje do šablony ani do logu.
- **`NULL` není prázdný řetězec.** Prázdné nepovinné pole z formuláře přijde jako `''` – převeď ho na `null`, jinak budeš mít v `city` prázdné stringy místo „nevyplněno".
- **Schéma se po nasazení mění přes `ALTER TABLE`**, ne přepsáním `schema.sql` a `DROP`em. Až budeš mít reálná data, `DROP TABLE` je konec.

---

## Hotovo, když

`npm run dev` naběhne, aplikace se připojí k databázi, `\dt` ukazuje čtyři tabulky se správnými cizími klíči a v nich sedí testovací data. Teprve pak má smysl pouštět se do kroku 3 v `main.md` (registrace a přihlášení).
