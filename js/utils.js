// Utility functions for mathematical and geometric calculations
import { GAME_CONFIG } from './config.js';

export function pointToLineDistance(px, py, x1, y1, x2, y2) {
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

export function isPointInPolygon(x, y, polygon) {
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

export function calculatePolygonArea(polygon) {
    let area = 0;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        area += (polygon[j].x + polygon[i].x) * (polygon[j].y - polygon[i].y);
    }
    return Math.abs(area) / 2;
}

export function calculatePolygonBounds(polygon) {
    let minX = Math.min(...polygon.map(p => p.x));
    let maxX = Math.max(...polygon.map(p => p.x));
    let minY = Math.min(...polygon.map(p => p.y));
    let maxY = Math.max(...polygon.map(p => p.y));
    
    return { minX, maxX, minY, maxY };
}

export function createConvexHull(points) {
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
            while (hull.length > 1 && crossProduct(hull[hull.length - 2], hull[hull.length - 1], sortedPoints[i]) <= 0) {
                hull.pop();
            }
            hull.push(sortedPoints[i]);
        }
    }
    
    return hull;
}

export function crossProduct(p1, p2, p3) {
    return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
}

export function formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    const ms = Math.floor((milliseconds % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function getRandomPosition(canvas, safeZones, isPositionInSafeZone) {
    let x, y;
    let attempts = 0;
    
    do {
        x = Math.random() * (canvas.width - 100) + 50;
        y = Math.random() * (canvas.height - 100) + 50;
        attempts++;
    } while (isPositionInSafeZone(x, y) && attempts < 50);
    
    return { x, y };
}

export function getRandomSpeed() {
    return GAME_CONFIG.ENEMY_SPEED_MIN + Math.random() * (GAME_CONFIG.ENEMY_SPEED_MAX - GAME_CONFIG.ENEMY_SPEED_MIN);
}
