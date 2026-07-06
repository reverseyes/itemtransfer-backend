const express = require('express');
const app = express();
// Render automatically provides a PORT environment variable, otherwise defaults to 3000 locally
const PORT = process.env.PORT || 3000;

// This allows the server to accept raw text strings (Base64) up to 10 Megabytes in size
app.use(express.text({ limit: '10mb' }));

// A temporary, secure map in the server's memory to link TransferID -> ItemData
const vault = new Map();

// 📥 1. EXPORT ENDPOINT: Handles saving the Shulker box data
app.post('/export/:id', (req, res) => {
    const id = req.params.id;
    const base64Data = req.body;

    if (!base64Data) {
        return res.status(400).send('No item data provided');
    }

    // Save the data to memory
    vault.set(id, base64Data);
    console.log(`[ItemTransfer] Securely saved Shulker data under ID: ${id}`);
    res.status(200).send('Successfully stored in vault');
});

// 📤 2. IMPORT ENDPOINT: Handles retrieving the Shulker box data
app.get('/import/:id', (req, res) => {
    const id = req.params.id;

    // Check if the 5-character ID actually exists in our memory
    if (!vault.has(id)) {
        return res.status(404).send('Invalid, expired, or already used Transfer ID');
    }

    // Grab the stored item string
    const data = vault.get(id);
    
    // CRITICAL: Immediately delete it from memory after one single fetch.
    // This blocks players from using the same code over and over to duplicate stacks of diamond blocks!
    vault.delete(id); 
    console.log(`[ItemTransfer] Retrieved and wiped code from memory: ${id}`);
    
    res.status(200).send(data);
});

// Start listening for incoming connections from your Minecraft servers
app.listen(PORT, () => {
    console.log(`[ItemTransfer] Cloud Vault Backend online and listening on port ${PORT}`);
});
