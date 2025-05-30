// src/components/SmoothCanvas/core/CanvasRenderer.js - ENHANCED WITH AI TEXT RENDERING
import React from 'react';
import rough from 'roughjs';

export class CanvasRenderer {
  constructor(canvasEngine, options = {}) {
    this.engine = canvasEngine;
    this.options = options;
    this.roughSvg = null;
    this.renderedShapeIds = new Set();
    this.shapeElements = new Map();
    this.textElements = new Map(); // NEW: Track AI text elements
  }

  initializeRoughSvg() {
    if (!this.roughSvg && this.engine.svgRef.current) {
      this.roughSvg = rough.svg(this.engine.svgRef.current);
      // console.log('CanvasRenderer: Rough.js SVG initialized');
    }
  }

  // NEW: AI Text Rendering Methods
  renderAITextElement(textData) {
    // console.log('CanvasRenderer: Rendering AI text element:', textData);
    
    const { id, text, x, y, fontFamily, fontSize, fontWeight, color, textAlign, bounds } = textData;
    
    // Remove existing text element if it exists
    const existingElement = this.textElements.get(id);
    if (existingElement && existingElement.parentNode) {
      existingElement.parentNode.removeChild(existingElement);
    }
    
    // Create text element
    const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textElement.id = `ai-text-${id}`;
    textElement.setAttribute('class', 'ai-generated-text');
    
    // Position based on bounds and alignment
    let textX = x;
    if (bounds) {
      switch (textAlign) {
        case 'center':
          textX = bounds.centerX;
          break;
        case 'right':
          textX = bounds.x + bounds.width;
          break;
        case 'left':
        default:
          textX = bounds.x;
          break;
      }
    }
    
    // Set text properties
    textElement.setAttribute('x', textX);
    textElement.setAttribute('y', y);
    textElement.setAttribute('font-family', fontFamily || 'Arial, sans-serif');
    textElement.setAttribute('font-size', fontSize || 16);
    textElement.setAttribute('font-weight', fontWeight || 'normal');
    textElement.setAttribute('fill', color || '#000000');
    textElement.setAttribute('text-anchor', this.getTextAnchor(textAlign));
    textElement.setAttribute('dominant-baseline', 'middle');
    
    // Add smooth transition
    textElement.style.transition = 'all 0.3s ease';
    textElement.style.opacity = '0';
    
    // Set text content
    textElement.textContent = text;
    
    // Add to SVG
    this.engine.svgRef.current.appendChild(textElement);
    
    // Store reference
    this.textElements.set(id, textElement);
    
    // Animate in
    requestAnimationFrame(() => {
      textElement.style.opacity = '1';
      textElement.style.transform = 'scale(1)';
    });
    
    console.log('CanvasRenderer: AI text element rendered successfully');
    
    return textElement;
  }

  getTextAnchor(textAlign) {
    switch (textAlign) {
      case 'center': return 'middle';
      case 'right': return 'end';
      case 'left':
      default: return 'start';
    }
  }

  // NEW: Remove AI text element
  removeAITextElement(id) {
    console.log('CanvasRenderer: Removing AI text element:', id);
    
    const element = this.textElements.get(id);
    if (element && element.parentNode) {
      // Animate out
      element.style.transition = 'all 0.3s ease';
      element.style.opacity = '0';
      element.style.transform = 'scale(0.8)';
      
      setTimeout(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }, 300);
      
      this.textElements.delete(id);
    }
  }

  // NEW: Update AI text element
  updateAITextElement(id, updates) {
    // console.log('CanvasRenderer: Updating AI text element:', id, updates);
    
    const element = this.textElements.get(id);
    if (!element) return;
    
    // Update properties
    if (updates.text !== undefined) {
      element.textContent = updates.text;
    }
    if (updates.x !== undefined) {
      element.setAttribute('x', updates.x);
    }
    if (updates.y !== undefined) {
      element.setAttribute('y', updates.y);
    }
    if (updates.fontFamily !== undefined) {
      element.setAttribute('font-family', updates.fontFamily);
    }
    if (updates.fontSize !== undefined) {
      element.setAttribute('font-size', updates.fontSize);
    }
    if (updates.fontWeight !== undefined) {
      element.setAttribute('font-weight', updates.fontWeight);
    }
    if (updates.color !== undefined) {
      element.setAttribute('fill', updates.color);
    }
    if (updates.textAlign !== undefined) {
      element.setAttribute('text-anchor', this.getTextAnchor(updates.textAlign));
    }
  }

  // NEW: Clear all AI text elements
  clearAITextElements() {
    console.log('CanvasRenderer: Clearing all AI text elements');
    
    for (const [id, element] of this.textElements.entries()) {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }
    
    this.textElements.clear();
  }

  // NEW: Get all AI text elements for selection
  getAITextElements() {
    return Array.from(this.textElements.entries()).map(([id, element]) => ({
      id,
      element,
      bounds: this.getTextElementBounds(element)
    }));
  }

  // NEW: Get bounds of text element
  getTextElementBounds(element) {
    try {
      const bbox = element.getBBox();
      return {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
        centerX: bbox.x + bbox.width / 2,
        centerY: bbox.y + bbox.height / 2
      };
    } catch (error) {
      console.warn('CanvasRenderer: Could not get text bounds:', error);
      return null;
    }
  }

  // NEW: AI Processing Visual Feedback
  renderAIProcessingFeedback(strokeBounds, isProcessing = false) {
    const svg = this.engine.svgRef.current;
    if (!svg) return;

    // Remove existing processing feedback
    const existingFeedback = svg.querySelector('#ai-processing-feedback');
    if (existingFeedback) {
      existingFeedback.remove();
    }

    if (!isProcessing || !strokeBounds) return;

    // Create processing feedback group
    const feedbackGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    feedbackGroup.id = 'ai-processing-feedback';
    
    // Background rectangle
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', strokeBounds.x - 5);
    bg.setAttribute('y', strokeBounds.y - 5);
    bg.setAttribute('width', strokeBounds.width + 10);
    bg.setAttribute('height', strokeBounds.height + 10);
    bg.setAttribute('fill', 'rgba(139, 92, 246, 0.1)');
    bg.setAttribute('stroke', '#8b5cf6');
    bg.setAttribute('stroke-width', '1');
    bg.setAttribute('stroke-dasharray', '3,3');
    bg.setAttribute('rx', '5');
    
    // Processing spinner
    const spinner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    spinner.setAttribute('cx', strokeBounds.centerX);
    spinner.setAttribute('cy', strokeBounds.y - 15);
    spinner.setAttribute('r', '6');
    spinner.setAttribute('fill', 'none');
    spinner.setAttribute('stroke', '#8b5cf6');
    spinner.setAttribute('stroke-width', '2');
    spinner.setAttribute('stroke-dasharray', '6 6');
    spinner.style.animation = 'spin 1s linear infinite';
    
    // Processing text
    const processingText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    processingText.setAttribute('x', strokeBounds.centerX + 15);
    processingText.setAttribute('y', strokeBounds.y - 10);
    processingText.setAttribute('font-family', 'Arial, sans-serif');
    processingText.setAttribute('font-size', '12');
    processingText.setAttribute('fill', '#8b5cf6');
    processingText.setAttribute('font-weight', '500');
    processingText.textContent = 'Converting...';
    
    feedbackGroup.appendChild(bg);
    feedbackGroup.appendChild(spinner);
    feedbackGroup.appendChild(processingText);
    
    svg.appendChild(feedbackGroup);
    
    // Auto-remove after timeout (fallback)
    setTimeout(() => {
      if (feedbackGroup.parentNode) {
        feedbackGroup.parentNode.removeChild(feedbackGroup);
      }
    }, 10000);
  }

  // NEW: Clear AI processing feedback
  clearAIProcessingFeedback() {
    const svg = this.engine.svgRef.current;
    if (!svg) return;

    const feedback = svg.querySelector('#ai-processing-feedback');
    if (feedback) {
      feedback.remove();
    }
  }

  // ENHANCED: Render shapes with selection state and AI text support
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

    // console.log('CanvasRenderer: Rendering', shapes.length, 'shapes to SVG');

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
        // console.log(`CanvasRenderer: Creating new shape ${shape.id}:`, shape.shapeType);
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

      // console.log('CanvasRenderer: Creating shape with options:', shapeOptions);

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
        
        // console.log('CanvasRenderer: Successfully created and stored shape element');
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
      
      // console.log('CanvasRenderer: Cleared all rendered shapes');
    }
  }

  updateEraserPreview(pathsToErase) {
    for (const [shapeId, element] of this.shapeElements.entries()) {
      const opacity = pathsToErase.has(shapeId) ? 0.3 : 1;
      element.setAttribute('opacity', opacity);
    }
  }

  // ENHANCED: Main render method with AI text support
  renderPaths() {
    const paths = this.engine.getPaths();
    const pathsToErase = this.engine.getPathsToErase();
    const selectedItems = this.engine.selectedItems;

    // console.log('CanvasRenderer: Rendering React stroke paths, count:', paths.filter(p => p.type !== 'shape' && p.type !== 'aiText').length);

    // Render shapes to SVG with selection state
    this.renderShapesToSVG();

    // NEW: Render AI text elements
    this.renderAITextElements();

    // Return React elements for stroke paths only (not shapes or AI text)
    const strokePaths = paths
      .filter(pathObj => pathObj.type !== 'shape' && pathObj.type !== 'aiText')
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

  // NEW: Render AI text elements to SVG
  renderAITextElements() {
    const paths = this.engine.getPaths();
    const aiTextPaths = paths.filter(path => path.type === 'aiText');
    const selectedItems = this.engine.selectedItems;

    // console.log('CanvasRenderer: Rendering AI text elements, count:', aiTextPaths.length);

    // Track current AI text IDs
    const currentAITextIds = new Set(aiTextPaths.map(t => t.id));

    // Remove AI text elements that no longer exist
    for (const [textId, element] of this.textElements.entries()) {
      if (!currentAITextIds.has(textId)) {
        this.removeAITextElement(textId);
      }
    }

    // Render or update AI text elements
    aiTextPaths.forEach(textPath => {
      const isSelected = selectedItems.has(textPath.id);
      const existingElement = this.textElements.get(textPath.id);

      if (!existingElement) {
        // Create new AI text element
        this.renderAITextElement({
          id: textPath.id,
          text: textPath.text,
          x: textPath.x,
          y: textPath.y,
          fontFamily: textPath.fontFamily,
          fontSize: textPath.fontSize,
          fontWeight: textPath.fontWeight,
          color: textPath.color,
          textAlign: textPath.textAlign,
          bounds: textPath.bounds
        });
      } else {
        // Update selection state
        if (isSelected) {
          existingElement.classList.add('selected-ai-text');
          existingElement.style.filter = 'drop-shadow(0 0 3px rgba(139, 92, 246, 0.5))';
        } else {
          existingElement.classList.remove('selected-ai-text');
          existingElement.style.filter = 'none';
        }
      }
    });
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
      'e': 'e-resize', 'se': 'se-resize', 's': 's-resize',
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

  // NEW: AI Tool Cursor for visual feedback
  renderAIToolCursor(showCursor, position) {
    if (!showCursor || !position) return null;

    return (
      <div
        className="ai-tool-cursor"
        style={{
          width: '24px',
          height: '24px',
          left: position.x - 12,
          top: position.y - 12,
          position: 'absolute',
          border: '2px solid #8b5cf6',
          borderRadius: '50%',
          pointerEvents: 'none',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          zIndex: 100,
          transform: 'translateZ(0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: '#8b5cf6',
          fontWeight: 'bold'
        }}
      >
        AI
      </div>
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