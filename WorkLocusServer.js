const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const selfsigned = require('selfsigned');
const multer = require('multer');

const app = express();
const PORT = 5007; 

// Ensure persistence when running as Windows Service
const physicalDir = __dirname;
const DATA_DIR = path.join(physicalDir, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
const TEMP_DIR = path.join(physicalDir, 'temp_uploads');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}
const DB_FILE = path.join(DATA_DIR, 'database.sqlite');
const upload = multer({ dest: TEMP_DIR });

app.use(cors());
app.use(express.json());
app.use(express.static(physicalDir));

function initDB() {
    try {
        const DB_BACKUP_DIR = path.join(physicalDir, 'backups');
        if (!fs.existsSync(DB_BACKUP_DIR)) { fs.mkdirSync(DB_BACKUP_DIR); }
        const todayFile = `database_backup_${new Date().toISOString().split('T')[0]}.sqlite`;
        const backupPath = path.join(DB_BACKUP_DIR, todayFile);
        if (fs.existsSync(DB_FILE) && !fs.existsSync(backupPath)) {
            fs.copyFileSync(DB_FILE, backupPath);
            console.log('[BACKUP] Daily database backup created: ' + todayFile);
        }
    } catch (e) {
        console.error('[BACKUP ERROR] ' + e.message);
    }

    const db = new sqlite3.Database(DB_FILE);
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS Items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            Barcode TEXT UNIQUE,
            Name TEXT,
            NameEn TEXT,
            Description TEXT,
            Category TEXT,
            CategoryEn TEXT,
            TotalQuantity INTEGER DEFAULT 0,
            BorrowedQuantity INTEGER DEFAULT 0,
            BrokenQuantity INTEGER DEFAULT 0,
            LocationID INTEGER,
            PriceVND INTEGER DEFAULT 0,
            LastUpdated TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(LocationID) REFERENCES Locations(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS Locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ShelfLabel TEXT UNIQUE,
            ShelfLabelEn TEXT,
            RoomNumber TEXT
        )`);

        // Database Migration: Add Tester columns to Items if missing
        const alterTableQueries = [
            "ALTER TABLE Items ADD COLUMN TesterName TEXT",
            "ALTER TABLE Items ADD COLUMN TesterID TEXT",
            "ALTER TABLE Items ADD COLUMN CustomTesterName TEXT"
        ];

        alterTableQueries.forEach(query => {
            db.run(query, (err) => {
                // Ignore error if column already exists
                if (err && !err.message.includes("duplicate column name")) {
                    console.error("[DB MIGRATION ERROR]", err.message);
                }
            });
        });

        db.run(`CREATE TABLE IF NOT EXISTS Transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            part_id INTEGER,
            user_name TEXT,
            action TEXT,
            timestamp TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS AppUsers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            role TEXT,
            pass_code TEXT
        )`);

        db.get("SELECT COUNT(*) as count FROM AppUsers", (err, row) => {
            if (row && row.count === 0) {
                const stmt = db.prepare("INSERT INTO AppUsers (id, username, role, pass_code) VALUES (?, ?, ?, ?)");
                const initialUsers = [[1, 'An', 'Admin', 'equilibr@2026'], [2, 'Binh', 'User', 'equilibr@2026']];
                initialUsers.forEach(u => stmt.run(u));
                stmt.finalize();
            }
        });
    });
    return db;
}

let db = initDB();

const queryAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

app.get('/api/items', async (req, res) => {
    try { const rows = await queryAll('SELECT * FROM Items'); res.json({ data: rows }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/items', (req, res) => {
    const item = req.body;
    db.run(
        `INSERT INTO Items (Barcode, Name, NameEn, Description, Category, CategoryEn, TotalQuantity, BorrowedQuantity, BrokenQuantity, LocationID, PriceVND, LastUpdated, TesterName, TesterID, CustomTesterName) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)`,
        [item.Barcode, item.Name, item.NameEn, item.Description, item.Category, item.CategoryEn, item.TotalQuantity, item.BorrowedQuantity || 0, item.BrokenQuantity || 0, item.LocationID, item.PriceVND || 0, item.TesterName || null, item.TesterID || null, item.CustomTesterName || null],
        function (err) {
            if (err) { res.status(500).json({ error: err.message }); return; }
            db.get('SELECT * FROM Items WHERE id = ?', [this.lastID], (fetchErr, row) => {
                if (fetchErr) res.status(500).json({ error: fetchErr.message });
                else res.status(201).json({ data: row, message: 'Item created successfully' });
            });
        }
    );
});

app.put('/api/items/:id', (req, res) => {
    const itemId = req.params.id;
    const item = req.body;
    db.get('SELECT * FROM Items WHERE id = ?', [itemId], (fetchErr, row) => {
        if (fetchErr || !row) {
            console.error(`[API] Item not found: ${itemId}`);
            return res.status(404).json({ error: 'Item not found' });
        }
        const merged = { ...row, ...item };
        console.log(`[API] Updating item ${itemId}: BorrowedQuantity=${merged.BorrowedQuantity}`);
        db.run(
            `UPDATE Items SET Barcode=?, Name=?, NameEn=?, Description=?, Category=?, CategoryEn=?, TotalQuantity=?, BorrowedQuantity=?, BrokenQuantity=?, LocationID=?, PriceVND=?, LastUpdated=CURRENT_TIMESTAMP, TesterName=?, TesterID=?, CustomTesterName=? WHERE id=?`,
            [merged.Barcode, merged.Name, merged.NameEn, merged.Description, merged.Category, merged.CategoryEn, merged.TotalQuantity, merged.BorrowedQuantity || 0, merged.BrokenQuantity || 0, merged.LocationID, merged.PriceVND || 0, merged.TesterName || null, merged.TesterID || null, merged.CustomTesterName || null, itemId],
            (err) => {
                if (err) {
                    console.error(`[API] Update failed for item ${itemId}:`, err.message);
                    res.status(500).json({ error: err.message });
                } else {
                    db.get('SELECT * FROM Items WHERE id = ?', [itemId], (fErr, updated) => res.json({ data: updated }));
                }
            }
        );
    });
});

app.delete('/api/items/:id', (req, res) => {
    db.run('DELETE FROM Items WHERE id = ?', [req.params.id], (err) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ message: 'Deleted' });
    });
});

app.get('/api/locations', async (req, res) => {
    try { const rows = await queryAll('SELECT * FROM Locations'); res.json({ data: rows }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/locations', async (req, res) => {
    const { ShelfLabel, ShelfLabelEn, RoomNumber } = req.body;
    try {
        const result = await runQuery(
            'INSERT INTO Locations (ShelfLabel, ShelfLabelEn, RoomNumber) VALUES (?, ?, ?)',
            [ShelfLabel, ShelfLabelEn || ShelfLabel, RoomNumber || '']
        );
        res.json({ data: { id: result.lastID, ShelfLabel, ShelfLabelEn: ShelfLabelEn || ShelfLabel, RoomNumber: RoomNumber || '' } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', async (req, res) => {
    try { const rows = await queryAll('SELECT * FROM AppUsers'); res.json({ data: rows }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', (req, res) => {
    const user = req.body;
    db.run('INSERT INTO AppUsers (username, role, pass_code) VALUES (?, ?, ?)', [user.username, user.role, user.pass_code], function (err) {
        if (err) res.status(500).json({ error: err.message });
        else res.status(201).json({ id: this.lastID });
    });
});

app.put('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    const user = req.body;
    db.run(
        'UPDATE AppUsers SET username=?, role=?, pass_code=? WHERE id=?',
        [user.username, user.role, user.pass_code, userId],
        function (err) {
            if (err) res.status(500).json({ error: err.message });
            else res.json({ message: 'User updated successfully' });
        }
    );
});

app.delete('/api/users/:id', (req, res) => {
    db.run('DELETE FROM AppUsers WHERE id = ?', [req.params.id], (err) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ message: 'User deleted successfully' });
    });
});

// Database Export/Import
app.get('/api/db/export', (req, res) => {
    console.log('[API] Exporting database...');
    const absPath = path.resolve(DB_FILE);
    if (fs.existsSync(absPath)) {
        const filename = `equilibr_Backup_${new Date().toISOString().split('T')[0]}.sqlite`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/x-sqlite3');
        const stream = fs.createReadStream(absPath);
        stream.on('error', (err) => {
            console.error('[API] Export stream error:', err);
            if (!res.headersSent) res.status(500).json({ error: 'Failed to stream database' });
        });
        stream.pipe(res);
    } else {
        res.status(404).json({ error: 'Database file not found' });
    }
});

app.post('/api/db/import', upload.single('database'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    console.log('[API] Importing database from:', req.file.path);
    const tempPath = req.file.path;
    const backupDir = path.join(physicalDir, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
    
    const preImportBackup = path.join(backupDir, `pre_import_backup_${Date.now()}.sqlite`);
    
    try {
        // Step 1: Backup current DB
        if (fs.existsSync(DB_FILE)) {
            fs.copyFileSync(DB_FILE, preImportBackup);
        }
        
        // Step 2: Close current connection
        db.close((err) => {
            if (err) throw err;
            
            // Step 3: Replace file
            fs.copyFileSync(tempPath, DB_FILE);
            fs.unlinkSync(tempPath);
            
            // Step 4: Re-open connection
            db = new sqlite3.Database(DB_FILE); // Update the let variable
            console.log('[API] Database replaced and re-opened.');
            res.json({ message: 'Database imported successfully. The app will reload.' });
            
            // Optional: Restart the process or just rely on the next request?
            // Since it's a persistent service, it's safer to just exit and let the service manager restart it 
            // OR ensure the 'db' variable is mutable.
        });
    } catch (e) {
        console.error('[API] Import failed:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/transactions', async (req, res) => {
    try { const rows = await queryAll('SELECT * FROM Transactions ORDER BY timestamp DESC'); res.json({ data: rows }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/transactions', (req, res) => {
    const tx = req.body;
    console.log(`[API] Logging transaction: ${tx.user_name} ${tx.action} item ${tx.part_id}`);
    db.run(
        'INSERT INTO Transactions (part_id, user_name, action, timestamp) VALUES (?, ?, ?, ?)',
        [tx.part_id, tx.user_name, tx.action, tx.timestamp || new Date().toISOString()],
        function (err) {
            if (err) {
                console.error('[API] Transaction log failed:', err.message);
                res.status(500).json({ error: err.message });
            } else {
                res.status(201).json({ id: this.lastID });
            }
        }
    );
});

app.post('/api/borrows/bulk', (req, res) => {
    const { cart, user_name, timestamp } = req.body;
    console.log(`[API] Processing bulk borrow for ${user_name}: ${cart.length} items`);
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        let errorOccurred = false;

        cart.forEach(item => {
            if (errorOccurred) return;
            
            // Update Item
            db.run(
                'UPDATE Items SET BorrowedQuantity = BorrowedQuantity + ? WHERE id = ?',
                [item.qty, item.id],
                (err) => { 
                    if (err) { errorOccurred = true; console.error(`[BULK] Update failed for ${item.id}:`, err.message); }
                }
            );

            // Log Transaction
            db.run(
                'INSERT INTO Transactions (part_id, user_name, action, timestamp) VALUES (?, ?, ?, ?)',
                [item.id, user_name, `BULK_BORROW (${item.qty})`, timestamp || new Date().toISOString()],
                (err) => {
                    if (err) { errorOccurred = true; console.error(`[BULK] Log failed for ${item.id}:`, err.message); }
                }
            );
        });

        db.run('COMMIT', (err) => {
            if (err || errorOccurred) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err ? err.message : 'Bulk borrow failed' });
            } else {
                res.json({ message: 'Bulk borrow processed successfully' });
            }
        });
    });
});

app.post('/api/returns/bulk', (req, res) => {
    const { cart, user_name, timestamp } = req.body;
    console.log(`[API] Processing bulk return for ${user_name}: ${cart.length} items`);

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        let errorOccurred = false;

        cart.forEach(item => {
            if (errorOccurred) return;

            db.run(
                'UPDATE Items SET BorrowedQuantity = BorrowedQuantity - ? WHERE id = ?',
                [item.qty, item.id],
                (err) => {
                    if (err) { errorOccurred = true; console.error(`[BULK] Update failed for ${item.id}:`, err.message); }
                }
            );

            db.run(
                'INSERT INTO Transactions (part_id, user_name, action, timestamp) VALUES (?, ?, ?, ?)',
                [item.id, user_name, `BULK_RETURN (${item.qty})`, timestamp || new Date().toISOString()],
                (err) => {
                    if (err) { errorOccurred = true; console.error(`[BULK] Log failed for ${item.id}:`, err.message); }
                }
            );
        });

        db.run('COMMIT', (err) => {
            if (err || errorOccurred) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err ? err.message : 'Bulk return failed' });
            } else {
                res.json({ message: 'Bulk return processed successfully' });
            }
        });
    });
});

app.post('/api/sync-stock', (req, res) => {
    console.log('[API] Recalculating all item stock from transactions...');
    db.all('SELECT * FROM Transactions', (err, transactions) => {
        if (err) return res.status(500).json({ error: err.message });

        const netHoldings = {}; // itemId -> totalBorrowed

        transactions.forEach(tx => {
            const itemId = tx.part_id;
            const rawAction = (tx.action || '').toUpperCase();
            let qty = 1;
            const qtyMatch = rawAction.match(/\((\d+)\)/);
            if (qtyMatch) qty = parseInt(qtyMatch[1]);

            if (!netHoldings[itemId]) netHoldings[itemId] = 0;

            if (rawAction.includes('BORROW')) {
                netHoldings[itemId] += qty;
            } else if (rawAction.includes('RETURN')) {
                netHoldings[itemId] -= qty;
            }
        });

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            // Update all items
            Object.keys(netHoldings).forEach(id => {
                const finalQty = Math.max(0, netHoldings[id]);
                db.run('UPDATE Items SET BorrowedQuantity = ? WHERE id = ?', [finalQty, id]);
            });

            // Reset items with 0 transactions
            const txItemIds = Object.keys(netHoldings).join(',');
            if (txItemIds) {
                db.run(`UPDATE Items SET BorrowedQuantity = 0 WHERE id NOT IN (${txItemIds})`);
            } else {
                db.run('UPDATE Items SET BorrowedQuantity = 0');
            }

            db.run('COMMIT', (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    res.status(500).json({ error: err.message });
                } else {
                    res.json({ message: 'Stock synchronized successfully with transactions.' });
                }
            });
        });
    });
});

const getLocalIp = () => {
    const interfaces = require('os').networkInterfaces();
    // Prioritize physical adapters (Wi-Fi, Ethernet) over virtual/internal ones
    const priority = ['Wi-Fi', 'Ethernet', 'Local Area Connection', 'en0', 'eth0', 'wlan0'];
    
    const sortedNames = Object.keys(interfaces).sort((a, b) => {
        const aIndex = priority.findIndex(p => a.toLowerCase().includes(p.toLowerCase()));
        const bIndex = priority.findIndex(p => b.toLowerCase().includes(p.toLowerCase()));
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return aIndex - bIndex;
    });

    for (const name of sortedNames) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                // Ignore APIPA addresses
                if (!iface.address.startsWith('169.254')) return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

// SSL Certificate Logic (Requirement: Smart IP Switching)
async function startSecureServer() {
    const certPath = path.join(physicalDir, 'cert.pem');
    const keyPath = path.join(physicalDir, 'key.pem');
    const currentIp = getLocalIp();
    let sslOptions = {};

    try {
        let regenerate = false;
        if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
            const certContent = fs.readFileSync(certPath, 'utf8');
            // Force regeneration if IP changed OR if we need to upgrade to SAN (mobile fix)
            // Force regeneration if IP changed OR if we need to upgrade to SAN/Usage flags (Brave fix)
            if (!certContent.includes(currentIp) || !certContent.includes('SAN_AND_USAGE_V1')) {
                console.log(`[SSL] IP change or SSL upgrade detected. Re-generating for ${currentIp}...`);
                regenerate = true;
            } else {
                console.log(`[SSL] Loading existing certificate for ${currentIp}...`);
                sslOptions = {
                    key: fs.readFileSync(keyPath),
                    cert: fs.readFileSync(certPath)
                };
            }
        } else {
            regenerate = true;
        }

        if (regenerate) {
            console.log(`[SSL] Generating fresh self-signed certs (with SAN & Usage) for IP: ${currentIp}...`);
            const attrs = [{ name: 'commonName', value: currentIp }];
            
            // Critical for Brave and Modern Chromium: SAN + KeyUsage + EKU
            const options = {
                days: 365,
                keySize: 2048,
                extensions: [
                    { name: 'basicConstraints', cA: false },
                    { 
                        name: 'keyUsage', 
                        digitalSignature: true, 
                        nonRepudiation: true, 
                        keyEncipherment: true, 
                        dataEncipherment: true 
                    },
                    { 
                        name: 'extKeyUsage', 
                        serverAuth: true, 
                        clientAuth: true 
                    },
                    {
                        name: 'subjectAltName',
                        altNames: [
                            { type: 7, ip: currentIp },
                            { type: 2, value: 'localhost' }
                        ]
                    }
                ]
            };

            const pems = await selfsigned.generate(attrs, options);
            
            // Add a marker so we know this cert has SAN and Usage enabled
            const certWithMarker = pems.cert + '\n# SAN_AND_USAGE_V1';
            
            fs.writeFileSync(certPath, certWithMarker);
            fs.writeFileSync(keyPath, pems.private);
            
            sslOptions = {
                key: pems.private,
                cert: pems.cert
            };
        }
    } catch (err) {
        console.error('[SSL ERROR] Failed to initialize SSL:', err.message);
        process.exit(1);
    }

    app.get('/api/ip', (req, res) => {
        res.json({ ip: getLocalIp() });
    });

    // Create HTTP Server on Port 5007 (Cloudflare handles the HTTPS encryption for us!)
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 equilibr Backend is running on http://${getLocalIp()}:${PORT}`);
        console.log(`📲 Mobile access (Scanner): https://equilibr2026.com\n`);
    });
}

startSecureServer();
