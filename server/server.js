// server/server.js
// ... (بقیه require ها مثل قبل) ...
const cors = require('cors');
const { getEnvOrThrow } = require('./utils');
// ... (بقیه require ها) ...

// --- Initializations ---
// ... (بقیه مقداردهی‌ها) ...
const BOT_TOKEN = getEnvOrThrow('BOT_TOKEN');
const WEBHOOK_DOMAIN = getEnvOrThrow('WEBHOOK_DOMAIN'); // باید 'alpha-project-cyan.vercel.app' باشد
const MINI_APP_URL = getEnvOrThrow('MINI_APP_URL'); // باید 'https://alpha-project-cyan.vercel.app' باشد
const WEBHOOK_PATH = `/api/telegram-webhook/${BOT_TOKEN}`;
// ... (راه اندازی bot) ...

const app = express();
const server = http.createServer(app);

// --- CORS Setup ---
const corsOptions = {
  // !!! مهم: اجازه دسترسی از دامنه Vercel شما !!!
  origin: [MINI_APP_URL, 'http://localhost:8080', 'http://localhost:3000'], // اضافه کردن MINI_APP_URL
  methods: ["GET", "POST"]
};
app.use(cors(corsOptions));
const io = new Server(server, {
    cors: corsOptions,
    // !!! هشدار: تنظیمات زیر ممکن است در Vercel Serverless کار نکنند !!!
    // pingTimeout: 60000, // افزایش تایم‌اوت پینگ (شاید کمک کند؟)
    // transports: ['websocket'] // اجبار به وب‌سوکت (شاید Vercel بهتر هندل کند؟ بعید است)
});

// ... (بقیه کد سرور مثل قبل: Middleware, Webhook Endpoint, Socket.IO Logic, Start Server) ...

// --- Start the Server ---
server.listen(PORT, async () => {
    console.log(`Backend server potentially running on port ${PORT} (within Vercel runtime)`);
    const webhookUrl = `https://${WEBHOOK_DOMAIN}${WEBHOOK_PATH}`;
    console.log(`!!! IMPORTANT: Manually set Telegram webhook to: ${webhookUrl}`);
    console.warn("!!! WARNING: Running Socket.IO on Vercel Serverless is NOT recommended and likely unstable/non-functional for real-time multiplayer.");
    // ... (کد تنظیم وبهوک خودکار باید کامنت یا حذف شده باشد) ...
});

// ... (Graceful shutdown) ...