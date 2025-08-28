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
        
        this.safeZones = [];
        this.enemies = [];
        this.lineSegments = [];
        
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        
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
            this.showScreen('levelSelector');
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
            levelButton.textContent = i;
            
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
        
        this.safeZones = [];
        this.enemies = [];
        this.apples = [];
        this.lineSegments = [];
        
        // Reset timer (starts from 0)
        this.levelTime = 0;
        this.startTime = Date.now();
        
        // Create initial safe zone
        this.safeZones.push({
            type: 'rectangle',
            x: 350,
            y: 250,
            width: 100,
            height: 100
        });
        
        // Create enemies based on level
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
        
        this.updateDisplay();
    }
    
    startDrawing() {
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
            if (this.currentLevel === 2 || this.currentLevel === 3 || this.currentLevel === 4 || this.currentLevel === 5) {
                // For level 2, 3, 4, and 5, create a proper polygon area
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
                
                this.safeZones.push(newSafeZone);
                
                // Check for enemies trapped inside the polygon
                for (let i = this.enemies.length - 1; i >= 0; i--) {
                    const enemy = this.enemies[i];
                    if (this.isPointInPolygon(enemy.x, enemy.y, polygon)) {
                        // Convert enemy to apple
                        this.apples.push({
                            x: enemy.x,
                            y: enemy.y,
                            radius: 8,
                            points: 50
                        });
                        this.enemies.splice(i, 1);
                        
                        // For level 5, mark the zone as permanent if an enemy was killed
                        if (this.currentLevel === 5) {
                            newSafeZone.enemyKilled = true;
                            newSafeZone.temporary = false;
                        }
                    }
                }
                
                // Add score for capturing area
                const area = this.calculatePolygonArea(polygon);
                this.score += Math.floor(area / 100);
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
                this.score += Math.floor(area / 100);
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
        // Check enemy collisions
        for (const enemy of this.enemies) {
            const distance = Math.sqrt(
                Math.pow(this.player.x - enemy.x, 2) + 
                Math.pow(this.player.y - enemy.y, 2)
            );
            
            if (distance < this.player.radius + enemy.radius) {
                this.gameOver();
                return;
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
                        this.gameOver();
                        return;
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
        
        if (this.keys['w'] || this.keys['ArrowUp']) dy -= this.player.speed;
        if (this.keys['s'] || this.keys['ArrowDown']) dy += this.player.speed;
        if (this.keys['a'] || this.keys['ArrowLeft']) dx -= this.player.speed;
        if (this.keys['d'] || this.keys['ArrowRight']) dx += this.player.speed;
        
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
                    this.gameOver();
                    return;
                }
            }
        }
    }
    
    updateEnemies() {
        for (const enemy of this.enemies) {
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // For level 5, enemies don't chase - they only wander
            if (this.currentLevel === 5) {
                // Wander randomly only
                if (!enemy.wanderAngle) {
                    enemy.wanderAngle = Math.random() * Math.PI * 2;
                }
                
                if (Math.random() < 0.02) {
                    enemy.wanderAngle += (Math.random() - 0.5) * Math.PI / 2;
                }
                
                const newX = enemy.x + Math.cos(enemy.wanderAngle) * enemy.speed * 0.5;
                const newY = enemy.y + Math.sin(enemy.wanderAngle) * enemy.speed * 0.5;
                
                if (!this.isPositionInSafeZone(newX, newY) && 
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
            
            if (lineTarget && lineDistance <= lineChaseRange && !this.player.isInSafeZone) {
                // Chase the line
                const lineDx = lineTarget.x - enemy.x;
                const lineDy = lineTarget.y - enemy.y;
                const lineDist = Math.sqrt(lineDx * lineDx + lineDy * lineDy);
                
                if (lineDist > 0) {
                    const newX = enemy.x + (lineDx / lineDist) * enemy.speed;
                    const newY = enemy.y + (lineDy / lineDist) * enemy.speed;
                    
                    if (!this.isPositionInSafeZone(newX, newY) && 
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
                    const newX = enemy.x + (dx / distance) * enemy.speed;
                    const newY = enemy.y + (dy / distance) * enemy.speed;
                    
                    if (!this.isPositionInSafeZone(newX, newY) && 
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
                
                const newX = enemy.x + Math.cos(enemy.wanderAngle) * enemy.speed * 0.5;
                const newY = enemy.y + Math.sin(enemy.wanderAngle) * enemy.speed * 0.5;
                
                if (!this.isPositionInSafeZone(newX, newY) && 
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
        document.getElementById('levelDisplay').textContent = `Level ${this.currentLevel}`;
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
        this.ctx.fillStyle = '#f00';
        for (const enemy of this.enemies) {
            this.ctx.beginPath();
            this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
            this.ctx.fill();
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
        
        // Draw player
        this.ctx.fillStyle = this.player.isInSafeZone ? '#0f0' : '#ff0';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw player outline
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
    
    gameLoop() {
        if (this.gameState === 'playing') {
            // Update timer (counting up)
            this.levelTime = Math.floor((Date.now() - this.startTime) / 1000);
            
            // Check for level completion (85% board filled OR all enemies converted to apples)
            if (this.calculateBoardCompletion() >= 85 || (this.enemies.length === 0 && this.apples.length === 0)) {
                this.completeLevel();
                return;
            }
            
            this.updatePlayer();
            this.updateEnemies();
            this.checkCollisions();
            this.checkTemporaryZones(); // Check for expired temporary zones
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
    
    completeLevel() {
        this.completedLevels.add(this.currentLevel);
        if (this.currentLevel === this.unlockedLevels) {
            this.unlockedLevels++;
        }
        
        // Save progress to localStorage
        localStorage.setItem('unlockedLevels', this.unlockedLevels.toString());
        localStorage.setItem('completedLevels', JSON.stringify(Array.from(this.completedLevels)));
        
        // Show level completion screen
        this.gameState = 'completed';
        document.getElementById('levelCompleteScore').textContent = `Score: ${this.score}`;
        
        // Format time with milliseconds for completion screen
        const totalMilliseconds = Date.now() - this.startTime;
        const minutes = Math.floor(totalMilliseconds / 60000);
        const seconds = Math.floor((totalMilliseconds % 60000) / 1000);
        const milliseconds = Math.floor((totalMilliseconds % 1000) / 10);
        document.getElementById('levelCompleteTime').textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
        
        this.showScreen('levelCompleteScreen');
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
