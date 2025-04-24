// server/server.js
const express = require('express');
const http = require('http'); // همچنان لازم است برای Socket.IO
const { Server } = require('socket.io');
const cors = require('cors');
const { getEnvOrThrow } = require('./utils');
// const { initializeFirebaseAdmin } = require('./firebase-admin'); // فعلا کامنت اگر استفاده نمی‌شود
const { setupBot } = require('./bot');
const gameState = require('./game-state');

// --- خواندن متغیرهای محیطی (اولین کار برای شناسایی خطا) ---
let BOT_TOKEN, WEBHOOK_DOMAIN, MINI_APP_URL, PORT;
try {
    BOT_TOKEN = getEnvOrThrow('BOT_TOKEN');
    WEBHOOK_DOMAIN = getEnvOrThrow('WEBHOOK_DOMAIN'); // e.g., alpha-project-cyan.vercel.app
    MINI_APP_URL = getEnvOrThrow('MINI_APP_URL');   // e.g., https://alpha-project-cyan.vercel.app
    PORT = process.env.PORT || 3001; // Vercel پورت را خودش تعیین می‌کند، این بیشتر برای سازگاری است
} catch (error) {
    console.error("FATAL ERROR READING ENV VARS:", error.message);
    // در محیط Serverless، نمی‌توانیم process.exit کنیم، فقط لاگ می‌کنیم
    // Vercel باید در لاگ‌ها خطای استقرار یا اجرا را نشان دهد
    throw error; // خطا را دوباره throw کنید تا Vercel متوجه مشکل شود
}

// --- مقداردهی اولیه Express و Socket.IO ---
const app = express();
const server = http.createServer(app); // Socket.IO نیاز به http server دارد

const corsOptions = {
    origin: [MINI_APP_URL, 'http://localhost:8080', 'http://localhost:3000'],
    methods: ["GET", "POST"]
};
app.use(cors(corsOptions));
const io = new Server(server, {
    cors: corsOptions,
    // هشدار: Socket.IO در Vercel Serverless پایدار نخواهد بود!
});

// --- ربات تلگرام ---
const bot = setupBot(BOT_TOKEN);
const WEBHOOK_PATH = `/api/telegram-webhook/${BOT_TOKEN}`; // مسیر دریافت وبهوک

// --- Middleware ---
app.use(express.json()); // برای خواندن JSON از وبهوک

// --- Telegram Webhook Endpoint ---
app.post(WEBHOOK_PATH, async (req, res) => {
    console.log(`Webhook received at ${WEBHOOK_PATH}`);
    try {
        // استفاده از webhookCallback برای مدیریت خودکار پاسخ به تلگرام
        // توجه: این روش نیاز دارد که Telegraf مستقیما به req, res دسترسی داشته باشد
        // و در محیط Serverless ممکن است نیاز به تنظیم بیشتری داشته باشد.
        // روش جایگزین: استفاده از bot.handleUpdate
        await bot.handleUpdate(req.body, res);
         // اطمینان از ارسال پاسخ اگر handleUpdate خودش نفرستاده بود (کمتر محتمل با handleUpdate)
        if (!res.headersSent) {
             console.log("Webhook processed by handleUpdate, ensuring response.");
            // res.sendStatus(200); // یا ارسال پاسخ JSON خالی
            // res.status(200).send({});
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        // ارسال پاسخ خطا در صورت بروز مشکل
        if (!res.headersSent) {
            res.sendStatus(500);
        }
    }
});

// --- Socket.IO Logic ---
io.on('connection', (socket) => {
    console.log(`User connected via Socket.IO: ${socket.id}`);
    // ... (بقیه منطق Socket.IO شما مثل قبل) ...
     socket.on('playerJoin', ({ telegramUser }) => { /* ... */ });
     socket.on('playerMove', ({ x, y }) => { /* ... */ });
     socket.on('disconnect', () => { /* ... */ });
     socket.on('requestInitialState', () => { /* ... */ });
});

// --- Health Check Endpoint ---
app.get('/api/health', (req, res) => { // مسیر را به /api/ تغییر دادم
  res.status(200).send('Project Alpha Backend is running!');
});

// --- تغییر کلیدی برای Vercel: Export کردن app ---
// به جای app.listen یا server.listen، خود app را export می‌کنیم
// Vercel خودش سرور را مدیریت می‌کند و درخواست‌ها را به این app می‌فرستد.
// **نکته مهم:** سرور http که برای Socket.IO ساختیم (server) به طور مستقیم listen نمی‌شود.
// Vercel باید بتواند اتصالات WebSocket را به این تابع Serverless هدایت کند که پیچیده است.
// این ساختار *ممکن است* وبهوک HTTP را کار بیندازد ولی Socket.IO همچنان مشکل خواهد داشت.

module.exports = app;

// کد server.listen() حذف شد چون Vercel خودش مدیریت می‌کند.
// console.log های مربوط به listen و تنظیم وبهوک خودکار هم باید حذف شوند.
// server/server.js
// ...
app.post(WEBHOOK_PATH, async (req, res) => {
    console.log(`>>> Webhook received at ${new Date().toISOString()}`); // زمان دریافت
    console.log(`>>> Request Body:`, JSON.stringify(req.body, null, 2)); // محتوای آپدیت تلگرام
    try {
        console.log(`>>> Calling bot.handleUpdate...`);
        await bot.handleUpdate(req.body, res);
        console.log(`>>> bot.handleUpdate finished.`);
        if (!res.headersSent) {
             console.log(`>>> Ensuring response is sent (Status 200).`);
             res.sendStatus(200); // یا res.send({});
        }
    } catch (error) {
        console.error('>>> ERROR processing webhook:', error); // لاگ کردن خطای کامل
        if (!res.headersSent) {
            res.sendStatus(500);
        }
    }
});
// ...