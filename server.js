const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const pdf = require('pdf-parse');
const app = express();
app.use(bodyParser.json());


const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; 
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Webhook endpoint to handle POST requests from Telegram
app.post('/webhook', async (req, res) => {
    try {
        const update = req.body;
        if (update.message && update.message.document) {
            const chatId = update.message.chat.id;
            const fileId = update.message.document.file_id;
            console.log('File received:', update.message.document);

            // Get file path from Telegram
            const fileResponse = await axios.get(
                `${TELEGRAM_API}/getFile?file_id=${fileId}`
            );
            const filePath = fileResponse.data.result.file_path;
            const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

            // Parse the PDF
            const parsedData = await parsePDF(fileUrl);
            console.log('Parsed PDF data:', parsedData);

            // Send to Grok (placeholder)
            const grokResponse = await sendToGrok(parsedData);
            console.log('Grok response:', grokResponse);

            // Send response back to Telegram
            await axios.post(`${TELEGRAM_API}/sendMessage`, {
                chat_id: chatId,
                text: grokResponse
            });
        }
        res.sendStatus(200); // Acknowledge the webhook
    } catch (error) {
        console.error('Error processing update:', error);
        res.sendStatus(200); // Send 200 to avoid Telegram retries
    }
});

// Function to parse PDF
async function parsePDF(fileUrl) {
    try {
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        const data = await pdf(buffer);
        return data.text; // Extracted text from the PDF
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error('Failed to parse PDF');
    }
}

// Placeholder function to send data to Grok
async function sendToGrok(parsedData) {
    try {
        // Simulate Grok response; replace with xAI API call if available
        const response = `Response from Grok: I analyzed the PDF content: "${parsedData.substring(0, 100)}..." and here’s my summary: [Custom response based on content]`;
        return response;
    } catch (error) {
        console.error('Error with Grok:', error);
        throw new Error('Failed to get response from Grok');
    }
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});