const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../risk_management.db');
const db = new sqlite3.Database(dbPath);

async function fixSequences() {
    console.log('--- Starting Risk Sequence Correction (SQLite) ---');

    db.serialize(() => {
        // Get all unique department IDs
        db.all('SELECT DISTINCT department_id FROM risks', [], (err, depts) => {
            if (err) {
                console.error('Error fetching departments:', err);
                return;
            }

            console.log(`Found ${depts.length} departments with risks.`);

            depts.forEach(dept => {
                const deptId = dept.department_id;
                console.log(`\nProcessing Department ID: ${deptId}`);

                db.all('SELECT id, sl_no, risk_description FROM risks WHERE department_id = ? ORDER BY created_at ASC, id ASC', [deptId], (err, risks) => {
                    if (err) {
                        console.error(`Error fetching risks for dept ${deptId}:`, err);
                        return;
                    }

                    console.log(`Found ${risks.length} risks in department.`);

                    risks.forEach((risk, index) => {
                        const newSlNo = index + 1;
                        if (risk.sl_no !== newSlNo) {
                            console.log(`  Updating Risk ID ${risk.id}: SL No ${risk.sl_no} -> ${newSlNo}`);
                            db.run('UPDATE risks SET sl_no = ? WHERE id = ?', [newSlNo, risk.id]);
                        } else {
                            console.log(`  Risk ID ${risk.id} already correct (${newSlNo})`);
                        }
                    });
                });
            });
        });
    });
}

fixSequences();
// Wait a bit then close
setTimeout(() => {
    db.close();
    console.log('\n--- Sequence Correction Completed ---');
}, 3000);
