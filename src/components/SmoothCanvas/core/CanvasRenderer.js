// src/components/SmoothCanvas/core/CanvasRenderer.js - FIXED to preserve shape properties
import React from 'react';
import rough from 'roughjs';

export class CanvasRenderer {
  constructor(canvasEngine, options = {}) {
    this.engine = canvasEngine;
    this.options = options;
    this.roughSvg = null;
    this.renderedShapeIds = new Set();
    this.shapeElements = new Map(); // FIXED: Track rendered elements
  }

  initializeRoughSvg() {
    if (!this.roughSvg && this.engine.svgRef.current) {
      this.roughSvg = rough.svg(this.engine.svgRef.current);
      console.log('CanvasRenderer: Rough.js SVG initialized');
    }
  }

  // FIXED: Render shapes with property preservation
  renderShapesToSVG() {
    this.initializeRoughSvg();
    
    if (!this.roughSvg || !this.engine.svgRef.current) {
      console.warn('CanvasRenderer: Rough.js or SVG ref not available');
      return;
    }

    const svg = this.engine.svgRef.current;
    const paths = this.engine.getPaths();
    const shapes = paths.filter(path => path.type === 'shape');
    const pathsToErase = this.engine.getPathsToErase();

    console.log('CanvasRenderer: Rendering', shapes.length, 'shapes to SVG');

    // FIXED: Instead of clearing all shapes, only update changed ones
    const currentShapeIds = new Set(shapes.map(s => s.id));
    
    // Remove shapes that no longer exist
    for (const [shapeId, element] of this.shapeElements.entries()) {
      if (!currentShapeIds.has(shapeId)) {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
        this.shapeElements.delete(shapeId);
        this.renderedShapeIds.delete(shapeId);
      }
    }

    // Render new or update existing shapes
    shapes.forEach((shape, index) => {
      const isMarkedForErase = pathsToErase.has(shape.id);
      const existingElement = this.shapeElements.get(shape.id);
      
      // FIXED: Only re-render if shape is new or eraser state changed
      if (!existingElement) {
        console.log(`CanvasRenderer: Creating new shape ${shape.id}:`, shape.shapeType);
        this.createNewShape(shape, isMarkedForErase);
      } else {
        // FIXED: Only update opacity for eraser preview, preserve all other properties
        const currentOpacity = parseFloat(existingElement.getAttribute('opacity') || '1');
        const targetOpacity = isMarkedForErase ? 0.3 : 1;
        
        if (Math.abs(currentOpacity - targetOpacity) > 0.01) {
          existingElement.setAttribute('opacity', targetOpacity);
        }
      }
    });
  }

  // FIXED: Create new shape with preserved properties
  createNewShape(shape, isMarkedForErase) {
    try {
      let shapeNode = null;
      const opacity = isMarkedForErase ? 0.3 : 1;

      // FIXED: Always use the ORIGINAL shape properties, never current store values
      const shapeOptions = {
        stroke: shape.color, // Use shape's own color
        strokeWidth: shape.borderSize, // Use shape's own border size
        fill: shape.fill ? shape.fillColor : 'none', // Use shape's own fill settings
        fillStyle: shape.fillStyle || 'hachure',
        roughness: shape.roughness || 1.2, // Use shape's own roughness
        bowing: shape.bowing || 1.0, // Use shape's own bowing
        fillWeight: (shape.borderSize || 2) * 0.5,
      };

      console.log('CanvasRenderer: Creating shape with PRESERVED options:', shapeOptions);

      // Always create rough rectangle (hand-drawn style as requested)
      switch (shape.shapeType) {
        case 'rectangle':
          shapeNode = this.roughSvg.rectangle(
            shape.x, shape.y, shape.width, shape.height, shapeOptions
          );
          break;
          
        default:
          console.warn('Unknown shape type:', shape.shapeType);
          return;
      }

      if (shapeNode) {
        // Set attributes with preserved properties
        shapeNode.setAttribute('opacity', opacity);
        shapeNode.setAttribute('data-shape-id', shape.id);
        shapeNode.setAttribute('class', 'rough-shape');
        shapeNode.style.transition = 'opacity 0.2s ease';

        // FIXED: Store reference to prevent re-creation
        this.shapeElements.set(shape.id, shapeNode);
        this.renderedShapeIds.add(shape.id);

        // Append to SVG
        this.engine.svgRef.current.appendChild(shapeNode);
        
        console.log('CanvasRenderer: Successfully created and stored shape element');
      }

    } catch (error) {
      console.error('CanvasRenderer: Error creating shape:', error);
    }
  }

  // FIXED: Clear with proper cleanup
  clearRenderedShapes() {
    if (this.engine.svgRef.current) {
      // Remove all tracked elements
      for (const [shapeId, element] of this.shapeElements.entries()) {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
      
      // Clear tracking
      this.shapeElements.clear();
      this.renderedShapeIds.clear();
      
      console.log('CanvasRenderer: Cleared all rendered shapes');
    }
  }

  // FIXED: Update eraser preview without re-rendering shapes
  updateEraserPreview(pathsToErase) {
    // Only update opacity of existing elements
    for (const [shapeId, element] of this.shapeElements.entries()) {
      const opacity = pathsToErase.has(shapeId) ? 0.3 : 1;
      element.setAttribute('opacity', opacity);
    }
  }

  // MAIN RENDER METHOD - called by React for stroke paths
  renderPaths() {
    const paths = this.engine.getPaths();
    const pathsToErase = this.engine.getPathsToErase();

    console.log('CanvasRenderer: Rendering React stroke paths, count:', paths.filter(p => p.type !== 'shape').length);

    // FIXED: Render shapes to SVG with property preservation
    this.renderShapesToSVG();

    // Return React elements for stroke paths only
    const strokePaths = paths
      .filter(pathObj => pathObj.type !== 'shape')
      .map((pathObj) => {
        return (
          <path
            key={pathObj.id}
            d={pathObj.pathData}
            fill={pathObj.color}
            stroke="none"
            fillRule="nonzero"
            style={{
              opacity: pathsToErase.has(pathObj.id) ? 0.3 : (pathObj.opacity || 100) / 100,
              transition: 'opacity 0.1s ease'
            }}
          />
        );
      });

    return strokePaths;
  }

  renderEraserCursor(showEraser, eraserPosition, eraserWidth) {
    if (!showEraser) return null;

    return (
      <div
        className="eraser-cursor"
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