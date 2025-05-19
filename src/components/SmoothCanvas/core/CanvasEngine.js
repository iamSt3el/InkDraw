// src/components/SmoothCanvas/core/CanvasEngine.js
export class CanvasEngine {
    constructor(canvasRef, svgRef, options = {}) {
      this.canvasRef = canvasRef;
      this.svgRef = svgRef;
      this.options = {
        width: 900,
        height: 700,
        strokeColor: '#000000',
        strokeWidth: 5,
        eraserWidth: 10,
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
      
      this.dpr = window.devicePixelRatio || 1;
      this.initializeCanvas();
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
  
    getStrokeOptions(inputType, strokeWidth) {
      const baseOptions = {
        size: strokeWidth,
        smoothing: 0.5,
        streamline: 0.5,
        last: true,
        start: { taper: 0, cap: true },
        end: { taper: strokeWidth * 0, cap: true }
      };
  
      if (inputType === 'pen') {
        return {
          ...baseOptions,
          thinning: 0.3,
          simulatePressure: false,
          smoothing: 0.3,
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
  
      const x = (e.clientX - rect.left) / rect.width * this.options.width;
      const y = (e.clientY - rect.top) / rect.height * this.options.height;
      
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
      const expandedBbox = {
        x: bbox.x - eraserRadius,
        y: bbox.y - eraserRadius,
        width: bbox.width + 2 * eraserRadius,
        height: bbox.height + 2 * eraserRadius
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
  
    // Add a shape with simplified approach
    addShape(shapeData) {
      const { type, x, y, width, height, color, strokeWidth, opacity, fill, fillColor, fillOpacity } = shapeData;
      
      // Generate a unique ID for the shape
      const id = this.generatePathId();
      
      // Create a consistent shape object
      const newShape = {
        id,
        type: 'shape',          // Mark as shape type
        shapeType: type,        // The specific shape type (rectangle, circle, etc.)
        x, y, width, height,    // Position and dimensions
        color: this.normalizeColor(color),
        strokeWidth,
        opacity: opacity || 100,
        fill: !!fill,           // Convert to boolean
        fillColor: fillColor || color,
        fillOpacity: fillOpacity || 20,
        timestamp: Date.now()
      };
      
      // Handle special shape types like lines
      if (type === 'line') {
        newShape.x1 = shapeData.x1;
        newShape.y1 = shapeData.y1;
        newShape.x2 = shapeData.x2;
        newShape.y2 = shapeData.y2;
      }
      
      // Calculate bounding box for the shape
      const bbox = this.calculateBoundingBox(newShape);
      if (bbox) {
        this.pathBBoxes.set(newShape.id, bbox);
      }
      
      // Add to paths array
      this.paths.push(newShape);
      
      return newShape;
    }
  
    clearPaths() {
      this.paths = [];
      this.pathBBoxes.clear();
      this.currentPath = [];
      this.pathsToErase.clear();
      this.nextPathId = 0;
    }
  
    undo() {
      if (this.paths.length === 0) return false;
      
      const lastPath = this.paths.pop();
      if (lastPath && lastPath.id !== undefined) {
        this.pathBBoxes.delete(lastPath.id);
      }
      return true;
    }
  
    // Export as JSON - simplified format for better interoperability
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
              x1: path.x1,
              y1: path.y1,
              x2: path.x2,
              y2: path.y2,
              color: path.color,
              strokeWidth: path.strokeWidth,
              opacity: path.opacity,
              fill: path.fill,
              fillColor: path.fillColor,
              fillOpacity: path.fillOpacity,
              timestamp: path.timestamp
            };
          } else {
            return {
              id: path.id,
              type: path.type,
              pathData: path.pathData,
              color: path.color,
              strokeWidth: path.strokeWidth,
              inputType: path.inputType,
              inputPoints: path.inputPoints,
              timestamp: path.timestamp
            };
          }
        }),
        appState: {
          width: this.options.width,
          height: this.options.height
        }
      });
    }
  
    // Import function that handles shapes
    importFromJSON(jsonData) {
      if (!jsonData) {
        return true;
      }
  
      try {
        let data;
        
        // Parse JSON if string
        if (typeof jsonData === 'string') {
          // Skip empty strings and non-JSON
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
  
        // Validate structure
        if (!data || !data.elements) {
          return true;
        }
  
        // Clear existing paths
        this.clearPaths();
  
        // Import elements
        data.elements.forEach((element) => {
          if (element.type === 'stroke' && element.pathData) {
            // Create stroke object
            const newPath = {
              id: this.generatePathId(),
              pathData: element.pathData,
              color: element.color || '#000000',
              type: element.type,
              inputType: element.inputType || 'mouse',
              strokeWidth: element.strokeWidth || 5,
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
            // Create shape object
            const newShape = {
              id: this.generatePathId(),
              type: 'shape',
              shapeType: element.shapeType,
              x: element.x,
              y: element.y,
              width: element.width,
              height: element.height,
              color: element.color || '#000000',
              strokeWidth: element.strokeWidth || 2,
              opacity: element.opacity || 100,
              fill: element.fill || false,
              fillColor: element.fillColor || element.color || '#000000',
              fillOpacity: element.fillOpacity || 20,
              timestamp: element.timestamp || Date.now()
            };
            
            // Handle special shape types like lines
            if (element.shapeType === 'line') {
              newShape.x1 = element.x1;
              newShape.y1 = element.y1;
              newShape.x2 = element.x2;
              newShape.y2 = element.y2;
            }
  
            const bbox = this.calculateBoundingBox(newShape);
            if (bbox) {
              this.pathBBoxes.set(newShape.id, bbox);
            }
  
            this.paths.push(newShape);
          }
        });
  
        // Update options if provided
        if (data.appState) {
          this.updateOptions({
            width: data.appState.width || this.options.width,
            height: data.appState.height || this.options.height
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
      svgClone.setAttribute('viewBox', `0 0 ${this.options.width} ${this.options.height}`);
      svgClone.setAttribute('width', this.options.width);
      svgClone.setAttribute('height', this.options.height);
      
      const paths = svgClone.querySelectorAll('path');
      paths.forEach((path, index) => {
        if (this.paths[index] && this.paths[index].color) {
          path.setAttribute('fill', this.paths[index].color);
          path.setAttribute('stroke', 'none');
        }
      });
  
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
  
    // Setters
    setPathsToErase(pathsToErase) { this.pathsToErase = pathsToErase; }
    setCurrentPath(path) { this.currentPath = path; }
  
    updateOptions(newOptions) {
      this.options = { ...this.options, ...newOptions };
      if (newOptions.width || newOptions.height) {
        this.initializeCanvas();
      }
    }
  
    destroy() {
      if (this.frameRequest) {
        cancelAnimationFrame(this.frameRequest);
      }
      this.pathBBoxes.clear();
    }
  }