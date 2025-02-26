require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,       // Например, "localhost"
  user: process.env.DB_USER,       // Ваш пользователь MySQL
  password: process.env.DB_PASSWORD, // Пароль от базы данных
  database: process.env.DB_NAME,   // Название вашей базы данных
  charset: "utf8mb4",              // Указываем кодировку
});

module.exports = pool;

