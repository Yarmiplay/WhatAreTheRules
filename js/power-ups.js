// Power-up system for Level 11
import { GAME_CONFIG, POWER_UP_TYPES, POWER_UP_SYMBOLS, POWER_UP_COLORS } from './config.js';
import { getRandomPosition } from './utils.js';

export class PowerUpSystem {
    constructor(canvas, isPositionInSafeZone) {
        this.powerUps = [];
        this.powerUpSpawnTime = 0;
        this.powerUpSpawnInterval = GAME_CONFIG.POWER_UP_SPAWN_INTERVAL;
        this.playerPowerUps = {
            speedBoost: 0,
            invincibility: 0
        };
        this.enemySlowEffect = 0;
        this.canvas = canvas;
        this.isPositionInSafeZone = isPositionInSafeZone;
    }

    spawnPowerUp() {
        // Spawn a random power-up at a random position
        const powerUpTypes = [POWER_UP_TYPES.RABBIT, POWER_UP_TYPES.TURTLE, POWER_UP_TYPES.STAR];
        const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        
        const position = getRandomPosition(this.canvas, [], this.isPositionInSafeZone);
        
        this.powerUps.push({
            x: position.x,
            y: position.y,
            radius: GAME_CONFIG.POWER_UP_RADIUS,
            type: randomType,
            createdAt: Date.now(),
            lifespan: GAME_CONFIG.POWER_UP_LIFESPAN
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

    checkPowerUpCollection(player) {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            const distance = Math.sqrt(
                Math.pow(player.x - powerUp.x, 2) + 
                Math.pow(player.y - powerUp.y, 2)
            );
            
            if (distance < player.radius + powerUp.radius) {
                // Apply power-up effect
                switch (powerUp.type) {
                    case POWER_UP_TYPES.RABBIT:
                        this.playerPowerUps.speedBoost = GAME_CONFIG.POWER_UP_EFFECT_DURATION;
                        break;
                    case POWER_UP_TYPES.TURTLE:
                        this.enemySlowEffect = GAME_CONFIG.POWER_UP_EFFECT_DURATION;
                        break;
                    case POWER_UP_TYPES.STAR:
                        this.playerPowerUps.invincibility = GAME_CONFIG.POWER_UP_EFFECT_DURATION;
                        break;
                }
                
                this.powerUps.splice(i, 1);
                return true; // Power-up was collected
            }
        }
        return false; // No power-up was collected
    }

    getPlayerSpeedMultiplier() {
        return this.playerPowerUps.speedBoost > 0 ? GAME_CONFIG.SPEED_BOOST_MULTIPLIER : 1;
    }

    getEnemySpeedMultiplier() {
        return this.enemySlowEffect > 0 ? GAME_CONFIG.ENEMY_SLOW_MULTIPLIER : 1;
    }

    isPlayerInvincible() {
        return this.playerPowerUps.invincibility > 0;
    }

    reset() {
        this.powerUps = [];
        this.playerPowerUps = {
            speedBoost: 0,
            invincibility: 0
        };
        this.enemySlowEffect = 0;
        this.powerUpSpawnTime = Date.now();
    }
}
