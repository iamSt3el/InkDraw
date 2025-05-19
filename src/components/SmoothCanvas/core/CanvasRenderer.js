// src/components/SmoothCanvas/core/CanvasRenderer.js
import React from 'react';

export class CanvasRenderer {
  constructor(canvasEngine, options = {}) {
    this.engine = canvasEngine;
    this.options = options;
  }

  renderPaths() {
    const paths = this.engine.getPaths();
    const pathsToErase = this.engine.getPathsToErase();

    const renderedPaths = paths.map((pathObj) => {
      // Handle different types of paths
      if (pathObj.type === 'shape') {
        // For shapes, use direct SVG elements
        return this.renderShape(pathObj, pathsToErase.has(pathObj.id));
      } else {
        // For normal strokes
        return (
          <path
            key={pathObj.id}
            d={pathObj.pathData}
            fill={pathObj.color}
            stroke="none"
            fillRule="nonzero"
            style={{
              opacity: pathsToErase.has(pathObj.id) ? 0.3 : 1,
              transition: 'opacity 0.1s ease'
            }}
          />
        );
      }
    });

    return renderedPaths;
  }
  
  // Render a shape based on its type
  renderShape(shape, isBeingErased) {
    const opacity = isBeingErased ? 0.3 : shape.opacity / 100;
    const key = shape.id;
    
    const shapeStyles = {
      stroke: shape.color,
      strokeWidth: shape.strokeWidth,
      fill: shape.fill ? shape.fillColor : 'none',
      fillOpacity: shape.fill ? shape.fillOpacity / 100 : 0,
      opacity: opacity,
      transition: 'opacity 0.1s ease',
    };
    
    switch (shape.shapeType) {
      case 'rectangle':
        return (
          <rect
            key={key}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            style={shapeStyles}
          />
        );
        
      case 'circle':
        const centerX = shape.x + shape.width / 2;
        const centerY = shape.y + shape.height / 2;
        const radius = Math.max(shape.width, shape.height) / 2;
        
        return (
          <circle
            key={key}
            cx={centerX}
            cy={centerY}
            r={radius}
            style={shapeStyles}
          />
        );
        
      case 'ellipse':
        const ellipseCenterX = shape.x + shape.width / 2;
        const ellipseCenterY = shape.y + shape.height / 2;
        
        return (
          <ellipse
            key={key}
            cx={ellipseCenterX}
            cy={ellipseCenterY}
            rx={shape.width / 2}
            ry={shape.height / 2}
            style={shapeStyles}
          />
        );
        
      case 'line':
        return (
          <line
            key={key}
            x1={shape.x1}
            y1={shape.y1}
            x2={shape.x2}
            y2={shape.y2}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
            style={{ opacity: opacity, transition: 'opacity 0.1s ease' }}
          />
        );
        
      case 'triangle':
        // Create points for triangle
        const points = [
          [shape.x + shape.width / 2, shape.y],                // Top
          [shape.x, shape.y + shape.height],                   // Bottom left
          [shape.x + shape.width, shape.y + shape.height]      // Bottom right
        ].map(p => p.join(',')).join(' ');
        
        return (
          <polygon
            key={key}
            points={points}
            style={shapeStyles}
          />
        );
        
      default:
        // Fallback to a generic path if shape type is unknown
        console.warn('Unknown shape type:', shape.shapeType);
        return (
          <rect
            key={key}
            x={shape.x || 0}
            y={shape.y || 0}
            width={shape.width || 10}
            height={shape.height || 10}
            style={shapeStyles}
          />
        );
    }
  }

  // Add method to render temporary shapes during drawing
  renderTemporaryShape(temporaryShape) {
    if (!temporaryShape) return null;
    
    // Use the same rendering method but with temporary styling
    const tempShape = {
      ...temporaryShape,
      id: 'temp-shape',
      opacity: (temporaryShape.opacity || 100) * 0.8, // Slightly more transparent for preview
    };
    
    return this.renderShape(tempShape, false);
  }

  renderEraserCursor(showEraser, eraserPosition, eraserWidth) {
    if (!showEraser) return null;

    return (
      <div
        style={{
          width: eraserWidth * 2,
          height: eraserWidth * 2,
          left: eraserPosition.x - eraserWidth,
          top: eraserPosition.y - eraserWidth,
          position: 'absolute',
          border: '2px solid #ef4444',
          borderRadius: '50%',
          pointerEvents: 'none',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          zIndex: 100,
          transform: 'translateZ(0)',
          animation: 'none'
        }}
      />
    );
  }

  renderBackgroundImage(backgroundImageUrl, width, height) {
    if (!backgroundImageUrl) return null;

    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `url(${backgroundImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.1,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
    );
  }

  renderGrid(width, height, gridSize = 20, gridColor = '#e5e7eb') {
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `
            linear-gradient(to right, ${gridColor} 1px, transparent 1px),
            linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)
          `,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
    );
  }
}