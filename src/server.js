const express = require('express');
const path = require('path');

const app = express();
app.set('view engine', 'ejs');
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index', { title: 'Domovská stránka' });
});

app.listen(PORT, () => {
    console.log(`Server bezi na http://localhost:${PORT}`);
});

app.set('views', path.join(__dirname, 'views'));