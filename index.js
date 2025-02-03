const express = require("express");
const app = express();
const PORT = 3000;
const axios = require("axios");
const pg = require("pg");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
dotenv.config();

const db = new pg.Client({
    "user": process.env.USER,
    "host": process.env.HOST,
    "database": process.env.DATABASE,
    "password": process.env.PASSWORD,
    "port": process.env.PORT
});

db.connect();








app.listen(PORT, () => {
    console.log(`Server listening on port http://localhost:${PORT}`);
})