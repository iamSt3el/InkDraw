// src/components/SmoothCanvas/core/CanvasEngine.js - Updated with Selection Support
import rough from 'roughjs';

export class CanvasEngine {
  constructor(canvasRef, svgRef, options = {}) {
    this.canvasRef = canvasRef;
    this.svgRef = svgRef;
    this.options = {
      width: 900,
      height: 700,
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

    // Rough.js instances
    this.roughCanvas = null;
    this.roughSvg = null;

    this.dpr = window.devicePixelRatio || 1;
    this.initializeCanvas();
    this.initializeRough();
  }

  // Existing methods (initializeCanvas, initializeRough, etc.)...
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

  // SELECTION METHODS

  // Hit testing for individual items
  hitTest(point, item) {
    const tolerance = 15 / (this.options.viewBox ?
      this.options.width / this.options.viewBox.width : 1);

    console.log('Hit testing item:', item.id, 'at point:', point, 'tolerance:', tolerance);

    if (item.type === 'stroke') {
      return this.hitTestStroke(point, item, tolerance);
    } else if (item.type === 'shape') {
      return this.hitTestShape(point, item, tolerance);
    }
    return false;
  }

  hitTestStroke(point, stroke, tolerance) {
    // INCREASED TOLERANCE for easier clicking
    const adjustedTolerance = tolerance * 2; // Double the tolerance

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

    // DEBUG: Log hit test details
    console.log('Hit testing stroke:', {
      id: stroke.id,
      point: point,
      bbox: bbox,
      tolerance: adjustedTolerance
    });

    // Expanded bounding box test with increased tolerance
    const hit = point.x >= bbox.x - adjustedTolerance &&
      point.x <= bbox.x + bbox.width + adjustedTolerance &&
      point.y >= bbox.y - adjustedTolerance &&
      point.y <= bbox.y + bbox.height + adjustedTolerance;

    console.log('Hit test result:', hit);
    return hit;
  }

  hitTestShape(point, shape, tolerance) {
    console.log('Shape hit test:', shape, 'point:', point);

    if (shape.shapeType === 'rectangle') {
      const hit = point.x >= shape.x - tolerance &&
        point.x <= shape.x + shape.width + tolerance &&
        point.y >= shape.y - tolerance &&
        point.y <= shape.y + shape.height + tolerance;

      console.log('Rectangle hit test result:', hit);
      return hit;
    }
    return false;
  }

  // Find the topmost item at a point
  findItemAtPoint(point) {
    console.log('Finding item at point:', point, 'total paths:', this.paths.length);

    // Search from top to bottom (reverse order since later items are on top)
    for (let i = this.paths.length - 1; i >= 0; i--) {
      const item = this.paths[i];
      console.log('Testing item:', item.id, item.type);

      if (this.hitTest(point, item)) {
        console.log('Found item:', item.id);
        return item;
      }
    }

    console.log('No item found at point');
    return null;
  }

  // Find all items within a rectangle
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
    }

    if (!itemBounds) return false;

    // Check if rectangles intersect
    const intersects = !(rect.x > itemBounds.x + itemBounds.width ||
      rect.x + rect.width < itemBounds.x ||
      rect.y > itemBounds.y + itemBounds.height ||
      rect.y + rect.height < itemBounds.y);

    console.log('Item intersects rect:', item.id, intersects, 'itemBounds:', itemBounds, 'rect:', rect);
    return intersects;
  }

  // Calculate bounding box for selected items
  getSelectionBounds(selectedItemIds) {
    // FIX 1: Handle both Set and Array inputs
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
        // FIX 2: Improved stroke bounds calculation
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

  // Get resize handle at point
  getResizeHandleAtPoint(point, bounds) {
    if (!bounds) return null;

    const handleSize = 8;
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

  // TRANSFORMATION METHODS

  moveSelectedItems(deltaX, deltaY) {
    for (const itemId of this.selectedItems) {
      const item = this.paths.find(p => p.id === itemId);
      if (!item) continue;

      if (item.type === 'stroke') {
        this.moveStroke(item, deltaX, deltaY);
      } else if (item.type === 'shape') {
        this.moveShape(item, deltaX, deltaY);
      }
    }

    // Update bounding boxes
    this.updatePathBoundingBoxes();
  }

  moveStroke(stroke, deltaX, deltaY) {
    // This is complex - we need to parse and modify the SVG path data
    // For now, we'll store the transformation and apply it during rendering
    if (!stroke.transform) {
      stroke.transform = { translateX: 0, translateY: 0 };
    }
    stroke.transform.translateX += deltaX;
    stroke.transform.translateY += deltaY;
  }

  moveShape(shape, deltaX, deltaY) {
    shape.x += deltaX;
    shape.y += deltaY;
  }

  resizeSelectedItems(newBounds) {
    if (this.selectedItems.size === 0 || !this.selectionBounds) return;

    const oldBounds = this.selectionBounds;
    const scaleX = newBounds.width / oldBounds.width;
    const scaleY = newBounds.height / oldBounds.height;

    for (const itemId of this.selectedItems) {
      const item = this.paths.find(p => p.id === itemId);
      if (!item) continue;

      if (item.type === 'shape') {
        this.resizeShape(item, oldBounds, newBounds, scaleX, scaleY);
      }
      // Note: Stroke resizing is more complex and would require path transformation
    }

    this.selectionBounds = newBounds;
    this.updatePathBoundingBoxes();
  }

  resizeShape(shape, oldBounds, newBounds, scaleX, scaleY) {
    // Calculate relative position within old bounds
    const relX = (shape.x - oldBounds.x) / oldBounds.width;
    const relY = (shape.y - oldBounds.y) / oldBounds.height;
    const relW = shape.width / oldBounds.width;
    const relH = shape.height / oldBounds.height;

    // Apply to new bounds
    shape.x = newBounds.x + relX * newBounds.width;
    shape.y = newBounds.y + relY * newBounds.height;
    shape.width = relW * newBounds.width;
    shape.height = relH * newBounds.height;
  }

  deleteSelectedItems() {
    const itemsToDelete = Array.from(this.selectedItems);

    // Remove items from paths array
    this.paths = this.paths.filter(item => !itemsToDelete.includes(item.id));

    // Clean up bounding boxes
    for (const itemId of itemsToDelete) {
      this.pathBBoxes.delete(itemId);
    }

    // Clear selection
    this.selectedItems.clear();
    this.selectionBounds = null;
  }

  updatePathBoundingBoxes() {
    for (const item of this.paths) {
      if (item.type === 'stroke') {
        const bbox = this.calculateBoundingBox(item.pathData);
        if (bbox && item.transform) {
          bbox.x += item.transform.translateX;
          bbox.y += item.transform.translateY;
        }
        if (bbox) {
          this.pathBBoxes.set(item.id, bbox);
        }
      } else if (item.type === 'shape') {
        const bbox = { x: item.x, y: item.y, width: item.width, height: item.height };
        this.pathBBoxes.set(item.id, bbox);
      }
    }
  }

  // SELECTION STATE METHODS

  setSelectedItems(itemIds) {
    this.selectedItems = new Set(itemIds);
    this.selectionBounds = this.getSelectionBounds(this.selectedItems);
  }

  addToSelection(itemId) {
    this.selectedItems.add(itemId);
    this.selectionBounds = this.getSelectionBounds(this.selectedItems);
  }

  removeFromSelection(itemId) {
    this.selectedItems.delete(itemId);
    this.selectionBounds = this.selectedItems.size > 0 ?
      this.getSelectionBounds(this.selectedItems) : null;
  }

  clearSelection() {
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
  }

  finishAreaSelection(addToExisting = false) {
    if (!this.isSelecting || !this.selectionRect) return [];

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

    return Array.from(this.selectedItems);
  }

  // EXISTING METHODS (keeping all the original functionality)

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

  // Rectangle drawing methods (existing)
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

  calculateBoundingBox(pathData) {
    if (typeof pathData === 'string') {
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

      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    else if (typeof pathData === 'object') {
      const shape = pathData;

      if (shape.type === 'line') {
        const x = Math.min(shape.x1, shape.x2);
        const y = Math.min(shape.y1, shape.y2);
        const width = Math.abs(shape.x2 - shape.x1);
        const height = Math.abs(shape.y2 - shape.y1);
        return { x, y, width, height };
      }
      else {
        return {
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height
        };
      }
    }

    return null;
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
  }

  undo() {
    if (this.paths.length === 0) return false;

    const lastPath = this.paths.pop();
    if (lastPath && lastPath.id !== undefined) {
      this.pathBBoxes.delete(lastPath.id);
      // Remove from selection if it was selected
      this.removeFromSelection(lastPath.id);
    }
    return true;
  }

  exportAsJSON() {
    return JSON.stringify({
      type: 'drawing',
      version: 1,
      elements: this.paths.map(path => {
        if (path.type === 'shape') {
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

      data.elements.forEach((element) => {
        if (element.type === 'stroke' && element.pathData) {
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
    this.cancelRectangle();
    this.clearSelection();
  }
}