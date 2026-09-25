const express = require('express');
const pool = require('../db.js');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM hydrants');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Chyba serveru');
    }
});

module.exports = router;