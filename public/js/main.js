// public/js/main.js
// فرض می‌کنیم GameScene.js توسط AI تولید شده و export شده است
import { GameScene } from './GameScene.js';

console.log("Project Alpha: main.js loading...");

let tg = null;
let userInfo = null;
let socket = null;

// --- 1. Initialize Telegram ---
try {
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand(); // تمام صفحه کردن مینی‌اپ
        userInfo = tg.initDataUnsafe?.user;
        console.log("Telegram WebApp Initialized. User:", userInfo);

        // تنظیم دکمه اصلی تلگرام (اختیاری)
        tg.MainButton.setText("خروج از بازی");
        tg.MainButton.show();
        tg.MainButton.onClick(() => tg.close());

    } else {
        console.warn("Telegram WebApp API not found. Running in standard browser?");
        // شاید بخواهید پیامی نمایش دهید یا لاگین جایگزین داشته باشید
        // alert("Please open this game through the Telegram bot.");
    }
} catch (err) {
    console.error("Error initializing Telegram WebApp:", err);
    // نمایش خطا به کاربر
}

// --- 2. Connect to Backend Server via Socket.IO ---
// آدرس بک‌اند سرور شما (باید از متغیر محیطی خوانده شود یا هاردکد شود - بهتر است از طریق build process تزریق شود)
// در Vercel/Render/..., process.env در کلاینت در دسترس نیست.
const BACKEND_URL = "YOUR_DEPLOYED_BACKEND_URL"; // مثل https://your-backend.onrender.com
// const BACKEND_URL = "http://localhost:3001"; // برای تست لوکال بک‌اند

console.log(`Attempting to connect to Socket.IO server at: ${BACKEND_URL}`);

try {
    socket = io(BACKEND_URL, {
         transports: ['websocket'], // اولویت با وب‌سوکت
         reconnectionAttempts: 5, // تعداد تلاش برای اتصال مجدد
         reconnectionDelay: 1000, // تاخیر بین تلاش‌ها
     });

    socket.on('connect', () => {
        console.log(`Socket.IO Connected! ID: ${socket.id}`);
        // بعد از اتصال موفق، به سرور بگویید که وصل شده اید (همراه با اطلاعات تلگرام)
        socket.emit('playerJoin', { telegramUser: userInfo });

        // --- 3. Initialize Phaser Game (Only AFTER socket connects) ---
        if (!window.phaserGame) { // فقط یک بار بازی را بسازید
          initializePhaserGame(socket, tg, userInfo);
        }
    });

    socket.on('disconnect', (reason) => {
        console.warn(`Socket.IO Disconnected. Reason: ${reason}`);
        // نمایش پیام به کاربر یا تلاش برای اتصال مجدد UI
        if (window.phaserGame) {
            // شاید بخواهید بازی را متوقف کنید یا پیامی نشان دهید
            // window.phaserGame.scene.getScene('GameScene').sys.pause();
        }
        // تلاش برای اتصال مجدد به صورت خودکار توسط Socket.IO انجام می‌شود (طبق تنظیمات بالا)
    });

    socket.on('connect_error', (error) => {
        console.error('Socket.IO Connection Error:', error);
        displayConnectionError(`Failed to connect to server: ${error.message}. Please try refreshing.`);
    });

} catch (err) {
    console.error("Failed to initialize Socket.IO:", err);
    displayConnectionError("Could not establish connection to the game server.");
}

// --- Phaser Initialization Function ---
function initializePhaserGame(socketInstance, tgInstance, userInstance) {
    console.log("Initializing Phaser game...");
    const config = {
        type: Phaser.AUTO, // اولویت با WebGL، اگر نشد Canvas
        scale: {
            mode: Phaser.Scale.RESIZE, // تغییر اندازه خودکار با پنجره
            parent: 'game-container', // ID المان والد
            width: '100%',
            height: '100%'
        },
        scene: [GameScene], // لیست صحنه‌های بازی شما
        // physics: { default: 'arcade', arcade: { debug: false } }, // فیزیک پایه (اختیاری)
        // pixelArt: true, // اگر گرافیک پیکسلی دارید
        // antialias: true, // برای گرافیک نرم‌تر
    };

    window.phaserGame = new Phaser.Game(config);

    // پاس دادن نمونه‌های سوکت و تلگرام به بازی از طریق رجیستری
    window.phaserGame.registry.set('socket', socketInstance);
    window.phaserGame.registry.set('tg', tgInstance);
    window.phaserGame.registry.set('userInfo', userInstance);

    console.log("Phaser game instance created.");
}

// --- Helper to Display Errors ---
function displayConnectionError(message) {
  const container = document.getElementById('game-container');
  if (container) {
    container.innerHTML = `<div style="color: red; padding: 20px; text-align: center;">${message}</div>`;
  }
}

// اگر اتصال اولیه سوکت برقرار نشد، خطا نمایش دهید
// (این کد ممکن است قبل از اتمام تلاش‌های اتصال مجدد اجرا شود)
// setTimeout(() => {
//     if (!socket || !socket.connected) {
//         if (!document.querySelector('#game-container div')) { // فقط اگر پیام خطای دیگری نیست
//              displayConnectionError("Unable to connect to the game server after initial attempts.");
//         }
//     }
// }, 6000); // کمی صبر کنید