// src/components/SmoothCanvas/core/CanvasRenderer.js - Updated with Selection Visuals
import React from 'react';
import rough from 'roughjs';

export class CanvasRenderer {
  constructor(canvasEngine, options = {}) {
    this.engine = canvasEngine;
    this.options = options;
    this.roughSvg = null;
    this.renderedShapeIds = new Set();
    this.shapeElements = new Map();
  }

  initializeRoughSvg() {
    if (!this.roughSvg && this.engine.svgRef.current) {
      this.roughSvg = rough.svg(this.engine.svgRef.current);
      console.log('CanvasRenderer: Rough.js SVG initialized');
    }
  }

  // Render shapes with selection state
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
      const isSelected = this.engine.isItemSelected(shape.id);
      const existingElement = this.shapeElements.get(shape.id);
      
      if (!existingElement) {
        console.log(`CanvasRenderer: Creating new shape ${shape.id}:`, shape.shapeType);
        this.createNewShape(shape, isMarkedForErase, isSelected);
      } else {
        // Update opacity and selection state
        const currentOpacity = parseFloat(existingElement.getAttribute('opacity') || '1');
        const targetOpacity = isMarkedForErase ? 0.3 : (isSelected ? 0.8 : 1);
        
        if (Math.abs(currentOpacity - targetOpacity) > 0.01) {
          existingElement.setAttribute('opacity', targetOpacity);
        }

        // Update selection class
        if (isSelected) {
          existingElement.classList.add('selected-shape');
        } else {
          existingElement.classList.remove('selected-shape');
        }
      }
    });
  }

  createNewShape(shape, isMarkedForErase, isSelected) {
    try {
      let shapeNode = null;
      const opacity = isMarkedForErase ? 0.3 : (isSelected ? 0.8 : 1);

      const shapeOptions = {
        stroke: shape.color,
        strokeWidth: shape.borderSize,
        fill: shape.fill ? shape.fillColor : 'none',
        fillStyle: shape.fillStyle || 'hachure',
        roughness: shape.roughness || 1.2,
        bowing: shape.bowing || 1.0,
        fillWeight: (shape.borderSize || 2) * 0.5,
      };

      console.log('CanvasRenderer: Creating shape with options:', shapeOptions);

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
        shapeNode.setAttribute('opacity', opacity);
        shapeNode.setAttribute('data-shape-id', shape.id);
        shapeNode.setAttribute('class', `rough-shape ${isSelected ? 'selected-shape' : ''}`);
        shapeNode.style.transition = 'opacity 0.2s ease';

        this.shapeElements.set(shape.id, shapeNode);
        this.renderedShapeIds.add(shape.id);

        this.engine.svgRef.current.appendChild(shapeNode);
        
        console.log('CanvasRenderer: Successfully created and stored shape element');
      }

    } catch (error) {
      console.error('CanvasRenderer: Error creating shape:', error);
    }
  }

  clearRenderedShapes() {
    if (this.engine.svgRef.current) {
      for (const [shapeId, element] of this.shapeElements.entries()) {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
      
      this.shapeElements.clear();
      this.renderedShapeIds.clear();
      
      console.log('CanvasRenderer: Cleared all rendered shapes');
    }
  }

  updateEraserPreview(pathsToErase) {
    for (const [shapeId, element] of this.shapeElements.entries()) {
      const opacity = pathsToErase.has(shapeId) ? 0.3 : 1;
      element.setAttribute('opacity', opacity);
    }
  }

  // MAIN RENDER METHOD - called by React for stroke paths
  renderPaths() {
    const paths = this.engine.getPaths();
    const pathsToErase = this.engine.getPathsToErase();
    const selectedItems = this.engine.selectedItems;

    console.log('CanvasRenderer: Rendering React stroke paths, count:', paths.filter(p => p.type !== 'shape').length);

    // Render shapes to SVG with selection state
    this.renderShapesToSVG();

    // Return React elements for stroke paths only
    const strokePaths = paths
      .filter(pathObj => pathObj.type !== 'shape')
      .map((pathObj) => {
        const isSelected = selectedItems.has(pathObj.id);
        const isMarkedForErase = pathsToErase.has(pathObj.id);
        
        // Apply transform if it exists
        let transform = '';
        if (pathObj.transform && (pathObj.transform.translateX || pathObj.transform.translateY)) {
          transform = `translate(${pathObj.transform.translateX || 0}, ${pathObj.transform.translateY || 0})`;
        }

        return (
          <path
            key={pathObj.id}
            d={pathObj.pathData}
            fill={pathObj.color}
            stroke="none"
            fillRule="nonzero"
            transform={transform}
            className={isSelected ? 'selected-stroke' : ''}
            style={{
              opacity: isMarkedForErase ? 0.3 : (isSelected ? 0.8 : (pathObj.opacity || 100) / 100),
              transition: 'opacity 0.1s ease',
              filter: isSelected ? 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.5))' : 'none'
            }}
          />
        );
      });

    return strokePaths;
  }

  // Render selection overlay (called from SmoothCanvas component)
  renderSelectionOverlay() {
    const elements = [];

    // Render area selection rectangle
    if (this.engine.isSelecting && this.engine.selectionRect) {
      const rect = this.engine.selectionRect;
      elements.push(
        <rect
          key="selection-area"
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="rgba(59, 130, 246, 0.5)"
          strokeWidth="1"
          strokeDasharray="5,5"
          style={{ pointerEvents: 'none' }}
        />
      );
    }

    // Render selection bounds and handles
    if (this.engine.selectionBounds && this.engine.selectedItems.size > 0) {
      const bounds = this.engine.selectionBounds;
      
      // Selection bounds rectangle
      elements.push(
        <rect
          key="selection-bounds"
          x={bounds.x - 2}
          y={bounds.y - 2}
          width={bounds.width + 4}
          height={bounds.height + 4}
          fill="none"
          stroke="rgba(59, 130, 246, 0.8)"
          strokeWidth="1"
          strokeDasharray="3,3"
          style={{ pointerEvents: 'none' }}
        />
      );

      // Resize handles
      const handles = this.engine.getResizeHandles(bounds);
      Object.entries(handles).forEach(([name, handle]) => {
        elements.push(
          <rect
            key={`handle-${name}`}
            x={handle.x - 4}
            y={handle.y - 4}
            width="8"
            height="8"
            fill="white"
            stroke="rgba(59, 130, 246, 0.8)"
            strokeWidth="1"
            style={{ 
              cursor: this.getHandleCursor(name),
              pointerEvents: 'auto'
            }}
          />
        );
      });
    }

    return elements;
  }

  getHandleCursor(handleName) {
    const cursors = {
      'nw': 'nw-resize', 'n': 'n-resize', 'ne': 'ne-resize',
      'e': 'e-resize', 'se': 'se-resize', 's': 's-resolve',
      'sw': 'sw-resize', 'w': 'w-resize'
    };
    return cursors[handleName] || 'default';
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