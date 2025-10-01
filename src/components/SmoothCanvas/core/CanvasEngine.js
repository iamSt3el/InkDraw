// src/components/SmoothCanvas/core/CanvasEngine.js - FIXED SELECTION ISSUES
import rough from 'roughjs';

export class CanvasEngine {
  constructor(canvasRef, svgRef, options = {}) {
    this.canvasRef = canvasRef;
    this.svgRef = svgRef;
    this.options = {
      width: 1600,
      height: 870,
      strokeColor: '#000000',
      strokeWidth: 5,
      opacity: 100,
      eraserWidth: 10,
      viewBox: { x: 0, y: 0, width: 900, height: 700 },
      shapeColor: '#000000',
      shapeBorderSize: 2,
      shapeFill: false,
      shapeFillColor: '#000000',
      shapeRoundCorners: false,
      ...options
    };

    // Existing properties
    this.isDrawing = false;
    this.currentPath = [];
    this.paths = [];
    this.isErasing = false;
    this.lastPoint = null;
    this.inputType = 'mouse';
    this.eraserPosition = { x: 0, y: 0 };
    this.showEraser = false;
    this.activePointer = null;
    this.startTime = null;
    this.frameRequest = null;
    this.nextPathId = 0;
    this.pathsToErase = new Set();
    this.pathBBoxes = new Map();

    // Selection properties
    this.selectedItems = new Set();
    this.isSelecting = false;
    this.selectionStart = null;
    this.selectionRect = null;
    this.selectionBounds = null;
    this.isDraggingSelection = false;
    this.dragStart = null;
    this.resizeHandle = null; // Which resize handle is being dragged

    // Rectangle drawing state
    this.isDrawingRectangle = false;
    this.rectangleStart = null;
    this.currentRectangle = null;

    // AI-specific properties
    this.aiTextElements = new Map(); // Store AI text elements separately for quick access
    this.isAIMode = false;
    this.currentAIStroke = null;

    // Image properties
    this.imageElements = new Map(); // Store image elements separately for quick access
    this.loadedImages = new Map(); // Cache for loaded image objects

    // Rough.js instances
    this.roughCanvas = null;
    this.roughSvg = null;

    this.dpr = window.devicePixelRatio || 1;
    this.initializeCanvas();
    this.initializeRough();
  }

  // FIXED: Initialize canvas with proper scaling
  initializeCanvas() {
    if (!this.canvasRef.current) return;

    const canvas = this.canvasRef.current;
    canvas.width = this.options.width * this.dpr;
    canvas.height = this.options.height * this.dpr;
    canvas.style.width = `${this.options.width}px`;
    canvas.style.height = `${this.options.height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  initializeRough() {
    if (this.canvasRef.current) {
      this.roughCanvas = rough.canvas(this.canvasRef.current);
    }
    if (this.svgRef.current) {
      this.roughSvg = rough.svg(this.svgRef.current);
    }
  }

  // ===========================================
  // FIXED SELECTION METHODS
  // ===========================================

  // FIXED: Improved hit testing with better tolerance calculation
  hitTest(point, item) {
    // FIXED: Use zoom-aware tolerance calculation
    const baseSize = Math.max(this.options.width, this.options.height);
    const baseTolerance = baseSize * 0.008; // 0.8% of canvas size

    const viewBox = this.options.viewBox;
    const zoomLevel = viewBox ? this.options.width / viewBox.width : 1;
    const tolerance = baseTolerance / zoomLevel;

    console.log('Hit testing item:', {
      itemId: item.id,
      itemType: item.type,
      point: point,
      tolerance: tolerance,
      zoomLevel: zoomLevel
    });

    if (item.type === 'stroke') {
      return this.hitTestStroke(point, item, tolerance);
    } else if (item.type === 'shape') {
      return this.hitTestShape(point, item, tolerance);
    } else if (item.type === 'aiText') {
      const bounds = this.pathBBoxes.get(item.id);
      return bounds ? this.hitTestAIText(point, item, bounds) : false;
    } else if (item.type === 'image') {
      return this.hitTestImage(point, item);
    }
    return false;
  }

  // FIXED: More accurate stroke hit testing
  hitTestStroke(point, stroke, tolerance) {
    // Get or calculate bounding box
    let bbox = this.pathBBoxes.get(stroke.id);
    if (!bbox) {
      bbox = this.calculateBoundingBox(stroke.pathData);
      if (bbox) {
        // Apply transform if it exists
        if (stroke.transform) {
          bbox.x += stroke.transform.translateX || 0;
          bbox.y += stroke.transform.translateY || 0;
        }
        this.pathBBoxes.set(stroke.id, bbox);
      }
    }

    if (!bbox) {
      console.log('No bounding box for stroke:', stroke.id);
      return false;
    }

    // FIXED: Use stroke width for better tolerance
    const strokeWidth = stroke.strokeWidth || 5;
    const adjustedTolerance = Math.max(tolerance, strokeWidth);

    console.log('Stroke hit test:', {
      id: stroke.id,
      point: point,
      bbox: bbox,
      strokeWidth: strokeWidth,
      tolerance: adjustedTolerance
    });

    // Expanded bounding box test
    const hit = point.x >= bbox.x - adjustedTolerance &&
      point.x <= bbox.x + bbox.width + adjustedTolerance &&
      point.y >= bbox.y - adjustedTolerance &&
      point.y <= bbox.y + bbox.height + adjustedTolerance;

    console.log('Stroke hit result:', hit);
    return hit;
  }

  // FIXED: Better shape hit testing
  hitTestShape(point, shape, tolerance) {
    console.log('Shape hit test:', {
      id: shape.id,
      point: point,
      shape: { x: shape.x, y: shape.y, width: shape.width, height: shape.height },
      tolerance: tolerance
    });

    if (shape.shapeType === 'rectangle') {
      const hit = point.x >= shape.x - tolerance &&
        point.x <= shape.x + shape.width + tolerance &&
        point.y >= shape.y - tolerance &&
        point.y <= shape.y + shape.height + tolerance;

      console.log('Rectangle hit result:', hit);
      return hit;
    }
    return false;
  }

  // FIXED: Improved AI text hit testing
  hitTestAIText(point, textElement, bounds) {
    const baseSize = Math.max(this.options.width, this.options.height);
    const baseTolerance = baseSize * 0.01; // 1% of canvas size for text

    const viewBox = this.options.viewBox;
    const zoomLevel = viewBox ? this.options.width / viewBox.width : 1;
    const tolerance = baseTolerance / zoomLevel;

    console.log('AI text hit test:', {
      id: textElement.id,
      point: point,
      bounds: bounds,
      tolerance: tolerance
    });

    const hit = this.pointInBounds(point, bounds, tolerance);
    console.log('AI text hit result:', hit);
    return hit;
  }

  // FIXED: Find item at point with better debugging
  findItemAtPoint(point) {
    console.log('=== FINDING ITEM AT POINT ===');
    console.log('Point:', point);
    console.log('Total paths:', this.paths.length);
    console.log('ViewBox:', this.options.viewBox);

    // Search from top to bottom (reverse order since later items are on top)
    for (let i = this.paths.length - 1; i >= 0; i--) {
      const item = this.paths[i];
      console.log(`Testing item ${i}:`, {
        id: item.id,
        type: item.type,
        hasTransform: !!item.transform
      });

      if (this.hitTest(point, item)) {
        console.log('*** FOUND ITEM ***:', item.id);
        return item;
      }
    }

    console.log('No item found at point');
    return null;
  }

  // FIXED: Better bounding box calculation for strokes
  calculateBoundingBox(pathData) {
    if (typeof pathData === 'string') {
      // Extract coordinates from SVG path data
      const coords = pathData.match(/(-?\d+(?:\.\d+)?)/g);
      if (!coords || coords.length < 4) return null;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      for (let i = 0; i < coords.length - 1; i += 2) {
        const x = parseFloat(coords[i]);
        const y = parseFloat(coords[i + 1]);

        if (!isNaN(x) && !isNaN(y)) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }

      if (minX === Infinity || minY === Infinity) return null;

      return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX), // Ensure minimum width
        height: Math.max(1, maxY - minY)  // Ensure minimum height
      };
    }
    else if (typeof pathData === 'object') {
      const shape = pathData;

      if (shape.type === 'line') {
        const x = Math.min(shape.x1, shape.x2);
        const y = Math.min(shape.y1, shape.y2);
        const width = Math.max(1, Math.abs(shape.x2 - shape.x1));
        const height = Math.max(1, Math.abs(shape.y2 - shape.y1));
        return { x, y, width, height };
      }
      else {
        return {
          x: shape.x,
          y: shape.y,
          width: Math.max(1, shape.width),
          height: Math.max(1, shape.height)
        };
      }
    }

    return null;
  }

  // FIXED: Better selection bounds calculation
  getSelectionBounds(selectedItemIds) {
    // Handle both Set and Array inputs
    let itemIds;
    if (selectedItemIds instanceof Set) {
      itemIds = Array.from(selectedItemIds);
    } else if (Array.isArray(selectedItemIds)) {
      itemIds = selectedItemIds;
    } else {
      console.error('getSelectionBounds: Invalid input type:', typeof selectedItemIds);
      return null;
    }

    if (itemIds.length === 0) {
      console.log('getSelectionBounds: No items selected');
      return null;
    }

    console.log('getSelectionBounds: Processing items:', itemIds);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let validItems = 0;

    for (const itemId of itemIds) {
      const item = this.paths.find(p => p.id === itemId);
      if (!item) {
        console.log('getSelectionBounds: Item not found:', itemId);
        continue;
      }

      let itemBounds;
      if (item.type === 'stroke') {
        itemBounds = this.pathBBoxes.get(item.id);
        if (!itemBounds) {
          console.log('getSelectionBounds: Calculating bounds for stroke:', item.id);
          itemBounds = this.calculateBoundingBox(item.pathData);
          if (itemBounds) {
            // Apply transform if it exists
            if (item.transform) {
              itemBounds.x += item.transform.translateX || 0;
              itemBounds.y += item.transform.translateY || 0;
            }
            this.pathBBoxes.set(item.id, itemBounds);
          }
        }
      } else if (item.type === 'shape') {
        itemBounds = { x: item.x, y: item.y, width: item.width, height: item.height };
      } else if (item.type === 'aiText') {
        itemBounds = this.pathBBoxes.get(item.id);
        if (!itemBounds) {
          itemBounds = this.calculateTextBounds(item);
          if (itemBounds) {
            this.pathBBoxes.set(item.id, itemBounds);
          }
        }
      } else if (item.type === 'image') {
        itemBounds = this.pathBBoxes.get(item.id);
        if (!itemBounds) {
          itemBounds = this.calculateImageBounds(item);
          if (itemBounds) {
            this.pathBBoxes.set(item.id, itemBounds);
          }
        }
      }

      if (itemBounds && itemBounds.width > 0 && itemBounds.height > 0) {
        console.log('getSelectionBounds: Valid bounds for', item.id, ':', itemBounds);
        minX = Math.min(minX, itemBounds.x);
        minY = Math.min(minY, itemBounds.y);
        maxX = Math.max(maxX, itemBounds.x + itemBounds.width);
        maxY = Math.max(maxY, itemBounds.y + itemBounds.height);
        validItems++;
      } else {
        console.log('getSelectionBounds: Invalid bounds for', item.id, ':', itemBounds);
      }
    }

    if (validItems === 0 || minX === Infinity) {
      console.log('getSelectionBounds: No valid bounds found');
      return null;
    }

    const bounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };

    console.log('getSelectionBounds: Final bounds:', bounds);
    return bounds;
  }

  // FIXED: Find items in rectangle with better intersection testing
  findItemsInRect(rect) {
    console.log('Finding items in rect:', rect);
    const itemsInRect = [];

    for (const item of this.paths) {
      if (this.itemIntersectsRect(item, rect)) {
        itemsInRect.push(item.id);
        console.log('Item in rect:', item.id);
      }
    }

    console.log('Found items in rect:', itemsInRect);
    return itemsInRect;
  }

  // FIXED: Better rectangle intersection testing
  itemIntersectsRect(item, rect) {
    let itemBounds;

    if (item.type === 'stroke') {
      itemBounds = this.pathBBoxes.get(item.id);
      if (!itemBounds) {
        itemBounds = this.calculateBoundingBox(item.pathData);
        if (itemBounds && item.transform) {
          itemBounds.x += item.transform.translateX || 0;
          itemBounds.y += item.transform.translateY || 0;
        }
        if (itemBounds) {
          this.pathBBoxes.set(item.id, itemBounds);
        }
      }
    } else if (item.type === 'shape') {
      itemBounds = { x: item.x, y: item.y, width: item.width, height: item.height };
    } else if (item.type === 'aiText') {
      itemBounds = this.pathBBoxes.get(item.id);
      if (!itemBounds) {
        itemBounds = this.calculateTextBounds(item);
        if (itemBounds) {
          this.pathBBoxes.set(item.id, itemBounds);
        }
      }
    } else if (item.type === 'image') {
      itemBounds = this.pathBBoxes.get(item.id);
      if (!itemBounds) {
        itemBounds = this.calculateImageBounds(item);
        if (itemBounds) {
          this.pathBBoxes.set(item.id, itemBounds);
        }
      }
    }

    if (!itemBounds) return false;

    // FIXED: More precise intersection test
    const intersects = !(rect.x > itemBounds.x + itemBounds.width ||
      rect.x + rect.width < itemBounds.x ||
      rect.y > itemBounds.y + itemBounds.height ||
      rect.y + rect.height < itemBounds.y);

    console.log('Item intersects rect:', {
      itemId: item.id,
      intersects: intersects,
      itemBounds: itemBounds,
      rect: rect
    });
    return intersects;
  }

  // ===========================================
  // IMAGE ELEMENT METHODS
  // ===========================================

  // Add image element to the canvas
  async addImageElement(imageData) {
    const {
      url, x, y, width, height, originalWidth, originalHeight, name
    } = imageData;

    const id = this.generatePathId();

    try {
      // Load and cache the image
      const img = await this.loadImage(url);
      this.loadedImages.set(id, img);

      const imageElement = {
        id,
        type: 'image',
        url,
        x: x || 0,
        y: y || 0,
        width: width || img.naturalWidth,
        height: height || img.naturalHeight,
        originalWidth: originalWidth || img.naturalWidth,
        originalHeight: originalHeight || img.naturalHeight,
        name: name || 'image',
        timestamp: Date.now(),
        // Image-specific transform properties
        transform: {
          translateX: 0,
          translateY: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0
        }
      };

      // Calculate bounding box for the image element
      const imageBounds = this.calculateImageBounds(imageElement);
      if (imageBounds) {
        this.pathBBoxes.set(imageElement.id, imageBounds);
      }

      this.paths.push(imageElement);
      this.imageElements.set(id, imageElement);

      console.log('CanvasEngine: Added image element:', {
        id: imageElement.id,
        name: imageElement.name,
        dimensions: `${imageElement.width}x${imageElement.height}`
      });

      return imageElement;
    } catch (error) {
      console.error('CanvasEngine: Failed to add image element:', error);
      throw error;
    }
  }

  // Load image from URL
  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

  // Calculate bounding box for image elements
  calculateImageBounds(imageElement) {
    const { x, y, width, height, transform } = imageElement;
    
    let bounds = {
      x: x,
      y: y,
      width: width,
      height: height
    };

    // Apply transform if it exists
    if (transform) {
      bounds.x += transform.translateX || 0;
      bounds.y += transform.translateY || 0;
      bounds.width *= transform.scaleX || 1;
      bounds.height *= transform.scaleY || 1;
    }

    return bounds;
  }

  // Hit test for images
  hitTestImage(point, image) {
    const bounds = this.calculateImageBounds(image);
    
    // Add small tolerance for easier clicking
    const tolerance = 2;
    
    console.log('Image hit test:', {
      id: image.id,
      point: point,
      bounds: bounds,
      tolerance: tolerance
    });

    const hit = point.x >= bounds.x - tolerance &&
      point.x <= bounds.x + bounds.width + tolerance &&
      point.y >= bounds.y - tolerance &&
      point.y <= bounds.y + bounds.height + tolerance;

    console.log('Image hit result:', hit);
    return hit;
  }

  // Move image element
  moveImageElement(id, deltaX, deltaY) {
    const element = this.paths.find(p => p.id === id && p.type === 'image');

    if (!element) {
      console.warn('CanvasEngine: Image element not found for move:', id);
      return false;
    }

    // Update position
    element.x += deltaX;
    element.y += deltaY;
    element.lastModified = Date.now();

    // Update transform if it exists
    if (!element.transform) {
      element.transform = { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
    }
    element.transform.translateX += deltaX;
    element.transform.translateY += deltaY;

    // Update bounding box
    const newBounds = this.calculateImageBounds(element);
    if (newBounds) {
      this.pathBBoxes.set(id, newBounds);
    }

    // Update quick access map
    this.imageElements.set(id, element);

    console.log('CanvasEngine: Moved image element:', id, { deltaX, deltaY });
    return true;
  }

  // Resize image element
  resizeImageElement(id, newWidth, newHeight, maintainAspectRatio = true) {
    const element = this.paths.find(p => p.id === id && p.type === 'image');

    if (!element) {
      console.warn('CanvasEngine: Image element not found for resize:', id);
      return false;
    }

    if (maintainAspectRatio) {
      const aspectRatio = element.originalWidth / element.originalHeight;
      const newAspectRatio = newWidth / newHeight;
      
      if (newAspectRatio > aspectRatio) {
        newWidth = newHeight * aspectRatio;
      } else {
        newHeight = newWidth / aspectRatio;
      }
    }

    // Update dimensions
    element.width = Math.max(10, newWidth); // Minimum size
    element.height = Math.max(10, newHeight);
    element.lastModified = Date.now();

    // Update transform scale
    if (!element.transform) {
      element.transform = { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
    }
    element.transform.scaleX = element.width / element.originalWidth;
    element.transform.scaleY = element.height / element.originalHeight;

    // Update bounding box
    const newBounds = this.calculateImageBounds(element);
    if (newBounds) {
      this.pathBBoxes.set(id, newBounds);
    }

    // Update quick access map
    this.imageElements.set(id, element);

    console.log('CanvasEngine: Resized image element:', id, { width: element.width, height: element.height });
    return true;
  }

  // Remove image element
  removeImageElement(id) {
    const elementIndex = this.paths.findIndex(p => p.id === id && p.type === 'image');
    
    if (elementIndex === -1) {
      console.warn('CanvasEngine: Image element not found for removal:', id);
      return false;
    }

    // Remove from paths array
    this.paths.splice(elementIndex, 1);
    
    // Clean up maps
    this.pathBBoxes.delete(id);
    this.imageElements.delete(id);
    this.loadedImages.delete(id);

    console.log('CanvasEngine: Removed image element:', id);
    return true;
  }

  // Get loaded image object
  getLoadedImage(id) {
    return this.loadedImages.get(id);
  }

  // ===========================================
  // AI TEXT ELEMENT METHODS
  // ===========================================

  // Add AI text element to the canvas
  addAITextElement(textData) {
    const {
      text, x, y, fontFamily, fontSize, fontWeight, color, textAlign,
      bounds, confidence, metadata
    } = textData;

    const id = this.generatePathId();

    const aiTextElement = {
      id,
      type: 'aiText',
      text: text.trim(),
      x: x || 0,
      y: y || 0,
      fontFamily: fontFamily || 'Arial, sans-serif',
      fontSize: fontSize || 16,
      fontWeight: fontWeight || 'normal',
      color: this.normalizeColor(color || '#000000'),
      textAlign: textAlign || 'left',
      bounds: bounds || null,
      confidence: confidence || 0.8,
      timestamp: Date.now(),
      metadata: metadata || {},
      // Text-specific transform properties
      transform: {
        translateX: 0,
        translateY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      }
    };

    // Calculate bounding box for the text element
    const textBounds = this.calculateTextBounds(aiTextElement);
    if (textBounds) {
      this.pathBBoxes.set(aiTextElement.id, textBounds);
    }

    this.paths.push(aiTextElement);
    this.aiTextElements.set(id, aiTextElement);

    console.log('CanvasEngine: Added AI text element:', {
      id: aiTextElement.id,
      text: aiTextElement.text,
      confidence: aiTextElement.confidence
    });

    return aiTextElement;
  }

  // Calculate bounding box for text elements
  calculateTextBounds(textElement) {
    // Approximate text bounds calculation
    const { text, fontSize, x, y } = textElement;

    // Rough estimation: each character is about 0.6 * fontSize wide
    const charWidth = fontSize * 0.6;
    const width = text.length * charWidth;
    const height = fontSize * 1.2; // Include line height

    // Adjust based on text alignment
    let adjustedX = x;
    switch (textElement.textAlign) {
      case 'center':
        adjustedX = x - width / 2;
        break;
      case 'right':
        adjustedX = x - width;
        break;
      case 'left':
      default:
        adjustedX = x;
        break;
    }

    return {
      x: adjustedX,
      y: y - height * 0.8, // Adjust for baseline
      width: width,
      height: height
    };
  }

  // Check if point is within bounds (with tolerance)
  pointInBounds(point, bounds, tolerance = 0) {
    return point.x >= bounds.x - tolerance &&
      point.x <= bounds.x + bounds.width + tolerance &&
      point.y >= bounds.y - tolerance &&
      point.y <= bounds.y + bounds.height + tolerance;
  }

  // Move AI text element
  moveAITextElement(id, deltaX, deltaY) {
    const element = this.paths.find(p => p.id === id && p.type === 'aiText');

    if (!element) {
      console.warn('CanvasEngine: AI text element not found for move:', id);
      return false;
    }

    // Update position
    element.x += deltaX;
    element.y += deltaY;
    element.lastModified = Date.now();

    // Update transform if it exists
    if (!element.transform) {
      element.transform = { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
    }
    element.transform.translateX += deltaX;
    element.transform.translateY += deltaY;

    // Update bounding box
    const newBounds = this.calculateTextBounds(element);
    if (newBounds) {
      this.pathBBoxes.set(id, newBounds);
    }

    // Update quick access map
    this.aiTextElements.set(id, element);

    console.log('CanvasEngine: Moved AI text element:', id, { deltaX, deltaY });
    return true;
  }

  // ===========================================
  // SELECTION STATE METHODS
  // ===========================================

  setSelectedItems(itemIds) {
    this.selectedItems = new Set(itemIds);
    this.selectionBounds = this.getSelectionBounds(this.selectedItems);
    console.log('Set selected items:', itemIds, 'bounds:', this.selectionBounds);
  }

  addToSelection(itemId) {
    this.selectedItems.add(itemId);
    this.selectionBounds = this.getSelectionBounds(this.selectedItems);
    console.log('Added to selection:', itemId, 'total selected:', this.selectedItems.size);
  }

  removeFromSelection(itemId) {
    this.selectedItems.delete(itemId);
    this.selectionBounds = this.selectedItems.size > 0 ?
      this.getSelectionBounds(this.selectedItems) : null;
    console.log('Removed from selection:', itemId, 'remaining:', this.selectedItems.size);
  }

  clearSelection() {
    console.log('Clearing selection, was:', this.selectedItems.size, 'items');
    this.selectedItems.clear();
    this.selectionBounds = null;
    this.isSelecting = false;
    this.selectionStart = null;
    this.selectionRect = null;
  }

  isItemSelected(itemId) {
    return this.selectedItems.has(itemId);
  }

  // AREA SELECTION METHODS

  startAreaSelection(point) {
    console.log('Starting area selection at:', point);
    this.isSelecting = true;
    this.selectionStart = point;
    this.selectionRect = { x: point.x, y: point.y, width: 0, height: 0 };
  }

  updateAreaSelection(currentPoint) {
    if (!this.isSelecting || !this.selectionStart) return;

    const start = this.selectionStart;
    this.selectionRect = {
      x: Math.min(start.x, currentPoint.x),
      y: Math.min(start.y, currentPoint.y),
      width: Math.abs(currentPoint.x - start.x),
      height: Math.abs(currentPoint.y - start.y)
    };

    console.log('Updated selection rect:', this.selectionRect);
  }

  finishAreaSelection(addToExisting = false) {
    if (!this.isSelecting || !this.selectionRect) return [];

    console.log('Finishing area selection:', this.selectionRect);
    const itemsInRect = this.findItemsInRect(this.selectionRect);

    if (!addToExisting) {
      this.setSelectedItems(itemsInRect);
    } else {
      for (const itemId of itemsInRect) {
        this.addToSelection(itemId);
      }
    }

    this.isSelecting = false;
    this.selectionStart = null;
    this.selectionRect = null;

    console.log('Area selection finished, selected items:', Array.from(this.selectedItems));
    return Array.from(this.selectedItems);
  }

  // ===========================================
  // TRANSFORMATION METHODS
  // ===========================================

  moveSelectedItems(deltaX, deltaY) {
    console.log('Moving selected items:', { deltaX, deltaY, count: this.selectedItems.size });

    for (const itemId of this.selectedItems) {
      const item = this.paths.find(p => p.id === itemId);
      if (!item) continue;

      if (item.type === 'stroke') {
        this.moveStroke(item, deltaX, deltaY);
      } else if (item.type === 'shape') {
        this.moveShape(item, deltaX, deltaY);
      } else if (item.type === 'aiText') {
        this.moveAITextElement(itemId, deltaX, deltaY);
      } else if (item.type === 'image') {
        this.moveImageElement(itemId, deltaX, deltaY);
      }
    }

    // Update bounding boxes and selection bounds
    this.updatePathBoundingBoxes();
    this.selectionBounds = this.getSelectionBounds(this.selectedItems);
  }

  resizeSelectedItems(newBounds) {
    console.log('Resizing selected items:', { newBounds, count: this.selectedItems.size });

    if (!this.selectionBounds || this.selectedItems.size === 0) return;

    const oldBounds = this.selectionBounds;
    const scaleX = newBounds.width / oldBounds.width;
    const scaleY = newBounds.height / oldBounds.height;
    const offsetX = newBounds.x - oldBounds.x;
    const offsetY = newBounds.y - oldBounds.y;

    console.log('Resize params:', { scaleX, scaleY, offsetX, offsetY });

    for (const itemId of this.selectedItems) {
      const item = this.paths.find(p => p.id === itemId);
      if (!item) continue;

      if (item.type === 'shape') {
        this.resizeShape(item, oldBounds, newBounds, scaleX, scaleY, offsetX, offsetY);
      } else if (item.type === 'image') {
        this.resizeImageItem(item, oldBounds, newBounds, scaleX, scaleY, offsetX, offsetY);
      } else if (item.type === 'aiText') {
        this.resizeAITextItem(item, oldBounds, newBounds, scaleX, scaleY, offsetX, offsetY);
      } else if (item.type === 'stroke') {
        this.resizeStroke(item, oldBounds, newBounds, scaleX, scaleY, offsetX, offsetY);
      }
    }

    // Update bounding boxes and selection bounds
    this.updatePathBoundingBoxes();
    this.selectionBounds = newBounds;
  }

  resizeShape(shape, oldBounds, newBounds, scaleX, scaleY, offsetX, offsetY) {
    // Calculate relative position within old bounds
    const relativeX = (shape.x - oldBounds.x) / oldBounds.width;
    const relativeY = (shape.y - oldBounds.y) / oldBounds.height;
    const relativeWidth = shape.width / oldBounds.width;
    const relativeHeight = shape.height / oldBounds.height;

    // Apply to new bounds
    shape.x = newBounds.x + (relativeX * newBounds.width);
    shape.y = newBounds.y + (relativeY * newBounds.height);
    shape.width = relativeWidth * newBounds.width;
    shape.height = relativeHeight * newBounds.height;

    // Update bounding box
    const bbox = { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
    this.pathBBoxes.set(shape.id, bbox);
  }

  resizeImageItem(image, oldBounds, newBounds, scaleX, scaleY, offsetX, offsetY) {
    // Calculate relative position within old bounds
    const relativeX = (image.x - oldBounds.x) / oldBounds.width;
    const relativeY = (image.y - oldBounds.y) / oldBounds.height;
    const relativeWidth = image.width / oldBounds.width;
    const relativeHeight = image.height / oldBounds.height;

    // Apply to new bounds
    image.x = newBounds.x + (relativeX * newBounds.width);
    image.y = newBounds.y + (relativeY * newBounds.height);
    image.width = relativeWidth * newBounds.width;
    image.height = relativeHeight * newBounds.height;

    // Update transform
    if (!image.transform) {
      image.transform = { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
    }
    image.transform.scaleX = image.width / image.originalWidth;
    image.transform.scaleY = image.height / image.originalHeight;

    // Update bounding box
    const bbox = this.calculateImageBounds(image);
    if (bbox) {
      this.pathBBoxes.set(image.id, bbox);
    }

    console.log('Resized image:', image.id, { 
      newDimensions: `${image.width}x${image.height}`,
      position: `${image.x},${image.y}`
    });
  }

  resizeAITextItem(textItem, oldBounds, newBounds, scaleX, scaleY, offsetX, offsetY) {
    // Calculate relative position within old bounds
    const relativeX = (textItem.x - oldBounds.x) / oldBounds.width;
    const relativeY = (textItem.y - oldBounds.y) / oldBounds.height;

    // Apply to new bounds (position only, don't scale text size)
    textItem.x = newBounds.x + (relativeX * newBounds.width);
    textItem.y = newBounds.y + (relativeY * newBounds.height);

    // Update bounding box
    const bbox = this.calculateTextBounds(textItem);
    if (bbox) {
      this.pathBBoxes.set(textItem.id, bbox);
    }
  }

  resizeStroke(stroke, oldBounds, newBounds, scaleX, scaleY, offsetX, offsetY) {
    // For strokes, we need to transform the path data itself
    // This is more complex and might not be ideal for all use cases
    // For now, just move the stroke proportionally
    
    if (!stroke.transform) {
      stroke.transform = { translateX: 0, translateY: 0 };
    }

    // Calculate current stroke bounds
    let strokeBounds = this.pathBBoxes.get(stroke.id);
    if (!strokeBounds) {
      strokeBounds = this.calculateBoundingBox(stroke.pathData);
      if (strokeBounds) {
        this.pathBBoxes.set(stroke.id, strokeBounds);
      }
    }

    if (strokeBounds) {
      // Calculate relative position within old bounds
      const relativeX = (strokeBounds.x - oldBounds.x) / oldBounds.width;
      const relativeY = (strokeBounds.y - oldBounds.y) / oldBounds.height;

      // Apply to new bounds
      const newStrokeX = newBounds.x + (relativeX * newBounds.width);
      const newStrokeY = newBounds.y + (relativeY * newBounds.height);

      // Update transform
      stroke.transform.translateX += (newStrokeX - strokeBounds.x);
      stroke.transform.translateY += (newStrokeY - strokeBounds.y);

      // Update bounding box
      strokeBounds.x = newStrokeX;
      strokeBounds.y = newStrokeY;
      this.pathBBoxes.set(stroke.id, strokeBounds);
    }
  }

  moveStroke(stroke, deltaX, deltaY) {
    // Store the transformation and apply it during rendering
    if (!stroke.transform) {
      stroke.transform = { translateX: 0, translateY: 0 };
    }
    stroke.transform.translateX += deltaX;
    stroke.transform.translateY += deltaY;

    // Update bounding box
    let bbox = this.pathBBoxes.get(stroke.id);
    if (bbox) {
      bbox.x += deltaX;
      bbox.y += deltaY;
      this.pathBBoxes.set(stroke.id, bbox);
    }
  }

  moveShape(shape, deltaX, deltaY) {
    shape.x += deltaX;
    shape.y += deltaY;

    // Update bounding box
    const bbox = { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
    this.pathBBoxes.set(shape.id, bbox);
  }

  updatePathBoundingBoxes() {
    for (const item of this.paths) {
      if (item.type === 'stroke') {
        const bbox = this.calculateBoundingBox(item.pathData);
        if (bbox && item.transform) {
          bbox.x += item.transform.translateX || 0;
          bbox.y += item.transform.translateY || 0;
        }
        if (bbox) {
          this.pathBBoxes.set(item.id, bbox);
        }
      } else if (item.type === 'shape') {
        const bbox = { x: item.x, y: item.y, width: item.width, height: item.height };
        this.pathBBoxes.set(item.id, bbox);
      } else if (item.type === 'aiText') {
        const bbox = this.calculateTextBounds(item);
        if (bbox) {
          this.pathBBoxes.set(item.id, bbox);
        }
      } else if (item.type === 'image') {
        const bbox = this.calculateImageBounds(item);
        if (bbox) {
          this.pathBBoxes.set(item.id, bbox);
        }
      }
    }
  }

  deleteSelectedItems() {
    const itemsToDelete = Array.from(this.selectedItems);
    console.log('Deleting selected items:', itemsToDelete);

    // Remove items from paths array
    this.paths = this.paths.filter(item => !itemsToDelete.includes(item.id));

    // Clean up maps
    for (const itemId of itemsToDelete) {
      this.pathBBoxes.delete(itemId);
      this.aiTextElements.delete(itemId);
      this.imageElements.delete(itemId);
      this.loadedImages.delete(itemId);
    }

    // Clear selection
    this.selectedItems.clear();
    this.selectionBounds = null;
  }

  // Get resize handle at point
  getResizeHandleAtPoint(point, bounds) {
    if (!bounds) return null;

    const handleSize = 12; // Increased handle size for easier clicking
    const handles = this.getResizeHandles(bounds);

    for (const [name, handle] of Object.entries(handles)) {
      if (point.x >= handle.x - handleSize / 2 && point.x <= handle.x + handleSize / 2 &&
        point.y >= handle.y - handleSize / 2 && point.y <= handle.y + handleSize / 2) {
        return name;
      }
    }

    return null;
  }

  getResizeHandles(bounds) {
    const { x, y, width, height } = bounds;
    return {
      'nw': { x: x, y: y },                    // top-left
      'n': { x: x + width / 2, y: y },          // top-center
      'ne': { x: x + width, y: y },            // top-right
      'e': { x: x + width, y: y + height / 2 }, // middle-right
      'se': { x: x + width, y: y + height },   // bottom-right
      's': { x: x + width / 2, y: y + height }, // bottom-center
      'sw': { x: x, y: y + height },           // bottom-left
      'w': { x: x, y: y + height / 2 }          // middle-left
    };
  }

  // ===========================================
  // EXISTING METHODS (PEN, ERASER, SHAPES, ETC.)
  // ===========================================

  getStrokeOptions(inputType, strokeWidth) {
    const zoomLevel = this.options.viewBox ?
      this.options.width / this.options.viewBox.width : 1;

    const adjustedWidth = strokeWidth / zoomLevel;

    const baseOptions = {
      size: adjustedWidth,
      smoothing: 0.5,
      streamline: 0.5,
      last: true,
      start: { taper: 0, cap: true },
      end: { taper: adjustedWidth * 0, cap: true }
    };

    if (inputType === 'pen') {
      return {
        ...baseOptions,
        thinning: 0.6,
        simulatePressure: false,
        smoothing: 0.4,
        streamline: 0.9,
      };
    } else {
      return {
        ...baseOptions,
        thinning: 0.3,
        simulatePressure: true,
        smoothing: 0.5,
        streamline: 0.5,
      };
    }
  }

  getSvgPathFromStroke(stroke) {
    if (!stroke.length) return '';

    const d = [];
    const [first, ...rest] = stroke;
    d.push('M', first[0].toFixed(2), first[1].toFixed(2));

    for (const [x, y] of rest) {
      d.push('L', x.toFixed(2), y.toFixed(2));
    }

    d.push('Z');
    return d.join(' ');
  }

  getPointFromEvent(e) {
    const rect = this.canvasRef.current.getBoundingClientRect();
    const type = e.pointerType || 'mouse';
    if (type !== this.inputType) {
      this.inputType = type;
    }

    const canvasX = (e.clientX - rect.left) / rect.width * this.options.width;
    const canvasY = (e.clientY - rect.top) / rect.height * this.options.height;

    const viewBox = this.options.viewBox || { x: 0, y: 0, width: this.options.width, height: this.options.height };
    const x = viewBox.x + (canvasX / this.options.width) * viewBox.width;
    const y = viewBox.y + (canvasY / this.options.height) * viewBox.height;

    let pressure = 0.5;

    if (type === 'pen') {
      pressure = e.pressure || 0.5;
      if (pressure === 0) {
        pressure = 0.5;
        this.inputType = 'mouse';
      }
      pressure = Math.max(0.1, Math.min(1.0, pressure));
    } else if (type === 'touch') {
      pressure = 0.6;
    } else {
      pressure = 0.8;
    }

    return [x, y, pressure];
  }

  // Rectangle drawing methods
  startRectangle(startPoint) {
    console.log('Starting rectangle at:', startPoint);
    this.isDrawingRectangle = true;
    this.rectangleStart = { x: startPoint[0], y: startPoint[1] };
    this.currentRectangle = null;
  }

  updateRectangle(currentPoint) {
    if (!this.isDrawingRectangle || !this.rectangleStart) return;

    const startX = this.rectangleStart.x;
    const startY = this.rectangleStart.y;
    const currentX = currentPoint[0];
    const currentY = currentPoint[1];

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    this.currentRectangle = {
      x, y, width, height,
      color: this.options.shapeColor || '#000000',
      borderSize: this.options.shapeBorderSize || 2,
      fill: this.options.shapeFill || false,
      fillColor: this.options.shapeFillColor || '#000000',
      roundCorners: this.options.shapeRoundCorners || false,
      isRough: true,
      roughness: 1.2,
      bowing: 1.0,
      fillStyle: 'hachure'
    };

    this.updateTemporaryRectangle();
  }

  updateTemporaryRectangle() {
    if (!this.currentRectangle || !this.svgRef.current) return;

    const existingTemp = this.svgRef.current.querySelector('#temp-rectangle');
    if (existingTemp) {
      existingTemp.remove();
    }

    this.createTempRoughRectangle();
  }

  createTempRoughRectangle() {
    const rect = this.currentRectangle;

    const roughOptions = {
      stroke: rect.color,
      strokeWidth: rect.borderSize,
      fill: rect.fill ? rect.fillColor : 'none',
      fillStyle: rect.fillStyle,
      roughness: rect.roughness,
      bowing: rect.bowing,
      fillWeight: rect.borderSize * 0.5,
    };

    try {
      const roughRect = this.roughSvg.rectangle(
        rect.x, rect.y, rect.width, rect.height, roughOptions
      );

      const tempGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      tempGroup.id = 'temp-rectangle';
      tempGroup.style.opacity = '0.8';
      tempGroup.innerHTML = roughRect.innerHTML;

      this.svgRef.current.appendChild(tempGroup);
    } catch (error) {
      console.error('Error creating rough rectangle:', error);
    }
  }

  finishRectangle() {
    if (!this.isDrawingRectangle || !this.currentRectangle) return null;

    console.log('Finishing rectangle:', this.currentRectangle);

    const tempRect = this.svgRef.current?.querySelector('#temp-rectangle');
    if (tempRect) {
      tempRect.remove();
    }

    if (this.currentRectangle.width > 5 && this.currentRectangle.height > 5) {
      const rectangleShape = this.addShape({
        type: 'rectangle',
        ...this.currentRectangle
      });

      this.isDrawingRectangle = false;
      this.rectangleStart = null;
      this.currentRectangle = null;

      return rectangleShape;
    }

    this.isDrawingRectangle = false;
    this.rectangleStart = null;
    this.currentRectangle = null;
    return null;
  }

  cancelRectangle() {
    const tempRect = this.svgRef.current?.querySelector('#temp-rectangle');
    if (tempRect) {
      tempRect.remove();
    }

    this.isDrawingRectangle = false;
    this.rectangleStart = null;
    this.currentRectangle = null;
  }

  eraserIntersectsBoundingBox(eraserX, eraserY, eraserRadius, bbox) {
    const zoomLevel = this.options.viewBox ?
      this.options.width / this.options.viewBox.width : 1;

    const adjustedRadius = eraserRadius / zoomLevel;

    const expandedBbox = {
      x: bbox.x - adjustedRadius,
      y: bbox.y - adjustedRadius,
      width: bbox.width + 2 * adjustedRadius,
      height: bbox.height + 2 * adjustedRadius
    };

    return eraserX >= expandedBbox.x &&
      eraserX <= expandedBbox.x + expandedBbox.width &&
      eraserY >= expandedBbox.y &&
      eraserY <= expandedBbox.y + expandedBbox.height;
  }

  normalizeColor(color) {
    if (color.startsWith('rgba') || color.startsWith('rgb')) {
      return color;
    }
    return color;
  }

  generatePathId() {
    return `path-${Date.now()}-${this.nextPathId++}`;
  }

  addPath(pathData, color, strokeWidth, inputType, inputPoints = []) {
    const newPath = {
      id: this.generatePathId(),
      pathData,
      color: this.normalizeColor(color),
      type: 'stroke',
      inputType,
      strokeWidth,
      opacity: this.options.opacity,
      inputPoints,
      timestamp: Date.now(),
      transform: null // For selection transformations
    };

    const bbox = this.calculateBoundingBox(pathData);
    if (bbox) {
      this.pathBBoxes.set(newPath.id, bbox);
    }

    this.paths.push(newPath);
    return newPath;
  }

  addShape(shapeData) {
    const {
      type, x, y, width, height,
      color, borderSize, fill, fillColor, roundCorners,
      isRough, roughness, bowing, fillStyle
    } = shapeData;

    const id = this.generatePathId();

    const newShape = {
      id,
      type: 'shape',
      shapeType: type,
      x, y, width, height,
      color: this.normalizeColor(color || '#000000'),
      borderSize: borderSize || 2,
      fill: !!fill,
      fillColor: this.normalizeColor(fillColor || color || '#000000'),
      roundCorners: !!roundCorners,
      isRough: isRough !== undefined ? isRough : true,
      roughness: roughness || 1.2,
      bowing: bowing || 1.0,
      fillStyle: fillStyle || 'hachure',
      timestamp: Date.now()
    };

    const bbox = this.calculateBoundingBox(newShape);
    if (bbox) {
      this.pathBBoxes.set(newShape.id, bbox);
    }

    this.paths.push(newShape);

    console.log('CanvasEngine: Added shape with preserved properties:', {
      id: newShape.id,
      color: newShape.color,
      borderSize: newShape.borderSize,
      fill: newShape.fill,
      fillColor: newShape.fillColor,
      roundCorners: newShape.roundCorners,
      isRough: newShape.isRough
    });

    return newShape;
  }

  clearPaths() {
    this.paths = [];
    this.pathBBoxes.clear();
    this.currentPath = [];
    this.pathsToErase.clear();
    this.nextPathId = 0;
    this.clearSelection(); // Clear selection when clearing paths
    this.cancelRectangle();
    this.aiTextElements.clear();
    this.imageElements.clear();
    this.loadedImages.clear();
  }

  undo() {
    if (this.paths.length === 0) return false;

    const lastPath = this.paths.pop();
    if (lastPath && lastPath.id !== undefined) {
      this.pathBBoxes.delete(lastPath.id);
      // Remove from selection if it was selected
      this.removeFromSelection(lastPath.id);
      // Remove from AI text elements if it's an AI text
      if (lastPath.type === 'aiText') {
        this.aiTextElements.delete(lastPath.id);
      }
      // Remove from image elements if it's an image
      if (lastPath.type === 'image') {
        this.imageElements.delete(lastPath.id);
        this.loadedImages.delete(lastPath.id);
      }
    }
    return true;
  }

  // EXPORT/IMPORT WITH AI TEXT SUPPORT
  exportAsJSON() {
    return JSON.stringify({
      type: 'drawing',
      version: 1,
      elements: this.paths.map(path => {
        if (path.type === 'image') {
          return {
            id: path.id,
            type: 'image',
            url: path.url,
            x: path.x,
            y: path.y,
            width: path.width,
            height: path.height,
            originalWidth: path.originalWidth,
            originalHeight: path.originalHeight,
            name: path.name,
            timestamp: path.timestamp,
            transform: path.transform
          };
        } else if (path.type === 'aiText') {
          return {
            id: path.id,
            type: 'aiText',
            text: path.text,
            x: path.x,
            y: path.y,
            fontFamily: path.fontFamily,
            fontSize: path.fontSize,
            fontWeight: path.fontWeight,
            color: path.color,
            textAlign: path.textAlign,
            bounds: path.bounds,
            confidence: path.confidence,
            timestamp: path.timestamp,
            metadata: path.metadata,
            transform: path.transform
          };
        } else if (path.type === 'shape') {
          return {
            id: path.id,
            type: 'shape',
            shapeType: path.shapeType,
            x: path.x,
            y: path.y,
            width: path.width,
            height: path.height,
            color: path.color,
            borderSize: path.borderSize,
            fill: path.fill,
            fillColor: path.fillColor,
            roundCorners: path.roundCorners,
            isRough: path.isRough,
            roughness: path.roughness,
            bowing: path.bowing,
            fillStyle: path.fillStyle,
            timestamp: path.timestamp
          };
        } else {
          return {
            id: path.id,
            type: path.type,
            pathData: path.pathData,
            color: path.color,
            strokeWidth: path.strokeWidth,
            opacity: path.opacity,
            inputType: path.inputType,
            inputPoints: path.inputPoints,
            timestamp: path.timestamp,
            transform: path.transform
          };
        }
      }),
      appState: {
        width: this.options.width,
        height: this.options.height,
        opacity: this.options.opacity,
        viewBox: this.options.viewBox,
        shapeColor: this.options.shapeColor,
        shapeBorderSize: this.options.shapeBorderSize,
        shapeFill: this.options.shapeFill,
        shapeFillColor: this.options.shapeFillColor,
        shapeRoundCorners: this.options.shapeRoundCorners
      }
    });
  }

  importFromJSON(jsonData) {
    if (!jsonData) {
      return true;
    }

    try {
      let data;

      if (typeof jsonData === 'string') {
        if (!jsonData.trim() || !jsonData.trim().startsWith('{')) {
          return true;
        }

        try {
          data = JSON.parse(jsonData);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          return false;
        }
      } else {
        data = jsonData;
      }

      if (!data || !data.elements) {
        return true;
      }

      this.clearPaths();

      data.elements.forEach(async (element) => {
        if (element.type === 'image') {
          // Import image element
          try {
            const imageElement = {
              id: this.generatePathId(),
              type: 'image',
              url: element.url || '',
              x: element.x || 0,
              y: element.y || 0,
              width: element.width || 100,
              height: element.height || 100,
              originalWidth: element.originalWidth || element.width || 100,
              originalHeight: element.originalHeight || element.height || 100,
              name: element.name || 'image',
              timestamp: element.timestamp || Date.now(),
              transform: element.transform || {
                translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotation: 0
              }
            };

            // Try to load the image if URL is available
            if (element.url) {
              try {
                const img = await this.loadImage(element.url);
                this.loadedImages.set(imageElement.id, img);
              } catch (error) {
                console.warn('CanvasEngine: Could not load image during import:', error);
              }
            }

            const bbox = this.calculateImageBounds(imageElement);
            if (bbox) {
              this.pathBBoxes.set(imageElement.id, bbox);
            }

            this.paths.push(imageElement);
            this.imageElements.set(imageElement.id, imageElement);
            console.log('CanvasEngine: Imported image element:', imageElement.id);
          } catch (error) {
            console.error('CanvasEngine: Failed to import image element:', error);
          }
        }
        else if (element.type === 'aiText') {
          // Import AI text element
          const aiTextElement = {
            id: this.generatePathId(),
            type: 'aiText',
            text: element.text || '',
            x: element.x || 0,
            y: element.y || 0,
            fontFamily: element.fontFamily || 'Arial, sans-serif',
            fontSize: element.fontSize || 16,
            fontWeight: element.fontWeight || 'normal',
            color: element.color || '#000000',
            textAlign: element.textAlign || 'left',
            bounds: element.bounds || null,
            confidence: element.confidence || 0.8,
            timestamp: element.timestamp || Date.now(),
            metadata: element.metadata || {},
            transform: element.transform || {
              translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotation: 0
            }
          };

          const bbox = this.calculateTextBounds(aiTextElement);
          if (bbox) {
            this.pathBBoxes.set(aiTextElement.id, bbox);
          }

          this.paths.push(aiTextElement);
          this.aiTextElements.set(aiTextElement.id, aiTextElement);
          console.log('CanvasEngine: Imported AI text element:', aiTextElement.id);
        }
        else if (element.type === 'stroke' && element.pathData) {
          const newPath = {
            id: this.generatePathId(),
            pathData: element.pathData,
            color: element.color || '#000000',
            type: element.type,
            inputType: element.inputType || 'mouse',
            strokeWidth: element.strokeWidth || 5,
            opacity: element.opacity !== undefined ? element.opacity : this.options.opacity,
            inputPoints: element.inputPoints || [],
            timestamp: element.timestamp || Date.now(),
            transform: element.transform || null
          };

          const bbox = this.calculateBoundingBox(element.pathData);
          if (bbox) {
            this.pathBBoxes.set(newPath.id, bbox);
          }

          this.paths.push(newPath);
        }
        else if (element.type === 'shape') {
          const newShape = {
            id: this.generatePathId(),
            type: 'shape',
            shapeType: element.shapeType,
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            color: element.color || '#000000',
            borderSize: element.borderSize !== undefined ? element.borderSize : (element.strokeWidth || 2),
            fill: element.fill !== undefined ? element.fill : false,
            fillColor: element.fillColor || element.color || '#000000',
            roundCorners: element.roundCorners !== undefined ? element.roundCorners : false,
            isRough: element.isRough !== undefined ? element.isRough : true,
            roughness: element.roughness !== undefined ? element.roughness : 1.2,
            bowing: element.bowing !== undefined ? element.bowing : 1.0,
            fillStyle: element.fillStyle || 'hachure',
            timestamp: element.timestamp || Date.now()
          };

          const bbox = this.calculateBoundingBox(newShape);
          if (bbox) {
            this.pathBBoxes.set(newShape.id, bbox);
          }

          this.paths.push(newShape);

          console.log('CanvasEngine: Imported shape with properties:', {
            id: newShape.id,
            color: newShape.color,
            borderSize: newShape.borderSize,
            fill: newShape.fill,
            isRough: newShape.isRough
          });
        }
      });

      if (data.appState) {
        this.updateOptions({
          width: data.appState.width || this.options.width,
          height: data.appState.height || this.options.height,
          opacity: data.appState.opacity !== undefined ? data.appState.opacity : this.options.opacity,
          viewBox: data.appState.viewBox || this.options.viewBox,
          shapeColor: data.appState.shapeColor || this.options.shapeColor,
          shapeBorderSize: data.appState.shapeBorderSize || this.options.shapeBorderSize,
          shapeFill: data.appState.shapeFill !== undefined ? data.appState.shapeFill : this.options.shapeFill,
          shapeFillColor: data.appState.shapeFillColor || this.options.shapeFillColor,
          shapeRoundCorners: data.appState.shapeRoundCorners !== undefined ? data.appState.shapeRoundCorners : this.options.shapeRoundCorners
        });
      }

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  exportAsSVG() {
    const svg = this.svgRef.current;
    if (!svg) return '';

    const svgClone = svg.cloneNode(true);
    const viewBox = this.options.viewBox;
    svgClone.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
    svgClone.setAttribute('width', this.options.width);
    svgClone.setAttribute('height', this.options.height);

    return new XMLSerializer().serializeToString(svgClone);
  }

  exportAsDataUrl(format = 'png', transparent = true) {
    return new Promise(resolve => {
      const exportCanvas = document.createElement('canvas');
      const exportCtx = exportCanvas.getContext('2d');

      exportCanvas.width = this.options.width * this.dpr;
      exportCanvas.height = this.options.height * this.dpr;
      exportCtx.scale(this.dpr, this.dpr);

      if (!transparent && format !== 'png') {
        exportCtx.fillStyle = '#ffffff';
        exportCtx.fillRect(0, 0, this.options.width, this.options.height);
      }

      const svgData = this.exportAsSVG();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        exportCtx.drawImage(img, 0, 0, this.options.width, this.options.height);
        URL.revokeObjectURL(url);
        const quality = format === 'jpeg' ? 0.98 : undefined;
        resolve(exportCanvas.toDataURL(`image/${format}`, quality));
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('');
      };

      img.src = url;
    });
  }

  // Getters
  getPaths() { return this.paths; }
  getPathsToErase() { return this.pathsToErase; }
  getCurrentPath() { return this.currentPath; }
  getCurrentRectangle() { return this.currentRectangle; }
  isDrawingShape() { return this.isDrawingRectangle; }
  getSelectedItems() { return Array.from(this.selectedItems); }
  getSelectionBounds() { return this.selectionBounds; }
  getSelectionRect() { return this.selectionRect; }

  // Setters
  setPathsToErase(pathsToErase) { this.pathsToErase = pathsToErase; }
  setCurrentPath(path) { this.currentPath = path; }

  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    if (newOptions.width || newOptions.height) {
      this.initializeCanvas();
    }
    this.initializeRough();
  }

  destroy() {
    if (this.frameRequest) {
      cancelAnimationFrame(this.frameRequest);
    }
    this.pathBBoxes.clear();
    this.aiTextElements.clear();
    this.imageElements.clear();
    this.loadedImages.clear();
    this.cancelRectangle();
    this.clearSelection();
  }
}