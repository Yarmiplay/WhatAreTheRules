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
            
            // Level 11: Show invincibility effect
            if (currentLevel === 11 && isInvincible) {
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
        
        // Draw safe zones
        this.drawSafeZones(gameState.safeZones, gameState.currentLevel);
        
        // Draw player line
        this.drawPlayerLine(gameState.player);
        
        // Draw enemies
        this.drawEnemies(gameState.enemies, gameState.currentLevel, gameState.powerUpSystem);
        
        // Draw apples
        this.drawApples(gameState.apples);
        
                // Draw power-ups (Level 11, 13, 15, and 16)
        if ((gameState.currentLevel === 11 || gameState.currentLevel === 13 || gameState.currentLevel === 15 || gameState.currentLevel === 16) && gameState.powerUpSystem) {
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
        const isInvincible = (gameState.currentLevel === 11 || gameState.currentLevel === 13 || gameState.currentLevel === 15 || gameState.currentLevel === 16) && gameState.powerUpSystem ? 
            gameState.powerUpSystem.isPlayerInvincible() : false;
        this.drawPlayer(gameState.player, gameState.currentLevel, isInvincible);
    }
}
