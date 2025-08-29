// Rendering logic for the game
import { GAME_CONFIG, POWER_UP_SYMBOLS, POWER_UP_COLORS } from './config.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawSafeZones(safeZones, currentLevel) {
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        this.ctx.strokeStyle = '#0f0';
        this.ctx.lineWidth = 2;
        
        for (const zone of safeZones) {
            if (zone.type === 'polygon') {
                // Draw polygon safe zone
                this.ctx.beginPath();
                this.ctx.moveTo(zone.points[0].x, zone.points[0].y);
                for (let i = 1; i < zone.points.length; i++) {
                    this.ctx.lineTo(zone.points[i].x, zone.points[i].y);
                }
                this.ctx.closePath();
                
                // For level 5, 12, and 14, show temporary zones with a different color
                if ((currentLevel === 5 && zone.temporary && !zone.enemyKilled) || 
                    (currentLevel === 12 && zone.temporary) ||
                    (currentLevel === 14 && zone.temporary)) {
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
                // For level 5, 12, and 14, show temporary zones with a different color
                if ((currentLevel === 5 && zone.temporary && !zone.enemyKilled) || 
                    (currentLevel === 12 && zone.temporary) ||
                    (currentLevel === 14 && zone.temporary)) {
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
                
                this.ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
                this.ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
            }
        }
    }

    drawPlayerLine(player) {
        if (player.line.length > 1) {
            this.ctx.strokeStyle = player.isInSafeZone ? '#0f0' : '#ff0';
            this.ctx.lineWidth = 4;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(player.line[0].x, player.line[0].y);
            
            for (let i = 1; i < player.line.length; i++) {
                this.ctx.lineTo(player.line[i].x, player.line[i].y);
            }
            
            this.ctx.stroke();
            
            // Draw line points for better visibility
            this.ctx.fillStyle = player.isInSafeZone ? '#0f0' : '#ff0';
            for (let i = 0; i < player.line.length; i += 5) {
                const point = player.line[i];
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    drawEnemies(enemies, currentLevel, powerUpSystem = null) {
        for (const enemy of enemies) {
            if (currentLevel === 9 && enemy.isAI) {
                // Level 9 AI enemies are drawn in blue like AI players
                this.ctx.fillStyle = '#0080ff'; // Blue for AI enemies
                this.ctx.beginPath();
                this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw outline for AI enemies
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            } else if (currentLevel === 16 && powerUpSystem) {
                // Level 16: Draw ghosts - white when normal, blue when vulnerable
                if (powerUpSystem.areGhostsVulnerable()) {
                    this.ctx.fillStyle = '#0000ff'; // Blue when vulnerable
                } else {
                    this.ctx.fillStyle = '#ffffff'; // White when normal
                }
                this.ctx.beginPath();
                this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw light border for vulnerable ghosts to make them more visible
                if (powerUpSystem.areGhostsVulnerable()) {
                    this.ctx.strokeStyle = '#87CEEB'; // Light sky blue border
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
            } else {
                // Regular enemies
                this.ctx.fillStyle = '#f00'; // Red for regular enemies
                this.ctx.beginPath();
                this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    drawApples(apples) {
        this.ctx.fillStyle = '#0f0';
        for (const apple of apples) {
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
    }

    drawPowerUps(powerUps) {
        for (const powerUp of powerUps) {
            if (powerUp.type === 'mushroom') {
                // Draw mushroom for Level 16
                this.ctx.fillStyle = powerUp.color || '#8B4513';
                this.ctx.beginPath();
                this.ctx.arc(powerUp.x, powerUp.y, 10, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw mushroom symbol
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '16px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(powerUp.symbol || '🍄', powerUp.x, powerUp.y);
            } else {
                // Draw regular power-ups
                this.ctx.fillStyle = POWER_UP_COLORS[powerUp.type];
                this.ctx.beginPath();
                this.ctx.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw power-up symbol
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                
                const symbol = POWER_UP_SYMBOLS[powerUp.type];
                this.ctx.fillText(symbol, powerUp.x, powerUp.y);
            }
        }
    }

    drawAIPlayer(aiPlayer, currentLevel) {
        // Draw AI player line
        if (aiPlayer.line.length > 1) {
            this.ctx.strokeStyle = aiPlayer.isInSafeZone ? '#0f0' : '#ff0';
            this.ctx.lineWidth = 4;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(aiPlayer.line[0].x, aiPlayer.line[0].y);
            
            for (let i = 1; i < aiPlayer.line.length; i++) {
                this.ctx.lineTo(aiPlayer.line[i].x, aiPlayer.line[i].y);
            }
            
            this.ctx.stroke();
        }
        
        // Draw AI player (green/yellow like original player)
        this.ctx.fillStyle = aiPlayer.isInSafeZone ? '#0f0' : '#ff0';
        this.ctx.beginPath();
        this.ctx.arc(aiPlayer.x, aiPlayer.y, aiPlayer.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw AI player outline
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawAdditionalAIPlayers(aiPlayers) {
        for (const ai of aiPlayers) {
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

    drawPlayer(player, currentLevel, isInvincible = false) {
        if (currentLevel === 6 || currentLevel === 7) {
            // Draw player (blue enemy) for level 6 and 7
            this.ctx.fillStyle = '#0080ff'; // Always blue for level 6 and 7
            this.ctx.beginPath();
            this.ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw player outline
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        } else {
            // Draw player normally for other levels
            this.ctx.fillStyle = player.isInSafeZone ? '#0f0' : '#ff0';
            
            // Show invincibility effect for levels with power-ups
            if ((currentLevel === 11 || currentLevel === 13 || currentLevel === 15 || currentLevel === 16 || currentLevel === 18 || currentLevel === 19) && isInvincible) {
                // Pulsing effect for invincibility
                const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
                this.ctx.globalAlpha = pulse;
            }
            
            this.ctx.beginPath();
            this.ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw player outline
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Reset alpha
            this.ctx.globalAlpha = 1;
        }
    }

    render(gameState) {
        this.clear();
        
        // Level 20: Special snake rendering
        if (gameState.currentLevel === 20) {
            this.drawLevel20Grid();
            this.drawLevel20Snake(gameState.snakeBody, gameState.gridCols, gameState.gridRows, gameState.tileWidth, gameState.tileHeight, gameState.gameInstance);
            this.drawLevel20Apples(gameState.apples, gameState.tileWidth, gameState.tileHeight);
            this.drawLevel20Walls(gameState.walls, gameState.tileWidth, gameState.tileHeight);
            return;
        }
        
        // Draw safe zones
        this.drawSafeZones(gameState.safeZones, gameState.currentLevel);
        
        // Draw player line
        this.drawPlayerLine(gameState.player);
        
        // Draw enemies
        this.drawEnemies(gameState.enemies, gameState.currentLevel, gameState.powerUpSystem);
        
        // Draw apples
        this.drawApples(gameState.apples);
        
                // Draw power-ups (Level 11, 13, 15, 16, 18, and 19)
        if ((gameState.currentLevel === 11 || gameState.currentLevel === 13 || gameState.currentLevel === 15 || gameState.currentLevel === 16 || gameState.currentLevel === 18 || gameState.currentLevel === 19) && gameState.powerUpSystem) {
            this.drawPowerUps(gameState.powerUpSystem.powerUps);
        }
        
        // Draw AI player for level 6 and 7
        if (gameState.currentLevel === 6 || gameState.currentLevel === 7) {
            this.drawAIPlayer(gameState.aiPlayer, gameState.currentLevel);
            
            // Draw additional AI players for level 7
            if (gameState.currentLevel === 7) {
                this.drawAdditionalAIPlayers(gameState.aiPlayers);
            }
        }
        
        // Draw player
        const isInvincible = (gameState.currentLevel === 11 || gameState.currentLevel === 13 || gameState.currentLevel === 15 || gameState.currentLevel === 16 || gameState.currentLevel === 18 || gameState.currentLevel === 19) && gameState.powerUpSystem ? 
            gameState.powerUpSystem.isPlayerInvincible() : false;
        this.drawPlayer(gameState.player, gameState.currentLevel, isInvincible);
    }
    
    drawLevel20Grid() {
        const tileWidth = this.canvas.width / 10;
        const tileHeight = this.canvas.height / 9;
        
        // Draw checkers pattern
        for (let x = 0; x < 10; x++) {
            for (let y = 0; y < 9; y++) {
                const isEven = (x + y) % 2 === 0;
                this.ctx.fillStyle = isEven ? '#2a2a2a' : '#1a1a1a'; // Black/grey checkers
                this.ctx.fillRect(x * tileWidth, y * tileHeight, tileWidth, tileHeight);
            }
        }
        
        // Draw grid lines
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x <= 10; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * tileWidth, 0);
            this.ctx.lineTo(x * tileWidth, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= 9; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * tileHeight);
            this.ctx.lineTo(this.canvas.width, y * tileHeight);
            this.ctx.stroke();
        }
    }
    
        drawLevel20Snake(snakeBody, gridCols, gridRows, tileWidth, tileHeight, gameInstance = null) {
        if (!snakeBody || snakeBody.length === 0) return;

        // Draw snake body segments with Bootstrap blue color and connection
        for (let i = 1; i < snakeBody.length; i++) {
            // Use animated position if available
            let segment;
            if (gameInstance && gameInstance.isSnakeAnimating) {
                segment = gameInstance.getSnakeAnimationPosition(i);
            } else {
                segment = snakeBody[i];
            }
            
            const x = (segment.x * tileWidth) + (tileWidth / 2);
            const y = (segment.y * tileHeight) + (tileHeight / 2);
            const radius = Math.min(tileWidth, tileHeight) * 0.35; // 70% of tile

            this.ctx.fillStyle = '#0d6efd'; // Bootstrap blue
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.fill();

            // Connect segments with lines for smooth appearance
            if (i < snakeBody.length - 1) {
                let nextSegment;
                if (gameInstance && gameInstance.isSnakeAnimating) {
                    nextSegment = gameInstance.getSnakeAnimationPosition(i + 1);
                } else {
                    nextSegment = snakeBody[i + 1];
                }
                
                const nextX = (nextSegment.x * tileWidth) + (tileWidth / 2);
                const nextY = (nextSegment.y * tileHeight) + (tileHeight / 2);

                this.ctx.strokeStyle = '#0d6efd';
                this.ctx.lineWidth = radius * 1.5;
                this.ctx.lineCap = 'round';
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(nextX, nextY);
                this.ctx.stroke();
            }

            // Add subtle border
            this.ctx.strokeStyle = '#0b5ed7'; // Darker Bootstrap blue
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Draw snake head
        let head;
        if (gameInstance && gameInstance.isSnakeAnimating) {
            head = gameInstance.getSnakeAnimationPosition(0);
        } else {
            head = snakeBody[0];
        }
        
        const headX = (head.x * tileWidth) + (tileWidth / 2);
        const headY = (head.y * tileHeight) + (tileHeight / 2);
        const headRadius = Math.min(tileWidth, tileHeight) * 0.4; // 80% of tile

        this.ctx.fillStyle = '#0d6efd'; // Bootstrap blue head
        this.ctx.beginPath();
        this.ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Connect head to first body segment
        if (snakeBody.length > 1) {
            let firstBody;
            if (gameInstance && gameInstance.isSnakeAnimating) {
                firstBody = gameInstance.getSnakeAnimationPosition(1);
            } else {
                firstBody = snakeBody[1];
            }
            
            const bodyX = (firstBody.x * tileWidth) + (tileWidth / 2);
            const bodyY = (firstBody.y * tileHeight) + (tileHeight / 2);

            this.ctx.strokeStyle = '#0d6efd';
            this.ctx.lineWidth = headRadius * 1.2;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(headX, headY);
            this.ctx.lineTo(bodyX, bodyY);
            this.ctx.stroke();
        }

        // Head border
        this.ctx.strokeStyle = '#0b5ed7'; // Darker Bootstrap blue
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
    drawLevel20Apples(apples, tileWidth, tileHeight) {
        if (!apples || apples.length === 0) return;
        
        const apple = apples[0];
        const centerX = (apple.x * tileWidth) + (tileWidth / 2);
        const centerY = (apple.y * tileHeight) + (tileHeight / 2);
        
        // Calculate size animation (grow and shrink)
        const animationSpeed = 0.003; // Speed of size change
        const sizeVariation = 0.1; // How much the size varies (10%)
        const baseRadius = apple.radius;
        // Ensure animationTime exists and is a number
        const animationTime = apple.animationTime || 0;
        const animatedRadius = baseRadius * (1 + sizeVariation * Math.sin(animationTime * animationSpeed));
        
        // Draw apple with gradient for prettier appearance
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, animatedRadius);
        gradient.addColorStop(0, '#ff6b6b'); // Bright red center
        gradient.addColorStop(0.7, '#ff4757'); // Medium red
        gradient.addColorStop(1, '#ff3838'); // Darker red edge
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, animatedRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add a subtle highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(centerX - animatedRadius * 0.3, centerY - animatedRadius * 0.3, animatedRadius * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawLevel20Walls(walls, tileWidth, tileHeight) {
        if (!walls || walls.length === 0) return;
        
        for (const wall of walls) {
            const x = wall.x * tileWidth;
            const y = wall.y * tileHeight;
            
            // Animation for walls about to expire (5 or fewer moves remaining)
            let alpha = 1.0;
            let scale = 1.0;
            
            if (wall.movesRemaining <= 5) {
                // Create pulsing animation
                const animationSpeed = 0.01; // Speed of pulse
                const pulseIntensity = 0.3; // How much the opacity varies
                const scaleIntensity = 0.1; // How much the size varies
                
                // Use current time for animation
                const currentTime = Date.now();
                const pulse = Math.sin(currentTime * animationSpeed) * 0.5 + 0.5; // 0 to 1
                
                alpha = 0.7 + (pulse * pulseIntensity); // Fade between 0.7 and 1.0
                scale = 1.0 - (pulse * scaleIntensity); // Scale between 1.0 and 1.1
            }
            
            // Apply scaling transformation
            this.ctx.save();
            const centerX = x + tileWidth / 2;
            const centerY = y + tileHeight / 2;
            this.ctx.translate(centerX, centerY);
            this.ctx.scale(scale, scale);
            this.ctx.translate(-centerX, -centerY);
            
                                 // Draw orange square wall with animation
                     this.ctx.fillStyle = `rgba(255, 140, 0, 0.3)`; // Orange color with 0.3 opacity
                     this.ctx.fillRect(x, y, tileWidth, tileHeight);
            
            // Add a subtle border with animation
            this.ctx.strokeStyle = `rgba(255, 107, 0, ${alpha})`; // Darker orange border with alpha
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, tileWidth, tileHeight);
            
            this.ctx.restore();
        }
    }
}
