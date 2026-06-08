const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const db = require('./database');

app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

app.get('/api', (req, res) => {
    if (req.query.action === 'getDashboardData') {
        db.all("SELECT * FROM payments ORDER BY dateSent ASC", [], (err, payRows) => {
            db.all("SELECT * FROM ledger ORDER BY date ASC", [], (err, ledRows) => {
                db.all("SELECT * FROM special_targets", [], (err, spRows) => {
                    res.json({ payments: payRows, ledger: ledRows, specialTargets: spRows });
                });
            });
        });
    }
});

app.post('/api', (req, res) => {
    const data = req.body;

    if (data.action === "savePayment") {
        let slipPath = "-";
        if (data.fileData && data.fileData !== "-") {
            try {
                const base64Data = data.fileData.replace(/^data:image\/\w+;base64,/, "");
                const dateStr = new Date().toLocaleDateString("th-TH").replace(/\//g, '-');
                const fileName = `${dateStr}_No${data.studentNo}_${Date.now()}.png`;
                const uploadDir = path.join(__dirname, 'public', 'slips');
                if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }
                fs.writeFileSync(path.join(uploadDir, fileName), base64Data, 'base64');
                slipPath = `/slips/${fileName}`;
            } catch(e) { console.error("Error saving image:", e); }
        }

        db.run("INSERT INTO payments (studentNo, type, slipLink, dateSent, amount) VALUES (?, ?, ?, datetime('now', 'localtime'), ?)",
            [data.studentNo, data.type, slipPath, data.amount],
            function(err) {
                if(err) return res.json({ status: "error", message: err.message });
                const newPaymentId = this.lastID; 
                const desc = `รับเงินจากเลขที่ ${data.studentNo} (${data.type})`;
                
                db.run("INSERT INTO ledger (date, description, type, amount) VALUES (datetime('now', 'localtime'), ?, 'เงินห้อง', ?)", 
                    [desc, data.amount], 
                    function() { res.json({ status: "success", message: "บันทึกยอดเงินเข้าระบบเรียบร้อย!", paymentId: newPaymentId }); }
                );
            }
        );
    }
    else if (data.action === "undoPayment") {
        // แก้บั๊ก CMD ดับตรงนี้! ใช้ Sub-query แทน ORDER BY LIMIT โดยตรง
        db.get("SELECT * FROM payments WHERE id = ?", [data.paymentId], (err, row) => {
            if (row) {
                db.run("DELETE FROM payments WHERE id = ?", [data.paymentId]);
                const desc = `รับเงินจากเลขที่ ${row.studentNo} (${row.type})`;
                db.run(`DELETE FROM ledger WHERE id = (SELECT id FROM ledger WHERE description = ? AND amount = ? AND type = 'เงินห้อง' ORDER BY id DESC LIMIT 1)`, 
                    [desc, row.amount], 
                    function(err) { res.json({ status: "success", message: "ยกเลิกรายการล่าสุด และดึงยอดเงินกลับเรียบร้อย!" }); }
                );
            } else { res.json({ status: "error", message: "ไม่พบรายการนี้ หรือถูกยกเลิกไปแล้ว" }); }
        });
    }
    else if (data.action === "addSpecialTarget") {
        // หาร 30 และปัดเศษขึ้นด้วย Math.ceil
        const perPerson = Math.ceil(data.totalAmount / 30);
        db.run("INSERT INTO special_targets (title, totalAmount, perPerson) VALUES (?, ?, ?)",
            [data.title, data.totalAmount, perPerson],
            function(err) { res.json({ status: "success", message: "สร้างยอดเป้าหมายเฉพาะกิจเรียบร้อยแล้ว!" }); }
        );
    }
    else if (data.action === "deleteSpecialTarget") {
        db.run("DELETE FROM special_targets WHERE id = ?", [data.id], function() { res.json({ status: "success" }); });
    }
    else if (data.action === "saveDirectLedger") {
        db.run("INSERT INTO ledger (date, description, type, amount) VALUES (datetime('now', 'localtime'), ?, ?, ?)",
            [data.description, data.type, data.amount],
            function() { res.json({ status: "success" }); }
        );
    }
    else if (data.action === "deleteLedgerEntry") {
        db.run("DELETE FROM ledger WHERE id = ?", [data.id], function() { res.json({ status: "success" }); });
    }
});

app.listen(3000, () => console.log('✅ ระบบทำงานสมบูรณ์แล้วที่ http://localhost:3000'));