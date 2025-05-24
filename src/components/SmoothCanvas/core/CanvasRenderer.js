// src/components/SmoothCanvas/core/CanvasRenderer.js - SIMPLE ROUGH.JS APPROACH
import React from 'react';
import rough from 'roughjs';

export class CanvasRenderer {
  constructor(canvasEngine, options = {}) {
    this.engine = canvasEngine;
    this.options = options;
    this.roughSvg = null;
    this.renderedShapeIds = new Set(); // Track what we've rendered
  }

  initializeRoughSvg() {
    if (!this.roughSvg && this.engine.svgRef.current) {
      this.roughSvg = rough.svg(this.engine.svgRef.current);
      console.log('CanvasRenderer: Rough.js SVG initialized');
    }
  }

  // SIMPLE: Just render shapes directly as per Rough.js docs
  renderShapesToSVG() {
    this.initializeRoughSvg();
    
    if (!this.roughSvg || !this.engine.svgRef.current) {
      console.warn('CanvasRenderer: Rough.js or SVG ref not available');
      return;
    }

    const svg = this.engine.svgRef.current;
    //const canvas = rough.canvas(this.engine.canvasRef.current);
    const paths = this.engine.getPaths();
    const shapes = paths.filter(path => path.type === 'shape');
    const pathsToErase = this.engine.getPathsToErase();

    console.log('CanvasRenderer: Rendering', shapes.length, 'shapes to SVG');

    // Clear existing rough shapes (they have a specific class)
    const existingRoughShapes = svg.querySelectorAll('.rough-shape');
    existingRoughShapes.forEach(shape => shape.remove());
    this.renderedShapeIds.clear();

    // Render each shape
    shapes.forEach((shape, index) => {
      console.log(`CanvasRenderer: Rendering shape ${index}:`, shape.shapeType, shape.isRough ? 'rough' : 'clean');
      
      try {
        let shapeNode = null;
        const opacity = pathsToErase.has(shape.id) ? 0.3 : (shape.opacity || 100) / 100;

        if (shape.isRough) {
          // ROUGH SHAPE - Use Rough.js exactly as documented
          const roughOptions = {
            stroke: shape.color || '#000000',
            strokeWidth: shape.strokeWidth || 2,
            fill: shape.fill ? (shape.fillColor || shape.color || '#000000') : 'none',
            fillStyle: shape.fillStyle || 'hachure',
            roughness: shape.roughness || 1,
            bowing: shape.bowing || 1,
            fillWeight: (shape.strokeWidth || 2) * 0.5,
          };

          console.log('CanvasRenderer: Creating rough shape with options:', roughOptions);

          switch (shape.shapeType) {
            case 'rectangle':
              // EXACTLY as per docs: roughSvg.rectangle returns a node
             //canvas.rectangle(shape.x, shape.y, shape.width, shape.height, roughOptions);
              shapeNode = this.roughSvg.rectangle(
                shape.x, shape.y, shape.width, shape.height, roughOptions
              );
              break;
              
            case 'circle':
              const centerX = shape.x + shape.width / 2;
              const centerY = shape.y + shape.height / 2;
              const diameter = Math.max(shape.width, shape.height);
              shapeNode = this.roughSvg.circle(centerX, centerY, diameter, roughOptions);
              break;
              
            case 'ellipse':
              const ellipseCenterX = shape.x + shape.width / 2;
              const ellipseCenterY = shape.y + shape.height / 2;
              shapeNode = this.roughSvg.ellipse(
                ellipseCenterX, ellipseCenterY, shape.width, shape.height, roughOptions
              );
              break;
              
            case 'line':
              shapeNode = this.roughSvg.line(
                shape.x1, shape.y1, shape.x2, shape.y2, roughOptions
              );
              break;
              
            default:
              console.warn('Unknown rough shape type:', shape.shapeType);
              return;
          }
          
        } else {
          // CLEAN SHAPE - Create standard SVG elements
          shapeNode = this.createCleanSVGShape(shape);
        }

        if (shapeNode) {
          // Set common attributes
          shapeNode.setAttribute('opacity', opacity);
          shapeNode.setAttribute('data-shape-id', shape.id);
          shapeNode.setAttribute('class', 'rough-shape'); // For easy cleanup
          shapeNode.style.transition = 'opacity 0.2s ease';

          // EXACTLY as per docs: svg.appendChild(node)
          svg.appendChild(shapeNode);
          this.renderedShapeIds.add(shape.id);
          
          console.log('CanvasRenderer: Successfully appended shape to SVG');
        }

      } catch (error) {
        console.error('CanvasRenderer: Error rendering shape:', error);
      }
    });
  }

  // Helper to create clean SVG shapes
  createCleanSVGShape(shape) {
    const svgNS = 'http://www.w3.org/2000/svg';
    let element = null;

    switch (shape.shapeType) {
      case 'rectangle':
        element = document.createElementNS(svgNS, 'rect');
        element.setAttribute('x', shape.x);
        element.setAttribute('y', shape.y);
        element.setAttribute('width', shape.width);
        element.setAttribute('height', shape.height);
        break;
        
      case 'circle':
        element = document.createElementNS(svgNS, 'circle');
        const centerX = shape.x + shape.width / 2;
        const centerY = shape.y + shape.height / 2;
        const radius = Math.max(shape.width, shape.height) / 2;
        element.setAttribute('cx', centerX);
        element.setAttribute('cy', centerY);
        element.setAttribute('r', radius);
        break;
        
      case 'ellipse':
        element = document.createElementNS(svgNS, 'ellipse');
        const ellipseCenterX = shape.x + shape.width / 2;
        const ellipseCenterY = shape.y + shape.height / 2;
        element.setAttribute('cx', ellipseCenterX);
        element.setAttribute('cy', ellipseCenterY);
        element.setAttribute('rx', shape.width / 2);
        element.setAttribute('ry', shape.height / 2);
        break;
        
      case 'line':
        element = document.createElementNS(svgNS, 'line');
        element.setAttribute('x1', shape.x1);
        element.setAttribute('y1', shape.y1);
        element.setAttribute('x2', shape.x2);
        element.setAttribute('y2', shape.y2);
        break;
        
      default:
        return null;
    }

    if (element) {
      // Apply styling
      element.setAttribute('stroke', shape.color || '#000000');
      element.setAttribute('stroke-width', shape.strokeWidth || 2);
      element.setAttribute('fill', shape.fill ? (shape.fillColor || shape.color) : 'none');
      if (shape.fill) {
        element.setAttribute('fill-opacity', (shape.fillOpacity || 20) / 100);
      }
    }

    return element;
  }

  // Clear all rendered shapes
  clearRenderedShapes() {
    if (this.engine.svgRef.current) {
      const svg = this.engine.svgRef.current;
      const existingRoughShapes = svg.querySelectorAll('.rough-shape');
      existingRoughShapes.forEach(shape => shape.remove());
      this.renderedShapeIds.clear();
      console.log('CanvasRenderer: Cleared all rendered shapes');
    }
  }

  // Update eraser preview
  updateEraserPreview(pathsToErase) {
    if (this.engine.svgRef.current) {
      const svg = this.engine.svgRef.current;
      const shapeElements = svg.querySelectorAll('.rough-shape');
      
      shapeElements.forEach(element => {
        const shapeId = element.getAttribute('data-shape-id');
        const opacity = pathsToErase.has(shapeId) ? 0.3 : 1;
        element.setAttribute('opacity', opacity);
      });
    }
  }

  // MAIN RENDER METHOD - called by React for stroke paths
  renderPaths() {
    const paths = this.engine.getPaths();
    const pathsToErase = this.engine.getPathsToErase();

    console.log('CanvasRenderer: Rendering React stroke paths, count:', paths.filter(p => p.type !== 'shape').length);

    // Render shapes to SVG (direct DOM manipulation)
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