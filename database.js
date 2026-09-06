const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Create data folder if it doesn't exist
const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Database file
const DB_PATH = path.join(DATA_DIR, "nexel.db");

const db = new Database(DB_PATH);

// Improve reliability when multiple admins use Nexel
db.pragma("journal_mode = WAL");

// Create transaction history table
db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        receipt_no TEXT NOT NULL UNIQUE,

        payer_name TEXT,
        payer_telebirr_no TEXT,

        credited_party_name TEXT,
        credited_party_acc_no TEXT,

        transaction_status TEXT,

        settled_amount REAL,
        service_fee REAL,
        service_fee_vat REAL,
        total_fee REAL,
        total_amount REAL,

        payment_mode TEXT,
        payment_reason TEXT,
        payment_channel TEXT,

        verified_by TEXT NOT NULL,
        verified_at TEXT NOT NULL,

        status TEXT NOT NULL DEFAULT 'VERIFIED'
    )
`);

console.log("==========================================");
console.log("       NEXEL DATABASE INITIALIZED");
console.log("==========================================");
console.log(`Database: ${DB_PATH}`);
console.log("Transaction table: READY");
console.log("Duplicate protection: ENABLED");
console.log("==========================================");

module.exports = db;