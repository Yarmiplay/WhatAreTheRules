// Level-specific polygon creation logic
import { createConvexHull, calculatePolygonBounds } from './utils.js';

export function createPolygonFromLine(points, currentLevel, player, safeZones) {
    // Create a polygon that connects the line to the nearest safe zone
    const polygon = [...points];
    
    if (currentLevel === 3) {
        // For level 3, create a comprehensive polygon that fills trapped areas between safe zones
        return createLevel3Polygon(points, player, safeZones);
    } else if (currentLevel === 4) {
        // For level 4, mixed-up filling rules!
        return createLevel4Polygon(points, player, safeZones);
    } else if (currentLevel === 8 || currentLevel === 9 || currentLevel === 10 || currentLevel === 11 || currentLevel === 12 || currentLevel === 13) {
        // Level 8, 9, 10, 11, 12, and 13: Create polygon that matches exact drawn shape + ALL existing areas
        if (currentLevel === 11 || currentLevel === 13) {
            return createLevel11Polygon(points, player, safeZones);
        } else if (currentLevel === 12) {
            return createLevel12Polygon(points, player, safeZones);
        } else {
            return createLevel8Polygon(points, player, safeZones);
        }
    } else {
        // For level 2, connect to the original safe zone (existing logic)
        return createLevel2Polygon(points, safeZones);
    }
}

function createLevel2Polygon(points, safeZones) {
    // Create a polygon that starts with the line points
    const polygon = [...points];
    
    // Find the nearest safe zone to connect to
    let nearestZone = null;
    let minDistance = Infinity;
    
    for (const zone of safeZones) {
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
    
    return polygon;
}

function createLevel3Polygon(points, player, safeZones) {
    // For level 3, create a comprehensive polygon that fills trapped areas between safe zones
    if (player.exitPosition) {
        // Start with the line points
        const linePoints = [...points];
        
        // Find all safe zones that could be involved in creating trapped areas
        const involvedZones = [];
        
        // Find the exit zone (where player left from)
        let exitZone = null;
        for (const zone of safeZones) {
            if (zone.type === 'polygon') {
                if (isPointInPolygon(player.exitPosition.x, player.exitPosition.y, zone.points)) {
                    exitZone = zone;
                    break;
                }
            } else {
                if (player.exitPosition.x >= zone.x && player.exitPosition.x <= zone.x + zone.width &&
                    player.exitPosition.y >= zone.y && player.exitPosition.y <= zone.y + zone.height) {
                    exitZone = zone;
                    break;
                }
            }
        }
        
        // Find zones that are close to the line path
        for (const zone of safeZones) {
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
        comprehensivePolygon.push({ x: player.exitPosition.x, y: player.exitPosition.y });
        
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
    
    return [...points];
}

function createLevel4Polygon(points, player, safeZones) {
    // For level 4, mixed-up filling rules!
    if (player.exitPosition) {
        // Start with the line points
        const linePoints = [...points];
        
        // Find the exit zone (where player left from)
        let exitZone = null;
        for (const zone of safeZones) {
            if (zone.type === 'polygon') {
                if (isPointInPolygon(player.exitPosition.x, player.exitPosition.y, zone.points)) {
                    exitZone = zone;
                    break;
                }
            } else {
                if (player.exitPosition.x >= zone.x && player.exitPosition.x <= zone.x + zone.width &&
                    player.exitPosition.y >= zone.y && player.exitPosition.y <= zone.y + zone.height) {
                    exitZone = zone;
                    break;
                }
            }
        }
        
        // Level 4 mixed rules: Create a zigzag pattern that connects to multiple safe zones
        const mixedPolygon = [...linePoints];
        
        // Find all safe zones and create connection points in a zigzag pattern
        const allZones = [...safeZones];
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
        mixedPolygon.push({ x: player.exitPosition.x, y: player.exitPosition.y });
        
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
    
    return [...points];
}

function createLevel8Polygon(points, player, safeZones) {
    // Level 8: Create polygon that matches exact drawn shape + initial area
    if (player.exitPosition) {
        // Start with the exact drawn line points
        const exactPolygon = [...points];
        
        // Find the initial safe zone (the starting rectangle)
        let initialZone = null;
        for (const zone of safeZones) {
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
        exactPolygon.push({ x: player.exitPosition.x, y: player.exitPosition.y });
        
        return exactPolygon;
    }
    
    // Fallback: just return the drawn points if no exit position
    return [...points];
}

function createLevel11Polygon(points, player, safeZones) {
    // Level 11: Create new corners every time, then check for enclosed areas
    if (player.exitPosition) {
        // Start with the exact drawn line points
        const exactPolygon = [...points];
        
        // Find the existing zone (either polygon or rectangle)
        let existingZone = null;
        
        // First priority: look for existing polygon
        for (const zone of safeZones) {
            if (zone.type === 'polygon') {
                existingZone = zone;
                break;
            }
        }
        
        // Second priority: if no polygon, look for the initial rectangle
        if (!existingZone) {
            for (const zone of safeZones) {
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
        exactPolygon.push({ x: player.exitPosition.x, y: player.exitPosition.y });
        
        // Check if the new polygon would create any enclosed unsafe areas
        const hasEnclosedUnsafeAreas = checkForEnclosedUnsafeAreas(exactPolygon, safeZones);
        
        if (hasEnclosedUnsafeAreas) {
            // If there are enclosed unsafe areas, fill them by creating a comprehensive polygon
            const allPoints = [...exactPolygon];
            
            // Add points from the existing zone to ensure complete coverage
            if (existingZone && existingZone.type === 'polygon') {
                allPoints.push(...existingZone.points);
            }
            
            // Create a convex hull to fill the enclosed areas
            return createConvexHull(allPoints);
        } else {
            // No enclosed unsafe areas, return the exact polygon shape
            return exactPolygon;
        }
    }
    
    // Fallback: just return the drawn points if no exit position
    return [...points];
}

function checkForEnclosedUnsafeAreas(newPolygon, safeZones) {
    // Check if the new polygon would create any enclosed unsafe areas within the safe zone
    // This is a simplified check - we'll sample points within the polygon to see if any are unsafe
    
    // Get the bounding box of the new polygon
    const bounds = calculatePolygonBounds(newPolygon);
    
    // Sample points within the polygon to check if any unsafe areas would be enclosed
    const samplePoints = [];
    const step = 20; // Sample every 20 pixels
    
    for (let x = bounds.minX; x <= bounds.maxX; x += step) {
        for (let y = bounds.minY; y <= bounds.maxY; y += step) {
            // Check if this point is inside the new polygon
            if (isPointInPolygon(x, y, newPolygon)) {
                // Check if this point is currently in an unsafe area
                if (!isPositionInSafeZone(x, y, safeZones)) {
                    samplePoints.push({ x, y });
                }
            }
        }
    }
    
    // If we found any unsafe points within the new polygon, it means we're enclosing unsafe areas
    return samplePoints.length > 0;
}

function isPositionInSafeZone(x, y, safeZones) {
    for (const zone of safeZones) {
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

function createLevel12Polygon(points, player, safeZones) {
    // Level 12: Works like Level 8 but with a single polygon that has an 8-second cooldown
    if (player.exitPosition) {
        // Start with the exact drawn line points
        const exactPolygon = [...points];
        
        // Find the initial safe zone (the starting rectangle)
        let initialZone = null;
        for (const zone of safeZones) {
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
        exactPolygon.push({ x: player.exitPosition.x, y: player.exitPosition.y });
        
        return exactPolygon;
    }
    
    // Fallback: just return the drawn points if no exit position
    return [...points];
}

// Import the isPointInPolygon function from utils
import { isPointInPolygon } from './utils.js';
