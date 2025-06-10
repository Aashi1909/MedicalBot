const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const pdf = require('pdf-parse');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

// Route to set the Telegram webhook (run once)
app.get('/setWebhook', async (req, res) => {
    try {
        const response = await axios.get(
            `${TELEGRAM_API}/setWebhook?url=${WEBHOOK_URL}&secret_token=${process.env.WEBHOOK_SECRET}`
        );
        console.log('Webhook set:', response.data);
        res.json({ success: true, result: response.data });
    } catch (error) {
        console.error('Failed to set webhook:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, error: 'Failed to set webhook' });
    }
});

// Webhook endpoint to handle POST requests from Telegram
app.post('/webhook', async (req, res) => {
    try {
        if (req.headers['x-telegram-bot-api-secret-token'] !== process.env.WEBHOOK_SECRET) {
            return res.status(401).send('Invalid secret token');
        }

        const update = req.body;
        if (update.message && update.message.document) {
            const chatId = update.message.chat.id;
            const fileId = update.message.document.file_id;
            console.log('File received:', update.message.document);

            const fileResponse = await axios.get(
                `${TELEGRAM_API}/getFile?file_id=${fileId}`
            );
            const filePath = fileResponse.data.result.file_path;
            const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

            const parsedData = await parsePDF(fileUrl);
            console.log('Parsed PDF data:', parsedData);

            const grokResponse = await sendToGrok(parsedData);
            console.log('Grok response:', grokResponse);

            await axios.post(`${TELEGRAM_API}/sendMessage`, {
                chat_id: chatId,
                text: grokResponse
            });
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('Error processing update:', error);
        res.sendStatus(200);
    }
});

// Function to parse PDF
async function parsePDF(fileUrl) {
    try {
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        const data = await pdf(buffer);
        return data.text;
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error('Failed to parse PDF');
    }
}

// Function to send data to Grok for patient report summary
async function sendToGrok(parsedData) {
    try {
        const response = await axios.post('https://api.x.ai/v1/grok', {
            prompt: `Summarize the patient report from this text, focusing on key medical details such as diagnosis, treatment, and vital signs: ${parsedData}`,
            model: 'grok-3',
            max_tokens: 500 // Reduced for concise summary
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].text; // Adjust based on actual API response
    } catch (error) {
        console.error('Error with Grok API:', error.response ? error.response.data : error.message);
        throw new Error('Failed to get response from Grok');
    }
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});