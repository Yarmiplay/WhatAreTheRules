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
        
                 // Level titles based on main instructions
         this.levelTitles = {
             1: "Foundation",
             2: "Shapes Emerge", 
             3: "Territory Mastery",
             4: "Territory Fusion",
             5: "Time Pressure",
             6: "You are the enemy",
             7: "AI Hunt",
             8: "Maybe Normal",
             9: "Score!",
             10: "100%",
                           11: "Power up"
         };
        
        // Timer properties
        this.levelTime = 0;
        this.maxLevelTime = 300; // 5 minutes in seconds
        this.startTime = 0;
        
        this.player = {
            x: 400,
            y: 300,
            radius: 8,
            speed: 3,
            isInSafeZone: true,
            isDrawing: false,
            line: []
        };
        
        // AI player for level 6 and 7
        this.aiPlayer = {
            x: 400,
            y: 300,
            radius: 8,
            speed: 2.5,
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
        this.lineSegments = [];
        
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        
                 // Speedrun mode properties
         this.speedrunMode = false;
         this.levelStartTime = 0;
         this.totalSpeedrunTime = 0;
         this.levelTimes = [];
         this.speedrunStartLevel = 1;
         
         // Power-up properties for level 11
         this.powerUps = [];
         this.powerUpSpawnTime = 0;
         this.powerUpSpawnInterval = 3000; // 3 seconds
         this.playerPowerUps = {
             speedBoost: 0,
             invincibility: 0
         };
         this.enemySlowEffect = 0;
         this.eatenMovingApples = 0; // Counter for Level 11 winning condition
        
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
                this.startLevel(1); // Start from level 1 in speedrun mode
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
        
        document.getElementById('backToMenu').addEventListener('click', () => {
            this.showScreen('mainMenu');
        });
        
        document.getElementById('backToMenuFromPause').addEventListener('click', () => {
            this.showScreen('mainMenu');
            this.gameState = 'menu';
        });
        
        document.getElementById('backToLevels').addEventListener('click', () => {
            this.showScreen('levelSelector');
            this.gameState = 'menu';
        });
        
        document.getElementById('backToLevelsFromGameOver').addEventListener('click', () => {
            this.showScreen('levelSelector');
            this.gameState = 'menu';
        });
        
        // Game controls
        document.getElementById('pauseButton').addEventListener('click', () => {
            this.pauseGame();
        });
        
        document.getElementById('resumeButton').addEventListener('click', () => {
            this.resumeGame();
        });
        
        document.getElementById('restartButton').addEventListener('click', () => {
            this.restartLevel();
        });
        
        document.getElementById('restartFromPause').addEventListener('click', () => {
            this.restartLevel();
        });
        
        document.getElementById('restartFromGameOver').addEventListener('click', () => {
            this.restartLevel();
        });
        
        // Level completion screen
        document.getElementById('nextLevelButton').addEventListener('click', () => {
            this.startLevel(this.currentLevel + 1);
        });
        
        document.getElementById('restartFromComplete').addEventListener('click', () => {
            this.restartLevel();
        });
        
        document.getElementById('backToLevelsFromComplete').addEventListener('click', () => {
            this.showScreen('levelSelector');
            this.gameState = 'menu';
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            if (e.key === 'Escape' && this.gameState === 'playing') {
                this.pauseGame();
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
                this.startDrawing();
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (this.gameState === 'playing') {
                this.stopDrawing();
            }
        });
        

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
            }
            
            levelButton.addEventListener('click', () => {
                if (i <= this.unlockedLevels) {
                    this.startLevel(i);
                }
            });
            
            levelGrid.appendChild(levelButton);
        }
    }
    
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        document.getElementById(screenName).classList.add('active');
        this.currentScreen = screenName;
        
        if (screenName === 'levelSelector') {
            this.createLevelSelector();
        }
    }
    
    startLevel(level) {
        this.currentLevel = level;
        this.score = 0;
        this.gameState = 'playing';
        this.showScreen('gameScreen');
        
        // Start level timer for speedrun mode
        if (this.speedrunMode) {
            this.levelStartTime = Date.now();
        }
        
        this.initializeLevel();
        this.gameLoop();
    }
    
    initializeLevel() {
        // Reset game objects
        this.player.x = 400;
        this.player.y = 300;
        this.player.isInSafeZone = true;
        this.player.isDrawing = false;
        this.player.line = [];
        this.player.exitPosition = null;
        
        // Reset AI player for level 6 and 7
        this.aiPlayer.x = 400;
        this.aiPlayer.y = 300;
        this.aiPlayer.isInSafeZone = true;
        this.aiPlayer.isDrawing = false;
        this.aiPlayer.line = [];
        this.aiPlayer.exitPosition = null;
        this.aiPlayer.wanderAngle = Math.random() * Math.PI * 2;
        
        // Reset multiple AI players for level 7
        this.aiPlayers = [];
        
                 this.safeZones = [];
         this.enemies = [];
         this.apples = [];
         this.lineSegments = [];
         this.powerUps = [];
        
                 // Reset timer (starts from 0)
         this.levelTime = 0;
         this.startTime = Date.now();
         
         // Reset power-up properties
         this.playerPowerUps = {
             speedBoost: 0,
             invincibility: 0
         };
         this.enemySlowEffect = 0;
         this.powerUpSpawnTime = Date.now();
         this.eatenMovingApples = 0; // Reset counter for Level 11
         console.log('Level 11 counter reset to 0');
        
        // Create initial safe zone
        this.safeZones.push({
            type: 'rectangle',
            x: 350,
            y: 250,
            width: 100,
            height: 100
        });
        
        // Level 6 and 7: Special setup - no regular enemies, just AI player(s)
        if (this.currentLevel === 6) {
            // Position AI player away from the player
            this.aiPlayer.x = 600;
            this.aiPlayer.y = 400;
            this.aiPlayer.isInSafeZone = false;
            this.aiPlayer.wanderAngle = Math.random() * Math.PI * 2;
                 } else if (this.currentLevel === 7) {
             // Level 7: Start with one AI player
             this.aiPlayer.x = 600;
             this.aiPlayer.y = 400;
             this.aiPlayer.isInSafeZone = false;
             this.aiPlayer.wanderAngle = Math.random() * Math.PI * 2;
         } else if (this.currentLevel === 9) {
             // Level 9: Create AI enemies that can be hunted (like level 6/7 but as enemies)
             let aiEnemyCount = 4; // Start with 4 AI enemies
         } else if (this.currentLevel === 10) {
             // Level 10: Create regular enemies like level 8
             let enemyCount = 4; // Start with 4 enemies
         } else if (this.currentLevel === 11) {
             // Level 11: Create enemies that become moving apples when enclosed
             let enemyCount = 3; // Start with 3 enemies (need to eat 3 to win)
             
             for (let i = 0; i < enemyCount; i++) {
                 let enemyX, enemyY;
                 let attempts = 0;
                 
                 // Keep trying until we find a position outside the safe zone
                 do {
                     enemyX = Math.random() * (this.canvas.width - 100) + 50;
                     enemyY = Math.random() * (this.canvas.height - 100) + 50;
                     attempts++;
                 } while (this.isPositionInSafeZone(enemyX, enemyY) && attempts < 50);
                 
                 this.enemies.push({
                     x: enemyX,
                     y: enemyY,
                     radius: 6,
                     speed: 0.8 + Math.random() * 0.8,
                     wanderAngle: Math.random() * Math.PI * 2,
     
                 });
             }
             
             // Spawn initial power-up
             this.spawnPowerUp();
         } else {
            // Create enemies based on level for other levels
            let enemyCount = Math.min(3 + Math.floor(this.currentLevel / 2), 8);
            if (this.currentLevel === 4) {
                enemyCount = 2; // Level 4 has only 2 enemies
            }
            
            if (this.currentLevel === 1 || this.currentLevel === 2 || this.currentLevel === 3 || this.currentLevel === 4 || this.currentLevel === 5) {
                // Fixed positions for level 1, 2, 3, 4, and 5
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
                
                for (let i = 0; i < enemyCount; i++) {
                    const position = fixedPositions[i];
                    this.enemies.push({
                        x: position.x,
                        y: position.y,
                        radius: 6,
                        speed: 0.8 + Math.random() * 0.8, // Slower than player (player speed is 3)
                        wanderAngle: Math.random() * Math.PI * 2
                    });
                }
            } else {
                // Random positions for higher levels
                for (let i = 0; i < enemyCount; i++) {
                    let enemyX, enemyY;
                    let attempts = 0;
                    
                    // Keep trying until we find a position outside the safe zone
                    do {
                        enemyX = Math.random() * (this.canvas.width - 100) + 50;
                        enemyY = Math.random() * (this.canvas.height - 100) + 50;
                        attempts++;
                    } while (this.isPositionInSafeZone(enemyX, enemyY) && attempts < 50);
                    
                    this.enemies.push({
                        x: enemyX,
                        y: enemyY,
                        radius: 6,
                        speed: 0.8 + Math.random() * 0.8, // Slower than player (player speed is 3)
                        wanderAngle: Math.random() * Math.PI * 2
                    });
                }
            }
        }
        
        this.updateDisplay();
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
    
    // New method to handle when player exits safe zone
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
                         if (this.currentLevel === 2 || this.currentLevel === 3 || this.currentLevel === 4 || this.currentLevel === 5 || this.currentLevel === 8 || this.currentLevel === 9 || this.currentLevel === 10 || this.currentLevel === 11) {
                 // For level 2, 3, 4, 5, 8, 9, 10, and 11, create a proper polygon area
                const polygon = this.createPolygonFromLine(points);
                const newSafeZone = {
                    type: 'polygon',
                    points: polygon,
                    bounds: this.calculatePolygonBounds(polygon)
                };
                
                // For level 5, make safe zones temporary (8 seconds) unless an enemy was killed
                if (this.currentLevel === 5) {
                    newSafeZone.temporary = true;
                    newSafeZone.createdAt = Date.now();
                    newSafeZone.lifespan = 8000; // 8 seconds
                    newSafeZone.enemyKilled = false; // Track if enemy was killed in this zone
                }
                
                                                 // Level 4, 7, 8, 9, 10, and 11: Merge with existing safe zones instead of creating new ones
         if (this.currentLevel === 4 || this.currentLevel === 7 || this.currentLevel === 8 || this.currentLevel === 9 || this.currentLevel === 10 || this.currentLevel === 11) {
             this.mergeSafeZones(newSafeZone);
         } else {
            this.safeZones.push(newSafeZone);
        }
                
                                         // Check for enemies trapped inside the polygon
        console.log(`Level 11: Checking ${this.enemies.length} enemies against polygon`);
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            console.log(`Level 11: Enemy ${i} at (${enemy.x}, ${enemy.y})`);
            if (this.isPointInPolygon(enemy.x, enemy.y, polygon)) {
                console.log(`Level 11: Enemy ${i} is inside polygon!`);
                // Convert enemy to apple for all levels
                const points = this.currentLevel === 9 ? 100 : 50; // Level 9 gives more points
                this.apples.push({
                    x: enemy.x,
                    y: enemy.y,
                    radius: 8,
                    points: points
                });
                this.enemies.splice(i, 1);
                
                // Level 11: Check if all enemies are gone
                if (this.currentLevel === 11 && this.enemies.length === 0) {
                    console.log('Level 11: All enemies removed! Completing level...');
                    this.completeLevel();
                    return;
                }
                
                // For level 5, mark the zone as permanent if an enemy was killed
                if (this.currentLevel === 5) {
                    newSafeZone.enemyKilled = true;
                    newSafeZone.temporary = false;
                }
            }
        }
                
                        // Add score for capturing area
        const area = this.calculatePolygonArea(polygon);
        const areaScore = this.currentLevel === 9 ? Math.floor(area / 50) : Math.floor(area / 100); // Level 9 gives more area points
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
                            radius: 8,
                            points: 50
                        });
                        this.enemies.splice(i, 1);
                    }
                }
                
                        // Add score for capturing area
        const area = (maxX - minX) * (maxY - minY);
        const areaScore = this.currentLevel === 9 ? Math.floor(area / 50) : Math.floor(area / 100); // Level 9 gives more area points
        this.score += areaScore;
            }
        }
        
        this.player.line = [];
        this.player.isDrawing = false;
        this.updateDisplay();
    }
    
    respawnEnemy() {
        // Only respawn enemies in level 4
        if (this.currentLevel === 4 && this.enemies.length < 2) {
            let enemyX, enemyY;
            let attempts = 0;
            
            // Keep trying until we find a position outside the safe zone
            do {
                enemyX = Math.random() * (this.canvas.width - 100) + 50;
                enemyY = Math.random() * (this.canvas.height - 100) + 50;
                attempts++;
            } while (this.isPositionInSafeZone(enemyX, enemyY) && attempts < 50);
            
            this.enemies.push({
                x: enemyX,
                y: enemyY,
                radius: 6,
                speed: 0.8 + Math.random() * 0.8,
                wanderAngle: Math.random() * Math.PI * 2
            });
        }
    }
    
    checkTemporaryZones() {
        // Only check temporary zones in level 5
        if (this.currentLevel === 5) {
            const currentTime = Date.now();
            
            // Remove expired temporary zones
            for (let i = this.safeZones.length - 1; i >= 0; i--) {
                const zone = this.safeZones[i];
                if (zone.temporary && !zone.enemyKilled) {
                    const age = currentTime - zone.createdAt;
                    if (age >= zone.lifespan) {
                        this.safeZones.splice(i, 1);
                    }
                }
            }
        }
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
                if (this.isPointInPolygon(this.player.x, this.player.y, zone.points)) {
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
            for (const enemy of this.enemies) {
                const distance = Math.sqrt(
                    Math.pow(this.player.x - enemy.x, 2) + 
                    Math.pow(this.player.y - enemy.y, 2)
                );
                
                                 if (distance < this.player.radius + enemy.radius) {
                     // Level 11: Check if player is invincible
                     if (this.currentLevel === 11 && this.playerPowerUps.invincibility > 0) {
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
                    
                    const distance = this.pointToLineDistance(
                        enemy.x, enemy.y,
                        lineStart.x, lineStart.y,
                        lineEnd.x, lineEnd.y
                    );
                    
                    if (distance < enemy.radius) {
                        // Level 11: Check if player is invincible
                        if (this.currentLevel === 11 && this.playerPowerUps.invincibility > 0) {
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
                 this.respawnEnemy(); // Respawn enemy for level 4
                 this.updateDisplay();
                 
                 // Level 9: Check if score target is reached
                 if (this.currentLevel === 9 && this.score >= 5000) {
                     this.completeLevel();
                     return;
                 }
             }
         }
         

         
         // Check power-up collection (Level 11)
         if (this.currentLevel === 11) {
             for (let i = this.powerUps.length - 1; i >= 0; i--) {
                 const powerUp = this.powerUps[i];
                 const distance = Math.sqrt(
                     Math.pow(this.player.x - powerUp.x, 2) + 
                     Math.pow(this.player.y - powerUp.y, 2)
                 );
                 
                 if (distance < this.player.radius + powerUp.radius) {
                     // Apply power-up effect
                     switch (powerUp.type) {
                         case 'rabbit':
                             this.playerPowerUps.speedBoost = 5000; // 5 seconds
                             break;
                         case 'turtle':
                             this.enemySlowEffect = 5000; // 5 seconds
                             break;
                         case 'star':
                             this.playerPowerUps.invincibility = 5000; // 5 seconds
                             break;
                     }
                     
                     this.powerUps.splice(i, 1);
                     this.updateDisplay();
                 }
             }
         }
    }
    
    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) param = dot / lenSq;
        
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    createPolygonFromLine(points) {
        // Create a polygon that connects the line to the nearest safe zone
        const polygon = [...points];
        
        if (this.currentLevel === 3) {
            // For level 3, create a comprehensive polygon that fills trapped areas between safe zones
        } else if (this.currentLevel === 4) {
            // For level 4, mixed-up filling rules!
            if (this.player.exitPosition) {
                // Start with the line points
                const linePoints = [...points];
                
                // Find the exit zone (where player left from)
                let exitZone = null;
                for (const zone of this.safeZones) {
                    if (zone.type === 'polygon') {
                        if (this.isPointInPolygon(this.player.exitPosition.x, this.player.exitPosition.y, zone.points)) {
                            exitZone = zone;
                            break;
                        }
                    } else {
                        if (this.player.exitPosition.x >= zone.x && this.player.exitPosition.x <= zone.x + zone.width &&
                            this.player.exitPosition.y >= zone.y && this.player.exitPosition.y <= zone.y + zone.height) {
                            exitZone = zone;
                            break;
                        }
                    }
                }
                
                // Level 4 mixed rules: Create a zigzag pattern that connects to multiple safe zones
                const mixedPolygon = [...linePoints];
                
                // Find all safe zones and create connection points in a zigzag pattern
                const allZones = [...this.safeZones];
                if (exitZone) {
                    // Remove exit zone from the list to handle it separately
                    const exitZoneIndex = allZones.indexOf(exitZone);
                    if (exitZoneIndex > -1) {
                        allZones.splice(exitZoneIndex, 1);
                    }
                }
                
                // Add zigzag connections to other safe zones
                for (let i = 0; i < allZones.length && i < 3; i++) { // Limit to 3 zones for performance
                    const zone = allZones[i];
                    let zonePoints = [];
                    
                    if (zone.type === 'polygon') {
                        zonePoints = zone.points;
                    } else {
                        zonePoints = [
                            { x: zone.x, y: zone.y },
                            { x: zone.x + zone.width, y: zone.y },
                            { x: zone.x + zone.width, y: zone.y + zone.height },
                            { x: zone.x, y: zone.y + zone.height }
                        ];
                    }
                    
                    // Add every other point from the zone in a zigzag pattern
                    for (let j = 0; j < zonePoints.length; j += 2) {
                        mixedPolygon.push(zonePoints[j]);
                    }
                }
                
                // Connect back to the exit position
                mixedPolygon.push({ x: this.player.exitPosition.x, y: this.player.exitPosition.y });
                
                // Add points from the exit zone in a spiral pattern
                if (exitZone) {
                    if (exitZone.type === 'polygon') {
                        // Add points in reverse order for spiral effect
                        for (let i = exitZone.points.length - 1; i >= 0; i -= 2) {
                            mixedPolygon.push(exitZone.points[i]);
                        }
                    } else {
                        // Add rectangle corners in a specific order
                        mixedPolygon.push({ x: exitZone.x, y: exitZone.y });
                        mixedPolygon.push({ x: exitZone.x + exitZone.width, y: exitZone.y + exitZone.height });
                        mixedPolygon.push({ x: exitZone.x + exitZone.width, y: exitZone.y });
                        mixedPolygon.push({ x: exitZone.x, y: exitZone.y + exitZone.height });
                    }
                }
                
                return mixedPolygon;
            }
            if (this.player.exitPosition) {
                // Start with the line points
                const linePoints = [...points];
                
                // Find all safe zones that could be involved in creating trapped areas
                const involvedZones = [];
                
                // Find the exit zone (where player left from)
                let exitZone = null;
                for (const zone of this.safeZones) {
                    if (zone.type === 'polygon') {
                        if (this.isPointInPolygon(this.player.exitPosition.x, this.player.exitPosition.y, zone.points)) {
                            exitZone = zone;
                            break;
                        }
                    } else {
                        if (this.player.exitPosition.x >= zone.x && this.player.exitPosition.x <= zone.x + zone.width &&
                            this.player.exitPosition.y >= zone.y && this.player.exitPosition.y <= zone.y + zone.height) {
                            exitZone = zone;
                            break;
                        }
                    }
                }
                
                // Find zones that are close to the line path
                for (const zone of this.safeZones) {
                    let zonePoints = [];
                    if (zone.type === 'polygon') {
                        zonePoints = zone.points;
                    } else {
                        zonePoints = [
                            { x: zone.x, y: zone.y },
                            { x: zone.x + zone.width, y: zone.y },
                            { x: zone.x + zone.width, y: zone.y + zone.height },
                            { x: zone.x, y: zone.y + zone.height }
                        ];
                    }
                    
                    // Check if any point of the zone is close to the line
                    for (const zonePoint of zonePoints) {
                        for (const linePoint of linePoints) {
                            const distance = Math.sqrt(
                                Math.pow(zonePoint.x - linePoint.x, 2) + 
                                Math.pow(zonePoint.y - linePoint.y, 2)
                            );
                            if (distance < 100) { // Within 100 pixels
                                involvedZones.push(zone);
                                break;
                            }
                        }
                        if (involvedZones.includes(zone)) break;
                    }
                }
                
                // Create a comprehensive polygon that includes the line and connects to involved zones
                const comprehensivePolygon = [...linePoints];
                
                // Add connection points to involved zones
                for (const zone of involvedZones) {
                    if (zone.type === 'polygon') {
                        // For polygon zones, add the closest points
                        for (const zonePoint of zone.points) {
                            const distance = Math.sqrt(
                                Math.pow(linePoints[linePoints.length - 1].x - zonePoint.x, 2) + 
                                Math.pow(linePoints[linePoints.length - 1].y - zonePoint.y, 2)
                            );
                            if (distance < 50) { // Close connection points
                                comprehensivePolygon.push(zonePoint);
                            }
                        }
                    } else {
                        // For rectangle zones, add corner points
                        const zonePoints = [
                            { x: zone.x, y: zone.y },
                            { x: zone.x + zone.width, y: zone.y },
                            { x: zone.x + zone.width, y: zone.y + zone.height },
                            { x: zone.x, y: zone.y + zone.height }
                        ];
                        
                        for (const zonePoint of zonePoints) {
                            const distance = Math.sqrt(
                                Math.pow(linePoints[linePoints.length - 1].x - zonePoint.x, 2) + 
                                Math.pow(linePoints[linePoints.length - 1].y - zonePoint.y, 2)
                            );
                            if (distance < 50) { // Close connection points
                                comprehensivePolygon.push(zonePoint);
                            }
                        }
                    }
                }
                
                // Connect back to the exit position
                comprehensivePolygon.push({ x: this.player.exitPosition.x, y: this.player.exitPosition.y });
                
                // Add points from the exit zone to complete the enclosure
                if (exitZone) {
                    if (exitZone.type === 'polygon') {
                        // Add some points from the exit zone polygon
                        for (let i = 0; i < exitZone.points.length; i += 2) {
                            comprehensivePolygon.push(exitZone.points[i]);
                        }
                    } else {
                        // Add corner points from the exit rectangle
                        comprehensivePolygon.push({ x: exitZone.x, y: exitZone.y });
                        comprehensivePolygon.push({ x: exitZone.x + exitZone.width, y: exitZone.y });
                        comprehensivePolygon.push({ x: exitZone.x + exitZone.width, y: exitZone.y + exitZone.height });
                        comprehensivePolygon.push({ x: exitZone.x, y: exitZone.y + exitZone.height });
                    }
                }
                
                return comprehensivePolygon;
            }
                 } else if (this.currentLevel === 8 || this.currentLevel === 9 || this.currentLevel === 10 || this.currentLevel === 11) {
             // Level 8, 9, 10, and 11: Create polygon that matches exact drawn shape + ALL existing areas
             if (this.currentLevel === 11) {
                 return this.createLevel11Polygon(points);
             } else {
                 return this.createLevel8Polygon(points);
             }
         } else {
            // For level 2, connect to the original safe zone (existing logic)
            // Find the nearest safe zone to connect to
            let nearestZone = null;
            let minDistance = Infinity;
            
            for (const zone of this.safeZones) {
                if (zone.type === 'rectangle') {
                    // Calculate distance to rectangle zone
                    const dx = Math.max(zone.x - points[0].x, 0, points[0].x - (zone.x + zone.width));
                    const dy = Math.max(zone.y - points[0].y, 0, points[0].y - (zone.y + zone.height));
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestZone = zone;
                    }
                }
            }
            
            if (nearestZone && nearestZone.type === 'rectangle') {
                // Add points to connect to the nearest safe zone
                const startPoint = points[0];
                const endPoint = points[points.length - 1];
                
                // Find the closest corner or edge of the safe zone
                const zonePoints = [
                    { x: nearestZone.x, y: nearestZone.y },
                    { x: nearestZone.x + nearestZone.width, y: nearestZone.y },
                    { x: nearestZone.x + nearestZone.width, y: nearestZone.y + nearestZone.height },
                    { x: nearestZone.x, y: nearestZone.y + nearestZone.height }
                ];
                
                let closestZonePoint = zonePoints[0];
                let closestDistance = Math.sqrt(
                    Math.pow(endPoint.x - zonePoints[0].x, 2) + 
                    Math.pow(endPoint.y - zonePoints[0].y, 2)
                );
                
                for (const zonePoint of zonePoints) {
                    const distance = Math.sqrt(
                        Math.pow(endPoint.x - zonePoint.x, 2) + 
                        Math.pow(endPoint.y - zonePoint.y, 2)
                    );
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestZonePoint = zonePoint;
                    }
                }
                
                // Add the connection points to complete the polygon
                polygon.push(closestZonePoint);
                
                // Add points along the safe zone edge to connect back to start
                if (closestZonePoint.x === nearestZone.x) {
                    // Left edge
                    polygon.push({ x: nearestZone.x, y: nearestZone.y });
                } else if (closestZonePoint.x === nearestZone.x + nearestZone.width) {
                    // Right edge
                    polygon.push({ x: nearestZone.x + nearestZone.width, y: nearestZone.y });
                }
                
                if (closestZonePoint.y === nearestZone.y) {
                    // Top edge
                    polygon.push({ x: nearestZone.x, y: nearestZone.y });
                } else if (closestZonePoint.y === nearestZone.y + nearestZone.height) {
                    // Bottom edge
                    polygon.push({ x: nearestZone.x, y: nearestZone.y + nearestZone.height });
                }
            }
        }
        
        return polygon;
    }
    
    calculatePolygonBounds(polygon) {
        let minX = Math.min(...polygon.map(p => p.x));
        let maxX = Math.max(...polygon.map(p => p.x));
        let minY = Math.min(...polygon.map(p => p.y));
        let maxY = Math.max(...polygon.map(p => p.y));
        
        return { minX, maxX, minY, maxY };
    }
    
    isPointInPolygon(x, y, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }
    
    calculatePolygonArea(polygon) {
        let area = 0;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            area += (polygon[j].x + polygon[i].x) * (polygon[j].y - polygon[i].y);
        }
        return Math.abs(area) / 2;
    }
    
         updatePlayer() {
         let dx = 0;
         let dy = 0;
         
         // Calculate current speed (with power-up boost for Level 11)
         let currentSpeed = this.player.speed;
         if (this.currentLevel === 11 && this.playerPowerUps.speedBoost > 0) {
             currentSpeed *= 1.5; // 50% speed boost
         }
         
         if (this.keys['w'] || this.keys['ArrowUp']) dy -= currentSpeed;
         if (this.keys['s'] || this.keys['ArrowDown']) dy += currentSpeed;
         if (this.keys['a'] || this.keys['ArrowLeft']) dx -= currentSpeed;
         if (this.keys['d'] || this.keys['ArrowRight']) dx += currentSpeed;
        
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
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
                
                const distance = this.pointToLineDistance(
                    this.player.x, this.player.y,
                    lineStart.x, lineStart.y,
                    lineEnd.x, lineEnd.y
                );
                
                // Only check if player center is very close to the line (within 2 pixels)
                if (distance < 2) {
                    // Level 11: Check if player is invincible
                    if (this.currentLevel === 11 && this.playerPowerUps.invincibility > 0) {
                        // Player is invincible, ignore collision
                    } else {
                        this.gameOver();
                        return;
                    }
                }
            }
        }
    }
    
    updateAIPlayer() {
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
                if (this.isPointInPolygon(ai.x, ai.y, zone.points)) {
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
                    if (this.isPointInPolygon(this.aiPlayer.x, this.aiPlayer.y, zone.points)) {
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
    
         mergeSafeZones(newZone) {
         // Level 4, 8, 10, and 11: Merge new zone with existing zones
         if (this.currentLevel === 8 || this.currentLevel === 10 || this.currentLevel === 11) {
             // Level 8, 10, and 11: Merge the new area with the existing polygon to create a larger combined area
             // Check for enemies trapped inside the new zone
             for (let i = this.enemies.length - 1; i >= 0; i--) {
                 const enemy = this.enemies[i];
                 if (this.isPointInPolygon(enemy.x, enemy.y, newZone.points)) {
                     // Convert enemy to apple
                     this.apples.push({
                         x: enemy.x,
                         y: enemy.y,
                         radius: 8,
                         points: 50
                     });
                     this.enemies.splice(i, 1);
                 }
             }
             
             // Find the existing polygon zone (should be the only one)
             let existingPolygonZone = null;
             for (const zone of this.safeZones) {
                 if (zone.type === 'polygon') {
                     existingPolygonZone = zone;
                     break;
                 }
             }
             
                                                       if (existingPolygonZone) {
                   if (this.currentLevel === 11) {
                       // Level 11: Just use the new zone directly (it already includes the existing area)
                       // The createLevel11Polygon method already handles the merging correctly
                       this.safeZones = [newZone];
                   } else {
                      // Level 8 and 10: Create a merged polygon that combines the existing area with the new area
                      const mergedPoints = [...existingPolygonZone.points, ...newZone.points];
                      
                      // Create convex hull to create a proper merged polygon
                      const mergedPolygon = this.createConvexHull(mergedPoints);
                      
                      // Replace the existing zone with the merged zone
                      this.safeZones = [{
                          type: 'polygon',
                          points: mergedPolygon,
                          bounds: this.calculatePolygonBounds(mergedPolygon)
                      }];
                  }
             } else {
                 // If no existing polygon, just use the new zone
                 this.safeZones = [newZone];
             }
         } else if (this.currentLevel === 4) {
            // Level 4: Merge new zone with existing zones that overlap or are close
            const mergeDistance = 50; // Distance threshold for merging
            const zonesToMerge = [];
            
            // Find zones that should be merged
            for (let i = 0; i < this.safeZones.length; i++) {
                const existingZone = this.safeZones[i];
                
                // Check if zones overlap or are close enough to merge
                if (this.zonesShouldMerge(newZone, existingZone, mergeDistance)) {
                    zonesToMerge.push(i);
                }
            }
            
            if (zonesToMerge.length > 0) {
                try {
                    // Create merged zone
                    const mergedZone = this.createMergedZone(newZone, zonesToMerge);
                    
                    // Check for enemies trapped inside the merged zone
                    for (let i = this.enemies.length - 1; i >= 0; i--) {
                        const enemy = this.enemies[i];
                        if (this.isPointInPolygon(enemy.x, enemy.y, mergedZone.points)) {
                            // Convert enemy to apple
                            this.apples.push({
                                x: enemy.x,
                                y: enemy.y,
                                radius: 8,
                                points: 50
                            });
                            this.enemies.splice(i, 1);
                        }
                    }
                    
                    // Remove old zones and add merged zone
                    for (let i = zonesToMerge.length - 1; i >= 0; i--) {
                        this.safeZones.splice(zonesToMerge[i], 1);
                    }
                    this.safeZones.push(mergedZone);
                } catch (error) {
                    // If merging fails, just add the new zone
                    console.warn('Merging failed, adding zone separately:', error);
                    this.safeZones.push(newZone);
                }
            } else {
                // No zones to merge with, just add the new zone
                this.safeZones.push(newZone);
            }
        }
    }
    
    zonesShouldMerge(zone1, zone2, distance) {
        // Check if two zones should be merged based on proximity
        try {
            let bounds1, bounds2;
            
            // Handle different zone types
            if (zone1.type === 'polygon' && zone1.points) {
                bounds1 = zone1.bounds || this.calculatePolygonBounds(zone1.points);
            } else if (zone1.type === 'rectangle') {
                bounds1 = {
                    minX: zone1.x,
                    maxX: zone1.x + zone1.width,
                    minY: zone1.y,
                    maxY: zone1.y + zone1.height
                };
            } else {
                return false; // Invalid zone type
            }
            
            if (zone2.type === 'polygon' && zone2.points) {
                bounds2 = zone2.bounds || this.calculatePolygonBounds(zone2.points);
            } else if (zone2.type === 'rectangle') {
                bounds2 = {
                    minX: zone2.x,
                    maxX: zone2.x + zone2.width,
                    minY: zone2.y,
                    maxY: zone2.y + zone2.height
                };
            } else {
                return false; // Invalid zone type
            }
            
            // Check if bounding boxes overlap or are close
            const horizontalOverlap = !(bounds1.maxX + distance < bounds2.minX || bounds2.maxX + distance < bounds1.minX);
            const verticalOverlap = !(bounds1.maxY + distance < bounds2.minY || bounds2.maxY + distance < bounds1.minY);
            
            return horizontalOverlap && verticalOverlap;
        } catch (error) {
            console.warn('Error checking zone merge:', error);
            return false;
        }
    }
    
    createMergedZone(newZone, zoneIndices) {
        // Create a merged zone that encompasses all the zones to be merged
        const zonesToMerge = [newZone, ...zoneIndices.map(i => this.safeZones[i])];
        
        // Calculate the bounding box of all zones
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        for (const zone of zonesToMerge) {
            let bounds;
            if (zone.type === 'polygon' && zone.points) {
                bounds = zone.bounds || this.calculatePolygonBounds(zone.points);
            } else if (zone.type === 'rectangle') {
                bounds = {
                    minX: zone.x,
                    maxX: zone.x + zone.width,
                    minY: zone.y,
                    maxY: zone.y + zone.height
                };
            } else {
                continue; // Skip invalid zones
            }
            
            minX = Math.min(minX, bounds.minX);
            maxX = Math.max(maxX, bounds.maxX);
            minY = Math.min(minY, bounds.minY);
            maxY = Math.max(maxY, bounds.maxY);
        }
        
        // Ensure we have valid bounds
        if (minX === Infinity || maxX === -Infinity || minY === Infinity || maxY === -Infinity) {
            throw new Error('Invalid bounds for merged zone');
        }
        
        // Create a comprehensive polygon that includes all zones
        const mergedPoints = [];
        
        // Add points from all zones
        for (const zone of zonesToMerge) {
            if (zone.type === 'polygon' && zone.points && zone.points.length > 0) {
                mergedPoints.push(...zone.points);
            } else if (zone.type === 'rectangle') {
                // Add rectangle corners
                mergedPoints.push(
                    { x: zone.x, y: zone.y },
                    { x: zone.x + zone.width, y: zone.y },
                    { x: zone.x + zone.width, y: zone.y + zone.height },
                    { x: zone.x, y: zone.y + zone.height }
                );
            }
        }
        
        // Add corner points of the bounding box to ensure complete coverage
        mergedPoints.push(
            { x: minX, y: minY },
            { x: maxX, y: minY },
            { x: maxX, y: maxY },
            { x: minX, y: maxY }
        );
        
        // Ensure we have enough points for a convex hull
        if (mergedPoints.length < 3) {
            throw new Error('Not enough points for merged zone');
        }
        
        // Create convex hull to simplify the merged polygon
        const simplifiedPoints = this.createConvexHull(mergedPoints);
        
        return {
            type: 'polygon',
            points: simplifiedPoints,
            bounds: { minX, maxX, minY, maxY }
        };
    }
    
    createConvexHull(points) {
        // Graham scan algorithm for convex hull
        if (points.length < 3) return points;
        
        // Remove duplicate points
        const uniquePoints = [];
        for (const point of points) {
            const isDuplicate = uniquePoints.some(p => 
                Math.abs(p.x - point.x) < 0.1 && Math.abs(p.y - point.y) < 0.1
            );
            if (!isDuplicate) {
                uniquePoints.push(point);
            }
        }
        
        if (uniquePoints.length < 3) return uniquePoints;
        
        // Find the point with the lowest y-coordinate (and leftmost if tied)
        let start = 0;
        for (let i = 1; i < uniquePoints.length; i++) {
            if (uniquePoints[i].y < uniquePoints[start].y || 
                (uniquePoints[i].y === uniquePoints[start].y && uniquePoints[i].x < uniquePoints[start].x)) {
                start = i;
            }
        }
        
        // Sort points by polar angle with respect to start point
        const sortedPoints = uniquePoints.map((point, index) => ({ point, index }))
            .filter(p => p.index !== start)
            .sort((a, b) => {
                const angleA = Math.atan2(a.point.y - uniquePoints[start].y, a.point.x - uniquePoints[start].x);
                const angleB = Math.atan2(b.point.y - uniquePoints[start].y, b.point.x - uniquePoints[start].x);
                return angleA - angleB;
            })
            .map(p => p.point);
        
        // Build convex hull
        const hull = [uniquePoints[start]];
        
        if (sortedPoints.length > 0) {
            hull.push(sortedPoints[0]);
            
            for (let i = 1; i < sortedPoints.length; i++) {
                while (hull.length > 1 && this.crossProduct(hull[hull.length - 2], hull[hull.length - 1], sortedPoints[i]) <= 0) {
                    hull.pop();
                }
                hull.push(sortedPoints[i]);
            }
        }
        
        return hull;
    }
    
                  crossProduct(p1, p2, p3) {
         return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
     }
     
     spawnPowerUp() {
         // Spawn a random power-up at a random position
         const powerUpTypes = ['rabbit', 'turtle', 'star'];
         const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
         
         let powerUpX, powerUpY;
         let attempts = 0;
         
         do {
             powerUpX = Math.random() * (this.canvas.width - 100) + 50;
             powerUpY = Math.random() * (this.canvas.height - 100) + 50;
             attempts++;
         } while (this.isPositionInSafeZone(powerUpX, powerUpY) && attempts < 50);
         
         this.powerUps.push({
             x: powerUpX,
             y: powerUpY,
             radius: 8,
             type: randomType,
             createdAt: Date.now(),
             lifespan: 8000 // 8 seconds
         });
     }
     
     updatePowerUps() {
         const currentTime = Date.now();
         
         // Remove expired power-ups
         for (let i = this.powerUps.length - 1; i >= 0; i--) {
             const powerUp = this.powerUps[i];
             if (currentTime - powerUp.createdAt >= powerUp.lifespan) {
                 this.powerUps.splice(i, 1);
             }
         }
         
         // Spawn new power-ups every 3 seconds
         if (currentTime - this.powerUpSpawnTime >= this.powerUpSpawnInterval) {
             this.spawnPowerUp();
             this.powerUpSpawnTime = currentTime;
         }
         
         // Update active power-up timers
         if (this.playerPowerUps.speedBoost > 0) {
             this.playerPowerUps.speedBoost -= 16; // Assuming 60fps
             if (this.playerPowerUps.speedBoost <= 0) {
                 this.playerPowerUps.speedBoost = 0;
             }
         }
         
         if (this.playerPowerUps.invincibility > 0) {
             this.playerPowerUps.invincibility -= 16;
             if (this.playerPowerUps.invincibility <= 0) {
                 this.playerPowerUps.invincibility = 0;
             }
         }
         
         if (this.enemySlowEffect > 0) {
             this.enemySlowEffect -= 16;
             if (this.enemySlowEffect <= 0) {
                 this.enemySlowEffect = 0;
             }
         }
     }
    
    checkForEnclosedUnsafeAreas(newPolygon) {
        // Check if the new polygon would create any enclosed unsafe areas within the safe zone
        // This is a simplified check - we'll sample points within the polygon to see if any are unsafe
        
        // Get the bounding box of the new polygon
        const bounds = this.calculatePolygonBounds(newPolygon);
        
        // Sample points within the polygon to check if any unsafe areas would be enclosed
        const samplePoints = [];
        const step = 20; // Sample every 20 pixels
        
        for (let x = bounds.minX; x <= bounds.maxX; x += step) {
            for (let y = bounds.minY; y <= bounds.maxY; y += step) {
                // Check if this point is inside the new polygon
                if (this.isPointInPolygon(x, y, newPolygon)) {
                    // Check if this point is currently in an unsafe area
                    if (!this.isPositionInSafeZone(x, y)) {
                        samplePoints.push({ x, y });
                    }
                }
            }
        }
        
        // If we found any unsafe points within the new polygon, it means we're enclosing unsafe areas
        return samplePoints.length > 0;
    }
     
           createLevel8Polygon(points) {
          // Level 8: Create polygon that matches exact drawn shape + initial area
          if (this.player.exitPosition) {
              // Start with the exact drawn line points
              const exactPolygon = [...points];
              
              // Find the initial safe zone (the starting rectangle)
              let initialZone = null;
              for (const zone of this.safeZones) {
                  if (zone.type === 'rectangle' && zone.x === 350 && zone.y === 250 && zone.width === 100 && zone.height === 100) {
                      initialZone = zone;
                      break;
                  }
              }
              
              // Add points from the initial zone to connect the drawn line to it
              if (initialZone) {
                  // Find the closest point on the initial zone to connect to
                  const lastDrawnPoint = points[points.length - 1];
                  const zonePoints = [
                      { x: initialZone.x, y: initialZone.y },
                      { x: initialZone.x + initialZone.width, y: initialZone.y },
                      { x: initialZone.x + initialZone.width, y: initialZone.y + initialZone.height },
                      { x: initialZone.x, y: initialZone.y + initialZone.height }
                  ];
                  
                  // Find the closest corner of the initial zone
                  let closestPoint = zonePoints[0];
                  let closestDistance = Math.sqrt(
                      Math.pow(lastDrawnPoint.x - zonePoints[0].x, 2) + 
                      Math.pow(lastDrawnPoint.y - zonePoints[0].y, 2)
                  );
                  
                  for (const zonePoint of zonePoints) {
                      const distance = Math.sqrt(
                          Math.pow(lastDrawnPoint.x - zonePoint.x, 2) + 
                          Math.pow(lastDrawnPoint.y - zonePoint.y, 2)
                      );
                      if (distance < closestDistance) {
                          closestDistance = distance;
                          closestPoint = zonePoint;
                      }
                  }
                  
                  // Add the closest point first, then the other corners in order
                  exactPolygon.push(closestPoint);
                  
                  // Add the remaining corners in clockwise order
                  const startIndex = zonePoints.indexOf(closestPoint);
                  for (let i = 1; i <= 3; i++) {
                      const index = (startIndex + i) % 4;
                      exactPolygon.push(zonePoints[index]);
                  }
              }
              
              // Connect back to the exit position to complete the polygon
              exactPolygon.push({ x: this.player.exitPosition.x, y: this.player.exitPosition.y });
              
              return exactPolygon;
          }
          
          // Fallback: just return the drawn points if no exit position
          return [...points];
      }
      
                      createLevel11Polygon(points) {
         // Level 11: Create new corners every time, then check for enclosed areas
         if (this.player.exitPosition) {
             // Start with the exact drawn line points
             const exactPolygon = [...points];
             
             // Find the existing zone (either polygon or rectangle)
             let existingZone = null;
             
             // First priority: look for existing polygon
             for (const zone of this.safeZones) {
                 if (zone.type === 'polygon') {
                     existingZone = zone;
                     break;
                 }
             }
             
             // Second priority: if no polygon, look for the initial rectangle
             if (!existingZone) {
                 for (const zone of this.safeZones) {
                     if (zone.type === 'rectangle' && zone.x === 350 && zone.y === 250 && zone.width === 100 && zone.height === 100) {
                         existingZone = zone;
                         break;
                     }
                 }
             }
             
             // Add points from the existing zone to connect the drawn line to it
             if (existingZone) {
                 let zonePoints = [];
                 
                 // Get points from the zone
                 if (existingZone.type === 'polygon') {
                     zonePoints = existingZone.points;
                 } else {
                     // Convert rectangle to points
                     zonePoints = [
                         { x: existingZone.x, y: existingZone.y },
                         { x: existingZone.x + existingZone.width, y: existingZone.y },
                         { x: existingZone.x + existingZone.width, y: existingZone.y + existingZone.height },
                         { x: existingZone.x, y: existingZone.y + existingZone.height }
                     ];
                 }
                 
                 // Find the closest point on the existing zone to connect to
                 const lastDrawnPoint = points[points.length - 1];
                 let closestPoint = zonePoints[0];
                 let closestDistance = Math.sqrt(
                     Math.pow(lastDrawnPoint.x - zonePoints[0].x, 2) + 
                     Math.pow(lastDrawnPoint.y - zonePoints[0].y, 2)
                 );
                 
                 for (const zonePoint of zonePoints) {
                     const distance = Math.sqrt(
                         Math.pow(lastDrawnPoint.x - zonePoint.x, 2) + 
                         Math.pow(lastDrawnPoint.y - zonePoint.y, 2)
                     );
                     if (distance < closestDistance) {
                         closestDistance = distance;
                         closestPoint = zonePoint;
                     }
                 }
                 
                 // Add the closest point first, then the other points in order
                 exactPolygon.push(closestPoint);
                 
                 // Add the remaining points in order, starting from the closest point
                 const startIndex = zonePoints.indexOf(closestPoint);
                 for (let i = 1; i < zonePoints.length; i++) {
                     const index = (startIndex + i) % zonePoints.length;
                     exactPolygon.push(zonePoints[index]);
                 }
             }
             
             // Connect back to the exit position to complete the polygon
             exactPolygon.push({ x: this.player.exitPosition.x, y: this.player.exitPosition.y });
             
             // Check if the new polygon would create any enclosed unsafe areas
             const hasEnclosedUnsafeAreas = this.checkForEnclosedUnsafeAreas(exactPolygon);
             
             if (hasEnclosedUnsafeAreas) {
                 // If there are enclosed unsafe areas, fill them by creating a comprehensive polygon
                 const allPoints = [...exactPolygon];
                 
                 // Add points from the existing zone to ensure complete coverage
                 if (existingZone && existingZone.type === 'polygon') {
                     allPoints.push(...existingZone.points);
                 }
                 
                 // Create a convex hull to fill the enclosed areas
                 return this.createConvexHull(allPoints);
             } else {
                 // No enclosed unsafe areas, return the exact polygon shape
                 return exactPolygon;
             }
         }
         
         // Fallback: just return the drawn points if no exit position
         return [...points];
     }
      
             createConservativeMergedPolygon(existingZone, newZone) {
           // Level 11: Create a conservative merged polygon that extends the existing area with the new area
           
           // For Level 11, we want to preserve the existing polygon and just extend it
           // Start with the existing zone points
           const mergedPolygon = [...existingZone.points];
           
           // Add the new zone points that extend the area
           mergedPolygon.push(...newZone.points);
           
           // Create a convex hull to ensure we have a clean polygon
           // This will create the minimal convex polygon that contains both areas
           const hull = this.createConvexHull(mergedPolygon);
           
           return hull;
       }
     
          updateEnemies() {
         for (const enemy of this.enemies) {
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
                 
                 // Calculate enemy speed (with turtle effect for Level 11)
                 let enemySpeed = enemy.speed * 0.5;
                 if (this.currentLevel === 11 && this.enemySlowEffect > 0) {
                     enemySpeed *= 0.3; // 70% speed reduction
                 }
                 
                 const newX = enemy.x + Math.cos(enemy.wanderAngle) * enemySpeed;
                 const newY = enemy.y + Math.sin(enemy.wanderAngle) * enemySpeed;
                
                // For Level 11 moving apples, allow movement within safe zones
                const canMoveToPosition = (this.currentLevel === 11 && enemy.isMovingApple) ? 
                    true : !this.isPositionInSafeZone(newX, newY);
                
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
            
            // Check if enemy is close to the player's line
            let lineTarget = null;
            let lineDistance = Infinity;
            
            if (this.player.isDrawing && this.player.line.length > 1) {
                for (let i = 1; i < this.player.line.length; i++) {
                    const lineStart = this.player.line[i - 1];
                    const lineEnd = this.player.line[i];
                    
                    const distanceToLine = this.pointToLineDistance(
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
            
            // Calculate enemy speed (with turtle effect for Level 11)
            let enemySpeed = enemy.speed;
            if (this.currentLevel === 11 && this.enemySlowEffect > 0) {
                enemySpeed *= 0.3; // 70% speed reduction
            }
            
            if (lineTarget && lineDistance <= lineChaseRange && !this.player.isInSafeZone) {
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
                 
                 // Calculate enemy speed (with turtle effect for Level 11)
                 let enemySpeed = enemy.speed * 0.5;
                 if (this.currentLevel === 11 && this.enemySlowEffect > 0) {
                     enemySpeed *= 0.3; // 70% speed reduction
                 }
                 
                 const newX = enemy.x + Math.cos(enemy.wanderAngle) * enemySpeed;
                 const newY = enemy.y + Math.sin(enemy.wanderAngle) * enemySpeed;
                
                // For Level 11 moving apples, allow movement within safe zones
                const canMoveToPosition = (this.currentLevel === 11 && enemy.isMovingApple) ? 
                    true : !this.isPositionInSafeZone(newX, newY);
                
                if (canMoveToPosition && 
                    newX >= enemy.radius && newX <= this.canvas.width - enemy.radius &&
                    newY >= enemy.radius && newY <= this.canvas.height - enemy.radius) {
                    enemy.x = newX;
                    enemy.y = newY;
                } else {
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
    
    updateDisplay() {
        const levelTitle = this.levelTitles[this.currentLevel] || `Level ${this.currentLevel}`;
        document.getElementById('levelDisplay').textContent = `Level ${this.currentLevel}: ${levelTitle}`;
        document.getElementById('scoreDisplay').textContent = `Score: ${this.score}`;
        
        // Update timer display (counting up with milliseconds)
        const totalMilliseconds = Date.now() - this.startTime;
        const minutes = Math.floor(totalMilliseconds / 60000);
        const seconds = Math.floor((totalMilliseconds % 60000) / 1000);
        const milliseconds = Math.floor((totalMilliseconds % 1000) / 10);
        document.getElementById('timerDisplay').textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
        
        // Update completion percentage
        const completionPercent = this.calculateBoardCompletion();
        document.getElementById('completionDisplay').textContent = `Completion: ${completionPercent.toFixed(1)}%`;
    }
    
    calculateBoardCompletion() {
        const totalBoardArea = this.canvas.width * this.canvas.height;
        let safeZoneArea = 0;
        
        for (const zone of this.safeZones) {
            if (zone.type === 'polygon') {
                safeZoneArea += this.calculatePolygonArea(zone.points);
            } else {
                safeZoneArea += zone.width * zone.height;
            }
        }
        
                 // For Level 10, adjust the calculation to make the maximum achievable area count as 100%
         if (this.currentLevel === 10) {
             // The maximum achievable area is approximately 95.4% of the total board
             // So we scale the calculation to make that count as 100%
             const maxAchievableArea = totalBoardArea * 0.954;
             const scaledCompletion = (safeZoneArea / maxAchievableArea) * 100;
             // Add 0.1% grace so that 99.9% counts as 100%
             return Math.min(scaledCompletion + 0.1, 100);
         }
        
        return (safeZoneArea / totalBoardArea) * 100;
    }
    
    isPositionInSafeZone(x, y) {
        for (const zone of this.safeZones) {
            if (zone.type === 'polygon') {
                if (this.isPointInPolygon(x, y, zone.points)) {
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
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw safe zones
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        this.ctx.strokeStyle = '#0f0';
        this.ctx.lineWidth = 2;
        
        for (const zone of this.safeZones) {
            if (zone.type === 'polygon') {
                // Draw polygon safe zone
                this.ctx.beginPath();
                this.ctx.moveTo(zone.points[0].x, zone.points[0].y);
                for (let i = 1; i < zone.points.length; i++) {
                    this.ctx.lineTo(zone.points[i].x, zone.points[i].y);
                }
                this.ctx.closePath();
                
                // For level 5, show temporary zones with a different color
                if (this.currentLevel === 5 && zone.temporary && !zone.enemyKilled) {
                    // Calculate remaining time for visual effect
                    const remainingTime = Math.max(0, zone.lifespan - (Date.now() - zone.createdAt));
                    const timeRatio = remainingTime / zone.lifespan;
                    
                    // Use orange/red color that fades as time runs out
                    const alpha = 0.3 + (timeRatio * 0.4);
                    this.ctx.fillStyle = `rgba(255, 165, 0, ${alpha})`; // Orange with fading alpha
                    this.ctx.strokeStyle = '#ff8c00'; // Dark orange border
                } else {
                    this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
                    this.ctx.strokeStyle = '#0f0';
                }
                
                this.ctx.fill();
                this.ctx.stroke();
            } else {
                // Draw rectangle safe zone
                this.ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
                this.ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
            }
        }
        
        // Draw player line
        if (this.player.line.length > 1) {
            this.ctx.strokeStyle = this.player.isInSafeZone ? '#0f0' : '#ff0';
            this.ctx.lineWidth = 4;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(this.player.line[0].x, this.player.line[0].y);
            
            for (let i = 1; i < this.player.line.length; i++) {
                this.ctx.lineTo(this.player.line[i].x, this.player.line[i].y);
            }
            
            this.ctx.stroke();
            
            // Draw line points for better visibility
            this.ctx.fillStyle = this.player.isInSafeZone ? '#0f0' : '#ff0';
            for (let i = 0; i < this.player.line.length; i += 5) {
                const point = this.player.line[i];
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
                 // Draw enemies
         for (const enemy of this.enemies) {
             if (this.currentLevel === 11 && enemy.isMovingApple) {
                 // Level 11: Draw moving apples in green
                 this.ctx.fillStyle = '#0f0';
                 this.ctx.beginPath();
                 this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                 this.ctx.fill();
                 
                 // Draw apple stem
                 this.ctx.strokeStyle = '#8B4513';
                 this.ctx.lineWidth = 2;
                 this.ctx.beginPath();
                 this.ctx.moveTo(enemy.x, enemy.y - enemy.radius);
                 this.ctx.lineTo(enemy.x, enemy.y - enemy.radius - 5);
                 this.ctx.stroke();
             } else if (this.currentLevel === 9 && enemy.isAI) {
                 // Level 9 AI enemies are drawn in blue like AI players
                 this.ctx.fillStyle = '#0080ff'; // Blue for AI enemies
                 this.ctx.beginPath();
                 this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                 this.ctx.fill();
                 
                 // Draw outline for AI enemies
                 this.ctx.strokeStyle = '#fff';
                 this.ctx.lineWidth = 2;
                 this.ctx.stroke();
             } else {
                 // Regular enemies
                 this.ctx.fillStyle = '#f00'; // Red for regular enemies
                 this.ctx.beginPath();
                 this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                 this.ctx.fill();
             }
         }
        
                 // Draw apples
         this.ctx.fillStyle = '#0f0';
         for (const apple of this.apples) {
             this.ctx.beginPath();
             this.ctx.arc(apple.x, apple.y, apple.radius, 0, Math.PI * 2);
             this.ctx.fill();
             
             // Draw apple stem
             this.ctx.strokeStyle = '#8B4513';
             this.ctx.lineWidth = 2;
             this.ctx.beginPath();
             this.ctx.moveTo(apple.x, apple.y - apple.radius);
             this.ctx.lineTo(apple.x, apple.y - apple.radius - 5);
             this.ctx.stroke();
         }
         
         // Draw power-ups (Level 11)
         if (this.currentLevel === 11) {
             for (const powerUp of this.powerUps) {
                 switch (powerUp.type) {
                     case 'rabbit':
                         this.ctx.fillStyle = '#FF6B6B'; // Red-orange
                         break;
                     case 'turtle':
                         this.ctx.fillStyle = '#4ECDC4'; // Teal
                         break;
                     case 'star':
                         this.ctx.fillStyle = '#FFE66D'; // Yellow
                         break;
                 }
                 
                 this.ctx.beginPath();
                 this.ctx.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
                 this.ctx.fill();
                 
                 // Draw power-up symbol
                 this.ctx.fillStyle = '#fff';
                 this.ctx.font = '12px Arial';
                 this.ctx.textAlign = 'center';
                 this.ctx.textBaseline = 'middle';
                 
                 let symbol = '';
                 switch (powerUp.type) {
                     case 'rabbit':
                         symbol = '🐰';
                         break;
                     case 'turtle':
                         symbol = '🐢';
                         break;
                     case 'star':
                         symbol = '⭐';
                         break;
                 }
                 
                 this.ctx.fillText(symbol, powerUp.x, powerUp.y);
             }
         }
        
        // Draw AI player for level 6 and 7
        if (this.currentLevel === 6 || this.currentLevel === 7) {
            // Draw AI player line
            if (this.aiPlayer.line.length > 1) {
                this.ctx.strokeStyle = this.aiPlayer.isInSafeZone ? '#0f0' : '#ff0';
                this.ctx.lineWidth = 4;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                this.ctx.beginPath();
                this.ctx.moveTo(this.aiPlayer.line[0].x, this.aiPlayer.line[0].y);
                
                for (let i = 1; i < this.aiPlayer.line.length; i++) {
                    this.ctx.lineTo(this.aiPlayer.line[i].x, this.aiPlayer.line[i].y);
                }
                
                this.ctx.stroke();
            }
            
            // Draw AI player (green/yellow like original player)
            this.ctx.fillStyle = this.aiPlayer.isInSafeZone ? '#0f0' : '#ff0';
            this.ctx.beginPath();
            this.ctx.arc(this.aiPlayer.x, this.aiPlayer.y, this.aiPlayer.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw AI player outline
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Draw additional AI players for level 7
            if (this.currentLevel === 7) {
                for (const ai of this.aiPlayers) {
                    // Draw AI player line
                    if (ai.line.length > 1) {
                        this.ctx.strokeStyle = ai.isInSafeZone ? '#0f0' : '#ff0';
                        this.ctx.lineWidth = 4;
                        this.ctx.lineCap = 'round';
                        this.ctx.lineJoin = 'round';
                        this.ctx.beginPath();
                        this.ctx.moveTo(ai.line[0].x, ai.line[0].y);
                        
                        for (let i = 1; i < ai.line.length; i++) {
                            this.ctx.lineTo(ai.line[i].x, ai.line[i].y);
                        }
                        
                        this.ctx.stroke();
                    }
                    
                    // Draw AI player (green/yellow like original player)
                    this.ctx.fillStyle = ai.isInSafeZone ? '#0f0' : '#ff0';
                    this.ctx.beginPath();
                    this.ctx.arc(ai.x, ai.y, ai.radius, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Draw AI player outline
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                }
            }
            
            // Draw player (blue enemy)
            this.ctx.fillStyle = '#0080ff'; // Always blue for level 6 and 7
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw player outline
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
                 } else {
             // Draw player normally for other levels
             this.ctx.fillStyle = this.player.isInSafeZone ? '#0f0' : '#ff0';
             
             // Level 11: Show invincibility effect
             if (this.currentLevel === 11 && this.playerPowerUps.invincibility > 0) {
                 // Pulsing effect for invincibility
                 const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
                 this.ctx.globalAlpha = pulse;
             }
             
             this.ctx.beginPath();
             this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
             this.ctx.fill();
             
             // Draw player outline
             this.ctx.strokeStyle = '#fff';
             this.ctx.lineWidth = 2;
             this.ctx.stroke();
             
             // Reset alpha
             this.ctx.globalAlpha = 1;
         }
    }
    
    gameLoop() {
        if (this.gameState === 'playing') {
            // Update timer (counting up)
            this.levelTime = Math.floor((Date.now() - this.startTime) / 1000);
            
            // Check for level completion
            if (this.currentLevel === 6) {
                // Level 6: No completion by board filling, only by catching AI
                // The level continues until player catches AI or AI traps player
                                      } else if (this.currentLevel === 7) {
                 // Level 7: Complete when board is 85% filled OR all AIs are caught
                 if (this.calculateBoardCompletion() >= 85 || (this.aiPlayer.x === 0 && this.aiPlayers.length === 0)) {
                     this.completeLevel();
                     return;
                 }
                          } else if (this.currentLevel === 9) {
                 // Level 9: Complete when score reaches 5000
                 if (this.score >= 5000) {
                     this.completeLevel();
                     return;
                 }
             } else if (this.currentLevel === 10) {
                 // Level 10: Complete when board is 100% filled
                 if (this.calculateBoardCompletion() >= 100) {
                     this.completeLevel();
                     return;
                 }
                           } else if (this.currentLevel === 11) {
                  // Level 11: No completion by board filling - only by eating 3 enemies
                  // Completion is handled in checkCollisions when all enemies are eaten
             } else {
                 // Check for level completion (85% board filled OR all enemies converted to apples)
                 if (this.calculateBoardCompletion() >= 85 || (this.enemies.length === 0 && this.apples.length === 0)) {
                     this.completeLevel();
                     return;
                 }
             }
            
                         this.updatePlayer();
             this.updateAIPlayer(); // Update AI player for level 6
             this.updateEnemies();
             this.checkCollisions();
             this.checkTemporaryZones(); // Check for expired temporary zones
             
             // Update power-ups for Level 11
             if (this.currentLevel === 11) {
                 this.updatePowerUps();
             }
            this.render();
            this.updateDisplay();
            requestAnimationFrame(() => this.gameLoop());
        }
    }
    
    pauseGame() {
        this.gameState = 'paused';
        this.showScreen('pauseMenu');
    }
    
    resumeGame() {
        this.gameState = 'playing';
        this.showScreen('gameScreen');
        this.gameLoop();
    }
    
    restartLevel() {
        this.gameState = 'playing';
        this.showScreen('gameScreen');
        this.initializeLevel();
        this.gameLoop();
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('finalScore').textContent = `Score: ${this.score}`;
        this.showScreen('gameOverScreen');
    }
    
    playerWins() {
        this.gameState = 'completed';
        document.getElementById('levelCompleteTitle').textContent = 'You caught the AI!';
        document.getElementById('levelCompleteScore').textContent = `Score: ${this.score}`;
        
        // Format time with milliseconds for completion screen
        const totalMilliseconds = Date.now() - this.startTime;
        const minutes = Math.floor(totalMilliseconds / 60000);
        const seconds = Math.floor((totalMilliseconds % 60000) / 1000);
        const milliseconds = Math.floor((totalMilliseconds % 1000) / 10);
        document.getElementById('levelCompleteTime').textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
        
        this.completedLevels.add(this.currentLevel);
        if (this.currentLevel === this.unlockedLevels) {
            this.unlockedLevels++;
        }
        
        // Save progress to localStorage
        localStorage.setItem('unlockedLevels', this.unlockedLevels.toString());
        localStorage.setItem('completedLevels', JSON.stringify(Array.from(this.completedLevels)));
        
        this.showScreen('levelCompleteScreen');
    }
    
    aiWins() {
        this.gameState = 'gameOver';
        document.getElementById('finalScore').textContent = `AI won! Score: ${this.score}`;
        this.showScreen('gameOverScreen');
    }
    
            catchAI(caughtAI, index = -1) {
            // Level 7: When catching an AI, create random safe area and spawn new AI
            if (this.currentLevel === 7) {
                // Add score
                this.score += 100;
                
                // Calculate total field area
                const totalFieldArea = this.canvas.width * this.canvas.height;
                
                // Calculate target area (10% to 20% of total field)
                const minArea = totalFieldArea * 0.10;
                const maxArea = totalFieldArea * 0.20;
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
            radius: 8,
            speed: 2.5,
            isInSafeZone: false,
            isDrawing: false,
            line: [],
            exitPosition: null,
            wanderAngle: Math.random() * Math.PI * 2
        };
        
        this.aiPlayers.push(newAI);
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
            const levelTime = Date.now() - this.levelStartTime;
            this.levelTimes.push({
                level: this.currentLevel,
                time: levelTime
            });
            this.totalSpeedrunTime += levelTime;
        }
        
        // Show level completion screen
        this.gameState = 'completed';
        const levelTitle = this.levelTitles[this.currentLevel] || `Level ${this.currentLevel}`;
        document.getElementById('levelCompleteTitle').textContent = levelTitle;
        document.getElementById('levelCompleteScore').textContent = `Score: ${this.score}`;
        
        // Format time with milliseconds for completion screen
        const totalMilliseconds = Date.now() - this.startTime;
        const minutes = Math.floor(totalMilliseconds / 60000);
        const seconds = Math.floor((totalMilliseconds % 60000) / 1000);
        const milliseconds = Math.floor((totalMilliseconds % 1000) / 10);
        document.getElementById('levelCompleteTime').textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
        
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
                `Total (from Level ${this.speedrunStartLevel}): ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}.${totalMilliseconds.toString().padStart(2, '0')}`;
        }
        
        this.showScreen('levelCompleteScreen');
        
        // Auto-start next level in speedrun mode
        if (this.speedrunMode && this.currentLevel < 9) {
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
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.loadProgress();
});
