const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));

// Initialize DB if not exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
        partyA: null, // { signature: "base64...", date: "..." }
        partyB: null,
        createdDate: new Date().toISOString()
    }, null, 2));
}

// Get status
app.get('/api/status', (req, res) => {
    try {
        if (!fs.existsSync(DB_FILE)) {
             res.json({ partyA: null, partyB: null });
             return;
        }
        const data = JSON.parse(fs.readFileSync(DB_FILE));
        res.json(data);
    } catch (err) {
        console.error("Error reading DB:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Sign
app.post('/api/sign', (req, res) => {
    try {
        const { role, signature, date } = req.body; // role: 'partyA' or 'partyB'
        if (!['partyA', 'partyB'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        
        let data = { partyA: null, partyB: null };
        if (fs.existsSync(DB_FILE)) {
            data = JSON.parse(fs.readFileSync(DB_FILE));
        }

        data[role] = { signature, date };
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        
        res.json({ success: true, data });
    } catch (err) {
        console.error("Error writing DB:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
