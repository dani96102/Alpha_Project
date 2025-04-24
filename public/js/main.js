// public/js/main.js

// --- ۱. Configuration (مهمترین بخش!) ---
// !!! این آدرس رو با آدرس واقعی و عمومی سرور بک‌اند خودتون جایگزین کنید !!!
// مثال: "https://your-project-alpha-backend.onrender.com"
const https://alpha-project-cyan.vercel.app = 'YOUR_DEPLOYED_BACKEND_URL';
// !!! اگر این آدرس درست نباشه، بازی هرگز وصل و اجرا نمی‌شه !!!

// --- منتظر می‌مانیم تا DOM و همه اسکریپت‌ها بارگذاری شوند ---
window.addEventListener('load', () => {
    console.log("Project Alpha: Window loaded. Initializing...");

    // --- ۲. State Variables ---
    let tg = null;
    let userInfo = null;
    let socket = null;
    let phaserGameInstance = null;
    let connectionAttempted = false; // جلوگیری از تلاش‌های مکرر ناموفق

    // --- ۳. Helper Functions for UI Feedback ---
    function displayOverlayMessage(type, message) {
        let overlay = document.getElementById(`${type}-overlay`);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = `${type}-overlay`;
            overlay.style.position = 'absolute';
            overlay.style.top = (type === 'error' ? '60px' : '10px'); // خطا کمی پایین‌تر
            overlay.style.left = '50%';
            overlay.style.transform = 'translateX(-50%)';
            overlay.style.padding = '8px 12px';
            overlay.style.backgroundColor = (type === 'error' ? 'rgba(255, 100, 100, 0.9)' : 'rgba(173, 216, 230, 0.9)'); // قرمز برای خطا، آبی برای پیام
            overlay.style.color = '#000';
            overlay.style.borderRadius = '5px';
            overlay.style.zIndex = '1001'; // بالاتر از Canvas
            overlay.style.textAlign = 'center';
            overlay.style.maxWidth = '90%';
            overlay.style.fontSize = '14px';
            document.body.appendChild(overlay);
        }
        overlay.textContent = message;
        overlay.style.display = 'block';

        // پیام‌های خطا را به کنسول هم بفرستید
        if (type === 'error') {
            console.error(`UI Error Displayed: ${message}`);
        } else {
            console.log(`UI Message Displayed: ${message}`);
        }

        // مخفی کردن پیام دیگر در صورت نمایش پیام جدید
        const otherType = (type === 'error' ? 'message' : 'error');
        const otherOverlay = document.getElementById(`${otherType}-overlay`);
        if (otherOverlay) otherOverlay.style.display = 'none';
    }

    function clearOverlays() {
        const msgOverlay = document.getElementById('message-overlay');
        const errOverlay = document.getElementById('error-overlay');
        if (msgOverlay) msgOverlay.style.display = 'none';
        if (errOverlay) errOverlay.style.display = 'none';
    }

    // --- ۴. Check Core Libraries ---
    if (typeof io === 'undefined') {
        displayOverlayMessage('error', 'Critical Error: Multiplayer library (Socket.IO) failed to load.');
        return; // نمی‌توان ادامه داد
    }
    if (typeof Phaser === 'undefined') {
        displayOverlayMessage('error', 'Critical Error: Game engine (Phaser) failed to load.');
        return; // نمی‌توان ادامه داد
    }
     if (typeof GameScene === 'undefined') {
         // GameScene ممکنه در این لحظه هنوز لود نشده باشه، صبر می‌کنیم
         console.warn("GameScene is not defined yet, assuming it will load.");
     }

    // --- ۵. Initialize Telegram WebApp ---
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            tg = window.Telegram.WebApp;
            tg.ready(); // به تلگرام بگو آماده‌ایم
            tg.expand();
            userInfo = tg.initDataUnsafe?.user;
            console.log("Telegram WebApp Initialized. User ID:", userInfo ? userInfo.id : 'N/A');

            // دکمه اصلی تلگرام (اختیاری)
            tg.MainButton.setText("خروج").show().onClick(() => tg.close());
        } else {
            console.warn("Telegram WebApp not found. Running outside Telegram?");
            // displayOverlayMessage('message', 'Running in browser mode.'); // نمایش پیام (اختیاری)
        }
    } catch (error) {
        console.error("Error initializing Telegram WebApp:", error);
        displayOverlayMessage('error', 'Failed to initialize Telegram features.');
        // ادامه می‌دهیم، شاید بازی بدون تلگرام هم کار کند
    }

    // --- ۶. Initialize Socket.IO Connection ---
    if (!https://alpha-project-cyan.vercel.app || https://alpha-project-cyan.vercel.app === 'YOUR_DEPLOYED_BACKEND_URL') {
        console.error("FATAL: https://alpha-project-cyan.vercel.app is not set correctly in main.js!");
        displayOverlayMessage('error', 'Configuration Error: Server address missing.');
        connectionAttempted = true; // جلوگیری از تلاش بعدی
    } else if (!connectionAttempted) {
        connectionAttempted = true; // فقط یک بار برای اتصال تلاش کن
        console.log(`Attempting to connect to Socket.IO at: ${https://alpha-project-cyan.vercel.app}`);
        displayOverlayMessage('message', 'Connecting to game server...'); // نمایش پیام اتصال

        try {
            socket = io(https://alpha-project-cyan.vercel.app, {
                transports: ['websocket'], // اولویت با وب‌سوکت
                reconnectionAttempts: 3,
                timeout: 8000, // زمان بیشتر برای اولین اتصال
                // 'force new connection': true, // فقط برای دیباگ شدید
            });

            // --- ۷. Socket.IO Event Handlers ---
            socket.on('connect', () => {
                console.log(`Socket.IO Connected! ID: ${socket.id}`);
                clearOverlays(); // پاک کردن پیام اتصال
                displayOverlayMessage('message', 'Connected!'); // پیام تایید
                setTimeout(clearOverlays, 2000); // پاک کردن پیام تایید بعد از ۲ ثانیه

                // ارسال اطلاعات کاربر به سرور
                socket.emit('playerJoin', { telegramUser: userInfo });
                console.log('Sent playerJoin event.');

                // --- ۸. Initialize Phaser (فقط بعد از اتصال موفق) ---
                if (!phaserGameInstance) {
                    initializePhaserGame();
                } else {
                    console.log("Reconnected. Phaser already initialized.");
                    // اگر بازی pause شده بود، resume کنید (نیاز به منطق در GameScene)
                     // phaserGameInstance.scene.resume('GameScene');
                }
            });

            socket.on('disconnect', (reason) => {
                console.warn(`Socket.IO Disconnected. Reason: ${reason}`);
                if (reason === 'io server disconnect') {
                    // سرور ما را قطع کرده
                    displayOverlayMessage('error', 'Disconnected by server.');
                } else if (reason === 'io client disconnect') {
                     // ما خودمان قطع کردیم (مثلا بستن تب) - نیازی به پیام نیست
                     console.log("Disconnected by client.");
                } else {
                    // مشکلات شبکه
                    displayOverlayMessage('error', 'Connection lost. Attempting to reconnect...');
                }
                 // می‌توانید بازی را pause کنید
                 // if (phaserGameInstance) phaserGameInstance.scene.pause('GameScene');
            });

            socket.on('connect_error', (error) => {
                console.error('Socket.IO Connection Error:', error.message);
                // این خطا معمولا قبل از اولین اتصال یا حین تلاش برای اتصال مجدد رخ می‌ده
                displayOverlayMessage('error', `Cannot connect: ${error.message}. Check internet or server status.`);
                 // اگر بازی در حال اجرا بود، متوقفش کنید
                // if (phaserGameInstance) phaserGameInstance.scene.pause('GameScene');
            });

            socket.on('reconnect_attempt', (attempt) => {
                console.log(`Socket.IO Reconnect attempt ${attempt}`);
                displayOverlayMessage('message', `Reconnecting... (Attempt ${attempt})`);
            });

            socket.on('reconnect_failed', () => {
                console.error('Socket.IO Reconnection Failed.');
                displayOverlayMessage('error', 'Failed to reconnect to the server. Please refresh.');
            });

             socket.on('error', (error) => {
                 console.error('Socket.IO general error:', error);
                 displayOverlayMessage('error', `Communication error: ${error.message}`);
             });

        } catch (error) {
            console.error("Error initializing Socket.IO:", error);
            displayOverlayMessage('error', 'Failed to set up multiplayer connection.');
        }
    } // اتمام بلوک اتصال سوکت

    // --- ۹. Phaser Initialization Function ---
    function initializePhaserGame() {
        console.log("Attempting to initialize Phaser game...");

         // دوباره چک کنید که GameScene حالا تعریف شده باشد
         if (typeof GameScene === 'undefined') {
             console.error("GameScene class is still not defined! Cannot start Phaser.");
             displayOverlayMessage('error', 'Game scene code failed to load.');
             return;
         }
        if (!socket || !socket.connected) {
            console.error("Cannot initialize Phaser: Socket is not connected.");
             displayOverlayMessage('error', 'Cannot start game without server connection.');
            return; // اگر سوکت وصل نیست، بازی را شروع نکن
        }

        try {
            const config = {
                type: Phaser.AUTO,
                scale: {
                    mode: Phaser.Scale.RESIZE, // تغییر اندازه با پنجره
                    parent: 'game-container',
                    width: '100%',
                    height: '100%'
                },
                physics: {
                    default: 'arcade',
                    arcade: {
                         // debug: true, // برای دیباگ روشن کنید
                         gravity: { y: 0 }
                    }
                },
                scene: [GameScene], // صحنه بازی شما
                backgroundColor: '#1a1a1a', // پس‌زمینه تیره‌تر
                 render: {
                    antialias: true, // لبه‌های نرم‌تر
                    pixelArt: false // اگر بازی پیکسلی نیست
                 }
            };

            // ساخت نمونه بازی
            phaserGameInstance = new Phaser.Game(config);

            // پاس دادن اطلاعات به صحنه از طریق رجیستری
            phaserGameInstance.registry.set('socket', socket);
            phaserGameInstance.registry.set('tg', tg);
            phaserGameInstance.registry.set('userInfo', userInfo);

            console.log("Phaser game instance created and scene started.");
            clearOverlays(); // پاک کردن هر پیام قبلی

        } catch (error) {
            console.error("Error creating Phaser game instance:", error);
            displayOverlayMessage('error', `Failed to start game engine: ${error.message}`);
            if (phaserGameInstance) {
                 // تلاش برای از بین بردن نمونه ناموفق
                 phaserGameInstance.destroy(true);
                 phaserGameInstance = null;
            }
        }
    }

}); // اتمام addEventListener('load')