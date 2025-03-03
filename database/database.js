require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: "utf8mb4",
  connectionLimit: 20,
  waitForConnections: true,
  queueLimit: 0,
  connectTimeout: 10000, // Оставляем только этот тайм-аут
});

module.exports = pool;