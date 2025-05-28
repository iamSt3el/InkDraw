// src/components/SmoothCanvas/core/CanvasEngine.js - Fixed shape properties
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
      // Shape options (simplified)
      shapeColor: '#000000',
      shapeBorderSize: 2,
      shapeFill: false,
      shapeFillColor: '#000000',
      shapeRoundCorners: false,
      ...options
    };
    
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
    
    // Rough.js instances
    this.roughCanvas = null;
    this.roughSvg = null;
    
    // Rectangle drawing state
    this.isDrawingRectangle = false;
    this.rectangleStart = null;
    this.currentRectangle = null;
    
    this.dpr = window.devicePixelRatio || 1;
    this.initializeCanvas();
    this.initializeRough();
  }

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

  getStrokeOptions(inputType, strokeWidth) {
    // Adjust stroke width based on zoom level
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
    
    // Transform coordinates to account for viewBox (zoom and pan)
    const canvasX = (e.clientX - rect.left) / rect.width * this.options.width;
    const canvasY = (e.clientY - rect.top) / rect.height * this.options.height;
    
    // Apply viewBox transformation
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

    // Calculate rectangle bounds
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    // FIXED: Create temporary rectangle with PRESERVED properties from store
    this.currentRectangle = {
      x, y, width, height,
      color: this.options.shapeColor || '#000000',
      borderSize: this.options.shapeBorderSize || 2,
      fill: this.options.shapeFill || false,
      fillColor: this.options.shapeFillColor || '#000000',
      roundCorners: this.options.shapeRoundCorners || false,
      // Always rough style as requested
      isRough: true,
      roughness: 1.2, // Fixed value for hand-drawn style
      bowing: 1.0,    // Fixed value for hand-drawn style
      fillStyle: 'hachure' // Fixed fill style
    };

    // Update temporary rectangle in SVG
    this.updateTemporaryRectangle();
  }

  updateTemporaryRectangle() {
    if (!this.currentRectangle || !this.svgRef.current) return;

    // Remove existing temporary rectangle
    const existingTemp = this.svgRef.current.querySelector('#temp-rectangle');
    if (existingTemp) {
      existingTemp.remove();
    }

    // Always create rough rectangle since we only support hand-drawn style
    this.createTempRoughRectangle();
  }

  createTempRoughRectangle() {
    const rect = this.currentRectangle;
    
    // FIXED: Use consistent rough options that match the final shape
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

      // Create a group element for the temporary rectangle
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

    // Remove temporary rectangle
    const tempRect = this.svgRef.current?.querySelector('#temp-rectangle');
    if (tempRect) {
      tempRect.remove();
    }

    // Only create rectangle if it has meaningful dimensions
    if (this.currentRectangle.width > 5 && this.currentRectangle.height > 5) {
      const rectangleShape = this.addShape({
        type: 'rectangle',
        ...this.currentRectangle
      });

      // Reset rectangle drawing state
      this.isDrawingRectangle = false;
      this.rectangleStart = null;
      this.currentRectangle = null;

      return rectangleShape;
    }

    // Reset state even if rectangle was too small
    this.isDrawingRectangle = false;
    this.rectangleStart = null;
    this.currentRectangle = null;
    return null;
  }

  cancelRectangle() {
    // Remove temporary rectangle
    const tempRect = this.svgRef.current?.querySelector('#temp-rectangle');
    if (tempRect) {
      tempRect.remove();
    }

    // Reset state
    this.isDrawingRectangle = false;
    this.rectangleStart = null;
    this.currentRectangle = null;
  }

  calculateBoundingBox(pathData) {
    // For path data strings
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
    // For shape objects
    else if (typeof pathData === 'object') {
      const shape = pathData;
      
      // Different calculations based on shape type
      if (shape.type === 'line') {
        const x = Math.min(shape.x1, shape.x2);
        const y = Math.min(shape.y1, shape.y2);
        const width = Math.abs(shape.x2 - shape.x1);
        const height = Math.abs(shape.y2 - shape.y1);
        return { x, y, width, height };
      }
      else {
        // For rectangle, circle, triangle, etc.
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
    // Adjust eraser radius based on zoom level
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

  // Add a path for drawing strokes
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
      timestamp: Date.now()
    };
    
    const bbox = this.calculateBoundingBox(pathData);
    if (bbox) {
      this.pathBBoxes.set(newPath.id, bbox);
    }
    
    this.paths.push(newPath);
    return newPath;
  }

  // FIXED: Enhanced addShape method with proper property preservation
  addShape(shapeData) {
    const { 
      type, x, y, width, height, 
      color, borderSize, fill, fillColor, roundCorners,
      isRough, roughness, bowing, fillStyle
    } = shapeData;
    
    const id = this.generatePathId();
    
    // FIXED: Create shape with ALL required properties preserved
    const newShape = {
      id,
      type: 'shape',
      shapeType: type,
      x, y, width, height,
      // FIXED: Ensure all shape properties are stored consistently
      color: this.normalizeColor(color || '#000000'),
      borderSize: borderSize || 2,
      fill: !!fill,
      fillColor: this.normalizeColor(fillColor || color || '#000000'),
      roundCorners: !!roundCorners,
      // FIXED: Always store rough properties for consistency
      isRough: isRough !== undefined ? isRough : true,
      roughness: roughness || 1.2,  // Fixed hand-drawn values
      bowing: bowing || 1.0,        // Fixed hand-drawn values
      fillStyle: fillStyle || 'hachure',
      timestamp: Date.now()
    };
    
    // Calculate bounding box for the shape
    const bbox = this.calculateBoundingBox(newShape);
    if (bbox) {
      this.pathBBoxes.set(newShape.id, bbox);
    }
    
    // Add to paths array
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
    
    // Clear any temporary rectangles
    this.cancelRectangle();
  }

  undo() {
    if (this.paths.length === 0) return false;
    
    const lastPath = this.paths.pop();
    if (lastPath && lastPath.id !== undefined) {
      this.pathBBoxes.delete(lastPath.id);
    }
    return true;
  }

  // FIXED: Export with complete shape properties
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
            // FIXED: Export all shape properties
            color: path.color,
            borderSize: path.borderSize,
            fill: path.fill,
            fillColor: path.fillColor,
            roundCorners: path.roundCorners,
            // Rough.js properties
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
            timestamp: path.timestamp
          };
        }
      }),
      appState: {
        width: this.options.width,
        height: this.options.height,
        opacity: this.options.opacity,
        viewBox: this.options.viewBox,
        // FIXED: Store current shape options in app state
        shapeColor: this.options.shapeColor,
        shapeBorderSize: this.options.shapeBorderSize,
        shapeFill: this.options.shapeFill,
        shapeFillColor: this.options.shapeFillColor,
        shapeRoundCorners: this.options.shapeRoundCorners
      }
    });
  }

  // FIXED: Import function that properly restores shape properties
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
            timestamp: element.timestamp || Date.now()
          };

          const bbox = this.calculateBoundingBox(element.pathData);
          if (bbox) {
            this.pathBBoxes.set(newPath.id, bbox);
          }

          this.paths.push(newPath);
        }
        else if (element.type === 'shape') {
          // FIXED: Import with ALL shape properties preserved
          const newShape = {
            id: this.generatePathId(),
            type: 'shape',
            shapeType: element.shapeType,
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            // FIXED: Restore all shape properties with proper defaults
            color: element.color || '#000000',
            borderSize: element.borderSize !== undefined ? element.borderSize : (element.strokeWidth || 2),
            fill: element.fill !== undefined ? element.fill : false,
            fillColor: element.fillColor || element.color || '#000000',
            roundCorners: element.roundCorners !== undefined ? element.roundCorners : false,
            // FIXED: Restore rough properties with hand-drawn defaults
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

      // FIXED: Update options with imported app state
      if (data.appState) {
        this.updateOptions({
          width: data.appState.width || this.options.width,
          height: data.appState.height || this.options.height,
          opacity: data.appState.opacity !== undefined ? data.appState.opacity : this.options.opacity,
          viewBox: data.appState.viewBox || this.options.viewBox,
          // FIXED: Restore shape options
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

  // Export as SVG
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

  // Export as data URL
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

  // Setters
  setPathsToErase(pathsToErase) { this.pathsToErase = pathsToErase; }
  setCurrentPath(path) { this.currentPath = path; }

  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    if (newOptions.width || newOptions.height) {
      this.initializeCanvas();
    }
    // Re-initialize rough.js if needed
    this.initializeRough();
  }

  destroy() {
    if (this.frameRequest) {
      cancelAnimationFrame(this.frameRequest);
    }
    this.pathBBoxes.clear();
    this.cancelRectangle();
  }
}