// Main game file - imports and uses all modular components
import { GAME_CONFIG, LEVEL_TITLES } from './config.js';
import { formatTime, getRandomPosition, getRandomSpeed, pointToLineDistance, isPointInPolygon, calculatePolygonArea, calculatePolygonBounds } from './utils.js';
import { createPolygonFromLine } from './polygon-creators.js';
import { mergeSafeZones } from './zone-merger.js';
import { PowerUpSystem } from './power-ups.js';
import { Renderer } from './renderer.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentScreen = 'mainMenu';
        this.currentLevel = 1;
        this.score = 0;
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        this.unlockedLevels = 1;
        this.completedLevels = new Set();
        
        // Level titles
        this.levelTitles = LEVEL_TITLES;
        
        // Timer properties
        this.levelTime = 0;
        this.maxLevelTime = GAME_CONFIG.MAX_LEVEL_TIME;
        this.startTime = 0;
        
        // Game objects
        this.player = {
            x: 400,
            y: 300,
            radius: GAME_CONFIG.PLAYER_RADIUS,
            speed: GAME_CONFIG.PLAYER_SPEED,
            isInSafeZone: true,
            isDrawing: false,
            line: []
        };
        
        // AI player for level 6 and 7
        this.aiPlayer = {
            x: 400,
            y: 300,
            radius: GAME_CONFIG.PLAYER_RADIUS,
            speed: GAME_CONFIG.AI_PLAYER_SPEED,
            isInSafeZone: true,
            isDrawing: false,
            line: [],
            exitPosition: null,
            wanderAngle: Math.random() * Math.PI * 2
        };
        
        // Multiple AI players for level 7
        this.aiPlayers = [];
        
        this.safeZones = [];
        this.enemies = [];
        this.apples = [];
        this.lineSegments = [];
        
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        
        // Speedrun mode properties
        this.speedrunMode = false;
        this.levelStartTime = 0;
        this.totalSpeedrunTime = 0;
        this.levelTimes = [];
        this.speedrunStartLevel = 1;
        
        // Power-up system for level 11
        this.powerUpSystem = null;
        
        // Level 20: Wall system
        this.walls = [];
        this.wallLifespan = 35; // Walls last for 35 tile movements
        this.wallSpawnAttempts = 15; // Try 15 times to spawn walls
        this.wallMinDistance = 6; // Minimum distance from snake head in tiles
        
        // Renderer
        this.renderer = new Renderer(this.canvas);
        
        // Level 20 and 21: Snake properties
        this.snakeBody = [];
        this.snakeDirection = 'right';
        this.nextDirection = 'right';
        this.moveInterval = 135;
        this.lastMoveTime = 0;
        this.hasMoved = false;
        this.levelStartTime = 0;
        
        // Level 20 and 21: Input buffer for better responsiveness
        this.inputBuffer = [];
        this.maxInputBufferSize = 5; // Store up to 5 inputs for better buffering
        
        // Level 20 and 21: Animation properties
        this.isSnakeAnimating = false;
        this.snakeAnimationProgress = 0;
        this.snakeAnimationStartTime = 0;
        this.snakeAnimationDuration = 100; // 100ms animation
        this.snakeAnimationStartPositions = [];
        this.snakeAnimationEndPositions = [];
        
        // Level 20 and 21: Grace period properties
        this.gracePeriodActive = false;
        this.gracePeriodStartTime = 0;
        this.gracePeriodDuration = 100; // 100ms grace period
        this.gracePeriodKillingTile = null; // Store the tile that would kill the snake
        
        // Level 20 and 21: Independent input processing
        this.inputProcessingInterval = null;
        this.inputProcessingFrequency = 60; // Process inputs 60 times per second (16.67ms intervals)
        
        // Frame rate limiting for consistent gameplay (100fps for all levels except 20 and 21)
        this.targetFPS = 100;
        this.frameInterval = 1000 / this.targetFPS; // 10ms between frames
        this.lastFrameTime = 0;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.createLevelSelector();
        this.showScreen('mainMenu');
    }
    
    setupEventListeners() {
        // Menu navigation
        document.getElementById('startButton').addEventListener('click', () => {
            if (this.speedrunMode) {
                this.totalSpeedrunTime = 0;
                this.levelTimes = [];
                this.speedrunStartLevel = 1;
                this.startLevel(1);
            } else {
                this.showScreen('levelSelector');
            }
        });

        // Speedrun toggle
        document.getElementById('speedrunToggle').addEventListener('click', () => {
            this.speedrunMode = !this.speedrunMode;
            const button = document.getElementById('speedrunToggle');
            if (this.speedrunMode) {
                button.textContent = 'Speedrun Mode';
                button.classList.add('active');
            } else {
                button.textContent = 'Normal Mode';
                button.classList.remove('active');
            }
        });
        
        // Add other event listeners...
        this.setupGameEventListeners();
        this.setupInputEventListeners();
        this.setupSecretLevelsEventListeners();
    }
    
    setupGameEventListeners() {
        // Game control buttons
        const buttonIds = [
            'backToMenu', 'backToMenuFromPause', 'backToLevels', 'backToLevelsFromGameOver',
            'pauseButton', 'resumeButton', 'restartButton', 'restartFromPause', 'restartFromGameOver',
            'nextLevelButton', 'restartFromComplete', 'backToLevelsFromComplete'
        ];
        
        buttonIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', () => this.handleButtonClick(id));
            }
        });
    }
    
    setupInputEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            if (e.key === 'Escape' && this.gameState === 'playing') {
                this.pauseGame();
            }
            
                    // Level 20 and 21: Input buffering for better responsiveness
        if ((this.currentLevel === 20 || this.currentLevel === 21) && this.gameState === 'playing') {
            let direction = null;
            
            switch (e.key) {
                case 'w':
                case 'ArrowUp':
                    direction = 'up';
                    break;
                case 's':
                case 'ArrowDown':
                    direction = 'down';
                    break;
                case 'a':
                case 'ArrowLeft':
                    direction = 'left';
                    break;
                case 'd':
                case 'ArrowRight':
                    direction = 'right';
                    break;
            }
            
            if (direction) {
                // Start timer on first move
                if (!this.hasMoved) {
                    this.hasMoved = true;
                    this.levelStartTime = Date.now();
                }
                
                // Add to input buffer
                this.addToInputBuffer(direction);
            }
        }
            
            // Start drawing with spacebar when in safe zone
            if (e.key === ' ' && this.gameState === 'playing' && this.player.isInSafeZone && !this.player.isDrawing) {
                this.startDrawing();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            
            // Stop drawing when spacebar is released
            if (e.key === ' ' && this.gameState === 'playing' && this.player.isDrawing) {
                this.stopDrawing();
            }
        });
        
        // Mouse controls
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.gameState === 'playing') {
                //this.startDrawing();
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (this.gameState === 'playing') {
                //this.stopDrawing();
            }
        });
    }
    
    setupSecretLevelsEventListeners() {
        // Secret levels button
        const secretLevelsButton = document.getElementById('secretLevelsButton');
        if (secretLevelsButton) {
            secretLevelsButton.addEventListener('click', () => {
                this.showScreen('secretLevelsScreen');
                this.createSecretLevelSelector();
            });
        }
        
        // Back to level selector from secret levels
        const backToLevelSelector = document.getElementById('backToLevelSelector');
        if (backToLevelSelector) {
            backToLevelSelector.addEventListener('click', () => {
                this.showScreen('levelSelector');
            });
        }
    }
    
    handleButtonClick(buttonId) {
        switch (buttonId) {
            case 'backToMenu':
            case 'backToMenuFromPause':
                this.showScreen('mainMenu');
                break;
            case 'backToLevels':
            case 'backToLevelsFromPause':
            case 'backToLevelsFromGameOver':
                this.showScreen('levelSelector');
                this.gameState = 'menu';
                break;
            case 'pauseButton':
                this.pauseGame();
                break;
            case 'resumeButton':
                this.resumeGame();
                break;
            case 'restartButton':
            case 'restartFromPause':
            case 'restartFromGameOver':
            case 'restartFromComplete':
                this.restartLevel();
                break;
            case 'nextLevelButton':
                this.startLevel(this.currentLevel + 1);
                break;
            case 'backToLevelsFromComplete':
                this.showScreen('levelSelector');
                this.gameState = 'menu';
                break;
        }
    }
    
    createLevelSelector() {
        const levelGrid = document.getElementById('levelGrid');
        levelGrid.innerHTML = '';
        
        for (let i = 1; i <= 20; i++) {
            const levelButton = document.createElement('button');
            levelButton.className = 'level-button';
            
            // Create level number and title
            const levelNumber = document.createElement('div');
            levelNumber.className = 'level-number';
            levelNumber.textContent = i;
            
            const levelTitle = document.createElement('div');
            levelTitle.className = 'level-title';
            levelTitle.textContent = this.levelTitles[i] || `Level ${i}`;
            
            levelButton.appendChild(levelNumber);
            levelButton.appendChild(levelTitle);
            
                         if (i > this.unlockedLevels) {
                 levelButton.classList.add('locked');
             } else if (this.completedLevels.has(i)) {
                 levelButton.classList.add('completed');
             } else if (i >= 16 && i <= 20) {
                 levelButton.classList.add('advanced');
             }
            
            levelButton.addEventListener('click', () => {
                if (i <= this.unlockedLevels) {
                    this.startLevel(i);
                }
            });
            
            levelGrid.appendChild(levelButton);
        }
        
        // Show secret levels button only if Level 20 is completed
        const secretLevelsButton = document.getElementById('secretLevelsButton');
        if (this.completedLevels.has(20)) {
            secretLevelsButton.style.display = 'block';
        } else {
            secretLevelsButton.style.display = 'none';
        }
    }
    
    createSecretLevelSelector() {
        const secretLevelGrid = document.getElementById('secretLevelGrid');
        secretLevelGrid.innerHTML = '';
        
        // Add Level 21
        const levelButton = document.createElement('button');
        levelButton.className = 'level-button';
        
        // Create level number and title
        const levelNumber = document.createElement('div');
        levelNumber.className = 'level-number';
        levelNumber.textContent = '21';
        
        const levelTitle = document.createElement('div');
        levelTitle.className = 'level-title';
        levelTitle.textContent = this.levelTitles[21] || 'Level 21';
        
        levelButton.appendChild(levelNumber);
        levelButton.appendChild(levelTitle);
        
        // Level 21 is always unlocked if Level 20 is completed
        if (this.completedLevels.has(21)) {
            levelButton.classList.add('completed');
        }
        
        levelButton.addEventListener('click', () => {
            this.startLevel(21);
        });
        
        secretLevelGrid.appendChild(levelButton);
    }
    
    showScreen(screenName) {
        // Stop independent input processing when leaving game screen for levels 20 and 21
        if ((screenName === 'mainMenu' || screenName === 'levelSelector' || screenName === 'secretLevelsScreen') && 
            (this.currentLevel === 20 || this.currentLevel === 21)) {
            this.stopIndependentInputProcessing();
        }
        
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        document.getElementById(screenName).classList.add('active');
        this.currentScreen = screenName;
        
        if (screenName === 'levelSelector') {
            this.createLevelSelector();
        } else if (screenName === 'secretLevelsScreen') {
            this.createSecretLevelSelector();
        }
    }
    
    startLevel(level) {
        // Stop independent input processing if switching from levels 20 or 21
        if (this.currentLevel === 20 || this.currentLevel === 21) {
            this.stopIndependentInputProcessing();
        }
        
        this.currentLevel = level;
        this.score = 0;
        this.gameState = 'playing';
        this.showScreen('gameScreen');
        
        // Reset level timer for all modes
        this.levelStartTime = Date.now();
        
        // Reset Level 20 and 21 specific properties
        if (this.currentLevel === 20 || this.currentLevel === 21) {
            this.hasMoved = false;
        }
        
        this.initializeLevel();
        this.gameLoop();
    }
    
    initializeLevel() {
        // Reset game objects
        this.resetGameObjects();
        
        // Create initial safe zone (skip for level 21)
        if (this.currentLevel !== 21) {
            this.safeZones.push({
                type: 'rectangle',
                x: GAME_CONFIG.INITIAL_SAFE_ZONE.x,
                y: GAME_CONFIG.INITIAL_SAFE_ZONE.y,
                width: GAME_CONFIG.INITIAL_SAFE_ZONE.width,
                height: GAME_CONFIG.INITIAL_SAFE_ZONE.height
            });
        }
        
        // Level-specific setup
        this.setupLevelSpecificContent();
        
        this.updateDisplay();
    }
    
    resetGameObjects() {
        // Reset player
        this.player.x = 400;
        this.player.y = 300;
        this.player.isInSafeZone = true;
        this.player.isDrawing = false;
        this.player.line = [];
        this.player.exitPosition = null;
        this.player.currentDirection = 'none'; // Reset direction for Level 16
        
        // Reset AI player
        this.aiPlayer.x = 400;
        this.aiPlayer.y = 300;
        this.aiPlayer.isInSafeZone = true;
        this.aiPlayer.isDrawing = false;
        this.aiPlayer.line = [];
        this.aiPlayer.exitPosition = null;
        this.aiPlayer.wanderAngle = Math.random() * Math.PI * 2;
        
        // Reset arrays
        this.aiPlayers = [];
        this.safeZones = [];
        this.enemies = [];
        this.apples = [];
        this.lineSegments = [];
        
        // Level 20: Reset walls
        this.walls = [];
        
        // Level 20 and 21: Reset input buffer
        this.inputBuffer = [];
        
        // Level 20 and 21: Reset grace period
        this.gracePeriodActive = false;
        this.gracePeriodStartTime = 0;
        this.gracePeriodKillingTile = null;
        
        // Level 15: Reset enemy movement tracking
        this.enemyLastPositions = new Map();
        
        // Reset timer
        this.levelTime = 0;
        this.startTime = Date.now();
        
        // Reset shrinking timer for level 13 and 14
        this.shrinkingTimer = null;
        
        // Reset power-up system for Level 11, 13, 15, 16, 18, and 19
        if (this.currentLevel === 11 || this.currentLevel === 13 || this.currentLevel === 15 || this.currentLevel === 16 || this.currentLevel === 18 || this.currentLevel === 19) {
            this.powerUpSystem = new PowerUpSystem(this.canvas, (x, y) => this.isPositionInSafeZone(x, y), this.currentLevel);
            this.powerUpSystem.spawnPowerUp(); // Spawn initial power-up
        } else {
            this.powerUpSystem = null;
        }
    }
    
    setupLevelSpecificContent() {
        if (this.currentLevel === 6) {
            this.setupLevel6();
        } else if (this.currentLevel === 7) {
            this.setupLevel7();
        } else if (this.currentLevel === 9) {
            this.setupLevel9();
        } else if (this.currentLevel === 10) {
            this.setupLevel10();
        } else if (this.currentLevel === 11) {
            this.setupLevel11();
        } else if (this.currentLevel === 12) {
            this.setupLevel12();
        } else if (this.currentLevel === 13) {
            this.setupLevel13();
        } else if (this.currentLevel === 14) {
            this.setupLevel14();
        } else if (this.currentLevel === 15) {
            this.setupLevel15();
        } else if (this.currentLevel === 16) {
            this.setupLevel16();
        } else if (this.currentLevel === 17) {
            this.setupLevel17();
        } else if (this.currentLevel === 18) {
            this.setupLevel18();
        } else if (this.currentLevel === 19) {
            this.setupLevel19();
        } else if (this.currentLevel === 20) {
            this.setupLevel20();
        } else if (this.currentLevel === 21) {
            this.setupLevel21(); // Level 21 uses similar setup as Level 20 but keeps level 21
        } else {
            this.setupRegularLevel();
        }
    }
    
    setupLevel6() {
        // Position AI player away from the player
        this.aiPlayer.x = 600;
        this.aiPlayer.y = 400;
        this.aiPlayer.isInSafeZone = false;
        this.aiPlayer.wanderAngle = Math.random() * Math.PI * 2;
    }
    
    setupLevel7() {
        // Start with one AI player
        this.aiPlayer.x = 600;
        this.aiPlayer.y = 400;
        this.aiPlayer.isInSafeZone = false;
        this.aiPlayer.wanderAngle = Math.random() * Math.PI * 2;
    }
    
    setupLevel9() {
        // Create AI enemies that can be hunted
        this.createAIEnemies(4);
    }
    
    setupLevel10() {
        // Create regular enemies like level 8
        this.createEnemies(4);
    }
    
    setupLevel11() {
        // Create enemies that become moving apples when enclosed
        this.createEnemies(3);
    }
    
    setupLevel12() {
        // Create regular enemies like level 8
        this.createEnemies(4);
    }
    
    setupLevel13() {
        // Create enemies like level 11 (3 enemies)
        this.createEnemies(3);
    }
    
    setupLevel14() {
        // Create enemies like level 4 (2 enemies)
        this.createEnemies(2);
    }
    
    setupLevel15() {
        // Create enemies like level 11 (3 enemies)
        this.createEnemies(3);
    }
    
    setupLevel16() {
        // Create 4 ghost enemies for Pacman level
        this.enemies = [
            {
                x: this.canvas.width / 4,
                y: this.canvas.height / 4,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            },
            {
                x: this.canvas.width * 3 / 4,
                y: this.canvas.height / 4,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            },
            {
                x: this.canvas.width / 4,
                y: this.canvas.height * 3 / 4,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            },
            {
                x: this.canvas.width * 3 / 4,
                y: this.canvas.height * 3 / 4,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            }
        ];
    }
    
    setupLevel17() {
        // Create 3 regular enemies for Level 17 (same as Level 16 but with normal enemies)
        this.enemies = [
            {
                x: this.canvas.width / 4,
                y: this.canvas.height / 4,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            },
            {
                x: this.canvas.width * 3 / 4,
                y: this.canvas.height / 4,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            },
            {
                x: this.canvas.width / 4,
                y: this.canvas.height * 3 / 4,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            }
        ];
    }
    
    setupLevel18() {
        // Create 8 regular enemies for Level 18 (same as Level 17 but with power-ups for player only)
        this.enemies = [
            {
                x: this.canvas.width / 4,
                y: this.canvas.height / 4,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            },
            {
                x: this.canvas.width * 3 / 4,
                y: this.canvas.height / 4,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            },
            {
                x: this.canvas.width / 4,
                y: this.canvas.height * 3 / 4,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            },
            {
                x: this.canvas.width * 3 / 4,
                y: this.canvas.height * 3 / 4,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            },
            {
                x: this.canvas.width / 2,
                y: this.canvas.height / 4,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            },
            {
                x: this.canvas.width / 2,
                y: this.canvas.height * 3 / 4,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            },
            {
                x: this.canvas.width / 4,
                y: this.canvas.height / 2,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            },
            {
                x: this.canvas.width * 3 / 4,
                y: this.canvas.height / 2,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            }
        ];
    }
    
    setupLevel19() {
        // Create 3 regular enemies for Level 19 (same as Level 18 but enemies can use power-ups + board shrinks)
        this.enemies = [
            {
                x: this.canvas.width / 4,
                y: this.canvas.height / 4,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            },
            {
                x: this.canvas.width * 3 / 4,
                y: this.canvas.height / 4,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            },
            {
                x: this.canvas.width / 4,
                y: this.canvas.height * 3 / 4,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            }
        ];
    }
    
    setupLevel20() {
        this.currentLevel = 20;
        this.gameState = 'playing';
        this.score = 0;
        this.levelStartTime = Date.now();
        this.hasMoved = false; // Track if player has made first move
        
        // Grid setup
        this.gridCols = 10;
        this.gridRows = 9;
        this.tileWidth = this.canvas.width / this.gridCols;
        this.tileHeight = this.canvas.height / this.gridRows;
        
        // Snake setup - start at column 2 (more space from walls)
        const startX = 2;
        const startY = Math.floor(this.gridRows / 2);
        
        this.snakeBody = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY }
        ];
        
        this.snakeLength = 3; // Initialize snake length
        this.snakeDirection = 'right';
        this.nextDirection = 'right';
        this.lastMoveTime = 0;
        this.moveInterval = 135;
        
        // Level 20: Reset walls
        this.walls = [];
        
        // Spawn first apple at fixed position (3 tiles from right wall)
        this.spawnLevel20Apple(true);
        
        // Initialize animation properties
        this.snakeAnimationProgress = 0;
        this.snakeAnimationDuration = 135; // Same as move interval
        this.snakeAnimationStartTime = 0;
        this.snakeAnimationStartPositions = [];
        this.snakeAnimationEndPositions = [];
        this.isSnakeAnimating = false;
        
        // Start independent input processing
        this.startIndependentInputProcessing();
    }
    
    setupLevel21() {
        // Level 21 uses the same mechanics as Level 20 but keeps level 21
        this.gameState = 'playing';
        this.score = 0;
        this.levelStartTime = Date.now();
        this.hasMoved = false; // Track if player has made first move
        
        // Grid setup
        this.gridCols = 10;
        this.gridRows = 9;
        this.tileWidth = this.canvas.width / this.gridCols;
        this.tileHeight = this.canvas.height / this.gridRows;
        
        // Snake setup - start at column 2 (more space from walls)
        const startX = 2;
        const startY = Math.floor(this.gridRows / 2);
        
        this.snakeBody = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY }
        ];
        
        this.snakeLength = 3; // Initialize snake length
        this.snakeDirection = 'right';
        this.nextDirection = 'right';
        this.lastMoveTime = 0;
        this.moveInterval = 135;
        
        // Level 21: Reset walls
        this.walls = [];
        
        // Spawn first apple at fixed position (3 tiles from right wall)
        this.spawnLevel20Apple(true);
        
        // Initialize animation properties
        this.snakeAnimationProgress = 0;
        this.snakeAnimationDuration = 270; // Same as move interval
        this.snakeAnimationStartTime = 0;
        this.snakeAnimationStartPositions = [];
        this.snakeAnimationEndPositions = [];
        this.isSnakeAnimating = false;
        
        // Start independent input processing
        this.startIndependentInputProcessing();
    }
    
    setupRegularLevel() {
        // Create enemies based on level
        let enemyCount = Math.min(3 + Math.floor(this.currentLevel / 2), 8);
        if (this.currentLevel === 4) {
            enemyCount = 2; // Level 4 has only 2 enemies
        }
        
        if (this.currentLevel <= 5) {
            this.createFixedPositionEnemies(enemyCount);
        } else {
            this.createRandomPositionEnemies(enemyCount);
        }
    }
    
    createEnemies(count) {
        for (let i = 0; i < count; i++) {
            const position = getRandomPosition(this.canvas, this.safeZones, (x, y) => this.isPositionInSafeZone(x, y));
            this.enemies.push({
                x: position.x,
                y: position.y,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            });
        }
    }
    
    createAIEnemies(count) {
        for (let i = 0; i < count; i++) {
            const position = getRandomPosition(this.canvas, this.safeZones, (x, y) => this.isPositionInSafeZone(x, y));
            this.enemies.push({
                x: position.x,
                y: position.y,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2,
                isAI: true,
                fleeRange: 100
            });
        }
    }
    
    createFixedPositionEnemies(count) {
        const fixedPositions = [
            { x: 150, y: 150 },
            { x: 650, y: 150 },
            { x: 150, y: 450 },
            { x: 650, y: 450 },
            { x: 400, y: 100 },
            { x: 400, y: 500 },
            { x: 100, y: 300 },
            { x: 700, y: 300 }
        ];
        
        for (let i = 0; i < count; i++) {
            const position = fixedPositions[i];
            this.enemies.push({
                x: position.x,
                y: position.y,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            });
        }
    }
    
    createRandomPositionEnemies(count) {
        for (let i = 0; i < count; i++) {
            const position = getRandomPosition(this.canvas, this.safeZones, (x, y) => this.isPositionInSafeZone(x, y));
            this.enemies.push({
                x: position.x,
                y: position.y,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            });
        }
    }
    
    startDrawing() {
        // Level 6 and 7: Player cannot draw (they are the enemy)
        if (this.currentLevel === 6 || this.currentLevel === 7) {
            return;
        }
        
        // Can start drawing when in a safe zone and not already drawing
        if (this.player.isInSafeZone && !this.player.isDrawing) {
            this.player.isDrawing = true;
            this.player.line = [{ x: this.player.x, y: this.player.y }];
        }
    }
    
    stopDrawing() {
        // Only stop drawing, don't close area automatically
        // Area will be closed when player re-enters a safe zone
        this.player.isDrawing = false;
        this.player.line = [];
    }
    
    onExitSafeZone() {
        if (!this.player.isDrawing) {
            this.player.isDrawing = true;
            // Store the exit position (where player was when they left the safe zone)
            this.player.exitPosition = { x: this.player.x, y: this.player.y };
            this.player.line = [{ x: this.player.exitPosition.x, y: this.player.exitPosition.y }];
        }
    }
    
         closeArea() {
         // Create a new safe zone from the drawn line
         const points = [...this.player.line];
         if (points.length > 2) {
             // Level 9: Special case - don't create new areas, just convert enemies to apples and add score
             if (this.currentLevel === 9) {
                 // Create a temporary polygon to check for enemies and calculate area
                 const polygon = createPolygonFromLine(points, this.currentLevel, this.player, this.safeZones);
                 
                 // Check for enemies trapped inside the polygon
                 for (let i = this.enemies.length - 1; i >= 0; i--) {
                     const enemy = this.enemies[i];
                     if (isPointInPolygon(enemy.x, enemy.y, polygon)) {
                         // Convert enemy to apple
                         this.apples.push({
                             x: enemy.x,
                             y: enemy.y,
                             radius: GAME_CONFIG.APPLE_RADIUS,
                             points: GAME_CONFIG.LEVEL_9_APPLE_POINTS
                         });
                         this.enemies.splice(i, 1);
                     }
                 }
                 
                 // Add score for capturing area (but don't create the actual safe zone)
                 const area = calculatePolygonArea(polygon);
                 const areaScore = Math.floor(area / 50);
                 this.score += areaScore;
             } else if (this.currentLevel === 2 || this.currentLevel === 3 || this.currentLevel === 4 || 
                 this.currentLevel === 5 || this.currentLevel === 8 || 
                 this.currentLevel === 10 || this.currentLevel === 11 || this.currentLevel === 12 || 
                 this.currentLevel === 13 || this.currentLevel === 14 ||                 this.currentLevel === 15 || 
                 this.currentLevel === 16 || this.currentLevel === 17 || this.currentLevel === 18 || this.currentLevel === 19) {
                 // For polygon levels, create a proper polygon area
                 const polygon = createPolygonFromLine(points, this.currentLevel, this.player, this.safeZones);
                 const newSafeZone = {
                     type: 'polygon',
                     points: polygon,
                     bounds: calculatePolygonBounds(polygon)
                 };
                 
                 // For level 5 and 14, make safe zones temporary (8 seconds) unless an enemy was killed
                 if (this.currentLevel === 5 || this.currentLevel === 14) {
                     newSafeZone.temporary = true;
                     newSafeZone.createdAt = Date.now();
                     newSafeZone.lifespan = 8000; // 8 seconds
                     newSafeZone.enemyKilled = false; // Track if enemy was killed in this zone
                 }
                 
                 // For level 12, the merged polygon will be marked as temporary after merging
                 // (The timer is set in the mergeSafeZones function for Level 12)
                 
                 // Level 4, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17: Merge with existing safe zones
                 if (this.currentLevel === 4 || this.currentLevel === 7 || this.currentLevel === 8 || 
                                     this.currentLevel === 10 || this.currentLevel === 11 || 
                 this.currentLevel === 12 || this.currentLevel === 13 || this.currentLevel === 14 || 
                 this.currentLevel === 15 || this.currentLevel === 16 || this.currentLevel === 17 || this.currentLevel === 18 || this.currentLevel === 19) {
                     this.safeZones = mergeSafeZones(newSafeZone, this.currentLevel, this.safeZones, this.enemies, this.apples);
                 } else {
                     this.safeZones.push(newSafeZone);
                 }
                 
                 // Check for enemies trapped inside the polygon
                 for (let i = this.enemies.length - 1; i >= 0; i--) {
                     const enemy = this.enemies[i];
                     if (isPointInPolygon(enemy.x, enemy.y, polygon)) {
                         // Convert enemy to apple for all levels
                         const points = this.currentLevel === 9 ? GAME_CONFIG.LEVEL_9_APPLE_POINTS : GAME_CONFIG.REGULAR_APPLE_POINTS;
                         this.apples.push({
                             x: enemy.x,
                             y: enemy.y,
                             radius: GAME_CONFIG.APPLE_RADIUS,
                             points: points
                         });
                         this.enemies.splice(i, 1);
                         
                         // Level 11, 13, and 15: Check if all enemies are gone
                         if ((this.currentLevel === 11 || this.currentLevel === 13 || this.currentLevel === 15) && this.enemies.length === 0) {
                             //console.log(`Level ${this.currentLevel}: All enemies removed! Completing level...`);
                             this.completeLevel();
                             return;
                         }
                         
                         // For level 5, mark the zone as permanent if an enemy was killed
                         if (this.currentLevel === 5 && newSafeZone.temporary) {
                             newSafeZone.enemyKilled = true;
                             newSafeZone.temporary = false;
                         }
                         // For level 14, zones remain temporary even after killing enemies (they still shrink)
                     }
                 }
                 
                 // Add score for capturing area
                 const area = calculatePolygonArea(polygon);
                 const areaScore = this.currentLevel === 9 ? Math.floor(area / 50) : Math.floor(area / 100);
                 this.score += areaScore;
            } else {
                // For other levels, use rectangle areas
                let minX = Math.min(...points.map(p => p.x));
                let maxX = Math.max(...points.map(p => p.x));
                let minY = Math.min(...points.map(p => p.y));
                let maxY = Math.max(...points.map(p => p.y));
                
                // Add some padding
                const padding = 20;
                const newSafeZone = {
                    type: 'rectangle',
                    x: minX - padding,
                    y: minY - padding,
                    width: maxX - minX + padding * 2,
                    height: maxY - minY + padding * 2
                };
                
                this.safeZones.push(newSafeZone);
                
                // Check for enemies trapped inside the new safe zone
                for (let i = this.enemies.length - 1; i >= 0; i--) {
                    const enemy = this.enemies[i];
                    if (enemy.x >= newSafeZone.x && enemy.x <= newSafeZone.x + newSafeZone.width &&
                        enemy.y >= newSafeZone.y && enemy.y <= newSafeZone.y + newSafeZone.height) {
                        // Convert enemy to apple
                        this.apples.push({
                            x: enemy.x,
                            y: enemy.y,
                            radius: GAME_CONFIG.APPLE_RADIUS,
                            points: GAME_CONFIG.REGULAR_APPLE_POINTS
                        });
                        this.enemies.splice(i, 1);
                    }
                }
                
                // Add score for capturing area
                const area = (maxX - minX) * (maxY - minY);
                const areaScore = this.currentLevel === 9 ? Math.floor(area / 50) : Math.floor(area / 100);
                this.score += areaScore;
            }
        }
        
        this.player.line = [];
        this.player.isDrawing = false;
        this.updateDisplay();
    }
    
    checkSafeZone() {
        // Level 6 and 7: Player doesn't use safe zones (they are the enemy)
        if (this.currentLevel === 6 || this.currentLevel === 7) {
            this.player.isInSafeZone = false;
            return;
        }
        
        const wasInSafeZone = this.player.isInSafeZone;
        this.player.isInSafeZone = false;
        
        for (const zone of this.safeZones) {
            if (zone.type === 'polygon') {
                if (isPointInPolygon(this.player.x, this.player.y, zone.points)) {
                    this.player.isInSafeZone = true;
                    break;
                }
            } else {
                // Rectangle zone
                if (this.player.x >= zone.x && this.player.x <= zone.x + zone.width &&
                    this.player.y >= zone.y && this.player.y <= zone.y + zone.height) {
                    this.player.isInSafeZone = true;
                    break;
                }
            }
        }
        
        // If player just exited a safe zone, start drawing
        if (wasInSafeZone && !this.player.isInSafeZone) {
            this.onExitSafeZone();
        }
        
        // If player just entered a safe zone and was drawing, close the area
        if (!wasInSafeZone && this.player.isInSafeZone && this.player.isDrawing && this.player.line.length > 2) {
            this.closeArea();
        }
    }
    
    checkCollisions() {
        // Level 6 and 7: Player (blue enemy) catches AI player(s)
        if (this.currentLevel === 6) {
            const distance = Math.sqrt(
                Math.pow(this.player.x - this.aiPlayer.x, 2) + 
                Math.pow(this.player.y - this.aiPlayer.y, 2)
            );
            
            if (distance < this.player.radius + this.aiPlayer.radius) {
                this.playerWins();
                return;
            }
        } else if (this.currentLevel === 7) {
            // Check collision with main AI player
            const distance = Math.sqrt(
                Math.pow(this.player.x - this.aiPlayer.x, 2) + 
                Math.pow(this.player.y - this.aiPlayer.y, 2)
            );
            
            if (distance < this.player.radius + this.aiPlayer.radius) {
                this.catchAI(this.aiPlayer); // Call catchAI for main AI
                return;
            }
            
            // Check collisions with additional AI players
            for (let i = this.aiPlayers.length - 1; i >= 0; i--) {
                const ai = this.aiPlayers[i];
                const distance = Math.sqrt(
                    Math.pow(this.player.x - ai.x, 2) + 
                    Math.pow(this.player.y - ai.y, 2)
                );
                
                if (distance < this.player.radius + ai.radius) {
                    this.catchAI(ai, i); // Call catchAI for additional AI
                    return;
                }
            }
        } else {
            // Check enemy collisions for other levels
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                const distance = Math.sqrt(
                    Math.pow(this.player.x - enemy.x, 2) + 
                    Math.pow(this.player.y - enemy.y, 2)
                );
                
                if (distance < this.player.radius + enemy.radius) {
                    // Level 16: Check if ghosts are vulnerable and can be eaten
                    if (this.currentLevel === 16 && this.powerUpSystem && this.powerUpSystem.areGhostsVulnerable()) {
                        // Eat the ghost
                        this.enemies.splice(i, 1);
                        this.score += 200;
                        this.updateDisplay();
                        continue;
                    }
                    
                    // Level 11, 13, 15, 18, and 19: Check if player is invincible
                    if ((this.currentLevel === 11 || this.currentLevel === 13 || this.currentLevel === 15 || this.currentLevel === 18 || this.currentLevel === 19) && this.powerUpSystem && this.powerUpSystem.isPlayerInvincible()) {
                        // Player is invincible, ignore collision
                    } else {
                        this.gameOver();
                        return;
                    }
                }
            }
        }
        
        // Check line collision with enemies
        if (this.player.isDrawing && this.player.line.length > 1) {
            for (const enemy of this.enemies) {
                for (let i = 1; i < this.player.line.length; i++) {
                    const lineStart = this.player.line[i - 1];
                    const lineEnd = this.player.line[i];
                    
                    const distance = pointToLineDistance(
                        enemy.x, enemy.y,
                        lineStart.x, lineStart.y,
                        lineEnd.x, lineEnd.y
                    );
                    
                    if (distance < enemy.radius) {
                        // Level 11, 13, 15, 18, and 19: Check if player is invincible
                        if ((this.currentLevel === 11 || this.currentLevel === 13 || this.currentLevel === 15 || this.currentLevel === 18 || this.currentLevel === 19) && this.powerUpSystem && this.powerUpSystem.isPlayerInvincible()) {
                             // Player is invincible, ignore collision
                        } else {
                            this.gameOver();
                            return;
                        }
                    }
                }
            }
        }
        
        // Check apple collection
        for (let i = this.apples.length - 1; i >= 0; i--) {
            const apple = this.apples[i];
            const distance = Math.sqrt(
                Math.pow(this.player.x - apple.x, 2) + 
                Math.pow(this.player.y - apple.y, 2)
            );
            
            if (distance < this.player.radius + apple.radius) {
                this.score += apple.points;
                this.apples.splice(i, 1);
                
                // Level 20: Handle snake apple collection
                if (this.currentLevel === 20) {
                    this.snakeLength++; // Increase snake length
                    this.spawnLevel20Apple(false); // Spawn new apple
                    
                    // Check win condition - 25 apples eaten
                    if (this.snakeLength >= 28) { // 3 initial + 25 apples = 28
                        this.completeLevel();
                        return;
                    }
                } else if (this.currentLevel === 21) {
                    this.snakeLength++; // Increase snake length
                    const appleSpawned = this.spawnLevel20Apple(false); // Spawn new apple
                    
                    // Check win condition - when no apple can spawn
                    if (!appleSpawned || !this.canSpawnLevel20Apple()) {
                        this.completeLevel();
                        return;
                    }
                } else {
                    this.respawnEnemy(); // Respawn enemy for level 4
                }
                
                this.updateDisplay();
                
                // Level 9: Check if score target is reached
                if (this.currentLevel === 9 && this.score >= GAME_CONFIG.LEVEL_9_SCORE_TARGET) {
                    this.completeLevel();
                    return;
                }
            }
        }
        
                 // Check power-up collection (Level 11, 13, 15, 16, 18, and 19)
         if ((this.currentLevel === 11 || this.currentLevel === 13 || this.currentLevel === 15 || this.currentLevel === 16 || this.currentLevel === 18 || this.currentLevel === 19) && this.powerUpSystem) {
            if (this.powerUpSystem.checkPowerUpCollection(this.player)) {
                this.updateDisplay();
            }
            
            // Level 15 and 19: Check enemy power-up collection
            if (this.currentLevel === 15 || this.currentLevel === 19) {
                const enemyPowerUpResult = this.powerUpSystem.checkEnemyPowerUpCollection(this.enemies);
                if (enemyPowerUpResult) {
                    if (enemyPowerUpResult.type === 'split') {
                        // Create a duplicate enemy
                        const originalEnemy = this.enemies[enemyPowerUpResult.enemyId];
                        if (originalEnemy) {
                            const newEnemy = {
                                x: originalEnemy.x,
                                y: originalEnemy.y,
                                radius: originalEnemy.radius,
                                speed: originalEnemy.speed,
                                wanderAngle: Math.random() * Math.PI * 2
                            };
                            this.enemies.push(newEnemy);
                        }
                    }
                    this.updateDisplay();
                }
            }
        }
        
        // Level 11, 13, and 19: Check win condition (all enemies removed)
        if ((this.currentLevel === 11 || this.currentLevel === 13 || this.currentLevel === 19) && this.enemies.length === 0) {
            this.completeLevel();
            return;
        }
    }
    
    updatePlayer() {
        let dx = 0;
        let dy = 0;
        
                 // Calculate current speed (with power-up boost for Level 11, 13, 15, 16, 18, and 19)
         let currentSpeed = this.player.speed;
         if ((this.currentLevel === 11 || this.currentLevel === 13 || this.currentLevel === 15 || this.currentLevel === 16 || this.currentLevel === 18 || this.currentLevel === 19) && this.powerUpSystem) {
            currentSpeed *= this.powerUpSystem.getPlayerSpeedMultiplier();
        }
        
        // Level 16, 17, 18, 19, and 20: Cardinal direction movement with continuous movement
        if (this.currentLevel === 16 || this.currentLevel === 17 || this.currentLevel === 18 || this.currentLevel === 19 || this.currentLevel === 20) {
            // Initialize player direction if not set
            if (!this.player.currentDirection) {
                this.player.currentDirection = 'none';
            }
            
            // Check for new direction input
            if (this.keys['w'] || this.keys['ArrowUp']) {
                this.player.currentDirection = 'up';
            } else if (this.keys['s'] || this.keys['ArrowDown']) {
                this.player.currentDirection = 'down';
            } else if (this.keys['a'] || this.keys['ArrowLeft']) {
                this.player.currentDirection = 'left';
            } else if (this.keys['d'] || this.keys['ArrowRight']) {
                this.player.currentDirection = 'right';
            }
            
            // Level 20: Special snake movement
            if (this.currentLevel === 20) {
                // Snake movement is handled in updateLevel20Snake()
                return; // Skip normal movement for Level 20
            }
            
            // Apply movement based on current direction
            switch (this.player.currentDirection) {
                case 'up':
                    dy -= currentSpeed;
                    break;
                case 'down':
                    dy += currentSpeed;
                    break;
                case 'left':
                    dx -= currentSpeed;
                    break;
                case 'right':
                    dx += currentSpeed;
                    break;
            }
        } else {
            // Normal movement for other levels
            if (this.keys['w'] || this.keys['ArrowUp']) dy -= currentSpeed;
            if (this.keys['s'] || this.keys['ArrowDown']) dy += currentSpeed;
            if (this.keys['a'] || this.keys['ArrowLeft']) dx -= currentSpeed;
            if (this.keys['d'] || this.keys['ArrowRight']) dx += currentSpeed;
            
            // Normalize diagonal movement
            if (dx !== 0 && dy !== 0) {
                dx *= 0.707;
                dy *= 0.707;
            }
        }
        
        this.player.x += dx;
        this.player.y += dy;
        
        // Keep player in bounds
        this.player.x = Math.max(this.player.radius, Math.min(this.canvas.width - this.player.radius, this.player.x));
        this.player.y = Math.max(this.player.radius, Math.min(this.canvas.height - this.player.radius, this.player.y));
        
        // Update drawing line
        if (this.player.isDrawing) {
            // Only add new point if it's different from the last point and not the exit position
            const lastPoint = this.player.line[this.player.line.length - 1];
            const distanceFromLast = lastPoint ? Math.sqrt(
                Math.pow(this.player.x - lastPoint.x, 2) + 
                Math.pow(this.player.y - lastPoint.y, 2)
            ) : 0;
            
            // Add point if we've moved at least 3 pixels from the last point
            if (distanceFromLast > 3) {
                this.player.line.push({ x: this.player.x, y: this.player.y });
            }
        }
        
        this.checkSafeZone();
        
        // Check if player hits their own line
        if (this.player.isDrawing && this.player.line.length > 5) {
            // Skip the first few points to avoid collision with exit position
            for (let i = 2; i < this.player.line.length - 2; i++) {
                const lineStart = this.player.line[i];
                const lineEnd = this.player.line[i + 1];
                
                const distance = pointToLineDistance(
                    this.player.x, this.player.y,
                    lineStart.x, lineStart.y,
                    lineEnd.x, lineEnd.y
                );
                
                                 // Only check if player center is very close to the line (within 2 pixels)
                 if (distance < 2) {
                     // Level 11, 13, 15, 16, 18, and 19: Check if player is invincible
                     if ((this.currentLevel === 11 || this.currentLevel === 13 || this.currentLevel === 15 || this.currentLevel === 16 || this.currentLevel === 18 || this.currentLevel === 19) && this.powerUpSystem && this.powerUpSystem.isPlayerInvincible()) {
                         // Player is invincible, ignore collision
                     } else {
                         this.gameOver();
                         return;
                     }
                 }
            }
        }
    }
    
    updateEnemies() {
        for (const enemy of this.enemies) {
            // Level 16: Special enemy behavior for Pacman
            if (this.currentLevel === 16) {
                this.updateLevel16Enemy(enemy);
                continue;
            }
            
            // Level 15: Track enemy position to prevent staying still
            if (this.currentLevel === 15) {
                const enemyId = this.enemies.indexOf(enemy);
                const currentPos = { x: enemy.x, y: enemy.y };
                
                if (!this.enemyLastPositions.has(enemyId)) {
                    this.enemyLastPositions.set(enemyId, { pos: currentPos, frames: 0 });
                } else {
                    const lastData = this.enemyLastPositions.get(enemyId);
                    const distance = Math.sqrt(
                        Math.pow(currentPos.x - lastData.pos.x, 2) + 
                        Math.pow(currentPos.y - lastData.pos.y, 2)
                    );
                    
                    if (distance < 1) { // Enemy hasn't moved significantly
                        lastData.frames++;
                        if (lastData.frames >= 2) { // Force movement after 2 frames
                            enemy.x += Math.cos(enemy.wanderAngle) * enemy.speed * 0.5;
                            enemy.y += Math.sin(enemy.wanderAngle) * enemy.speed * 0.5;
                            enemy.wanderAngle = Math.random() * Math.PI * 2;
                            lastData.frames = 0;
                        }
                    } else {
                        lastData.frames = 0;
                    }
                    lastData.pos = { x: enemy.x, y: enemy.y };
                }
            }
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // For level 9, AI enemies flee from player like in level 6/7
            if (this.currentLevel === 9 && enemy.isAI) {
                // AI enemy behavior - tries to avoid the player
                const fleeRange = enemy.fleeRange || 100;
                
                if (distance < fleeRange) {
                    // Flee from player if too close
                    const fleeX = enemy.x - (dx / distance) * enemy.speed;
                    const fleeY = enemy.y - (dy / distance) * enemy.speed;
                    
                    if (fleeX >= enemy.radius && fleeX <= this.canvas.width - enemy.radius &&
                        fleeY >= enemy.radius && fleeY <= this.canvas.height - enemy.radius) {
                        enemy.x = fleeX;
                        enemy.y = fleeY;
                    }
                } else {
                    // Normal AI behavior - wander
                    if (Math.random() < 0.02) {
                        enemy.wanderAngle += (Math.random() - 0.5) * Math.PI / 2;
                    }
                    
                    const newX = enemy.x + Math.cos(enemy.wanderAngle) * enemy.speed;
                    const newY = enemy.y + Math.sin(enemy.wanderAngle) * enemy.speed;
                    
                    if (newX >= enemy.radius && newX <= this.canvas.width - enemy.radius &&
                        newY >= enemy.radius && newY <= this.canvas.height - enemy.radius) {
                        enemy.x = newX;
                        enemy.y = newY;
                    } else {
                        enemy.wanderAngle = Math.random() * Math.PI * 2;
                    }
                }
                
                continue; // Skip the rest of the enemy update logic for level 9 AI enemies
            }
            
            // For level 5, enemies don't chase - they only wander
            if (this.currentLevel === 5) {
                // Wander randomly only
                if (!enemy.wanderAngle) {
                    enemy.wanderAngle = Math.random() * Math.PI * 2;
                }
                
                if (Math.random() < 0.02) {
                    enemy.wanderAngle += (Math.random() - 0.5) * Math.PI / 2;
                }
                
                // Calculate enemy speed (with turtle effect for Level 11 and 13)
                let enemySpeed = enemy.speed * 0.5;
                if ((this.currentLevel === 11 || this.currentLevel === 13) && this.powerUpSystem) {
                    enemySpeed *= this.powerUpSystem.getEnemySpeedMultiplier();
                }
                
                const newX = enemy.x + Math.cos(enemy.wanderAngle) * enemySpeed;
                const newY = enemy.y + Math.sin(enemy.wanderAngle) * enemySpeed;
                
                const canMoveToPosition = !this.isPositionInSafeZone(newX, newY);
                
                if (canMoveToPosition && 
                    newX >= enemy.radius && newX <= this.canvas.width - enemy.radius &&
                    newY >= enemy.radius && newY <= this.canvas.height - enemy.radius) {
                    enemy.x = newX;
                    enemy.y = newY;
                } else {
                    enemy.wanderAngle = Math.random() * Math.PI * 2;
                }
                
                // Keep enemies in bounds (fallback)
                if (enemy.x < enemy.radius) {
                    enemy.x = enemy.radius;
                    enemy.wanderAngle = Math.random() * Math.PI * 2;
                } else if (enemy.x > this.canvas.width - enemy.radius) {
                    enemy.x = this.canvas.width - enemy.radius;
                    enemy.wanderAngle = Math.random() * Math.PI * 2;
                }
                
                if (enemy.y < enemy.radius) {
                    enemy.y = enemy.radius;
                    enemy.wanderAngle = Math.random() * Math.PI * 2;
                } else if (enemy.y > this.canvas.height - enemy.radius) {
                    enemy.y = this.canvas.height - enemy.radius;
                    enemy.wanderAngle = Math.random() * Math.PI * 2;
                }
                
                continue; // Skip the rest of the enemy update logic for level 5
            }
            
            // Level 15: Check if enemy should seek power-ups
            let powerUpTarget = null;
            let powerUpDistance = Infinity;
            
            if (this.currentLevel === 15 && this.powerUpSystem && this.powerUpSystem.powerUps.length > 0) {
                for (const powerUp of this.powerUpSystem.powerUps) {
                    const distance = Math.sqrt(
                        Math.pow(enemy.x - powerUp.x, 2) + 
                        Math.pow(enemy.y - powerUp.y, 2)
                    );
                    
                    if (distance < powerUpDistance && distance < 200) { // Seek power-ups within 200 pixels
                        powerUpDistance = distance;
                        powerUpTarget = { x: powerUp.x, y: powerUp.y };
                    }
                }
            }
            
            // Check if enemy is close to the player's line
            let lineTarget = null;
            let lineDistance = Infinity;
            
            if (this.player.isDrawing && this.player.line.length > 1) {
                for (let i = 1; i < this.player.line.length; i++) {
                    const lineStart = this.player.line[i - 1];
                    const lineEnd = this.player.line[i];
                    
                    const distanceToLine = pointToLineDistance(
                        enemy.x, enemy.y,
                        lineStart.x, lineStart.y,
                        lineEnd.x, lineEnd.y
                    );
                    
                    if (distanceToLine < lineDistance) {
                        lineDistance = distanceToLine;
                        lineTarget = { x: lineEnd.x, y: lineEnd.y };
                    }
                }
            }
            
            // Chase behavior
            const chaseRange = 150;
            const lineChaseRange = 100;
            const powerUpChaseRange = 200; // Level 15: Enemies seek power-ups
            
            // Calculate enemy speed (with turtle effect for Level 11, 13, 15, 18, and 19)
            let enemySpeed = enemy.speed;
            if ((this.currentLevel === 11 || this.currentLevel === 13 || this.currentLevel === 15 || this.currentLevel === 18 || this.currentLevel === 19) && this.powerUpSystem) {
                enemySpeed *= this.powerUpSystem.getEnemySpeedMultiplier(this.enemies.indexOf(enemy));
            }
            
                         if (powerUpTarget && powerUpDistance <= powerUpChaseRange && this.currentLevel === 15) {
                 // Level 15: Chase power-ups
                 const powerUpDx = powerUpTarget.x - enemy.x;
                 const powerUpDy = powerUpTarget.y - enemy.y;
                 const powerUpDist = Math.sqrt(powerUpDx * powerUpDx + powerUpDy * powerUpDy);
                 
                 if (powerUpDist > 0) {
                     const newX = enemy.x + (powerUpDx / powerUpDist) * enemySpeed;
                     const newY = enemy.y + (powerUpDy / powerUpDist) * enemySpeed;
                     
                     const canMoveToPosition = !this.isPositionInSafeZone(newX, newY);
                     
                     if (canMoveToPosition && 
                         newX >= enemy.radius && newX <= this.canvas.width - enemy.radius &&
                         newY >= enemy.radius && newY <= this.canvas.height - enemy.radius) {
                         enemy.x = newX;
                         enemy.y = newY;
                     } else {
                         // Level 15: Force movement even if blocked
                         enemy.x += Math.cos(enemy.wanderAngle) * enemySpeed * 0.5;
                         enemy.y += Math.sin(enemy.wanderAngle) * enemySpeed * 0.5;
                         enemy.wanderAngle = Math.random() * Math.PI * 2;
                     }
                 }
                         } else if (lineTarget && lineDistance <= lineChaseRange && !this.player.isInSafeZone) {
                 // Chase the line
                 const lineDx = lineTarget.x - enemy.x;
                 const lineDy = lineTarget.y - enemy.y;
                 const lineDist = Math.sqrt(lineDx * lineDx + lineDy * lineDy);
                 
                 if (lineDist > 0) {
                     const newX = enemy.x + (lineDx / lineDist) * enemySpeed;
                     const newY = enemy.y + (lineDy / lineDist) * enemySpeed;
                     
                     const canMoveToPosition = !this.isPositionInSafeZone(newX, newY);
                     
                     if (canMoveToPosition && 
                         newX >= enemy.radius && newX <= this.canvas.width - enemy.radius &&
                         newY >= enemy.radius && newY <= this.canvas.height - enemy.radius) {
                         enemy.x = newX;
                         enemy.y = newY;
                     } else {
                         // Level 15: Force movement even if blocked
                         if (this.currentLevel === 15) {
                             enemy.x += Math.cos(enemy.wanderAngle) * enemySpeed * 0.5;
                             enemy.y += Math.sin(enemy.wanderAngle) * enemySpeed * 0.5;
                         }
                         enemy.wanderAngle = Math.random() * Math.PI * 2;
                     }
                 }
                         } else if (distance <= chaseRange && !this.player.isInSafeZone) {
                 // Chase the player
                 if (distance > 0) {
                     const newX = enemy.x + (dx / distance) * enemySpeed;
                     const newY = enemy.y + (dy / distance) * enemySpeed;
                     
                     const canMoveToPosition = !this.isPositionInSafeZone(newX, newY);
                     
                     if (canMoveToPosition && 
                         newX >= enemy.radius && newX <= this.canvas.width - enemy.radius &&
                         newY >= enemy.radius && newY <= this.canvas.height - enemy.radius) {
                         enemy.x = newX;
                         enemy.y = newY;
                     } else {
                         // Level 15: Force movement even if blocked
                         if (this.currentLevel === 15) {
                             enemy.x += Math.cos(enemy.wanderAngle) * enemySpeed * 0.5;
                             enemy.y += Math.sin(enemy.wanderAngle) * enemySpeed * 0.5;
                         }
                         enemy.wanderAngle = Math.random() * Math.PI * 2;
                     }
                 }
                         } else {
                 // Wander randomly
                 if (!enemy.wanderAngle) {
                     enemy.wanderAngle = Math.random() * Math.PI * 2;
                 }
                 
                 if (Math.random() < 0.02) {
                     enemy.wanderAngle += (Math.random() - 0.5) * Math.PI / 2;
                 }
                 
                 // Calculate enemy speed (with turtle effect for Level 11, 13, 18, and 19)
                 let enemySpeed = enemy.speed * 0.5;
                 if ((this.currentLevel === 11 || this.currentLevel === 13 || this.currentLevel === 18 || this.currentLevel === 19) && this.powerUpSystem) {
                     enemySpeed *= this.powerUpSystem.getEnemySpeedMultiplier();
                 }
                 
                 const newX = enemy.x + Math.cos(enemy.wanderAngle) * enemySpeed;
                 const newY = enemy.y + Math.sin(enemy.wanderAngle) * enemySpeed;
                 
                 const canMoveToPosition = !this.isPositionInSafeZone(newX, newY);
                 
                 if (canMoveToPosition && 
                     newX >= enemy.radius && newX <= this.canvas.width - enemy.radius &&
                     newY >= enemy.radius && newY <= this.canvas.height - enemy.radius) {
                     enemy.x = newX;
                     enemy.y = newY;
                 } else {
                     // Level 15: Force movement even if blocked
                     if (this.currentLevel === 15) {
                         enemy.x += Math.cos(enemy.wanderAngle) * enemySpeed * 0.5;
                         enemy.y += Math.sin(enemy.wanderAngle) * enemySpeed * 0.5;
                     }
                     enemy.wanderAngle = Math.random() * Math.PI * 2;
                 }
             }
            
            // Keep enemies in bounds (fallback)
            if (enemy.x < enemy.radius) {
                enemy.x = enemy.radius;
                enemy.wanderAngle = Math.random() * Math.PI * 2;
            } else if (enemy.x > this.canvas.width - enemy.radius) {
                enemy.x = this.canvas.width - enemy.radius;
                enemy.wanderAngle = Math.random() * Math.PI * 2;
            }
            
            if (enemy.y < enemy.radius) {
                enemy.y = enemy.radius;
                enemy.wanderAngle = Math.random() * Math.PI * 2;
            } else if (enemy.y > this.canvas.height - enemy.radius) {
                enemy.y = this.canvas.height - enemy.radius;
                enemy.wanderAngle = Math.random() * Math.PI * 2;
            }
        }
    }
    
    updateLevel16Enemy(enemy) {
        // Initialize enemy direction if not set
        if (!enemy.currentDirection) {
            enemy.currentDirection = this.getRandomCardinalDirection();
        }
        
        // Check if ghosts are vulnerable (running away from player)
        const isVulnerable = this.powerUpSystem && this.powerUpSystem.areGhostsVulnerable();
        
        // Calculate distance to player
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
        
        // Check if enemy is near player's line
        let nearPlayerLine = false;
        if (this.player.isDrawing && this.player.line.length > 1) {
            for (let i = 1; i < this.player.line.length; i++) {
                const lineStart = this.player.line[i - 1];
                const lineEnd = this.player.line[i];
                const distanceToLine = Math.sqrt(
                    Math.pow(enemy.x - lineEnd.x, 2) + 
                    Math.pow(enemy.y - lineEnd.y, 2)
                );
                if (distanceToLine < 50) { // Within 50 pixels of player's line
                    nearPlayerLine = true;
                    break;
                }
            }
        }
        
        // Determine new direction based on behavior
        let newDirection = enemy.currentDirection;
        
        if (isVulnerable) {
            // When vulnerable, keep current direction (don't change direction to run away)
            // The enemy will continue moving in their current cardinal direction
        } else if (nearPlayerLine && distanceToPlayer < 100) {
            // When near player's line and close to player, prioritize following the line
            newDirection = this.getDirectionTowardsPlayerLine(enemy, this.player);
        } else if (Math.random() < 0.02) {
            // Randomly change direction occasionally
            newDirection = this.getRandomCardinalDirection();
        }
        
        // Update enemy direction
        enemy.currentDirection = newDirection;
        
        // Move enemy in the current direction
        const speed = enemy.speed;
        let newX = enemy.x;
        let newY = enemy.y;
        
        switch (enemy.currentDirection) {
            case 'up':
                newY -= speed;
                break;
            case 'down':
                newY += speed;
                break;
            case 'left':
                newX -= speed;
                break;
            case 'right':
                newX += speed;
                break;
        }
        
        // Check bounds and safe zones before updating position
        if (newX >= enemy.radius && newX <= this.canvas.width - enemy.radius &&
            newY >= enemy.radius && newY <= this.canvas.height - enemy.radius) {
            
            // Check if the new position would be in a safe zone
            let wouldBeInSafeZone = false;
            for (const zone of this.safeZones) {
                if (zone.type === 'polygon') {
                    if (isPointInPolygon(newX, newY, zone.points)) {
                        wouldBeInSafeZone = true;
                        break;
                    }
                } else {
                    // Rectangle zone
                    if (newX >= zone.x && newX <= zone.x + zone.width &&
                        newY >= zone.y && newY <= zone.y + zone.height) {
                        wouldBeInSafeZone = true;
                        break;
                    }
                }
            }
            
            if (!wouldBeInSafeZone) {
                enemy.x = newX;
                enemy.y = newY;
            } else {
                // If would enter safe zone, change direction
                enemy.currentDirection = this.getRandomCardinalDirection();
            }
        } else {
            // If would go out of bounds, change direction
            enemy.currentDirection = this.getRandomCardinalDirection();
        }
    }
    
    getRandomCardinalDirection() {
        const directions = ['up', 'down', 'left', 'right'];
        return directions[Math.floor(Math.random() * directions.length)];
    }
    
    getDirectionAwayFromPlayer(enemy, player) {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        
        // Determine which direction to move away
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? 'left' : 'right';
        } else {
            return dy > 0 ? 'up' : 'down';
        }
    }
    
    getDirectionTowardsPlayerLine(enemy, player) {
        if (!player.isDrawing || player.line.length < 2) {
            return this.getRandomCardinalDirection();
        }
        
        // Find the closest point on the player's line
        let closestPoint = player.line[player.line.length - 1];
        let closestDistance = Math.sqrt(
            Math.pow(enemy.x - closestPoint.x, 2) + 
            Math.pow(enemy.y - closestPoint.y, 2)
        );
        
        for (const point of player.line) {
            const distance = Math.sqrt(
                Math.pow(enemy.x - point.x, 2) + 
                Math.pow(enemy.y - point.y, 2)
            );
            if (distance < closestDistance) {
                closestDistance = distance;
                closestPoint = point;
            }
        }
        
        // Move towards the closest point on the line
        const dx = closestPoint.x - enemy.x;
        const dy = closestPoint.y - enemy.y;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? 'right' : 'left';
        } else {
            return dy > 0 ? 'down' : 'up';
        }
    }
    
    updateDisplay() {
        const levelTitle = this.levelTitles[this.currentLevel] || `Level ${this.currentLevel}`;
        document.getElementById('levelDisplay').textContent = `Level ${this.currentLevel}: ${levelTitle}`;
        document.getElementById('scoreDisplay').textContent = `Score: ${this.score}`;
        
        // Update timer display
        let totalMilliseconds;
        if (this.currentLevel === 20 || this.currentLevel === 21) {
            if (this.hasMoved) {
                // Level 20 and 21: Timer starts on first move
                totalMilliseconds = Date.now() - this.levelStartTime;
            } else {
                // Level 20 and 21: Timer shows 0:00.00 until first move
                totalMilliseconds = 0;
            }
        } else {
            // Other levels: Timer starts when level starts
            totalMilliseconds = Date.now() - this.levelStartTime;
        }
        document.getElementById('timerDisplay').textContent = `Time: ${formatTime(totalMilliseconds)}`;
        
        // Update completion percentage
        let completionPercent;
        if (this.currentLevel === 20) {
            // Level 20: Show apples eaten progress
            const applesEaten = this.snakeLength - 3; // Subtract initial length
            completionPercent = (applesEaten / 25) * 100; // 25 apples to win
        } else if (this.currentLevel === 21) {
            // Level 21: Calculate completion based on open tiles
            completionPercent = this.calculateLevel21Completion();
        } else {
            completionPercent = this.calculateBoardCompletion();
        }
        document.getElementById('completionDisplay').textContent = `Completion: ${completionPercent.toFixed(1)}%`;
    }
    
    calculateBoardCompletion() {
        const totalBoardArea = this.canvas.width * this.canvas.height;
        let safeZoneArea = 0;
        
        for (const zone of this.safeZones) {
            if (zone.type === 'polygon') {
                safeZoneArea += calculatePolygonArea(zone.points);
            } else {
                safeZoneArea += zone.width * zone.height;
            }
        }
        
        // For Level 10, adjust the calculation to make the maximum achievable area count as 100%
        if (this.currentLevel === 10) {
            // The maximum achievable area is approximately 95.4% of the total board
            // So we scale the calculation to make that count as 100%
            const maxAchievableArea = totalBoardArea * GAME_CONFIG.LEVEL_10_MAX_ACHIEVABLE_AREA;
            const scaledCompletion = (safeZoneArea / maxAchievableArea) * 100;
            // Add 0.1% grace so that 99.9% counts as 100%
            return Math.min(scaledCompletion + GAME_CONFIG.LEVEL_10_GRACE_PERCENT, 100);
        }
        
        return (safeZoneArea / totalBoardArea) * 100;
    }
    
    calculateLevel21Completion() {
        const totalTiles = 90; // 10x9 grid = 90 tiles
        let openTiles = 0;
        
        // Count open tiles (tiles not occupied by snake body, walls, or apples)
        for (let x = 0; x < this.gridCols; x++) {
            for (let y = 0; y < this.gridRows; y++) {
                // Check if tile is occupied by snake body
                const isSnakeBody = this.snakeBody.some(segment => segment.x === x && segment.y === y);
                
                // Check if tile is occupied by wall
                const isWall = this.walls.some(wall => wall.x === x && wall.y === y);
                
                // Check if tile has apple (apples count as open tiles)
                const hasApple = this.apples.some(apple => apple.x === x && apple.y === y);
                
                // Tile is open if it's not snake body and not wall (apples count as open)
                if (!isSnakeBody && !isWall) {
                    openTiles++;
                }
            }
        }
        
        // Calculate completion as 100% - (open tiles / total tiles * 100)
        const completionPercent = 100 - (openTiles / totalTiles * 100);
        return Math.max(0, Math.min(100, completionPercent)); // Clamp between 0 and 100
    }
    
    isPositionInSafeZone(x, y) {
        for (const zone of this.safeZones) {
            if (zone.type === 'polygon') {
                if (isPointInPolygon(x, y, zone.points)) {
                    return true;
                }
            } else {
                // Rectangle zone
                if (x >= zone.x && x <= zone.x + zone.width &&
                    y >= zone.y && y <= zone.y + zone.height) {
                    return true;
                }
            }
        }
        return false;
    }
    
    gameLoop() {
        const currentTime = performance.now();
        
        // Frame rate limiting for levels other than 20 and 21
        if (this.currentLevel !== 20 && this.currentLevel !== 21) {
            if (currentTime - this.lastFrameTime < this.frameInterval) {
                // Not enough time has passed, schedule next frame using setTimeout for precise timing
                setTimeout(() => this.gameLoop(), this.frameInterval - (currentTime - this.lastFrameTime));w
                return;
            }
            this.lastFrameTime = currentTime;
        }
        
        if (this.gameState === 'playing') {
            // Update timer (counting up)
            if ((this.currentLevel === 20 || this.currentLevel === 21) && this.hasMoved) {
                this.levelTime = Math.floor((Date.now() - this.levelStartTime) / 1000);
            } else {
                this.levelTime = Math.floor((Date.now() - this.levelStartTime) / 1000);
            }
            
            // Check for level completion using switch case
            switch (this.currentLevel) {
                case 6:
                    // Level 6: No completion by board filling, only by catching AI
                    // The level continues until player catches AI or AI traps player
                    break;
                    
                case 7:
                    // Level 7: Complete when board is 85% filled OR all AIs are caught
                    if (this.calculateBoardCompletion() >= GAME_CONFIG.BOARD_COMPLETION_THRESHOLD || (this.aiPlayer.x === 0 && this.aiPlayers.length === 0)) {
                        this.completeLevel();
                        return;
                    }
                    break;
                    
                case 9:
                    // Level 9: Complete when score reaches 5000
                    if (this.score >= GAME_CONFIG.LEVEL_9_SCORE_TARGET) {
                        this.completeLevel();
                        return;
                    }
                    break;
                    
                case 10:
                    // Level 10: Complete when board is 100% filled
                    if (this.calculateBoardCompletion() >= 100) {
                        this.completeLevel();
                        return;
                    }
                    break;
                    
                case 11:
                    // Level 11: No completion by board filling - only by eating 3 enemies
                    // Completion is handled in checkCollisions when all enemies are eaten
                    break;
                    
                case 12:
                    // Level 12: Complete when board is 75% filled
                    if (this.calculateBoardCompletion() >= 75) {
                        this.completeLevel();
                        return;
                    }
                    break;
                    
                case 13:
                    // Level 13: No completion by board filling - only by eating 3 enemies
                    // Completion is handled in checkCollisions when all enemies are eaten
                    break;
                    
                case 14:
                    // Level 14: Complete when board is 85% filled OR all enemies converted to apples
                    if (this.calculateBoardCompletion() >= GAME_CONFIG.BOARD_COMPLETION_THRESHOLD || (this.enemies.length === 0 && this.apples.length === 0)) {
                        this.completeLevel();
                        return;
                    }
                    break;
                    
                case 15:
                    // Level 15: Complete when all enemies are removed (same as Level 11)
                    if (this.enemies.length === 0) {
                        this.completeLevel();
                        return;
                    }
                    break;
                    
                                 case 16:
                     // Level 16: Complete when board is 85% filled AND all enemies are eaten
                     if (this.calculateBoardCompletion() >= 85 && this.enemies.length === 0) {
                         this.completeLevel();
                         return;
                     }
                     break;
                     
                 case 17:
                     // Level 17: Complete when board is 85% filled
                     if (this.calculateBoardCompletion() >= 85) {
                         this.completeLevel();
                         return;
                     }
                     break;
                    
                default:
                    // Check for level completion (85% board filled OR all enemies converted to apples)
                    if (this.calculateBoardCompletion() >= GAME_CONFIG.BOARD_COMPLETION_THRESHOLD || (this.enemies.length === 0 && this.apples.length === 0)) {
                        this.completeLevel();
                        return;
                    }
                    break;
            }
            
        // Level 20 and 21: Update snake (skip regular player updates)
        if (this.currentLevel === 20 || this.currentLevel === 21) {
            this.updateLevel20Snake();
        } else {
            // Regular levels: Update player, AI, and enemies
            this.updatePlayer();
            this.updateAIPlayer(); // Update AI player for level 6
            this.updateEnemies();
            this.checkCollisions();
        }
        
        this.checkTemporaryZones(); // Check for expired temporary zones
            
                         // Update power-ups for Level 11, 13, 15, 16, 18, and 19
             if ((this.currentLevel === 11 || this.currentLevel === 13 || this.currentLevel === 15 || this.currentLevel === 16 || this.currentLevel === 18 || this.currentLevel === 19) && this.powerUpSystem) {
                this.powerUpSystem.updatePowerUps();
            }
            
            // Render the game
            this.renderer.render({
                safeZones: this.safeZones,
                player: this.player,
                enemies: this.enemies,
                apples: this.apples,
                aiPlayer: this.aiPlayer,
                aiPlayers: this.aiPlayers,
                currentLevel: this.currentLevel,
                powerUpSystem: this.powerUpSystem,
                // Level 20 data
                snakeBody: this.snakeBody,
                gridCols: this.gridCols,
                gridRows: this.gridRows,
                tileWidth: this.tileWidth,
                tileHeight: this.tileHeight,
                walls: this.walls,
                gameInstance: this // Pass game instance for animation
            });
            
            this.updateDisplay();
            
            // Use setTimeout for precise timing on levels 1-19, requestAnimationFrame for levels 20-21
            if (this.currentLevel !== 20 && this.currentLevel !== 21) {
                setTimeout(() => this.gameLoop(), this.frameInterval);
            } else {
                requestAnimationFrame(() => this.gameLoop());
            }
        }
    }
    
    // Additional methods for AI players, game state management, etc.
    updateAIPlayer() {
        // AI player logic for levels 6 and 7
        if (this.currentLevel === 6 || this.currentLevel === 7) {
            // AI player behavior - tries to avoid the player and complete the game
            const dx = this.player.x - this.aiPlayer.x;
            const dy = this.player.y - this.aiPlayer.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Flee from player if too close
            const fleeRange = 100;
            if (distance < fleeRange) {
                const fleeX = this.aiPlayer.x - (dx / distance) * this.aiPlayer.speed;
                const fleeY = this.aiPlayer.y - (dy / distance) * this.aiPlayer.speed;
                
                if (fleeX >= this.aiPlayer.radius && fleeX <= this.canvas.width - this.aiPlayer.radius &&
                    fleeY >= this.aiPlayer.radius && fleeY <= this.canvas.height - this.aiPlayer.radius) {
                    this.aiPlayer.x = fleeX;
                    this.aiPlayer.y = fleeY;
                }
            } else {
                // Normal AI behavior - try to complete the game
                // Check if AI should start drawing
                if (this.aiPlayer.isInSafeZone && !this.aiPlayer.isDrawing && Math.random() < 0.01) {
                    this.aiPlayer.isDrawing = true;
                    this.aiPlayer.line = [{ x: this.aiPlayer.x, y: this.aiPlayer.y }];
                }
                
                // AI movement - wander and try to create safe zones
                if (Math.random() < 0.02) {
                    this.aiPlayer.wanderAngle += (Math.random() - 0.5) * Math.PI / 2;
                }
                
                const newX = this.aiPlayer.x + Math.cos(this.aiPlayer.wanderAngle) * this.aiPlayer.speed;
                const newY = this.aiPlayer.y + Math.sin(this.aiPlayer.wanderAngle) * this.aiPlayer.speed;
                
                if (newX >= this.aiPlayer.radius && newX <= this.canvas.width - this.aiPlayer.radius &&
                    newY >= this.aiPlayer.radius && newY <= this.canvas.height - this.aiPlayer.radius) {
                    this.aiPlayer.x = newX;
                    this.aiPlayer.y = newY;
                } else {
                    this.aiPlayer.wanderAngle = Math.random() * Math.PI * 2;
                }
            }
            
            // Update AI drawing line
            if (this.aiPlayer.isDrawing) {
                const lastPoint = this.aiPlayer.line[this.aiPlayer.line.length - 1];
                const distanceFromLast = lastPoint ? Math.sqrt(
                    Math.pow(this.aiPlayer.x - lastPoint.x, 2) + 
                    Math.pow(this.aiPlayer.y - lastPoint.y, 2)
                ) : 0;
                
                if (distanceFromLast > 3) {
                    this.aiPlayer.line.push({ x: this.aiPlayer.x, y: this.aiPlayer.y });
                }
            }
            
            // Check AI safe zone status
            this.checkAISafeZone();
        }
        
        // Update additional AI players for level 7
        if (this.currentLevel === 7) {
            this.updateAdditionalAIPlayers();
        }
    }
    
    updateAdditionalAIPlayers() {
        for (const ai of this.aiPlayers) {
            // AI behavior - tries to avoid the player
            const dx = this.player.x - ai.x;
            const dy = this.player.y - ai.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Flee from player if too close
            const fleeRange = 100;
            if (distance < fleeRange) {
                const fleeX = ai.x - (dx / distance) * ai.speed;
                const fleeY = ai.y - (dy / distance) * ai.speed;
                
                if (fleeX >= ai.radius && fleeX <= this.canvas.width - ai.radius &&
                    fleeY >= ai.radius && fleeY <= this.canvas.height - ai.radius) {
                    ai.x = fleeX;
                    ai.y = fleeY;
                }
            } else {
                // Normal AI behavior - wander
                if (Math.random() < 0.02) {
                    ai.wanderAngle += (Math.random() - 0.5) * Math.PI / 2;
                }
                
                const newX = ai.x + Math.cos(ai.wanderAngle) * ai.speed;
                const newY = ai.y + Math.sin(ai.wanderAngle) * ai.speed;
                
                if (newX >= ai.radius && newX <= this.canvas.width - ai.radius &&
                    newY >= ai.radius && newY <= this.canvas.height - ai.radius) {
                    ai.x = newX;
                    ai.y = newY;
                } else {
                    ai.wanderAngle = Math.random() * Math.PI * 2;
                }
            }
            
            // Check AI safe zone status
            this.checkIndividualAISafeZone(ai);
        }
    }
    
    checkIndividualAISafeZone(ai) {
        const wasInSafeZone = ai.isInSafeZone;
        ai.isInSafeZone = false;
        
        for (const zone of this.safeZones) {
            if (zone.type === 'polygon') {
                if (isPointInPolygon(ai.x, ai.y, zone.points)) {
                    ai.isInSafeZone = true;
                    break;
                }
            } else {
                if (ai.x >= zone.x && ai.x <= zone.x + zone.width &&
                    ai.y >= zone.y && ai.y <= zone.y + zone.height) {
                    ai.isInSafeZone = true;
                    break;
                }
            }
        }
        
        // If AI just exited a safe zone, start drawing
        if (wasInSafeZone && !ai.isInSafeZone) {
            if (!ai.isDrawing) {
                ai.isDrawing = true;
                ai.exitPosition = { x: ai.x, y: ai.y };
                ai.line = [{ x: ai.exitPosition.x, y: ai.exitPosition.y }];
            }
        }
        
        // If AI just entered a safe zone and was drawing, close the area
        if (!wasInSafeZone && ai.isInSafeZone && ai.isDrawing && ai.line.length > 2) {
            this.closeIndividualAIArea(ai);
        }
    }
    
    closeIndividualAIArea(ai) {
        const points = [...ai.line];
        if (points.length > 2) {
            // Create rectangle area for AI (simpler than polygon)
            let minX = Math.min(...points.map(p => p.x));
            let maxX = Math.max(...points.map(p => p.x));
            let minY = Math.min(...points.map(p => p.y));
            let maxY = Math.max(...points.map(p => p.y));
            
            const padding = 20;
            const newSafeZone = {
                type: 'rectangle',
                x: minX - padding,
                y: minY - padding,
                width: maxX - minX + padding * 2,
                height: maxY - minY + padding * 2
            };
            
            this.safeZones.push(newSafeZone);
            
            // Check for player trapped inside the new safe zone
            if (this.player.x >= newSafeZone.x && this.player.x <= newSafeZone.x + newSafeZone.width &&
                this.player.y >= newSafeZone.y && this.player.y <= newSafeZone.y + newSafeZone.height) {
                // Player is trapped - AI wins
                this.aiWins();
                return;
            }
        }
        
        ai.line = [];
        ai.isDrawing = false;
    }
    
    checkAISafeZone() {
        if (this.currentLevel === 6) {
            const wasInSafeZone = this.aiPlayer.isInSafeZone;
            this.aiPlayer.isInSafeZone = false;
            
            for (const zone of this.safeZones) {
                if (zone.type === 'polygon') {
                    if (isPointInPolygon(this.aiPlayer.x, this.aiPlayer.y, zone.points)) {
                        this.aiPlayer.isInSafeZone = true;
                        break;
                    }
                } else {
                    if (this.aiPlayer.x >= zone.x && this.aiPlayer.x <= zone.x + zone.width &&
                        this.aiPlayer.y >= zone.y && this.aiPlayer.y <= zone.y + zone.height) {
                        this.aiPlayer.isInSafeZone = true;
                        break;
                    }
                }
            }
            
            // If AI just exited a safe zone, start drawing
            if (wasInSafeZone && !this.aiPlayer.isInSafeZone) {
                if (!this.aiPlayer.isDrawing) {
                    this.aiPlayer.isDrawing = true;
                    this.aiPlayer.exitPosition = { x: this.aiPlayer.x, y: this.aiPlayer.y };
                    this.aiPlayer.line = [{ x: this.aiPlayer.exitPosition.x, y: this.aiPlayer.exitPosition.y }];
                }
            }
            
            // If AI just entered a safe zone and was drawing, close the area
            if (!wasInSafeZone && this.aiPlayer.isInSafeZone && this.aiPlayer.isDrawing && this.aiPlayer.line.length > 2) {
                this.closeAIArea();
            }
        }
    }
    
    closeAIArea() {
        if (this.currentLevel === 6) {
            const points = [...this.aiPlayer.line];
            if (points.length > 2) {
                // Create rectangle area for AI (simpler than polygon)
                let minX = Math.min(...points.map(p => p.x));
                let maxX = Math.max(...points.map(p => p.x));
                let minY = Math.min(...points.map(p => p.y));
                let maxY = Math.max(...points.map(p => p.y));
                
                const padding = 20;
                const newSafeZone = {
                    type: 'rectangle',
                    x: minX - padding,
                    y: minY - padding,
                    width: maxX - minX + padding * 2,
                    height: maxY - minY + padding * 2
                };
                
                this.safeZones.push(newSafeZone);
                
                // Check for player trapped inside the new safe zone
                if (this.player.x >= newSafeZone.x && this.player.x <= newSafeZone.x + newSafeZone.width &&
                    this.player.y >= newSafeZone.y && this.player.y <= newSafeZone.y + newSafeZone.height) {
                    // Player is trapped - AI wins
                    this.aiWins();
                    return;
                }
            }
            
            this.aiPlayer.line = [];
            this.aiPlayer.isDrawing = false;
        }
    }
    
    respawnEnemy() {
        // Only respawn enemies in level 4
        if (this.currentLevel === 4 && this.enemies.length < 2) {
            const position = getRandomPosition(this.canvas, this.safeZones, (x, y) => this.isPositionInSafeZone(x, y));
            this.enemies.push({
                x: position.x,
                y: position.y,
                radius: GAME_CONFIG.ENEMY_RADIUS,
                speed: getRandomSpeed(),
                wanderAngle: Math.random() * Math.PI * 2
            });
        }
    }
    
    checkTemporaryZones() {
        // Check temporary zones in level 5, 12, and 14
        if (this.currentLevel === 5 || this.currentLevel === 12 || this.currentLevel === 14) {
            const currentTime = Date.now();
            
            // Remove expired temporary zones
            for (let i = this.safeZones.length - 1; i >= 0; i--) {
                const zone = this.safeZones[i];
                if (zone.temporary) {
                    const age = currentTime - zone.createdAt;
                    if (age >= zone.lifespan) {
                        // For level 12, kill the player if the zone expires
                        if (this.currentLevel === 12 && zone.killPlayerOnExpire) {
                            this.gameOver();
                            return;
                        }
                        
                        // For level 5, only remove if no enemy was killed
                        if (this.currentLevel === 5 && !zone.enemyKilled) {
                            this.safeZones.splice(i, 1);
                        }
                    }
                }
            }
        }
        
        // Check shrinking safe zones for level 13, 14, and 19
        if (this.currentLevel === 13 || this.currentLevel === 14 || this.currentLevel === 19) {
            this.checkShrinkingSafeZones();
        }
    }
    
    checkShrinkingSafeZones() {
        const currentTime = Date.now();
        
        // Initialize shrinking timer if not exists
        if (!this.shrinkingTimer) {
            this.shrinkingTimer = currentTime;
        }
        
        // Check if 3 seconds have passed
        if (currentTime - this.shrinkingTimer >= 3000) {
            this.shrinkingTimer = currentTime;
            
            // Shrink all safe zones by 2%
            for (const zone of this.safeZones) {
                if (zone.type === 'polygon') {
                    this.shrinkPolygonZone(zone, 0.02); // 2% shrink
                } else {
                    this.shrinkRectangleZone(zone, 0.02); // 2% shrink
                }
            }
        }
    }
    
    shrinkPolygonZone(zone, shrinkFactor) {
        // Calculate center of polygon
        let centerX = 0, centerY = 0;
        for (const point of zone.points) {
            centerX += point.x;
            centerY += point.y;
        }
        centerX /= zone.points.length;
        centerY /= zone.points.length;
        
        // Shrink polygon by moving points towards center
        for (const point of zone.points) {
            const dx = point.x - centerX;
            const dy = point.y - centerY;
            point.x = centerX + dx * (1 - shrinkFactor);
            point.y = centerY + dy * (1 - shrinkFactor);
        }
        
        // Update bounds
        zone.bounds = calculatePolygonBounds(zone.points);
    }
    
    shrinkRectangleZone(zone, shrinkFactor) {
        const shrinkX = zone.width * shrinkFactor / 2;
        const shrinkY = zone.height * shrinkFactor / 2;
        
        zone.x += shrinkX;
        zone.y += shrinkY;
        zone.width -= shrinkX * 2;
        zone.height -= shrinkY * 2;
    }
    
    catchAI(caughtAI, index = -1) {
        // Level 7: When catching an AI, create random safe area and spawn new AI
        if (this.currentLevel === 7) {
            // Add score
            this.score += 100;
            
            // Calculate total field area
            const totalFieldArea = this.canvas.width * this.canvas.height;
            
            // Calculate target area (10% to 20% of total field)
            const minArea = totalFieldArea * GAME_CONFIG.LEVEL_7_AREA_MIN_PERCENT;
            const maxArea = totalFieldArea * GAME_CONFIG.LEVEL_7_AREA_MAX_PERCENT;
            const targetArea = Math.random() * (maxArea - minArea) + minArea;
            
            // Calculate random dimensions for the safe area
            const aspectRatio = Math.random() * 2 + 0.5; // Between 0.5 and 2.5
            const width = Math.sqrt(targetArea * aspectRatio);
            const height = targetArea / width;
            
            // Ensure the area fits within the canvas bounds
            const maxWidth = Math.min(width, this.canvas.width - 100);
            const maxHeight = Math.min(height, this.canvas.height - 100);
            
            // Random position for the safe area
            const margin = 50;
            const x = Math.random() * (this.canvas.width - maxWidth - 2 * margin) + margin;
            const y = Math.random() * (this.canvas.height - maxHeight - 2 * margin) + margin;
            
            // Create random rectangular safe zone
            const randomZone = {
                type: 'rectangle',
                x: x,
                y: y,
                width: maxWidth,
                height: maxHeight,
                bounds: {
                    minX: x,
                    maxX: x + maxWidth,
                    minY: y,
                    maxY: y + maxHeight
                }
            };
            
            // Add to existing safe zones (no merging)
            this.safeZones.push(randomZone);
            
            // Remove the caught AI
            if (index !== -1) {
                this.aiPlayers.splice(index, 1);
            } else {
                // If it's the main aiPlayer, reset it and add a new one to aiPlayers
                this.aiPlayer.x = -100; // Move off-screen
                this.aiPlayer.y = -100;
            }
            
            // Spawn a new AI player
            this.spawnNewAI();
            
            this.updateDisplay();
        }
    }
    
    spawnNewAI() {
        // Spawn a new AI player at a random position outside safe zones
        let newX, newY;
        let attempts = 0;
        
        do {
            newX = Math.random() * (this.canvas.width - 200) + 100; // Keep away from edges
            newY = Math.random() * (this.canvas.height - 200) + 100; // Keep away from edges
            attempts++;
        } while (this.isPositionInSafeZone(newX, newY) && attempts < 50);
        
        const newAI = {
            x: newX,
            y: newY,
            radius: GAME_CONFIG.PLAYER_RADIUS,
            speed: GAME_CONFIG.AI_PLAYER_SPEED,
            isInSafeZone: false,
            isDrawing: false,
            line: [],
            exitPosition: null,
            wanderAngle: Math.random() * Math.PI * 2
        };
        
        this.aiPlayers.push(newAI);
    }
    
    spawnLevel20Apple(isInitialSpawn = false) {
        let x, y;
        let attempts = 0;
        const maxAttempts = 100; // Prevent infinite loop
        
        if (isInitialSpawn) {
            // Fixed position: 3 tiles from right wall
            x = this.gridCols - 4; // 3 tiles from right wall
            y = Math.floor(this.gridRows / 2);
        } else {
            // Random position
            do {
                x = Math.floor(Math.random() * this.gridCols);
                y = Math.floor(Math.random() * this.gridRows);
                attempts++;
            } while ((this.snakeBody.some(segment => segment.x === x && segment.y === y) || 
                     this.walls.some(wall => wall.x === x && wall.y === y)) && attempts < maxAttempts);
            
            // If we couldn't find a valid position, return false
            if (attempts >= maxAttempts) {
                return false;
            }
        }
        
        this.apples = [{
            x: x,
            y: y,
            radius: this.tileWidth * 0.4,
            animationTime: 0 // Add animation time for size animation
        }];
        
        return true;
    }
    
    canSpawnLevel20Apple() {
        // Check if there's any valid position to spawn an apple
        for (let x = 0; x < this.gridCols; x++) {
            for (let y = 0; y < this.gridRows; y++) {
                // Check if position is not occupied by snake body or walls
                const occupiedBySnake = this.snakeBody.some(segment => segment.x === x && segment.y === y);
                const occupiedByWall = this.walls.some(wall => wall.x === x && wall.y === y);
                
                if (!occupiedBySnake && !occupiedByWall) {
                    return true; // Found a valid position
                }
            }
        }
        return false; // No valid position found
    }
    
    spawnLevel20Walls() {
        // Spawn 2 walls
        for (let i = 0; i < 2; i++) {
            let wallSpawned = false;
            
            // Try to spawn wall up to 3 times
            for (let attempt = 0; attempt < this.wallSpawnAttempts; attempt++) {
                const wallX = Math.floor(Math.random() * this.gridCols);
                const wallY = Math.floor(Math.random() * this.gridRows);
                
                // Check if position is at least 6 tiles away from snake head
                const head = this.snakeBody[0];
                const distance = Math.abs(wallX - head.x) + Math.abs(wallY - head.y); // Manhattan distance
                
                if (distance >= this.wallMinDistance) {
                    // Check if position doesn't overlap with snake body
                    const overlapsSnake = this.snakeBody.some(segment => segment.x === wallX && segment.y === wallY);
                    
                    // Check if position doesn't overlap with existing walls
                    const overlapsWall = this.walls.some(wall => wall.x === wallX && wall.y === wallY);
                    
                    // Check if position doesn't overlap with apple
                    const overlapsApple = this.apples.some(apple => apple.x === wallX && apple.y === wallY);
                    
                    if (!overlapsSnake && !overlapsWall && !overlapsApple) {
                        // Create wall
                        this.walls.push({
                            x: wallX,
                            y: wallY,
                            movesRemaining: this.wallLifespan
                        });
                        wallSpawned = true;
                        break;
                    }
                }
            }
            
            // If we couldn't spawn this wall after 15 attempts, skip it
            if (!wallSpawned) {
                //console.log(`Failed to spawn wall ${i + 1} after ${this.wallSpawnAttempts} attempts`);
            }
        }
    }
    
    isSnakeBodyAt(gridX, gridY) {
        return this.snakeBody.some(segment => segment.x === gridX && segment.y === gridY);
    }
    
    updateLevel20Snake() {
        // 1. ANIMATION FIRST - Update animation progress
        this.updateSnakeAnimation();
        
        // Update apple animation
        if (this.apples.length > 0) {
            this.apples[0].animationTime += 16; // Assuming 60fps
        }
        
        // Don't move until player has made first input
        if (!this.hasMoved) { return; }

        // Update direction
        this.snakeDirection = this.nextDirection;
        
        const currentTime = Date.now();
        if (currentTime - this.lastMoveTime < this.moveInterval) {
            return;
        }
        
        // Start new animation
        this.startSnakeAnimation();
        
        // 3. COLLISION - Calculate new head position
        const head = this.snakeBody[0];
        let newHeadX = head.x;
        let newHeadY = head.y;
        
        switch (this.snakeDirection) {
            case 'up': newHeadY--; break;
            case 'down': newHeadY++; break;
            case 'left': newHeadX--; break;
            case 'right': newHeadX++; break;
        }

        // Check for killing collisions and handle grace period
        const killingTile = this.checkForKillingTile(newHeadX, newHeadY);
        if (killingTile) {
            if (!this.gracePeriodActive) {
                // Start grace period
                this.gracePeriodActive = true;
                this.gracePeriodStartTime = Date.now();
                this.gracePeriodKillingTile = killingTile;
                return; // Don't move this frame, give player time to turn
            } else {
                // Check if grace period has expired
                const currentTime = Date.now();
                if (currentTime - this.gracePeriodStartTime >= this.gracePeriodDuration) {
                    this.gameOver();
                    return;
                } else {
                    // Still in grace period, don't move
                    return;
                }
            }
        } else {
            // No killing tile ahead, clear grace period if it was active
            if (this.gracePeriodActive) {
                this.gracePeriodActive = false;
                this.gracePeriodStartTime = 0;
                this.gracePeriodKillingTile = null;
            }
        }

        // Add new head
        this.snakeBody.unshift({ x: newHeadX, y: newHeadY });

        // Check apple collision
        if (this.apples.length > 0) {
            const apple = this.apples[0];
            if (newHeadX === apple.x && newHeadY === apple.y) {
                this.score += 100;
                this.snakeLength++; // Increase snake length
                
                if (this.currentLevel === 20) {
                    this.spawnLevel20Apple(false);
                    
                    // Check win condition - 25 apples eaten
                    if (this.snakeLength >= 28) { // 3 initial + 25 apples = 28
                        this.completeLevel();
                        return;
                    }
                } else if (this.currentLevel === 21) {
                    const appleSpawned = this.spawnLevel20Apple(false);
                    
                    // If apple couldn't spawn, check for win condition
                    if (!appleSpawned) {
                        this.completeLevel();
                        return;
                    }
                }
                
                // Level 20 and 21: Spawn walls when apple is eaten
                this.spawnLevel20Walls();
            } else {
                // Remove tail if no apple eaten
                this.snakeBody.pop();
            }
        } else {
            // Remove tail if no apple eaten
            this.snakeBody.pop();
        }
        
        // Update wall lifespan
        this.updateLevel20Walls();
        
        // Update last move time
        this.lastMoveTime = currentTime;
    }
    
    addToInputBuffer(direction) {
        // Only add direction if it's different from the last direction in buffer
        if (this.inputBuffer.length === 0 || this.inputBuffer[this.inputBuffer.length - 1] !== direction) {
            this.inputBuffer.push(direction);
            
            // Keep buffer size limited
            //if (this.inputBuffer.length > this.maxInputBufferSize) {
            //    this.inputBuffer.shift();
            //}
            console.log(this.inputBuffer);
        }
    }
    
    processInputBuffer() {
        // Process inputs in LIFO order (most recent first)
        let lastValidDirection = null;
        
        while (this.inputBuffer.length > 0) {
            const direction = this.inputBuffer.shift(); // FIFO is what works
            
            // Check if the direction is valid (not opposite to current direction)
            if ((direction === 'up' && this.snakeDirection !== 'down') ||
                (direction === 'down' && this.snakeDirection !== 'up') ||
                (direction === 'left' && this.snakeDirection !== 'right') ||
                (direction === 'right' && this.snakeDirection !== 'left')) {
                
                lastValidDirection = direction;
                console.log(lastValidDirection);
                break; // Use the first valid direction found (most recent)
            }
        }
        
        // Update next direction if we found a valid input
        if (lastValidDirection) {
            this.nextDirection = lastValidDirection;
        }
    }
    
    startIndependentInputProcessing() {
        // Clear any existing interval
        if (this.inputProcessingInterval) {
            clearInterval(this.inputProcessingInterval);
        }
        
        // Start processing inputs at high frequency
        this.inputProcessingInterval = setInterval(() => {
            if ((this.currentLevel === 20 || this.currentLevel === 21) && this.gameState === 'playing') {
                this.processInputBuffer();
            }
        }, 1000 / this.inputProcessingFrequency); // Convert frequency to interval
    }
    
    stopIndependentInputProcessing() {
        if (this.inputProcessingInterval) {
            clearInterval(this.inputProcessingInterval);
            this.inputProcessingInterval = null;
        }
    }
    
    checkForKillingTile(x, y) {
        // Check boundary collision
        if (x < 0 || x >= this.gridCols || y < 0 || y >= this.gridRows) {
            return { type: 'boundary', x: x, y: y };
        }
        
        // Check self collision
        if (this.snakeBody.some(segment => segment.x === x && segment.y === y)) {
            return { type: 'self', x: x, y: y };
        }
        
        // Check wall collision
        if (this.walls.some(wall => wall.x === x && wall.y === y)) {
            return { type: 'wall', x: x, y: y };
        }
        
        return null; // No killing tile
    }
    
    startSnakeAnimation() {
        // Store current positions as start positions
        this.snakeAnimationStartPositions = this.snakeBody.map(segment => ({ x: segment.x, y: segment.y }));
        
        // Calculate end positions (where snake will be after movement)
        this.snakeAnimationEndPositions = [];
        
        // Head moves to new position
        const head = this.snakeBody[0];
        let newHeadX = head.x;
        let newHeadY = head.y;
        
        switch (this.snakeDirection) {
            case 'up':
                newHeadY--;
                break;
            case 'down':
                newHeadY++;
                break;
            case 'left':
                newHeadX--;
                break;
            case 'right':
                newHeadX++;
                break;
        }
        
        this.snakeAnimationEndPositions.push({ x: newHeadX, y: newHeadY });
        
        // Body segments follow (each segment moves to where the previous one was)
        for (let i = 0; i < this.snakeBody.length - 1; i++) {
            this.snakeAnimationEndPositions.push({ x: this.snakeBody[i].x, y: this.snakeBody[i].y });
        }
        
        // Start animation
        this.snakeAnimationStartTime = Date.now();
        this.isSnakeAnimating = true;
        this.snakeAnimationProgress = 0;
    }
    
    updateSnakeAnimation() {
      
        const currentTime = Date.now();
        const elapsed = currentTime - this.snakeAnimationStartTime;
        this.snakeAnimationProgress = Math.min(elapsed / this.snakeAnimationDuration, 1);
        
        if (this.snakeAnimationProgress >= 1) {
            this.isSnakeAnimating = false;
        }
    }
    
    getSnakeAnimationPosition(index) {
        if (!this.isSnakeAnimating || index >= this.snakeAnimationStartPositions.length) {
            return this.snakeBody[index] || { x: 0, y: 0 };
        }
        
        const start = this.snakeAnimationStartPositions[index];
        const end = this.snakeAnimationEndPositions[index];
        
        // Use ease-out for smooth movement
        const easeProgress = 1 - Math.pow(1 - this.snakeAnimationProgress, 3);
        
        return {
            x: start.x + (end.x - start.x) * easeProgress,
            y: start.y + (end.y - start.y) * easeProgress
        };
    }
    
    pauseGame() {
        // Stop independent input processing for levels 20 and 21
        if (this.currentLevel === 20 || this.currentLevel === 21) {
            this.stopIndependentInputProcessing();
        }
        this.gameState = 'paused';
        this.showScreen('pauseMenu');
    }
    
    resumeGame() {
        this.gameState = 'playing';
        this.showScreen('gameScreen');
        // Restart independent input processing for levels 20 and 21
        if (this.currentLevel === 20 || this.currentLevel === 21) {
            this.startIndependentInputProcessing();
        }
        this.gameLoop();
    }
    
    restartLevel() {
        
        if (this.gameState != 'playing') {
            this.gameState = 'playing';
            this.gameLoop();
        }

        this.gameState = 'playing';

        this.showScreen('gameScreen');
        this.score = 0; // Reset score when restarting
        
        // Reset timer for current level (but not global speedrun timer)
        if (this.currentLevel === 20 || this.currentLevel === 21) {
            this.hasMoved = false;
            this.levelStartTime = Date.now();
            // Reset input buffer for levels 20 and 21
            this.inputBuffer = [];
            // Reset grace period for levels 20 and 21
            this.gracePeriodActive = false;
            this.gracePeriodStartTime = 0;
            this.gracePeriodKillingTile = null;
            // Restart independent input processing
            this.stopIndependentInputProcessing();
            this.startIndependentInputProcessing();
        } else {
            // For other levels, reset the level start time
            this.levelStartTime = Date.now();
        }
        
        this.initializeLevel();
        // Don't call gameLoop() here - it's already running from the previous level
        // The existing game loop will continue with the reset state
        
    }
    
    gameOver() {
        // Stop independent input processing for levels 20 and 21
        if (this.currentLevel === 20 || this.currentLevel === 21) {
            this.stopIndependentInputProcessing();
        }
        this.gameState = 'gameOver';
        document.getElementById('finalScore').textContent = `Score: ${this.score}`;
        this.showScreen('gameOverScreen');
    }
    
    playerWins() {
        this.completedLevels.add(this.currentLevel);
        if (this.currentLevel === this.unlockedLevels) {
            this.unlockedLevels++;
        }
        
        // Save progress to localStorage
        localStorage.setItem('unlockedLevels', this.unlockedLevels.toString());
        localStorage.setItem('completedLevels', JSON.stringify(Array.from(this.completedLevels)));
        
        // Calculate level time for speedrun mode
        if (this.speedrunMode) {
            let levelTime;
            if ((this.currentLevel === 20 || this.currentLevel === 21) && this.hasMoved) {
                // Level 20 and 21: Timer starts on first move
                levelTime = Date.now() - this.levelStartTime;
            } else {
                // Other levels: Timer starts when level starts
                levelTime = Date.now() - this.levelStartTime;
            }
            this.levelTimes.push({
                level: this.currentLevel,
                time: levelTime
            });
            this.totalSpeedrunTime += levelTime;
        }
        
        // Show level completion screen
        this.gameState = 'completed';
        document.getElementById('levelCompleteTitle').textContent = 'You caught the AI!';
        document.getElementById('levelCompleteScore').textContent = `Score: ${this.score}`;
        
        // Format time with milliseconds for completion screen
        let totalMilliseconds;
        if ((this.currentLevel === 20 || this.currentLevel === 21) && this.hasMoved) {
            // Level 20 and 21: Timer starts on first move
            totalMilliseconds = Date.now() - this.levelStartTime;
        } else {
            // Other levels: Timer starts when level starts
            totalMilliseconds = Date.now() - this.levelStartTime;
        }
        document.getElementById('levelCompleteTime').textContent = `Time: ${formatTime(totalMilliseconds)}`;
        
        // Show speedrun info if in speedrun mode
        if (this.speedrunMode) {
            const levelTime = this.levelTimes[this.levelTimes.length - 1].time;
            const levelMinutes = Math.floor(levelTime / 60000);
            const levelSeconds = Math.floor((levelTime % 60000) / 1000);
            const levelMilliseconds = Math.floor((levelTime % 1000) / 10);
            
            const totalMinutes = Math.floor(this.totalSpeedrunTime / 60000);
            const totalSeconds = Math.floor((this.totalSpeedrunTime % 60000) / 1000);
            const totalMilliseconds = Math.floor((this.totalSpeedrunTime % 1000) / 10);
            
            document.getElementById('levelCompleteTime').textContent = 
                `Level Time: ${levelMinutes}:${levelSeconds.toString().padStart(2, '0')}.${levelMilliseconds.toString().padStart(2, '0')} | ` +
                `Total: ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}.${totalMilliseconds.toString().padStart(2, '0')}`;
        }
        
        this.showScreen('levelCompleteScreen');
        
        // Auto-start next level in speedrun mode
        if (this.speedrunMode && this.currentLevel < 20) {
            setTimeout(() => {
                this.startLevel(this.currentLevel + 1);
            }, 2000); // 2 second delay to show completion screen
        }
    }
    
    aiWins() {
        this.gameState = 'gameOver';
        document.getElementById('finalScore').textContent = `AI won! Score: ${this.score}`;
        this.showScreen('gameOverScreen');
    }
    
    completeLevel() {
        this.completedLevels.add(this.currentLevel);
        if (this.currentLevel === this.unlockedLevels) {
            this.unlockedLevels++;
        }
        
        // Save progress to localStorage
        localStorage.setItem('unlockedLevels', this.unlockedLevels.toString());
        localStorage.setItem('completedLevels', JSON.stringify(Array.from(this.completedLevels)));
        
        // Calculate level time for speedrun mode
        if (this.speedrunMode) {
            let levelTime;
            if ((this.currentLevel === 20 || this.currentLevel === 21) && this.hasMoved) {
                // Level 20 and 21: Timer starts on first move
                levelTime = Date.now() - this.levelStartTime;
            } else {
                // Other levels: Timer starts when level starts
                levelTime = Date.now() - this.levelStartTime;
            }
            this.levelTimes.push({
                level: this.currentLevel,
                time: levelTime
            });
            this.totalSpeedrunTime += levelTime;
        }
        
        // Stop independent input processing for levels 20 and 21
        if (this.currentLevel === 20 || this.currentLevel === 21) {
            this.stopIndependentInputProcessing();
        }
        
        // Show level completion screen
        this.gameState = 'completed';
        const levelTitle = this.levelTitles[this.currentLevel] || `Level ${this.currentLevel}`;
        document.getElementById('levelCompleteTitle').textContent = levelTitle;
        document.getElementById('levelCompleteScore').textContent = `Score: ${this.score}`;
        
        // Format time with milliseconds for completion screen
        let totalMilliseconds;
        if ((this.currentLevel === 20 || this.currentLevel === 21) && this.hasMoved) {
            // Level 20 and 21: Timer starts on first move
            totalMilliseconds = Date.now() - this.levelStartTime;
        } else {
            // Other levels: Timer starts when level starts
            totalMilliseconds = Date.now() - this.levelStartTime;
        }
        document.getElementById('levelCompleteTime').textContent = `Time: ${formatTime(totalMilliseconds)}`;
        
        // Show speedrun info if in speedrun mode
        if (this.speedrunMode) {
            const levelTime = this.levelTimes[this.levelTimes.length - 1].time;
            const levelMinutes = Math.floor(levelTime / 60000);
            const levelSeconds = Math.floor((levelTime % 60000) / 1000);
            const levelMilliseconds = Math.floor((levelTime % 1000) / 10);
            
            const totalMinutes = Math.floor(this.totalSpeedrunTime / 60000);
            const totalSeconds = Math.floor((this.totalSpeedrunTime % 60000) / 1000);
            const totalMilliseconds = Math.floor((this.totalSpeedrunTime % 1000) / 10);
            
            document.getElementById('levelCompleteTime').textContent = 
                `Level Time: ${levelMinutes}:${levelSeconds.toString().padStart(2, '0')}.${levelMilliseconds.toString().padStart(2, '0')} | ` +
                `Total: ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}.${totalMilliseconds.toString().padStart(2, '0')}`;
        }
        
        this.showScreen('levelCompleteScreen');
        
        // Auto-start next level in speedrun mode
        if (this.speedrunMode && this.currentLevel < 20) {
            setTimeout(() => {
                this.startLevel(this.currentLevel + 1);
            }, 2000); // 2 second delay to show completion screen
        }
    }
    
    loadProgress() {
        const unlocked = localStorage.getItem('unlockedLevels');
        const completed = localStorage.getItem('completedLevels');
        
        if (unlocked) {
            this.unlockedLevels = parseInt(unlocked);
        }
        
        if (completed) {
            this.completedLevels = new Set(JSON.parse(completed));
        }
    }
    
    updateLevel20Walls() {
        // Decrease lifespan for all walls
        for (let i = this.walls.length - 1; i >= 0; i--) {
            this.walls[i].movesRemaining--;
            
            // Remove walls that have expired
            if (this.walls[i].movesRemaining <= 0) {
                this.walls.splice(i, 1);
            }
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.loadProgress();
});
