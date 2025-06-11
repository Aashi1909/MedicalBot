const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const pdf = require('pdf-parse');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();  
app.use(express.json());


app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Ngrok working');
});
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
console.log(process.env.GEMINI_API_KEY, "GEMINI_API_KEY")


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// const WEBHOOK_URL = process.env.WEBHOOK_URL;

console.log(BOT_TOKEN, "BOTTOKEN")
console.log(TELEGRAM_API, "TELEGRAM_API")

// Route to set the Telegram webhook (run once)
app.get('/setWebhook', async (req, res) => {
    try {
        const params = req.query.url
        const response = await axios.get(
            `${TELEGRAM_API}/setWebhook?url=${params}`
        );
        console.log('Webhook set:', response.data);
        res.json({ success: true, result: response.data });
    } catch (error) {
  console.error('Failed to set webhook:', error.response?.data || error.message);
  res.status(500).json({
    success: false,
    error: error.response?.data || error.message
  });
}
});

// Webhook endpoint to handle POST requests from Telegram
// app.post('/webhook', async (req, res) => {
//             // if (req.headers['x-telegram-bot-api-secret-token'] !== WEBHOOK_SECRET) {
//         //     return res.status(401).send('Invalid secret token');
//         // }
//         res.sendStatus(200);

//         const update = req.body;
//         console.log("jhgfdfghjk", update)
//         if (update.message && update.message.document) {
//             const chatId = update.message.chat.id;
//             const fileId = update.message.document.file_id;
//             console.log('File received:', update.message.document);

//             const fileResponse = await axios.get(
//                 `${TELEGRAM_API}/getFile?file_id=${fileId}`
//             );
//             const filePath = fileResponse.data.result.file_path;
//             const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

//             const parsedData = await parsePDF(fileUrl);
//             console.log('Parsed PDF data:', parsedData);

//             const geminiResponse = await sendToGrok(parsedData);
//             console.log('Grok response:', geminiResponse);

//             await axios.post(`${TELEGRAM_API}/sendMessage`, {
//                 chat_id: chatId,
//                 text: geminiResponse
//             });
//         }
//         res.sendStatus(200);
    
// });

app.post('/webhook', async (req, res) => {
    try {
        console.log('Webhook received:', JSON.stringify(req.body, null, 2));

        // Respond immediately to Telegram
        res.sendStatus(200);

        const update = req.body;
        if (update.message && update.message.document) {
            const chatId = update.message.chat.id;
            const fileId = update.message.document.file_id;
            console.log('File received:', update.message.document);

            try {
                const fileResponse = await axios.get(
                    `${TELEGRAM_API}/getFile?file_id=${fileId}`
                );
                const filePath = fileResponse.data.result.file_path;
                const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;

                const parsedData = await parsePDF(fileUrl);
                console.log('Parsed PDF data:', parsedData.slice(0, 100) + '...');

                const geminiResponse = await sendToGemini(parsedData);
                console.log('Gemini response:', geminiResponse);

                await axios.post(`${TELEGRAM_API}/sendMessage`, {
                    chat_id: chatId,
                    text: geminiResponse || 'No summary available.'
                });
            } catch (error) {
                console.error('Error processing document:', error.message);
                await axios.post(`${TELEGRAM_API}/sendMessage`, {
                    chat_id: chatId,
                    text: 'Failed to process the PDF or generate summary. Please check the API configuration and try again.'
                });
            }
        } else {
            console.log('No document in update');
        }
    } catch (error) {
        console.error('Error in webhook:', error.stack);
        if (!res.headersSent) res.sendStatus(200);
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


// async function sendToGrok(parsedData) {
//     try {
//         console.log('Sending request to Grok API with data length:', parsedData.length);
//         const response = await axios.post(
//             'https://api.x.ai/v1/chat/completions',
//             {
//                 model: 'grok-3',
//                 messages: [
//                     {
//                         role: 'user',
//                         content: `Summarize the patient report from this text, focusing on key medical details such as diagnosis, treatment, and vital signs: ${parsedData}`
//                     }
//                 ],
//                 max_tokens: 500,
//                 temperature: 0.7 // Added for controlled output
//             },
//             {
//                 headers: {
//                     'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
//                     'Content-Type': 'application/json'
//                 }
//             }
//         );
//         console.log('Grok API response:', response.data);
//         return response.data.choices[0].message.content;
//     } catch (error) {
//         console.error('Error with Grok API:', {
//             status: error.response?.status,
//             data: error.response?.data,
//             message: error.message
//         });
//         throw new Error('Failed to get response from Grok');
//     }
// }

// Start the server


async function sendToGemini(text) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Summarize this medical report:\n\n${text.slice(0, 12000)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (err) {
    console.error("Gemini API Error:", JSON.stringify(err, null, 2));
    return "Error generating summary from Gemini.";
  }
}


const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
