/**
 * Represents the main game scene in Phaser.
 */
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.player = null; // Reference to the local player's sprite
        this.otherPlayers = {}; // Map to store other players' sprites { socketId: sprite }
        this.socket = null; // Socket.IO client instance
        this.tg = null; // Telegram WebApp instance
        this.playerNameText = null; // Phaser text object for player name
        this.isDragging = false; // Flag to track if dragging is active
        this.lastPosition = { x: 0, y: 0 }; // Track last sent position
    }

    /**
     * Loads game assets before the scene starts.
     */
    preload() {
        // Load a placeholder image for players
        // In a real game, replace 'player.png' with your actual asset path
        this.load.image('playerSprite', 'https://via.placeholder.com/40/008080/FFFFFF?text=P'); // Teal placeholder
        this.load.image('otherPlayerSprite', 'https://via.placeholder.com/40/6a7a8a/FFFFFF?text=O'); // Gray placeholder
    }

    /**
     * Initializes data passed from the scene start.
     * @param {object} data - Data passed from the scene start call.
     */
    init(data) {
        this.socket = data.socket;
        this.tg = data.tg;

        // Basic error handling if socket or tg are missing
        if (!this.socket) {
            console.error('Socket.IO instance is missing!');
            // Handle error appropriately, maybe show a message or stop the scene
        }
        if (!this.tg) {
            console.error('Telegram WebApp instance is missing!');
            // Handle error appropriately
        } else {
            // Signal Telegram that the WebApp is ready
            this.tg.ready();
            console.log('Telegram WebApp ready.');
        }
    }

    /**
     * Creates game objects and sets up initial state.
     */
    create() {
        console.log('GameScene create started.');

        // Display Telegram User Name if available
        if (this.tg && this.tg.initDataUnsafe && this.tg.initDataUnsafe.user) {
            const user = this.tg.initDataUnsafe.user;
            const firstName = user.first_name || 'Player'; // Fallback name
            this.playerNameText = this.add.text(10, 10, `Welcome, ${firstName}!`, {
                fontSize: '18px',
                fill: '#ffffff', // White text for visibility
                fontFamily: 'Arial, sans-serif' // Clear, readable font
            }).setScrollFactor(0).setDepth(100); // Keep text fixed on screen
            console.log(`Displaying user: ${firstName}`);
        } else {
            console.warn('Telegram user data not available.');
            this.playerNameText = this.add.text(10, 10, 'Welcome, Player!', {
                 fontSize: '18px',
                 fill: '#ffffff',
                 fontFamily: 'Arial, sans-serif'
            }).setScrollFactor(0).setDepth(100);
        }

        // -- Socket.IO Event Listeners --

        if (!this.socket) {
            console.error("Socket not initialized in create!");
            return; // Stop creation if socket isn't ready
        }

        // Listener for current players when joining
        this.socket.on('currentPlayers', (players) => {
            console.log('Received current players:', players);
            Object.keys(players).forEach((id) => {
                if (players[id].playerId === this.socket.id) {
                    // Add the local player
                    this.addPlayer(players[id]);
                } else {
                    // Add other players
                    this.addOtherPlayer(players[id]);
                }
            });
            // Ensure player sprite exists before enabling input
             if (this.player) {
                this.setupInputHandling();
            } else {
                console.warn("Local player sprite not created after receiving currentPlayers.");
            }
        });

        // Listener for a new player joining
        this.socket.on('newPlayer', (playerInfo) => {
            console.log('New player joined:', playerInfo);
            // Ensure the new player isn't the local player (shouldn't happen but good practice)
            if (playerInfo.playerId !== this.socket.id) {
                this.addOtherPlayer(playerInfo);
            }
        });

        // Listener for player movement updates
        this.socket.on('playerMoved', (moveData) => {
            // console.log('Player moved:', moveData); // Can be spammy, uncomment for debugging
            const otherPlayerSprite = this.otherPlayers[moveData.id];
            if (otherPlayerSprite) {
                // Smoothly interpolate position for other players
                this.tweens.add({
                    targets: otherPlayerSprite,
                    x: moveData.x,
                    y: moveData.y,
                    duration: 50, // Short duration for responsiveness
                    ease: 'Linear'
                });
            } else {
                 console.warn(`Received move data for unknown player ID: ${moveData.id}`);
            }
        });

        // Listener for player disconnection
        this.socket.on('playerLeft', (playerId) => {
            console.log('Player left:', playerId);
            const otherPlayerSprite = this.otherPlayers[playerId];
            if (otherPlayerSprite) {
                otherPlayerSprite.destroy(); // Remove sprite from the scene
                delete this.otherPlayers[playerId]; // Remove from the map
            } else {
                console.warn(`Received disconnect for unknown player ID: ${playerId}`);
            }
        });

         // Fallback: If 'currentPlayers' isn't received quickly, maybe request it
        // setTimeout(() => {
        //     if (!this.player && this.socket.connected) {
        //         console.log("Requesting player data manually...");
        //         // You might need a specific event on the server to handle this request
        //         this.socket.emit('requestPlayerData');
        //     }
        // }, 2000); // Wait 2 seconds

        // Make sure the player object exists before setting up input
         if (!this.player) {
             // This often happens if 'currentPlayers' isn't received before create finishes.
             // We'll set up input *after* the player is added in the 'currentPlayers' handler.
             console.log("Waiting for player data before enabling input...");
         } else {
             this.setupInputHandling(); // Setup input if player somehow already exists
         }


        // Example: Add a static object
        this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY, 100, 50, 0xAAAAAA).setOrigin(0.5);
        this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'Puzzle Area', { fontSize: '14px', fill: '#000000' }).setOrigin(0.5);

         console.log('GameScene create finished.');
    }

    /**
     * Sets up player input handling (touch/pointer).
     */
    setupInputHandling() {
         if (!this.player) {
            console.error("Cannot set up input: Local player sprite does not exist.");
            return;
        }

        console.log("Setting up input handling for player:", this.player.playerId);

        // Make the player sprite interactive
        this.player.setInteractive();

        // Enable dragging for the player sprite
        this.input.setDraggable(this.player);

        // Listen for drag start event
        this.input.on('dragstart', (pointer, gameObject) => {
            // Optional: Add visual feedback on drag start (e.g., slightly bigger, different tint)
             if (gameObject === this.player) {
                gameObject.setTint(0x00ff00); // Example: tint green on drag start
                this.isDragging = true;
                 console.log("Drag start on player");
            }
        });

        // Listen for drag event
        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
             if (gameObject === this.player) {
                // Update the local player sprite's position directly
                gameObject.x = dragX;
                gameObject.y = dragY;

                // Keep player within game bounds (optional)
                const bounds = this.physics.world.bounds;
                gameObject.x = Phaser.Math.Clamp(gameObject.x, gameObject.width / 2, bounds.width - gameObject.width / 2);
                gameObject.y = Phaser.Math.Clamp(gameObject.y, gameObject.height / 2, bounds.height - gameObject.height / 2);


                 // No need to emit continuously here, we do it in update if position changed
                 // console.log(`Dragging player to: ${dragX.toFixed(0)}, ${dragY.toFixed(0)}`); // Debug log
            }
        });

        // Listen for drag end event
        this.input.on('dragend', (pointer, gameObject) => {
            // Optional: Remove visual feedback on drag end
            if (gameObject === this.player) {
                gameObject.clearTint(); // Remove tint
                 this.isDragging = false;
                console.log("Drag end on player");
                 // Emit final position on drag end as well
                 this.emitPlayerMovement();
            }
        });

        // Initialize last position
        this.lastPosition = { x: this.player.x, y: this.player.y };

        console.log("Input handling setup complete.");
    }


    /**
     * Adds the local player's sprite to the scene.
     * @param {object} playerInfo - Information about the player { playerId, x, y }.
     */
    addPlayer(playerInfo) {
         console.log(`Adding local player: ${playerInfo.playerId} at (${playerInfo.x}, ${playerInfo.y})`);
        // Add the player sprite using the physics engine for potential collision later
        this.player = this.physics.add.sprite(playerInfo.x, playerInfo.y, 'playerSprite').setOrigin(0.5, 0.5);
        this.player.playerId = playerInfo.playerId; // Assign socket ID for reference
        this.player.setCollideWorldBounds(true); // Keep player within game bounds
        this.player.setDepth(1); // Ensure player is above background elements

        // Store initial position
        this.lastPosition = { x: playerInfo.x, y: playerInfo.y };

        console.log("Local player sprite created:", this.player);
    }

    /**
     * Adds another player's sprite to the scene.
     * @param {object} playerInfo - Information about the player { playerId, x, y }.
     */
    addOtherPlayer(playerInfo) {
         console.log(`Adding other player: ${playerInfo.playerId} at (${playerInfo.x}, ${playerInfo.y})`);
        // Check if player already exists to avoid duplicates
         if (this.otherPlayers[playerInfo.playerId]) {
             console.warn(`Player ${playerInfo.playerId} already exists.`);
             return;
         }

        const otherPlayer = this.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayerSprite').setOrigin(0.5, 0.5);
        otherPlayer.playerId = playerInfo.playerId;
        otherPlayer.setDepth(0); // Keep other players slightly behind local player visually
        this.otherPlayers[playerInfo.playerId] = otherPlayer; // Store reference
         console.log("Other player sprite created:", otherPlayer);
    }

    /**
     * Emits player movement to the server if position has changed.
     */
    emitPlayerMovement() {
        if (!this.player || !this.socket || !this.socket.connected) {
             // console.warn("Cannot emit movement: Player or socket not ready."); // Can be spammy
            return;
        }

        const currentPosition = { x: this.player.x, y: this.player.y };

        // Check if position has significantly changed to avoid flooding
        const distanceThreshold = 1; // Only send if moved at least 1 pixel
        if (Phaser.Math.Distance.Between(this.lastPosition.x, this.lastPosition.y, currentPosition.x, currentPosition.y) > distanceThreshold) {
            // console.log(`Emitting move: ${currentPosition.x.toFixed(0)}, ${currentPosition.y.toFixed(0)}`); // Debug log
            this.socket.emit('playerMove', currentPosition);
            this.lastPosition = currentPosition; // Update last sent position
        }
    }


    /**
     * Game loop, called repeatedly.
     * @param {number} time - The current time.
     * @param {number} delta - The delta time in ms since the last frame.
     */
    update(time, delta) {
        // Emit player movement if dragging or position changed significantly
        if (this.player && this.isDragging) {
             // Emit movement updates during drag
             this.emitPlayerMovement();
        }
        // Alternative: Constantly check and emit if not dragging but position changed
        // else if (this.player) {
        //    this.emitPlayerMovement();
        // }
    }
}

// Export the scene if using ES6 modules
// export default GameScene;
// If not using modules, ensure this class is available globally or included before main.js
window.GameScene = GameScene;
