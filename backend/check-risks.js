const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const dbPath = path.join(__dirname, 'risk_management.db');
const db = new sqlite3.Database(dbPath);

const query = `
  SELECT r.id, r.sl_no, r.department_id, d.name as department_name, r.status, r.risk_description 
  FROM risks r 
  LEFT JOIN departments d ON r.department_id = d.id
`;

db.all(query, (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    fs.writeFileSync('risks_data.json', JSON.stringify(rows, null, 2));
    console.log('Data written to risks_data.json');
    db.close();
});
