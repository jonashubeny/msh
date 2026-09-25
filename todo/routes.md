# TODO – Routy

Doplněk k `main.md`, rozepsaný jen na routy (krok 2 a všechno, co na něm stojí).
Stav ke dni 2026-09-22.

## Stav

- [x] `db/schema.sql` hotové, tabulky v databázi existují – routy mají odkud číst
- [x] `src/routes/hydrants.js` neexistuje, složka `routes/` je prázdná (jen `.gitkeep`)
- [ ] `src/server.js` má routu `GET /` napsanou přímo v sobě – přesunout do routeru
- [ ] `src/views/` má jen `index.ejs`, žádné partials

---

## Jak router funguje

`express.Router()` je „mini-server" – má `.get()`, `.post()`, `.use()` úplně stejně jako `app`,
jen neposlouchá na portu. Sestaví se stranou v souboru a do aplikace se zapojí jedním
`app.use()`. `server.js` pak obsahuje jen nastavení a seznam zapojených routerů.

Každý route soubor má stejnou kostru:

```js
const express = require('express');
const pool = require('../db');      // ../ protože db.js je o složku výš

const router = express.Router();    // 1) vyrobit

router.get('/neco', (req, res) => { /* ... */ });   // 2) navěsit routy

module.exports = router;            // 3) vyexportovat
```

A v `server.js`:

```js
const hydrantsRouter = require('./routes/hydrants');
app.use('/', hydrantsRouter);
```

`require('../db')` je v každém souboru v pořádku – Node modul načte jen jednou a vrací
tu samou instanci, takže `Pool` je pořád jeden sdílený. Nikdy si nedělej `new Pool()` znovu.

---

## Seznam všech rout

Co bude aplikace nakonec umět. Sloupec „krok" odkazuje na `main.md`.

### `src/routes/hydrants.js`

| metoda | cesta | co dělá | krok |
|---|---|---|---|
| GET | `/` | seznam hydrantů, `SELECT ... ORDER BY created_at DESC` | 2 |
| GET | `/hydrants/new` | formulář pro nahrání fotky (jen přihlášený) | 4 |
| POST | `/hydrants` | přijme upload, uloží soubor + řádek do DB, redirect na detail | 4 |
| GET | `/hydrants/:id` | detail jednoho hydrantu + jeho komentáře a počet lajků | 2 |
| POST | `/hydrants/:id/like` | lajk, v SQL `ON CONFLICT DO NOTHING`, redirect zpět | 6 |
| POST | `/hydrants/:id/comments` | přidá komentář, redirect zpět na detail | 6 |
| POST | `/hydrants/:id/delete` | smazání – jen vlastník nebo admin | 6 |

### `src/routes/auth.js` (krok 3)

| metoda | cesta | co dělá |
|---|---|---|
| GET | `/register` | zobrazí registrační formulář |
| POST | `/register` | `bcrypt.hash(password, 12)`, `INSERT INTO users`, přihlásí a redirect na `/` |
| GET | `/login` | zobrazí přihlašovací formulář |
| POST | `/login` | `bcrypt.compare()`, nastaví `req.session.userId`, redirect na `/` |
| POST | `/logout` | `req.session.destroy()`, redirect na `/` |

Logout je záměrně `POST`, ne `GET` – odkaz na odhlášení jinak může vyvolat prohlížeč
nebo náhled sám od sebe.

### `src/routes/api.js` (krok 5)

| metoda | cesta | co dělá |
|---|---|---|
| GET | `/api/hydrants` | `res.json()` se seznamem `id, title, photo_path, lat, lng`, kde `lat`/`lng` nejsou NULL |

Tuhle routu čte JavaScript mapy v prohlížeči, proto vrací `res.json()` a ne `res.render()`.

### `src/routes/leaderboard.js` (krok 6, až nakonec)

| metoda | cesta | co dělá |
|---|---|---|
| GET | `/zebricky` | dva `SELECT ... ORDER BY COUNT(*) DESC` – nejlajkovanější hydranty a nejaktivnější uživatelé |

---

## Co udělat teď (krok 2)

- [ ] Vytvořit `src/routes/hydrants.js` s `GET /` a `GET /hydrants/:id`
- [ ] Ze `server.js` smazat `app.get('/', ...)` a nahradit ho `app.use('/', hydrantsRouter)`
- [ ] Přidat šablonu `src/views/hydrant-detail.ejs` (zatím klidně jen vypsat data)
- [ ] Na konec `server.js` přidat chybový middleware (viz níže)
- [ ] Ověřit, že `npm run dev` pořád nastartuje a `/` se zobrazí

Zbytek rout přibývá postupně podle kroků – nepředělávat je dopředu naprázdno.

---

## Čtyři věci, na které se dá naletět

**1. Prefix se skládá.** Cesta v `app.use()` se spojí s cestou v `router.get()`.
`app.use('/', router)` + `router.get('/hydrants/:id')` = `/hydrants/:id`.
Kdyby bylo `app.use('/hydrants', router)`, uvnitř routeru stačí `router.get('/:id')`.
Obojí je správně, jen se prefix nesmí napsat dvakrát – jinak vyjde `/hydrants/hydrants/5`.

**2. Na pořadí rout záleží.** Express jde shora dolů a použije první, co sedí.
`/hydrants/:id` sedí i na `/hydrants/new` a `:id` by dostalo hodnotu `"new"`.
Konkrétní cesty proto patří **nad** ty s parametrem:

```js
router.get('/hydrants/new', ...);   // musí být první
router.get('/hydrants/:id', ...);   // až potom
```

**3. Chyba z `await` se sama neodchytí.** Když spadne SQL dotaz uvnitř `async` handleru,
Express 4 to nezachytí a požadavek se zasekne. V routách proto:

```js
router.get('/', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT ...');
        res.render('index', { title: 'Domovská stránka', hydrants: result.rows });
    } catch (err) {
        next(err);
    }
});
```

a na konec `server.js`, **až za všechny `app.use()` s routery**:

```js
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Chyba serveru');
});
```

**4. Parametry do SQL nikdy přes spojování řetězců.** Vždycky `$1`, `$2` a pole hodnot:

```js
pool.query('SELECT * FROM hydrants WHERE id = $1', [req.params.id]);   // správně
pool.query('SELECT * FROM hydrants WHERE id = ' + req.params.id);      // SQL injection
```

`req.params.id` přijde z URL jako text a může v něm být cokoliv.

---

## Co do route souboru patří a co ne

Do routy patří jen práce s HTTP: přečíst `req`, zavolat dotaz, vrátit `res.render()`,
`res.json()` nebo `res.redirect()`. Všechno ostatní má vlastní místo:

| kód | kam patří |
|---|---|
| připojení k databázi | `src/db.js` (už hotové) |
| kontrola přihlášení (`requireLogin`) | `src/middleware/auth.js` – krok 3 |
| nastavení multeru (limit, filtr typů, název souboru) | `src/middleware/upload.js` – krok 4 |
| HTML | `src/views/` |

Kdyby `hydrants.js` přerostl, dělí se podle oblasti (`likes.js`, `comments.js`), ne podle
velikosti souboru.

---

## POST formuláře potřebují jeden řádek navíc

Bez tohohle bude `req.body` v každém POSTu `undefined`. Do `server.js` nad routery:

```js
app.use(express.urlencoded({ extended: true }));
```

Platí pro klasické HTML formuláře. Upload souboru řeší multer zvlášť (krok 4).

---

## Redirect po POSTu

Každá POST routa má skončit `res.redirect(...)`, ne `res.render(...)`. Jinak po odeslání
formuláře zůstane v adresním řádku POST URL a obnovení stránky (F5) odešle formulář znovu –
druhý stejný komentář, druhý upload.

```js
res.redirect('/hydrants/' + hydrantId);
```
