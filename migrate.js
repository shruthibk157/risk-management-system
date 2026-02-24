const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "risk_management.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS risks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER,
      risk_description TEXT,
      failure_mode TEXT,
      effects TEXT,
      severity INTEGER,
      causes TEXT,
      controls TEXT,
      occurrence INTEGER,
      detection INTEGER,
      rpn INTEGER,
      classification TEXT,
      recommended_action TEXT,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    )
  `);
});

db.close(() => {
  console.log("✅ Database migrated successfully");
});
