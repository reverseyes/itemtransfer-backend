const express = require('express');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON reading configurations with a 10MB limit for massive item text loads
app.use(express.json({ limit: '10mb' }));

// Our fast temporary in-memory database map: Claim ID -> Transport Data Object
const cloudStorage = new Map();

// --- 1. UPLOAD ENDPOINT (/api/upload) ---
app.post('/api/upload', (req, res) => {
    const { uploader, whitelist, itemData } = req.body;

    if (!uploader || !itemData) {
        return res.status(400).json({ error: "Missing required data fields." });
    }

    // Generate a secure, 6-character random text string ID (e.g., A4B9C2)
    const claimId = crypto.randomBytes(3).toString('hex').toUpperCase();

    // Establish the 24-hour expiration rule timeline (in milliseconds)
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000);

    // Save everything cleanly inside our live cloud map
    cloudStorage.set(claimId, {
        uploader,
        // Convert comma-separated string to an array, trim extra spaces, and lowercase it
        whitelist: whitelist ? whitelist.toLowerCase().split(',').map(name => name.trim()) : [],
        itemData,
        expiresAt
    });

    console.log(`[Cloud Save] Package ${claimId} successfully secured from ${uploader}.`);
    
    // Return the unique claim ID back to your NeoForge mod chat!
    res.json({ id: claimId });
});

// --- 2. CLAIM ENDPOINT (/api/claim) ---
app.post('/api/claim', (req, res) => {
    const { id, claimer } = req.body;

    if (!id || !claimer) {
        return res.status(400).json({ error: "Missing claim ID or username." });
    }

    const record = cloudStorage.get(id.toUpperCase());

    // Security Check 1: Does the package exist?
    if (!record) {
        return res.status(404).json({ error: "Invalid or expired ID." });
    }

    // Security Check 2: Has the 24-hour game time limit run out?
    if (Date.now() > record.expiresAt) {
        cloudStorage.delete(id.toUpperCase());
        return res.status(410).json({ error: "This package has expired." });
    }

    // --- ANTI-NUISANCE STREAM SNIPING SECURITY BLOCK ---
    const lowerClaimer = claimer.toLowerCase();
    const isUploader = record.uploader.toLowerCase() === lowerClaimer;
    const isWhitelisted = record.whitelist.includes(lowerClaimer);

    if (!isUploader && !isWhitelisted) {
        console.warn(`[Security Guard] ${claimer} tried to intercept package ${id} without permission! Access Denied.`);
        return res.status(403).json({ error: "You are not authorized to claim this box!" });
    }

    // Identity verified! Extract the item text string payload
    const payload = record.itemData;

    // CRUCIAL ANTI-DUPE ACTION: Instantly erase it from the cloud memory so it can never be claimed again
    cloudStorage.delete(id.toUpperCase());

    console.log(`[Cloud Claim] Package ${id} successfully delivered to ${claimer}. Erased from cloud storage.`);
    res.json({ itemData: payload });
});

// Automated Cleaner: Sweeps through the database map every 60 seconds to delete abandoned records
setInterval(() => {
    const now = Date.now();
    for (const [id, data] of cloudStorage.entries()) {
        if (now > data.expiresAt) {
            cloudStorage.delete(id);
            console.log(`[Automated Cleaner] Erased expired box: ${id}`);
        }
    }
}, 60000);

app.listen(PORT, () => {
    console.log(`ItemTransfer Backend Web Service running smoothly on port ${PORT}`);
});
