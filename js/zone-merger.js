// Safe zone merging logic for different levels
import { createConvexHull, calculatePolygonBounds, isPointInPolygon } from './utils.js';
import { GAME_CONFIG } from './config.js';

export function mergeSafeZones(newZone, currentLevel, safeZones, enemies, apples) {
    // Level 4, 8, 10, 11, 12, 13, 15, and 16: Merge new zone with existing zones
    if (currentLevel === 8 || currentLevel === 10 || currentLevel === 11 || currentLevel === 12 || currentLevel === 13 || currentLevel === 15 || currentLevel === 16) {
        return mergeLevel8Style(newZone, currentLevel, safeZones, enemies, apples);
    } else if (currentLevel === 4 || currentLevel === 14) {
        return mergeLevel4Style(newZone, safeZones, enemies, apples);
    }
    return [...safeZones, newZone];
}

function mergeLevel8Style(newZone, currentLevel, safeZones, enemies, apples) {
    // Level 8, 10, 11, and 12: Merge the new area with the existing polygon to create a larger combined area
    // Check for enemies trapped inside the new zone
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (isPointInPolygon(enemy.x, enemy.y, newZone.points)) {
            // Convert enemy to apple
            const points = currentLevel === 9 ? GAME_CONFIG.LEVEL_9_APPLE_POINTS : GAME_CONFIG.REGULAR_APPLE_POINTS;
            apples.push({
                x: enemy.x,
                y: enemy.y,
                radius: GAME_CONFIG.APPLE_RADIUS,
                points: points
            });
            enemies.splice(i, 1);
        }
    }
    
    // Find the existing polygon zone (should be the only one)
    let existingPolygonZone = null;
    for (const zone of safeZones) {
        if (zone.type === 'polygon') {
            existingPolygonZone = zone;
            break;
        }
    }
    
    if (existingPolygonZone) {
        if (currentLevel === 11) {
            // Level 11: Just use the new zone directly (it already includes the existing area)
            // The createLevel11Polygon method already handles the merging correctly
            return [newZone];
        } else if (currentLevel === 12) {
            // Level 12: Create a merged polygon and mark it as temporary with 8-second timer
            const mergedPoints = [...existingPolygonZone.points, ...newZone.points];
            
            // Create convex hull to create a proper merged polygon
            const mergedPolygon = createConvexHull(mergedPoints);
            
            // Replace the existing zone with the merged zone and add timer
            return [{
                type: 'polygon',
                points: mergedPolygon,
                bounds: calculatePolygonBounds(mergedPolygon),
                temporary: true,
                createdAt: Date.now(),
                lifespan: 8000, // 8 seconds
                killPlayerOnExpire: true // Kill player if this zone expires
            }];
        } else {
            // Level 8 and 10: Create a merged polygon that combines the existing area with the new area
            const mergedPoints = [...existingPolygonZone.points, ...newZone.points];
            
            // Create convex hull to create a proper merged polygon
            const mergedPolygon = createConvexHull(mergedPoints);
            
            // Replace the existing zone with the merged zone
            return [{
                type: 'polygon',
                points: mergedPolygon,
                bounds: calculatePolygonBounds(mergedPolygon)
            }];
        }
    } else {
        // If no existing polygon, just use the new zone
        if (currentLevel === 12) {
            // For Level 12, mark the first zone as temporary
            return [{
                ...newZone,
                temporary: true,
                createdAt: Date.now(),
                lifespan: 8000, // 8 seconds
                killPlayerOnExpire: true // Kill player if this zone expires
            }];
        } else {
            return [newZone];
        }
    }
}

function mergeLevel4Style(newZone, safeZones, enemies, apples) {
    // Level 4: Merge new zone with existing zones that overlap or are close
    const mergeDistance = 50; // Distance threshold for merging
    const zonesToMerge = [];
    
    // Find zones that should be merged
    for (let i = 0; i < safeZones.length; i++) {
        const existingZone = safeZones[i];
        
        // Check if zones overlap or are close enough to merge
        if (zonesShouldMerge(newZone, existingZone, mergeDistance)) {
            zonesToMerge.push(i);
        }
    }
    
    if (zonesToMerge.length > 0) {
        try {
            // Create merged zone
            const mergedZone = createMergedZone(newZone, zonesToMerge, safeZones);
            
            // Check for enemies trapped inside the merged zone
            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                if (isPointInPolygon(enemy.x, enemy.y, mergedZone.points)) {
                    // Convert enemy to apple
                    apples.push({
                        x: enemy.x,
                        y: enemy.y,
                        radius: GAME_CONFIG.APPLE_RADIUS,
                        points: GAME_CONFIG.REGULAR_APPLE_POINTS
                    });
                    enemies.splice(i, 1);
                }
            }
            
            // Remove old zones and add merged zone
            const result = [...safeZones];
            for (let i = zonesToMerge.length - 1; i >= 0; i--) {
                result.splice(zonesToMerge[i], 1);
            }
            result.push(mergedZone);
            return result;
        } catch (error) {
            // If merging fails, just add the new zone
            console.warn('Merging failed, adding zone separately:', error);
            return [...safeZones, newZone];
        }
    } else {
        // No zones to merge with, just add the new zone
        return [...safeZones, newZone];
    }
}

function zonesShouldMerge(zone1, zone2, distance) {
    // Check if two zones should be merged based on proximity
    try {
        let bounds1, bounds2;
        
        // Handle different zone types
        if (zone1.type === 'polygon' && zone1.points) {
            bounds1 = zone1.bounds || calculatePolygonBounds(zone1.points);
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
            bounds2 = zone2.bounds || calculatePolygonBounds(zone2.points);
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

function createMergedZone(newZone, zoneIndices, safeZones) {
    // Create a merged zone that encompasses all the zones to be merged
    const zonesToMerge = [newZone, ...zoneIndices.map(i => safeZones[i])];
    
    // Calculate the bounding box of all zones
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    for (const zone of zonesToMerge) {
        let bounds;
        if (zone.type === 'polygon' && zone.points) {
            bounds = zone.bounds || calculatePolygonBounds(zone.points);
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
    const simplifiedPoints = createConvexHull(mergedPoints);
    
    return {
        type: 'polygon',
        points: simplifiedPoints,
        bounds: { minX, maxX, minY, maxY }
    };
}
