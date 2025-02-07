const pg = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const db = new pg.Client({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: process.env.PORT
});

db.connect().then(() => {
    console.log("📚 Connected to PostgreSQL Database");
}).catch((err) => {
    console.error("❌ Database connection error:", err.message);
});

module.exports = db;