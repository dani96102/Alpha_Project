// Wait for the DOM and scripts (Phaser, Socket.IO, Telegram) to be ready
window.addEventListener('load', () => {
    console.log("Window loaded. Initializing game...");

    // --- Configuration ---
    const SOCKET_SERVER_URL = 'http://localhost:3000'; // IMPORTANT: Replace with your actual Socket.IO server URL
    const GAME_WIDTH = window.innerWidth; // Use window size for responsiveness
    const GAME_HEIGHT = window.innerHeight * 0.8; // Adjust height as needed, maybe leave space for other UI

    // --- Telegram WebApp Initialization ---
    let tg = null;
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            tg = window.Telegram.WebApp;
            tg.expand(); // Expand the Mini App view
            console.log("Telegram WebApp initialized:", tg);
        } else {
            console.warn("Telegram WebApp script not loaded or initialized correctly.");
            // Provide a fallback mechanism or message if running outside Telegram
            alert("Telegram context not found. Running in limited mode.");
        }
    } catch (error) {
        console.error("Error initializing Telegram WebApp:", error);
        alert("Failed to initialize Telegram WebApp.");
    }


    // --- Socket.IO Client Initialization ---
    let socket = null;
    try {
        // Check if io is defined (loaded from the script tag)
        if (typeof io !== 'undefined') {
            socket = io(SOCKET_SERVER_URL, {
                 transports: ['websocket'], // Explicitly use WebSocket if possible
                 // Add any other necessary Socket.IO options here
            });

            socket.on('connect', () => {
                console.log('Connected to Socket.IO server with ID:', socket.id);
                // Now that we are connected, start the Phaser game
                initializePhaser();
            });

            socket.on('connect_error', (err) => {
                console.error('Socket.IO connection error:', err.message, err.data);
                // Handle connection errors (e.g., show a message to the user)
                 alert(`Failed to connect to game server: ${err.message}. Please try again later.`);
                 // Maybe disable the game area or show an error state
                 const gameContainer = document.getElementById('phaser-game');
                 if (gameContainer) {
                     gameContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Connection Error. Cannot load game.</p>';
                 }
            });

            socket.on('disconnect', (reason) => {
                console.log('Disconnected from Socket.IO server:', reason);
                // Handle disconnection (e.g., show a message, try to reconnect)
                alert("Disconnected from server. Please check your connection.");
            });

        } else {
            console.error("Socket.IO client library (io) not found.");
             alert("Critical error: Cannot load multiplayer features.");
              const gameContainer = document.getElementById('phaser-game');
              if (gameContainer) {
                     gameContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error loading multiplayer library.</p>';
              }
        }

    } catch (error) {
        console.error("Error initializing Socket.IO:", error);
         alert("Failed to initialize multiplayer connection.");
         const gameContainer = document.getElementById('phaser-game');
         if (gameContainer) {
             gameContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Multiplayer Initialization Error.</p>';
         }
    }


    // --- Phaser Game Initialization ---
    function initializePhaser() {
        console.log("Initializing Phaser...");
        if (typeof Phaser === 'undefined') {
            console.error("Phaser library not found!");
             alert("Critical error: Cannot load game engine.");
              const gameContainer = document.getElementById('phaser-game');
             if (gameContainer) {
                 gameContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error loading game engine.</p>';
             }
            return;
        }
         if (!socket || !socket.connected) {
             console.error("Cannot initialize Phaser: Socket not connected.");
             return;
         }


        const config = {
            type: Phaser.AUTO, // Automatically choose WebGL or Canvas
            parent: 'phaser-game', // ID of the div container
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
             scale: {
                 mode: Phaser.Scale.FIT, // Fit the game within the parent container
                 autoCenter: Phaser.Scale.CENTER_BOTH // Center the game canvas
             },
            physics: {
                default: 'arcade', // Use Arcade Physics engine
                arcade: {
                    // debug: true, // Set to true for visual debugging of physics bodies
                    gravity: { y: 0 } // No gravity needed for top-down view
                }
            },
            scene: [GameScene], // Add the GameScene to the configuration
            backgroundColor: '#2d2d2d' // A dark background color
        };

        try {
            const game = new Phaser.Game(config);
             console.log("Phaser Game instance created:", game);

            // Pass socket and tg instances to the GameScene using the registry or scene start data
             // Using registry (accessible in scene via this.registry.get):
             // game.registry.set('socket', socket);
             // game.registry.set('tg', tg);
             // game.scene.start('GameScene'); // Start the scene after setting registry

             // Or using scene start data (accessible in scene's init method):
             game.scene.start('GameScene', { socket: socket, tg: tg });

             console.log("GameScene started with socket and tg data.");

             // Remove the "Loading game..." message
             const gameContainer = document.getElementById('phaser-game');
             const loadingMessage = gameContainer?.querySelector('p');
             if(loadingMessage) {
                loadingMessage.remove();
             }


        } catch (error) {
            console.error("Error creating Phaser game instance:", error);
            alert("Failed to start the game engine.");
            const gameContainer = document.getElementById('phaser-game');
             if (gameContainer) {
                 gameContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Game Engine Error.</p>';
             }
        }
    }

    // Initial setup check (optional, but good practice)
    if (typeof Phaser === 'undefined') console.error("Phaser is not defined!");
    if (typeof io === 'undefined') console.error("Socket.IO (io) is not defined!");
    if (typeof GameScene === 'undefined') console.error("GameScene is not defined!");

});
