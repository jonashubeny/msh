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

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM hydrants WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0){
        return res.status(404).send('Hydrant nenalezen');
    }

        res.json(result.rows[0]);
    } catch (err){
        console.error(err);
        res.status(500).send('Chyba serveru');
    }
});

module.exports = router;