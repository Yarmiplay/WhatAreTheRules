// Level-specific polygon creation logic
import { createConvexHull, calculatePolygonBounds } from './utils.js';

export function createLevel16Polygon(points, player, safeZones) {
    if (points.length < 3) return null;
    
    // Create a new safe zone that follows the user's drawn line exactly
    const newPolygon = [...points];
    
    // Check if there's a gap between start and end points
    const startPoint = points[0];
    const endPoint = points[points.length - 1];
    
    // Check if there's a gap between start and end points
    const distance = Math.sqrt(
        Math.pow(startPoint.x - endPoint.x, 2) + 
        Math.pow(startPoint.y - endPoint.y, 2)
    );
    
    if (distance > 5) { // If there's a significant gap
        // Fill the gap with cardinal-direction lines back to the start point
        const gapFillPoints = createCardinalPathToStart(endPoint, startPoint, points, safeZones);
        newPolygon.push(...gapFillPoints);
    }
    
    return newPolygon;
}

export function createLevel17Polygon(points, player, safeZones) {
    if (points.length < 3) return null;
    
    // Create a new safe zone that follows the user's drawn line exactly
    const newPolygon = [...points];
    
    // Check if there's a gap between start and end points
    const startPoint = points[0];
    const endPoint = points[points.length - 1];
    
    // Check if there's a gap between start and end points
    const distance = Math.sqrt(
        Math.pow(startPoint.x - endPoint.x, 2) + 
        Math.pow(startPoint.y - endPoint.y, 2)
    );
    
    if (distance > 5) { // If there's a significant gap
        // Fill the gap with cardinal-direction lines back to the start point
        const gapFillPoints = createCardinalPathToStart(endPoint, startPoint, points, safeZones);
        newPolygon.push(...gapFillPoints);
    }
    
    // Kill diagonals in the resulting polygon
    return killDiagonalsInPolygon(newPolygon);
}

export function killDiagonalsInPolygon(polygon) {
    if (polygon.length < 3) return polygon;
    
    const result = [];
    
    for (let i = 0; i < polygon.length; i++) {
        const current = polygon[i];
        const next = polygon[(i + 1) % polygon.length];
        
        // Check if this edge is diagonal
        const dx = Math.abs(next.x - current.x);
        const dy = Math.abs(next.y - current.y);
        
        // If both dx and dy are significant, it's a diagonal
        if (dx > 2 && dy > 2) {
            // Break diagonal into horizontal and vertical segments
            const brokenSegments = breakDiagonalLine(current, next);
            // Add all segments except the last one (to avoid duplicates)
            for (let j = 0; j < brokenSegments.length - 1; j++) {
                result.push(brokenSegments[j]);
            }
        } else {
            // Not diagonal, keep as is
            result.push(current);
        }
    }
    
    return result;
}

function breakDiagonalLine(start, end) {
    const segments = [];
    
    // Determine which direction to go first (horizontal or vertical)
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    
    if (dx > dy) {
        // Go horizontal first, then vertical
        const horizontalPoint = { x: end.x, y: start.y };
        segments.push(start);
        segments.push(horizontalPoint);
        segments.push(end);
    } else {
        // Go vertical first, then horizontal
        const verticalPoint = { x: start.x, y: end.y };
        segments.push(start);
        segments.push(verticalPoint);
        segments.push(end);
    }
    
    return segments;
}

function createCardinalPathToStart(fromPoint, toPoint, playerPath, safeZones) {
    const path = [];
    
    // First, try to find a direct cardinal path that doesn't intersect with player's line
    const directPath = findDirectCardinalPath(fromPoint, toPoint, playerPath);
    if (directPath) {
        return directPath;
    }
    
    // If direct path fails, navigate along safe zone edges
    return navigateAlongSafeZoneEdges(fromPoint, toPoint, playerPath, safeZones);
}

function findDirectCardinalPath(fromPoint, toPoint, playerPath) {
    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;
    
    // Try horizontal first, then vertical
    if (Math.abs(dx) > Math.abs(dy)) {
        const horizontalPoint = { x: toPoint.x, y: fromPoint.y };
        if (!pathIntersectsPlayerPath(fromPoint, horizontalPoint, playerPath)) {
            return [horizontalPoint, toPoint];
        }
    }
    
    // Try vertical first, then horizontal
    const verticalPoint = { x: fromPoint.x, y: toPoint.y };
    if (!pathIntersectsPlayerPath(fromPoint, verticalPoint, playerPath)) {
        return [verticalPoint, toPoint];
    }
    
    return null;
}

function navigateAlongSafeZoneEdges(fromPoint, toPoint, playerPath, safeZones) {
    const path = [];
    
    // Find the closest safe zone edge to navigate along
    let bestEdge = null;
    let bestDistance = Infinity;
    
    for (const zone of safeZones) {
        const edges = getZoneEdges(zone);
        
        for (const edge of edges) {
            // Check if this edge is in a cardinal direction
            const edgeDx = edge.end.x - edge.start.x;
            const edgeDy = edge.end.y - edge.start.y;
            
            if (Math.abs(edgeDx) > 0.1 && Math.abs(edgeDy) < 0.1) {
                // Horizontal edge
                const distance = Math.abs(fromPoint.y - edge.start.y);
                if (distance < bestDistance && !pathIntersectsPlayerPath(fromPoint, edge.start, playerPath)) {
                    bestDistance = distance;
                    bestEdge = edge;
                }
            } else if (Math.abs(edgeDy) > 0.1 && Math.abs(edgeDx) < 0.1) {
                // Vertical edge
                const distance = Math.abs(fromPoint.x - edge.start.x);
                if (distance < bestDistance && !pathIntersectsPlayerPath(fromPoint, edge.start, playerPath)) {
                    bestDistance = distance;
                    bestEdge = edge;
                }
            }
        }
    }
    
    if (bestEdge) {
        // Navigate to the edge first
        path.push(bestEdge.start);
        
        // Walk along the edge towards the target
        const edgePoints = walkAlongEdge(bestEdge, toPoint, playerPath);
        path.push(...edgePoints);
        
        // Connect to the target
        if (path.length > 0) {
            const lastPoint = path[path.length - 1];
            if (!pathIntersectsPlayerPath(lastPoint, toPoint, playerPath)) {
                path.push(toPoint);
            }
        }
        
        return path;
    }
    
    // Fallback: simple detour
    return createSimpleDetour(fromPoint, toPoint, playerPath);
}

function getZoneEdges(zone) {
    const edges = [];
    
    if (zone.type === 'polygon') {
        for (let i = 0; i < zone.points.length; i++) {
            const start = zone.points[i];
            const end = zone.points[(i + 1) % zone.points.length];
            edges.push({ start, end });
        }
    } else {
        // Rectangle zone
        const points = [
            { x: zone.x, y: zone.y },
            { x: zone.x + zone.width, y: zone.y },
            { x: zone.x + zone.width, y: zone.y + zone.height },
            { x: zone.x, y: zone.y + zone.height }
        ];
        
        for (let i = 0; i < points.length; i++) {
            const start = points[i];
            const end = points[(i + 1) % points.length];
            edges.push({ start, end });
        }
    }
    
    return edges;
}

function walkAlongEdge(edge, target, playerPath) {
    const path = [];
    const step = 10; // Step size for walking along edge
    
    let currentPoint = { ...edge.start };
    const edgeDx = edge.end.x - edge.start.x;
    const edgeDy = edge.end.y - edge.start.y;
    
    // Determine step direction
    const stepX = edgeDx > 0 ? step : edgeDx < 0 ? -step : 0;
    const stepY = edgeDy > 0 ? step : edgeDy < 0 ? -step : 0;
    
    // Walk along the edge until we reach the end or get close to target
    while (Math.abs(currentPoint.x - edge.end.x) > step && Math.abs(currentPoint.y - edge.end.y) > step) {
        const nextPoint = { x: currentPoint.x + stepX, y: currentPoint.y + stepY };
        
        // Check if we can continue along the edge
        if (!pathIntersectsPlayerPath(currentPoint, nextPoint, playerPath)) {
            path.push(nextPoint);
            currentPoint = nextPoint;
        } else {
            break;
        }
    }
    
    return path;
}

function createSimpleDetour(fromPoint, toPoint, playerPath) {
    // Create a simple detour that goes around the player's path
    const margin = 40;
    
    // Try going up and around
    const upPoint = { x: fromPoint.x, y: fromPoint.y - margin };
    const acrossPoint = { x: toPoint.x, y: fromPoint.y - margin };
    
    if (!pathIntersectsPlayerPath(fromPoint, upPoint, playerPath) &&
        !pathIntersectsPlayerPath(upPoint, acrossPoint, playerPath) &&
        !pathIntersectsPlayerPath(acrossPoint, toPoint, playerPath)) {
        return [upPoint, acrossPoint, toPoint];
    }
    
    // Try going down and around
    const downPoint = { x: fromPoint.x, y: fromPoint.y + margin };
    const acrossPoint2 = { x: toPoint.x, y: fromPoint.y + margin };
    
    if (!pathIntersectsPlayerPath(fromPoint, downPoint, playerPath) &&
        !pathIntersectsPlayerPath(downPoint, acrossPoint2, playerPath) &&
        !pathIntersectsPlayerPath(acrossPoint2, toPoint, playerPath)) {
        return [downPoint, acrossPoint2, toPoint];
    }
    
    // Fallback: just go directly
    return [toPoint];
}

function pathIntersectsPlayerPath(fromPoint, toPoint, playerPath) {
    // Check if the line from fromPoint to toPoint intersects with any segment of the player's path
    for (let i = 1; i < playerPath.length; i++) {
        const playerStart = playerPath[i - 1];
        const playerEnd = playerPath[i];
        
        if (linesIntersect(fromPoint, toPoint, playerStart, playerEnd)) {
            return true;
        }
    }
    return false;
}



function linesIntersect(p1, p2, p3, p4) {
    // Check if line segment p1-p2 intersects with line segment p3-p4
    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const x3 = p3.x, y3 = p3.y;
    const x4 = p4.x, y4 = p4.y;
    
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.001) return false; // Lines are parallel
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}









function findIntersections(drawnPolygon, existingPolygon) {
    const intersections = [];
    
    // Check each edge of the drawn polygon against each edge of the existing polygon
    for (let i = 0; i < drawnPolygon.length - 1; i++) {
        const drawnStart = drawnPolygon[i];
        const drawnEnd = drawnPolygon[i + 1];
        
        for (let j = 0; j < existingPolygon.length; j++) {
            const existingStart = existingPolygon[j];
            const existingEnd = existingPolygon[(j + 1) % existingPolygon.length];
            
            const intersection = getLineIntersection(drawnStart, drawnEnd, existingStart, existingEnd);
            if (intersection) {
                intersections.push({
                    point: intersection,
                    drawnIndex: i,
                    existingIndex: j
                });
            }
        }
    }
    
    // Sort intersections by their position along the drawn polygon
    intersections.sort((a, b) => a.drawnIndex - b.drawnIndex);
    
    return intersections;
}

function getLineIntersection(p1, p2, p3, p4) {
    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const x3 = p3.x, y3 = p3.y;
    const x4 = p4.x, y4 = p4.y;
    
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.001) return null; // Lines are parallel
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return {
            x: x1 + t * (x2 - x1),
            y: y1 + t * (y2 - y1)
        };
    }
    
    return null;
}

function getPolygonPointsBetween(startPoint, endPoint, polygon) {
    const points = [];
    
    // Find the indices of start and end points
    let startIndex = -1;
    let endIndex = -1;
    
    for (let i = 0; i < polygon.length; i++) {
        if (Math.abs(polygon[i].x - startPoint.x) < 0.1 && Math.abs(polygon[i].y - startPoint.y) < 0.1) {
            startIndex = i;
        }
        if (Math.abs(polygon[i].x - endPoint.x) < 0.1 && Math.abs(polygon[i].y - endPoint.y) < 0.1) {
            endIndex = i;
        }
    }
    
    if (startIndex === -1 || endIndex === -1) {
        return [];
    }
    
    // Add points from start to end (clockwise)
    let currentIndex = startIndex;
    while (currentIndex !== endIndex) {
        currentIndex = (currentIndex + 1) % polygon.length;
        points.push(polygon[currentIndex]);
    }
    
    return points;
}



export function createPolygonFromLine(points, currentLevel, player, safeZones) {
    const polygon = [...points];

    if (currentLevel === 3) {
        return createLevel3Polygon(points, player, safeZones);
    } else if (currentLevel === 4 || currentLevel === 14) {
        return createLevel4Polygon(points, player, safeZones);
    } else if (currentLevel === 8 || currentLevel === 9 || currentLevel === 10 || currentLevel === 11 || currentLevel === 12 || currentLevel === 13 || currentLevel === 15 || currentLevel === 16 || currentLevel === 17 || currentLevel === 18 || currentLevel === 19) {
        if (currentLevel === 11 || currentLevel === 13 || currentLevel === 15) {
            return createLevel11Polygon(points, player, safeZones);
        } else if (currentLevel === 12) {
            return createLevel12Polygon(points, player, safeZones);
        } else if (currentLevel === 16 || currentLevel === 18 || currentLevel === 19) {
            return createLevel16Polygon(points, player, safeZones);
        } else if (currentLevel === 17) {
            return createLevel17Polygon(points, player, safeZones);
        } else {
            return createLevel8Polygon(points, player, safeZones);
        }
    } else {
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
