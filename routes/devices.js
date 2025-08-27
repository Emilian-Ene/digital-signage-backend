// routes/devices.js

const express = require('express');
const router = express.Router();
const Player = require('../models/Player');

// Helper function to build the final JSON for the player
const buildPlaylistForPlayer = (content) => {
    if (content.mediaType) { 
        return {
            items: [{
                type: content.mediaType,
                url: `${process.env.BASE_URL}${content.fileUrl}`,
                duration: content.mediaType === 'video' ? 0 : content.duration,
            }]
        };
    }
    return {
        items: content.items.map(item => ({
            type: item.media.mediaType,
            url: `${process.env.BASE_URL}${item.media.fileUrl}`,
            duration: item.media.mediaType === 'video' ? 0 : item.duration,
        }))
    };
};

// --- The Single Endpoint for the Android App ---
router.post('/heartbeat', async (req, res) => {
    const { deviceId, pairingCode } = req.body;
    if (!deviceId) {
        return res.status(400).json({ message: 'deviceId is required' });
    }

    try {
        // --- FINAL, ROBUST LOGIC ---

        // Find the player first, regardless of the request type.
        let player = await Player.findOne({ deviceId: deviceId });

        // Case 1: The device is sending a pairing code (it thinks it's unpaired).
        if (pairingCode && pairingCode !== "") {
            
            // If the player doesn't exist at all, create it.
            if (!player) {
                player = new Player({
                    deviceId: deviceId,
                    pairingCode: pairingCode,
                    status: 'unpaired'
                });
                await player.save();
                return res.json({ status: 'unpaired', playlist: null });
            }

            // If the player EXISTS, check its current status.
            // If it's already paired ('Offline' or 'Online'), the pairing just happened.
            // Tell the app it's paired so it can stop sending the code.
            if (player.status === 'Offline' || player.status === 'Online') {
                return res.json({ status: 'paired_waiting', playlist: null });
            }

            // Otherwise, it's just a normal unpaired heartbeat. Update code and timestamp.
            player.pairingCode = pairingCode;
            player.lastHeartbeat = Date.now();
            await player.save();
            return res.json({ status: 'unpaired', playlist: null });
        }

        // Case 2: The device is NOT sending a pairing code (it thinks it's paired).
        
        // If the player doesn't exist (e.g., deleted from CMS), tell it to reset.
        if (!player) {
            return res.json({ status: 'unpaired', playlist: null });
        }
        
        // It's a normal heartbeat for a paired player. Update status and timestamp.
        player.lastHeartbeat = Date.now();
        player.status = 'Online';
        await player.save();
        
        // Populate and send content as before.
        await player.populate({
            path: 'assignedContent.contentId',
            populate: { path: 'items.media' }
        });

        if (player.assignedContent && player.assignedContent.contentId) {
            const playlistForPlayer = buildPlaylistForPlayer(player.assignedContent.contentId);
            return res.json({ status: 'playing', playlist: playlistForPlayer });
        } else {
            return res.json({ status: 'paired_waiting', playlist: null });
        }

    } catch (error) {
        console.error("Heartbeat Error:", error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;