// server/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors'); // برای مدیریت CORS
const { getEnvOrThrow } = require('./utils');
const { initializeFirebaseAdmin } = require('./firebase-admin');
const { setupBot } = require('./bot');
const gameState = require('./game-state'); // ماژول مدیریت وضعیت

// --- Initializations ---
const PORT = process.env.PORT || 3001;
// const db = initializeFirebaseAdmin(); // اگر می‌خوای از اول با Firestore کار کنی
const BOT_TOKEN = getEnvOrThrow('BOT_TOKEN');
const WEBHOOK_DOMAIN = getEnvOrThrow('WEBHOOK_DOMAIN'); // e.g., your-backend.onrender.com
const WEBHOOK_PATH = `/api/telegram-webhook/${BOT_TOKEN}`; // مسیر امن‌تر با توکن
const bot = setupBot(BOT_TOKEN);

const app = express();
const server = http.createServer(app);

// --- CORS Setup ---
// در پروداکشن، origin رو به آدرس دقیق Firebase Hosting محدود کن
const frontendUrl = getEnvOrThrow('MINI_APP_URL');
const corsOptions = {
  origin: [frontendUrl, 'http://localhost:8080'], // اجازه دسترسی از Firebase و لوکال هاست (برای تست)
  methods: ["GET", "POST"]
};
app.use(cors(corsOptions));
const io = new Server(server, { cors: corsOptions });

// --- Middleware ---
// برای خواندن JSON از وبهوک تلگرام
// نکته: Telegraf معمولا خودش body رو parse می‌کنه، ولی برای اطمینان می‌ذاریم
app.use(express.json());

// --- Telegram Webhook Endpoint ---
// Telegraf درخواست وبهوک رو در این مسیر مدیریت می‌کنه
app.post(WEBHOOK_PATH, (req, res) => {
  console.log(`Webhook received on ${WEBHOOK_PATH}`);
  bot.handleUpdate(req.body, res).catch(err => {
    console.error('Telegraf Error handling update:', err);
    // حتی در صورت خطا، به تلگرام پاسخ دهید تا وبهوک غیرفعال نشود
    if (!res.headersSent) {
       res.sendStatus(500);
    }
  });
});

// --- Socket.IO Connection Logic ---
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. وقتی بازیکن وصل میشه، اضافه ش کن و بهش خوش‌آمد بگو (همراه با بقیه بازیکنان)
  // اینجا می‌تونیم اطلاعات کاربر تلگرام رو هم بگیریم اگر کلاینت فرستاد
  socket.on('playerJoin', ({ telegramUser }) => {
     const player = gameState.addPlayer(socket.id, telegramUser);
     // لیست همه بازیکنان رو برای بازیکن جدید بفرست
     socket.emit('currentPlayers', gameState.getAllPlayers());
     // به بقیه بگو بازیکن جدید اومده (به جز خودش)
     socket.broadcast.emit('newPlayer', player);
  });

  // // اگر کلاینت اطلاعات تلگرام رو نفرستاد، حداقل اضافه ش کن
  // const player = gameState.addPlayer(socket.id);
  // socket.emit('currentPlayers', gameState.getAllPlayers());
  // socket.broadcast.emit('newPlayer', player);


  // 2. وقتی بازیکن حرکت می‌کنه
  socket.on('playerMove', ({ x, y }) => {
    // اینجا باید اعتبارسنجی حرکت انجام بشه (مثلا سرعت مجاز، عدم عبور از دیوار و...)
    const updatedPlayer = gameState.updatePlayerPosition(socket.id, x, y);
    if (updatedPlayer) {
      // حرکت رو برای بقیه بفرست
      socket.broadcast.emit('playerMoved', { id: socket.id, x: updatedPlayer.x, y: updatedPlayer.y });
      // اینجا می‌تونی وضعیت رو در Firestore هم آپدیت کنی
      // db.collection('users').doc(socket.id).update({ x: x, y: y }).catch(console.error);
    }
  });

  // 3. وقتی بازیکن قطع می‌شه
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    gameState.removePlayer(socket.id);
    // به بقیه بگو که این بازیکن رفت
    io.emit('playerLeft', socket.id);
    // اطلاعاتش رو از Firestore هم پاک کن یا وضعیتش رو آپدیت کن
  });

   // 4. درخواست وضعیت اولیه (اگر کلاینت دیرتر وصل شد)
   socket.on('requestInitialState', () => {
      socket.emit('currentPlayers', gameState.getAllPlayers());
   });

});

// --- Health Check Endpoint (Optional but useful) ---
app.get('/', (req, res) => {
  res.status(200).send('Project Alpha Backend is running!');
});

// --- Start the Server ---
server.listen(PORT, async () => {
  console.log(`Backend server listening on port ${PORT}`);
  const webhookUrl = `https://${WEBHOOK_DOMAIN}${WEBHOOK_PATH}`;
  console.log(`IMPORTANT: Manually set Telegram webhook using BotFather or API call to:`);
  console.log(webhookUrl);

  // --- تنظیم وبهوک (فقط در توسعه لوکال با ngrok و یا یکبار در سرور واقعی) ---
  // هشدار: این کار را به صورت خودکار در هر بار اجرا انجام ندهید!
  // if (process.env.NODE_ENV === 'development' || process.env.SET_WEBHOOK_ONCE === 'true') {
  //   try {
  //     await bot.telegram.setWebhook(webhookUrl);
  //     console.log(`Webhook set successfully to ${webhookUrl}`);
  //   } catch (error) {
  //     console.error('Error setting webhook:', error);
  //   }
  // }
});

// Graceful shutdown (Optional)
process.once('SIGINT', () => { bot.stop('SIGINT'); server.close(); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); server.close(); });