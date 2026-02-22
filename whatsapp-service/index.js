const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const QRCode = require('qrcode');
const pino = require('pino');

const app = express();
app.use(cors());
app.use(express.json());

const logger = pino({ level: 'warn' });

// Configuration
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8001';
const PORT = process.env.PORT || 3002;

// WhatsApp state
let sock = null;
let qrCodeData = null;
let connectionStatus = 'disconnected';
let connectedPhone = null;

// Initialize WhatsApp connection
async function initWhatsApp() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger,
            browser: ['NetworkOps', 'Chrome', '1.0.0'],
            connectTimeoutMs: 60000,
            qrTimeout: 60000
        });

        // Connection update handler
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                qrCodeData = qr;
                connectionStatus = 'waiting_qr';
                console.log('QR Code generated - waiting for scan');
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                console.log('Connection closed:', lastDisconnect?.error?.message);
                connectionStatus = 'disconnected';
                qrCodeData = null;
                connectedPhone = null;

                if (shouldReconnect) {
                    console.log('Reconnecting in 5 seconds...');
                    setTimeout(initWhatsApp, 5000);
                }
            } else if (connection === 'open') {
                console.log('WhatsApp connected successfully!');
                connectionStatus = 'connected';
                qrCodeData = null;
                connectedPhone = sock.user?.id?.split(':')[0] || sock.user?.id;
            }
        });

        // Message handler
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type === 'notify') {
                for (const message of messages) {
                    if (!message.key.fromMe && message.message) {
                        await handleIncomingMessage(message);
                    }
                }
            }
        });

        // Save credentials on update
        sock.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error('WhatsApp initialization error:', error.message);
        connectionStatus = 'error';
        setTimeout(initWhatsApp, 10000);
    }
}

// Handle incoming WhatsApp messages
async function handleIncomingMessage(message) {
    try {
        const phoneNumber = message.key.remoteJid?.replace('@s.whatsapp.net', '') || '';
        const messageText = message.message?.conversation ||
                           message.message?.extendedTextMessage?.text || '';

        if (!messageText) return;

        console.log(`Received message from ${phoneNumber}: ${messageText.substring(0, 50)}...`);

        // Forward message to FastAPI
        try {
            const response = await axios.post(`${FASTAPI_URL}/api/whatsapp/incoming`, {
                phone_number: phoneNumber,
                message: messageText,
                message_id: message.key.id,
                timestamp: message.messageTimestamp
            }, { timeout: 10000 });

            // Send auto-reply if configured
            if (response.data?.reply) {
                await sendMessage(phoneNumber, response.data.reply);
            }
        } catch (apiError) {
            console.error('API error:', apiError.message);
        }

    } catch (error) {
        console.error('Error handling incoming message:', error.message);
    }
}

// Send WhatsApp message
async function sendMessage(phoneNumber, text) {
    try {
        if (!sock || connectionStatus !== 'connected') {
            throw new Error('WhatsApp not connected');
        }

        // Format phone number
        let jid = phoneNumber;
        if (!jid.includes('@')) {
            // Remove any non-digit characters except +
            jid = jid.replace(/[^\d]/g, '');
            // Remove leading zeros or country code issues
            if (jid.startsWith('0')) {
                jid = '90' + jid.substring(1); // Assume Turkey
            }
            jid = `${jid}@s.whatsapp.net`;
        }

        await sock.sendMessage(jid, { text });
        console.log(`Message sent to ${phoneNumber}`);
        return { success: true, message: 'Mesaj gönderildi' };

    } catch (error) {
        console.error('Send message error:', error.message);
        return { success: false, error: error.message };
    }
}

// REST API Endpoints

// Get QR code
app.get('/qr', async (req, res) => {
    try {
        if (!qrCodeData) {
            return res.json({ qr: null, status: connectionStatus });
        }

        // Generate QR code as base64 image
        const qrImage = await QRCode.toDataURL(qrCodeData);
        res.json({ qr: qrImage, qr_raw: qrCodeData, status: connectionStatus });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get connection status
app.get('/status', (req, res) => {
    res.json({
        connected: connectionStatus === 'connected',
        status: connectionStatus,
        phone: connectedPhone,
        timestamp: new Date().toISOString()
    });
});

// Send message
app.post('/send', async (req, res) => {
    const { phone_number, message } = req.body;

    if (!phone_number || !message) {
        return res.status(400).json({ success: false, error: 'phone_number ve message gerekli' });
    }

    const result = await sendMessage(phone_number, message);
    res.json(result);
});

// Send bulk messages
app.post('/send-bulk', async (req, res) => {
    const { messages } = req.body; // Array of { phone_number, message }

    if (!Array.isArray(messages)) {
        return res.status(400).json({ success: false, error: 'messages array gerekli' });
    }

    const results = [];
    for (const msg of messages) {
        const result = await sendMessage(msg.phone_number, msg.message);
        results.push({ phone_number: msg.phone_number, ...result });
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.json({ results });
});

// Disconnect WhatsApp
app.post('/disconnect', async (req, res) => {
    try {
        if (sock) {
            await sock.logout();
            connectionStatus = 'disconnected';
            qrCodeData = null;
            connectedPhone = null;
        }
        res.json({ success: true, message: 'Bağlantı kesildi' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reconnect WhatsApp
app.post('/reconnect', async (req, res) => {
    try {
        if (sock) {
            sock.end();
        }
        connectionStatus = 'connecting';
        setTimeout(initWhatsApp, 1000);
        res.json({ success: true, message: 'Yeniden bağlanılıyor...' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', whatsapp: connectionStatus });
});

// Start server
app.listen(PORT, () => {
    console.log(`WhatsApp service running on port ${PORT}`);
    console.log(`FastAPI URL: ${FASTAPI_URL}`);
    initWhatsApp();
});
