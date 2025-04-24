// public/js/main.js

// ۱. وارد کردن صحنه بازی
import { GameScene } from './GameScene.js'; // مطمئن شوید این فایل وجود دارد و کلاس را export می‌کند

// --- ۲. Configuration ---
// !!! آدرس بک‌اند شما همان آدرس Vercel خواهد بود !!!
const SOCKET_SERVER_URL = 'https://alpha-project-cyan.vercel.app'; // آدرس Vercel شما

// --- منتظر بارگذاری کامل پنجره ---
window.addEventListener('load', () => {
    console.log("Project Alpha: Window loaded. Initializing...");

    // --- ۳. State Variables ---
    let tg = null;
    let userInfo = null;
    let socket = null;
    let phaserGameInstance = null;
    let connectionAttempted = false;

    // --- ۴. Helper Functions for UI Feedback ---
    // (این توابع بدون تغییر باقی می‌مانند - از نسخه قبلی کپی کنید)
    function displayOverlayMessage(type, message) { /* ... کد از پاسخ قبلی ... */ }
    function clearOverlays() { /* ... کد از پاسخ قبلی ... */ }

    // --- ۵. Check Core Libraries ---
    if (typeof io === 'undefined') return displayOverlayMessage('error', 'Multiplayer library failed to load.');
    if (typeof Phaser === 'undefined') return displayOverlayMessage('error', 'Game engine failed to load.');

    // --- ۶. Initialize Telegram WebApp ---
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();
            userInfo = tg.initDataUnsafe?.user;
            console.log("Telegram WebApp Initialized. User ID:", userInfo ? userInfo.id : 'N/A');
            tg.MainButton.setText("خروج").show().onClick(() => tg.close());
        } else {
            console.warn("Telegram WebApp not found.");
        }
    } catch (error) {
        console.error("Error initializing Telegram:", error);
        // displayOverlayMessage('error', 'Failed to init Telegram features.'); // کمتر حیاتی
    }

    // --- ۷. Initialize & Connect Socket.IO ---
    if (!SOCKET_SERVER_URL) { // این چک دیگر لازم نیست چون مستقیم مقدار دادیم
        displayOverlayMessage('error', 'Config Error: Server address missing.');
    } else if (!connectionAttempted) {
        connectionAttempted = true;
        displayOverlayMessage('message', 'Connecting to server...');
        console.log(`Connecting to Socket.IO at: ${SOCKET_SERVER_URL}`);

        try {
            socket = io(SOCKET_SERVER_URL, {
                transports: ['websocket'],
                reconnectionAttempts: 3,
                timeout: 8000,
                // path: '/socket.io/' // معمولا نیازی نیست ولی اگر Vercel rewrite خاصی دارد ممکن است لازم باشد
            });

            // --- ۸. Socket.IO Event Handlers ---
            socket.on('connect', () => {
                console.log(`Socket.IO Connected! ID: ${socket.id}`);
                clearOverlays();
                displayOverlayMessage('message', 'Connected!');
                setTimeout(clearOverlays, 1500);

                socket.emit('playerJoin', { telegramUser: userInfo });
                console.log('Sent playerJoin.');

                // --- ۹. Initialize Phaser ---
                if (!phaserGameInstance) {
                    initializePhaserGame();
                } else {
                    console.log("Reconnected to server.");
                }
            });

            // ... (بقیه event handler های سوکت: disconnect, connect_error, etc. از کد قبلی) ...
             socket.on('disconnect', (reason) => { console.warn(`Socket.IO Disconnected: ${reason}`); displayOverlayMessage('error', `Connection lost: ${reason}. Reconnecting...`); });
             socket.on('connect_error', (error) => { console.error('Socket.IO Connection Error:', error.message); displayOverlayMessage('error', `Cannot connect: ${error.message}`); });
             socket.on('reconnect_attempt', (attempt) => { console.log(`Reconnect attempt ${attempt}`); displayOverlayMessage('message', `Reconnecting... (${attempt})`); });
             socket.on('reconnect_failed', () => { console.error('Socket.IO Reconnection Failed.'); displayOverlayMessage('error', 'Failed to reconnect. Please refresh.'); });
             socket.on('error', (error) => { console.error('Socket.IO general error:', error); displayOverlayMessage('error', `Communication error: ${error.message}`); });


        } catch (error) {
            console.error("Error initializing Socket.IO:", error);
            displayOverlayMessage('error', 'Failed to set up connection.');
        }
    } // end if !connectionAttempted

    // --- ۱۰. Phaser Initialization Function ---
    function initializePhaserGame() {
         if (typeof GameScene === 'undefined') { console.error("GameScene not defined!"); displayOverlayMessage('error', 'Game scene failed load.'); return; }
         if (!socket || !socket.connected) { console.error("Phaser init failed: Socket not connected."); return; }
         if (phaserGameInstance) { console.warn("Phaser already initialized."); return; }

        console.log("Initializing Phaser game...");
        try {
            const config = { /* ... تنظیمات Phaser از کد قبلی ... */
                type: Phaser.AUTO,
                scale: { mode: Phaser.Scale.RESIZE, parent: 'game-container', width: '100%', height: '100%' },
                physics: { default: 'arcade', arcade: { /*debug: true,*/ gravity: { y: 0 } } },
                scene: [GameScene],
                backgroundColor: '#1a1a1a',
                render: { antialias: true, pixelArt: false }
            };

            phaserGameInstance = new Phaser.Game(config);
            phaserGameInstance.registry.set('socket', socket);
            phaserGameInstance.registry.set('tg', tg);
            phaserGameInstance.registry.set('userInfo', userInfo);
            console.log("Phaser game instance created.");
            clearOverlays(); // پاک کردن پیام‌های اتصال

        } catch (error) {
            console.error("Error creating Phaser game instance:", error);
            displayOverlayMessage('error', `Failed to start game engine: ${error.message}`);
            if (phaserGameInstance) { phaserGameInstance.destroy(true); phaserGameInstance = null; }
        }
    }

}); // --- End of window.addEventListener('load') ---

// Helper function definitions (کد کامل از پاسخ قبلی کپی شود)
function displayOverlayMessage(type, message) {
    let overlay = document.getElementById(`${type}-overlay`);
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = `${type}-overlay`;
        overlay.style.position = 'absolute';
        overlay.style.left = '50%';
        overlay.style.transform = 'translateX(-50%)';
        overlay.style.width = '85%';
        overlay.style.padding = '10px 15px';
        overlay.style.borderRadius = '5px';
        overlay.style.zIndex = '1001';
        overlay.style.textAlign = 'center';
        overlay.style.fontSize = '14px';
        overlay.style.display = 'none';
        overlay.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        overlay.style.top = (type === 'error' ? '60px' : '10px');
        overlay.style.backgroundColor = (type === 'error' ? 'rgba(250, 128, 114, 0.9)' : 'rgba(173, 216, 230, 0.9)');
        overlay.style.color = '#000';
        document.body.appendChild(overlay);
    }
    overlay.textContent = message;
    overlay.style.display = 'block';
    if (type === 'error') console.error(`UI Error: ${message}`); else console.log(`UI Message: ${message}`);
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