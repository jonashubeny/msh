const express = require('express');
const pool = require('../db.js');

const router = express.Router();

router.get('/', async (req, res) => {
    result = await pool.query ('SELECT * FROM hydrants');
    res.json(result.rows);
});

module.exports = router;