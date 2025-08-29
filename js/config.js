// Game configuration and constants
export const GAME_CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    PLAYER_SPEED: 3,
    AI_PLAYER_SPEED: 2.5,
    ENEMY_SPEED_MIN: 0.8,
    ENEMY_SPEED_MAX: 1.6,
    PLAYER_RADIUS: 8,
    ENEMY_RADIUS: 6,
    APPLE_RADIUS: 8,
    POWER_UP_RADIUS: 8,
    INITIAL_SAFE_ZONE: {
        x: 350,
        y: 250,
        width: 100,
        height: 100
    },
    MAX_LEVEL_TIME: 300, // 5 minutes in seconds
    POWER_UP_SPAWN_INTERVAL: 3000, // 3 seconds
    POWER_UP_LIFESPAN: 8000, // 8 seconds
    POWER_UP_EFFECT_DURATION: 5000, // 5 seconds
    SPEED_BOOST_MULTIPLIER: 1.5,
    ENEMY_SLOW_MULTIPLIER: 0.3,
    BOARD_COMPLETION_THRESHOLD: 85,
    LEVEL_10_MAX_ACHIEVABLE_AREA: 0.954,
    LEVEL_10_GRACE_PERCENT: 0.1,
    LEVEL_9_SCORE_TARGET: 5000,
    LEVEL_9_APPLE_POINTS: 100,
    REGULAR_APPLE_POINTS: 50,
    LEVEL_7_AREA_MIN_PERCENT: 0.10,
    LEVEL_7_AREA_MAX_PERCENT: 0.20
};

export const LEVEL_TITLES = {
    1: "Foundation",
    2: "Shapes Emerge",
    3: "Territory Mastery",
    4: "Territory Fusion",
    5: "Time Pressure",
    6: "You Are the Enemy",
    7: "The Hunt",
    8: "Maybe Normal",
    9: "Score!",
    10: "100%",
    11: "Power Up",
    12: "Time's Up",
    13: "Time Attack",
    14: "Wombo Combo",
    15: "Advantage",
    16: "Cardinal",
    17: "Limited",
    18: "Limited Power",
    19: "Shrinking Power",
    20: "Snake"
};

export const POWER_UP_TYPES = {
    RABBIT: 'rabbit',
    TURTLE: 'turtle',
    STAR: 'star'
};

export const POWER_UP_SYMBOLS = {
    [POWER_UP_TYPES.RABBIT]: '🐰',
    [POWER_UP_TYPES.TURTLE]: '🐢',
    [POWER_UP_TYPES.STAR]: '⭐'
};

export const POWER_UP_COLORS = {
    [POWER_UP_TYPES.RABBIT]: '#FF6B6B',
    [POWER_UP_TYPES.TURTLE]: '#4ECDC4',
    [POWER_UP_TYPES.STAR]: '#FFE66D'
};
