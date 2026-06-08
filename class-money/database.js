const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./class_money.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS payments ( id INTEGER PRIMARY KEY AUTOINCREMENT, studentNo INTEGER, type TEXT, slipLink TEXT, dateSent DATETIME, amount REAL )`);
    db.run(`CREATE TABLE IF NOT EXISTS ledger ( id INTEGER PRIMARY KEY AUTOINCREMENT, date DATETIME, description TEXT, type TEXT, amount REAL )`);
    
    // ตารางใหม่สำหรับเก็บยอดเฉพาะกิจ
    db.run(`CREATE TABLE IF NOT EXISTS special_targets ( id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, totalAmount REAL, perPerson REAL )`);
});

module.exports = db;