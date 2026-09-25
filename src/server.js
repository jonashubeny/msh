const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

const hydrantsRouter = require('./routes/hydrants');
app.use('/', hydrantsRouter);

app.listen(PORT, () => {
    console.log(`Server bezi na http://localhost:${PORT}`);
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Chyba serveru');
});