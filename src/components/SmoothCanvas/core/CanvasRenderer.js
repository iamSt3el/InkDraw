// src/components/SmoothCanvas/core/CanvasRenderer.js - FIXED SELECTION OVERLAY
import React from 'react';
import rough from 'roughjs';

export class CanvasRenderer {
  constructor(canvasEngine, options = {}) {
    this.engine = canvasEngine;
    this.options = options;
    this.roughSvg = null;
    this.renderedShapeIds = new Set();
    this.shapeElements = new Map();
    this.textElements = new Map();
    this.imageElements = new Map(); // Store image SVG elements
  }

  initializeRoughSvg() {
    if (!this.roughSvg && this.engine.svgRef.current) {
      this.roughSvg = rough.svg(this.engine.svgRef.current);
    }
  }

  // AI Text Rendering Methods
  renderAITextElement(textData) {
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

  // Remove AI text element
  removeAITextElement(id) {
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

  // Update AI text element
  updateAITextElement(id, updates) {
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

  // Clear all AI text elements
  clearAITextElements() {
    for (const [id, element] of this.textElements.entries()) {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }
    
    this.textElements.clear();
  }

  // ===========================================
  // IMAGE RENDERING METHODS
  // ===========================================

  // Render image element
  renderImageElement(imageData) {
    const { id, url, x, y, width, height, name, transform } = imageData;
    
    // Remove existing image element if it exists
    const existingElement = this.imageElements.get(id);
    if (existingElement && existingElement.parentNode) {
      existingElement.parentNode.removeChild(existingElement);
    }
    
    // Get the loaded image from canvas engine
    const loadedImage = this.engine.getLoadedImage(id);
    if (!loadedImage) {
      console.warn('CanvasRenderer: No loaded image found for:', id);
      return null;
    }
    
    // Create image element
    const imageElement = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    imageElement.id = `canvas-image-${id}`;
    imageElement.setAttribute('class', 'canvas-image');
    
    // Set image properties
    imageElement.setAttribute('x', x);
    imageElement.setAttribute('y', y);
    imageElement.setAttribute('width', width);
    imageElement.setAttribute('height', height);
    imageElement.setAttribute('href', url);
    imageElement.setAttribute('data-image-id', id);
    imageElement.setAttribute('data-image-name', name);
    
    // Apply transform if exists
    if (transform && (transform.translateX || transform.translateY || transform.scaleX !== 1 || transform.scaleY !== 1 || transform.rotation)) {
      const transformString = this.buildTransformString(transform, x + width/2, y + height/2);
      imageElement.setAttribute('transform', transformString);
    }
    
    // Add smooth transition
    imageElement.style.transition = 'all 0.3s ease';
    imageElement.style.opacity = '0';
    
    // Add to SVG
    this.engine.svgRef.current.appendChild(imageElement);
    
    // Store reference
    this.imageElements.set(id, imageElement);
    
    // Animate in
    requestAnimationFrame(() => {
      imageElement.style.opacity = '1';
      imageElement.style.transform = 'scale(1)';
    });
    
    console.log('CanvasRenderer: Rendered image element:', { id, name, dimensions: `${width}x${height}` });
    return imageElement;
  }

  // Build transform string for SVG
  buildTransformString(transform, centerX, centerY) {
    const parts = [];
    
    if (transform.translateX || transform.translateY) {
      parts.push(`translate(${transform.translateX || 0}, ${transform.translateY || 0})`);
    }
    
    if (transform.rotation) {
      parts.push(`rotate(${transform.rotation}, ${centerX}, ${centerY})`);
    }
    
    if (transform.scaleX !== 1 || transform.scaleY !== 1) {
      parts.push(`scale(${transform.scaleX || 1}, ${transform.scaleY || 1})`);
    }
    
    return parts.join(' ');
  }

  // Remove image element
  removeImageElement(id) {
    const element = this.imageElements.get(id);
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
      
      this.imageElements.delete(id);
    }
  }

  // Update image element
  updateImageElement(id, updates) {
    const element = this.imageElements.get(id);
    if (!element) return;
    
    // Update properties
    if (updates.x !== undefined) {
      element.setAttribute('x', updates.x);
    }
    if (updates.y !== undefined) {
      element.setAttribute('y', updates.y);
    }
    if (updates.width !== undefined) {
      element.setAttribute('width', updates.width);
    }
    if (updates.height !== undefined) {
      element.setAttribute('height', updates.height);
    }
    if (updates.transform !== undefined) {
      const centerX = parseFloat(element.getAttribute('x')) + parseFloat(element.getAttribute('width')) / 2;
      const centerY = parseFloat(element.getAttribute('y')) + parseFloat(element.getAttribute('height')) / 2;
      const transformString = this.buildTransformString(updates.transform, centerX, centerY);
      element.setAttribute('transform', transformString);
    }
  }

  // Clear all image elements
  clearImageElements() {
    for (const [id, element] of this.imageElements.entries()) {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }
    
    this.imageElements.clear();
  }

  // Get all image elements for selection
  getImageElements() {
    return Array.from(this.imageElements.entries()).map(([id, element]) => ({
      id,
      element,
      bounds: this.getImageElementBounds(element)
    }));
  }

  // Get bounds of image element
  getImageElementBounds(element) {
    try {
      const x = parseFloat(element.getAttribute('x'));
      const y = parseFloat(element.getAttribute('y'));
      const width = parseFloat(element.getAttribute('width'));
      const height = parseFloat(element.getAttribute('height'));
      
      return {
        x,
        y,
        width,
        height,
        centerX: x + width / 2,
        centerY: y + height / 2
      };
    } catch (error) {
      console.warn('CanvasRenderer: Could not get image bounds:', error);
      return null;
    }
  }

  // Get all AI text elements for selection
  getAITextElements() {
    return Array.from(this.textElements.entries()).map(([id, element]) => ({
      id,
      element,
      bounds: this.getTextElementBounds(element)
    }));
  }

  // Get bounds of text element
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

  // AI Processing Visual Feedback
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

  // Clear AI processing feedback
  clearAIProcessingFeedback() {
    const svg = this.engine.svgRef.current;
    if (!svg) return;

    const feedback = svg.querySelector('#ai-processing-feedback');
    if (feedback) {
      feedback.remove();
    }
  }

  // Render shapes with selection state and AI text support
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
    }
  }

  updateEraserPreview(pathsToErase) {
    for (const [shapeId, element] of this.shapeElements.entries()) {
      const opacity = pathsToErase.has(shapeId) ? 0.3 : 1;
      element.setAttribute('opacity', opacity);
    }
  }

  // Main render method with AI text support
  renderPaths() {
    const paths = this.engine.getPaths();
    const pathsToErase = this.engine.getPathsToErase();
    const selectedItems = this.engine.selectedItems;

    // Render shapes to SVG with selection state
    this.renderShapesToSVG();

    // Render AI text elements
    this.renderAITextElements();

    // Render image elements
    this.renderImageElements();

    // Return React elements for stroke paths only (not shapes, AI text, or images)
    const strokePaths = paths
      .filter(pathObj => pathObj.type !== 'shape' && pathObj.type !== 'aiText' && pathObj.type !== 'image')
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

  // Render AI text elements to SVG
  renderAITextElements() {
    const paths = this.engine.getPaths();
    const aiTextPaths = paths.filter(path => path.type === 'aiText');
    const selectedItems = this.engine.selectedItems;

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

  // Render image elements to SVG
  renderImageElements() {
    const paths = this.engine.getPaths();
    const imagePaths = paths.filter(path => path.type === 'image');
    const selectedItems = this.engine.selectedItems;

    // Track current image IDs
    const currentImageIds = new Set(imagePaths.map(i => i.id));

    // Remove image elements that no longer exist
    for (const [imageId, element] of this.imageElements.entries()) {
      if (!currentImageIds.has(imageId)) {
        this.removeImageElement(imageId);
      }
    }

    // Render or update image elements
    imagePaths.forEach(imagePath => {
      const isSelected = selectedItems.has(imagePath.id);
      const existingElement = this.imageElements.get(imagePath.id);

      if (!existingElement) {
        // Create new image element
        this.renderImageElement({
          id: imagePath.id,
          url: imagePath.url,
          x: imagePath.x,
          y: imagePath.y,
          width: imagePath.width,
          height: imagePath.height,
          name: imagePath.name,
          transform: imagePath.transform
        });
      } else {
        // Update position and size if changed
        const currentX = parseFloat(existingElement.getAttribute('x'));
        const currentY = parseFloat(existingElement.getAttribute('y'));
        const currentWidth = parseFloat(existingElement.getAttribute('width'));
        const currentHeight = parseFloat(existingElement.getAttribute('height'));

        if (currentX !== imagePath.x || currentY !== imagePath.y || 
            currentWidth !== imagePath.width || currentHeight !== imagePath.height) {
          this.updateImageElement(imagePath.id, {
            x: imagePath.x,
            y: imagePath.y,
            width: imagePath.width,
            height: imagePath.height,
            transform: imagePath.transform
          });
        }

        // Update selection state
        if (isSelected) {
          existingElement.classList.add('selected-image');
          existingElement.style.filter = 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.5))';
        } else {
          existingElement.classList.remove('selected-image');
          existingElement.style.filter = 'none';
        }
      }
    });
  }

  // FIXED: Render selection overlay with proper visibility
  renderSelectionOverlay() {
    const elements = [];

    console.log('Rendering selection overlay:', {
      isSelecting: this.engine.isSelecting,
      selectionRect: this.engine.selectionRect,
      selectionBounds: this.engine.selectionBounds,
      selectedItems: this.engine.selectedItems.size
    });

    // FIXED: Render area selection rectangle with better visibility
    if (this.engine.isSelecting && this.engine.selectionRect) {
      const rect = this.engine.selectionRect;
      console.log('Rendering selection rectangle:', rect);
      
      elements.push(
        <rect
          key="selection-area"
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill="rgba(59, 130, 246, 0.15)"
          stroke="rgba(59, 130, 246, 0.8)"
          strokeWidth="2"
          strokeDasharray="4,4"
          style={{ 
            pointerEvents: 'none',
            animation: 'selectionPulse 1.5s ease-in-out infinite'
          }}
        />
      );
    }

    // Render selection bounds and handles
    if (this.engine.selectionBounds && this.engine.selectedItems.size > 0) {
      const bounds = this.engine.selectionBounds;
      console.log('Rendering selection bounds:', bounds);
      
      // Selection bounds rectangle
      elements.push(
        <rect
          key="selection-bounds"
          x={bounds.x - 3}
          y={bounds.y - 3}
          width={bounds.width + 6}
          height={bounds.height + 6}
          fill="none"
          stroke="rgba(59, 130, 246, 0.9)"
          strokeWidth="2"
          strokeDasharray="6,6"
          style={{ 
            pointerEvents: 'none',
            animation: 'selectionBoundsPulse 2s ease-in-out infinite'
          }}
        />
      );

      // Resize handles
      const handles = this.engine.getResizeHandles(bounds);
      Object.entries(handles).forEach(([name, handle]) => {
        elements.push(
          <g key={`handle-${name}`}>
            {/* Handle background */}
            <circle
              cx={handle.x}
              cy={handle.y}
              r="8"
              fill="white"
              stroke="rgba(59, 130, 246, 0.9)"
              strokeWidth="2"
              style={{ 
                cursor: this.getHandleCursor(name),
                pointerEvents: 'auto',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
              }}
            />
            {/* Handle center dot */}
            <circle
              cx={handle.x}
              cy={handle.y}
              r="3"
              fill="rgba(59, 130, 246, 0.9)"
              style={{ 
                cursor: this.getHandleCursor(name),
                pointerEvents: 'auto'
              }}
            />
          </g>
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

  // AI Tool Cursor for visual feedback
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