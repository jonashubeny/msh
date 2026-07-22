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
│   └── schema.sql        # návrh databázových tabulek
├── src/
│   ├── server.js         # vstupní bod aplikace
│   ├── routes/           # Express routy
│   ├── views/            # šablony stránek
│   ├── public/            # statické soubory (CSS, JS)
│   │   ├── css/
│   │   └── js/
│   └── uploads/          # nahrané fotky (mimo git)
├── .env.example
├── package.json
└── README.md
```

## Spuštění (vývoj)

```bash
npm install
cp .env.example .env   # a uprav hodnoty podle potřeby
npm run dev
```

Aplikace poběží na `http://localhost:3000`.

## Nasazení

Plánováno nasazení na domácí server přes Docker.
