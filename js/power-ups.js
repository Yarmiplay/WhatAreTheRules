// Power-up system for Level 11, Level 15, and Level 16
import { GAME_CONFIG, POWER_UP_TYPES, POWER_UP_SYMBOLS, POWER_UP_COLORS } from './config.js';
import { getRandomPosition } from './utils.js';

export class PowerUpSystem {
    constructor(canvas, isPositionInSafeZone, currentLevel = 11) {
        this.powerUps = [];
        this.powerUpSpawnTime = 0;
        this.powerUpSpawnInterval = currentLevel === 15 ? GAME_CONFIG.POWER_UP_SPAWN_INTERVAL * 2 : 
                                  currentLevel === 16 ? 3000 : GAME_CONFIG.POWER_UP_SPAWN_INTERVAL; // 3 seconds for Level 16
        this.playerPowerUps = {
            speedBoost: 0,
            invincibility: 0
        };
        this.enemySlowEffect = 0;
        this.enemyPowerUps = new Map(); // Map of enemy ID to their power-ups
        this.playerSlowEffect = 0; // For Level 15
        this.ghostVulnerability = 0; // For Level 16: ghosts become vulnerable when > 0
        this.currentLevel = currentLevel;
        this.canvas = canvas;
        this.isPositionInSafeZone = isPositionInSafeZone;
    }

    spawnPowerUp() {
        if (this.currentLevel === 16) {
            // Level 16: Spawn mushrooms
            const position = getRandomPosition(this.canvas, [], this.isPositionInSafeZone);
            this.powerUps.push({
                x: position.x,
                y: position.y,
                type: 'mushroom',
                symbol: '🍄',
                color: '#8B4513',
                collected: false
            });
        } else {
            // Level 11 and 15: Spawn regular power-ups
            const position = getRandomPosition(this.canvas, [], this.isPositionInSafeZone);
            const types = ['rabbit', 'turtle', 'star'];
            const randomType = types[Math.floor(Math.random() * types.length)];
            
            this.powerUps.push({
                x: position.x,
                y: position.y,
                type: randomType,
                symbol: POWER_UP_SYMBOLS[randomType],
                color: POWER_UP_COLORS[randomType],
                collected: false
            });
        }
    }

    updatePowerUps() {
        const currentTime = Date.now();
        
        // Spawn new power-ups
        if (currentTime - this.powerUpSpawnTime > this.powerUpSpawnInterval) {
            this.spawnPowerUp();
            this.powerUpSpawnTime = currentTime;
        }
        
        // Update player power-up timers
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
        
        // Update enemy slow effect
        if (this.enemySlowEffect > 0) {
            this.enemySlowEffect -= 16;
            if (this.enemySlowEffect <= 0) {
                this.enemySlowEffect = 0;
            }
        }
        
        // Update player slow effect (Level 15)
        if (this.playerSlowEffect > 0) {
            this.playerSlowEffect -= 16;
            if (this.playerSlowEffect <= 0) {
                this.playerSlowEffect = 0;
            }
        }
        
        // Update ghost vulnerability (Level 16)
        if (this.ghostVulnerability > 0) {
            this.ghostVulnerability -= 16;
            if (this.ghostVulnerability <= 0) {
                this.ghostVulnerability = 0;
            }
        }
        
        // Update enemy power-up timers
        for (const [enemyId, powerUps] of this.enemyPowerUps) {
            for (const powerUp of powerUps) {
                if (powerUp.duration > 0) {
                    powerUp.duration -= 16;
                    if (powerUp.duration <= 0) {
                        powerUp.duration = 0;
                    }
                }
            }
        }
    }

    checkPowerUpCollection(player) {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            if (powerUp.collected) continue;
            
            const distance = Math.sqrt(
                Math.pow(player.x - powerUp.x, 2) + 
                Math.pow(player.y - powerUp.y, 2)
            );
            
            if (distance < player.radius + 10) {
                this.applyPowerUp(powerUp.type);
                this.powerUps.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    checkEnemyPowerUpCollection(enemies) {
        if (this.currentLevel !== 15) return null;
        
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            if (powerUp.collected) continue;
            
            for (let j = 0; j < enemies.length; j++) {
                const enemy = enemies[j];
                const distance = Math.sqrt(
                    Math.pow(enemy.x - powerUp.x, 2) + 
                    Math.pow(enemy.y - powerUp.y, 2)
                );
                
                if (distance < enemy.radius + 10) {
                    const result = this.applyEnemyPowerUp(j, powerUp.type);
                    this.powerUps.splice(i, 1);
                    return result;
                }
            }
        }
        return null;
    }

    applyPowerUp(type) {
        if (this.currentLevel === 16 && type === 'mushroom') {
            // Level 16: Make ghosts vulnerable for 5 seconds
            this.ghostVulnerability = 5000; // 5 seconds
            return;
        }
        
        switch (type) {
            case 'rabbit':
                this.playerPowerUps.speedBoost = 8000; // 8 seconds
                break;
            case 'turtle':
                this.enemySlowEffect = 8000; // 8 seconds
                break;
            case 'star':
                this.playerPowerUps.invincibility = 5000; // 5 seconds
                break;
        }
    }

    applyEnemyPowerUp(enemyId, type) {
        if (!this.enemyPowerUps.has(enemyId)) {
            this.enemyPowerUps.set(enemyId, []);
        }
        
        const enemyPowerUps = this.enemyPowerUps.get(enemyId);
        
        switch (type) {
            case 'rabbit':
                enemyPowerUps.push({ type: 'speed', duration: 8000 });
                break;
            case 'star':
                return { type: 'split', enemyId: enemyId };
            case 'turtle':
                this.playerSlowEffect = 8000; // Slow the player
                break;
        }
        
        return null;
    }

    isPlayerInvincible() {
        return this.playerPowerUps.invincibility > 0;
    }

    getPlayerSpeedMultiplier() {
        let multiplier = 1.0;
        
        if (this.playerPowerUps.speedBoost > 0) {
            multiplier *= 1.5;
        }
        
        if (this.playerSlowEffect > 0) {
            multiplier *= 0.5;
        }
        
        return multiplier;
    }

    getEnemySpeedMultiplier(enemyId = null) {
        let multiplier = 1.0;
        
        if (this.enemySlowEffect > 0) {
            multiplier *= 0.5;
        }
        
        // Check enemy-specific power-ups (Level 15)
        if (enemyId !== null && this.enemyPowerUps.has(enemyId)) {
            const enemyPowerUps = this.enemyPowerUps.get(enemyId);
            for (const powerUp of enemyPowerUps) {
                if (powerUp.type === 'speed' && powerUp.duration > 0) {
                    multiplier *= 1.5;
                }
            }
        }
        
        return multiplier;
    }

    areGhostsVulnerable() {
        return this.ghostVulnerability > 0;
    }
}
