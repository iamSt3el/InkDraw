// src/components/SmoothCanvas/core/EventHandler.js - FIXED PAN TOOL
import { getStroke } from 'perfect-freehand';

export class EventHandler {
  constructor(canvasEngine, options = {}) {
    this.engine = canvasEngine;
    this.options = options;
    this.callbacks = {};
    
    // Pan tool state
    this.isPanning = false;
    this.lastPanPoint = null;
    this.panStartPoint = null;
    
    // Bind methods
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  handlePointerDown(e) {
    if (!this.engine.canvasRef.current || !e.isPrimary) return;

    // Handle pan tool
    if (this.options.currentTool === 'pan' || e.altKey || e.buttons === 4) {
      this.startPanning(e);
      return;
    }

    // Existing drawing logic
    this.engine.isDrawing = true;
    this.engine.activePointer = e.pointerId;
    e.preventDefault();

    if (this.engine.canvasRef.current.setPointerCapture) {
      this.engine.canvasRef.current.setPointerCapture(e.pointerId);
    }

    const point = this.engine.getPointFromEvent(e);
    this.engine.lastPoint = point;

    if (this.engine.isErasing) {
      this.engine.setPathsToErase(new Set());
      this.handleErase(point[0], point[1]);
    } else {
      this.engine.setCurrentPath([point]);
      this.createTempPath(point);
    }
  }

  handlePointerMove(e) {
    if (!this.engine.canvasRef.current) return;

    // Handle panning
    if (this.isPanning) {
      this.continuePanning(e);
      return;
    }

    // Handle pan tool hover (show grab cursor)
    if (this.options.currentTool === 'pan' && !this.engine.isDrawing) {
      return;
    }

    // Update eraser position
    if (this.options.currentTool === 'eraser') {
      const point = this.engine.getPointFromEvent(e);
      this.engine.eraserPosition = { x: point[0], y: point[1] };
      this.engine.showEraser = true;

      if (this.callbacks.onEraserMove) {
        this.callbacks.onEraserMove(this.engine.eraserPosition);
      }
    }

    if (!this.engine.isDrawing || e.pointerId !== this.engine.activePointer) return;
    e.preventDefault();

    if (this.engine.isErasing) {
      const point = this.engine.getPointFromEvent(e);
      this.handleErase(point[0], point[1]);
    } else {
      // Get coalesced events for smoother drawing
      let points = [];
      if (e.getCoalescedEvents && typeof e.getCoalescedEvents === 'function') {
        const coalescedEvents = e.getCoalescedEvents();
        for (const coalescedEvent of coalescedEvents) {
          points.push(this.engine.getPointFromEvent(coalescedEvent));
        }
      } else {
        points.push(this.engine.getPointFromEvent(e));
      }

      // Process all points
      for (const point of points) {
        this.updateDrawing(point);
      }
    }

    this.engine.lastPoint = this.engine.getPointFromEvent(e);
  }

  handlePointerUp(e) {
    // Handle pan end
    if (this.isPanning) {
      this.endPanning(e);
      return;
    }

    if (!this.engine.isDrawing || e.pointerId !== this.engine.activePointer) return;

    this.engine.isDrawing = false;
    this.engine.activePointer = null;

    if (this.engine.canvasRef.current?.releasePointerCapture) {
      this.engine.canvasRef.current.releasePointerCapture(e.pointerId);
    }

    if (this.engine.isErasing) {
      this.finalizeErase();
    } else {
      this.finalizeStroke(e);
    }

    this.engine.lastPoint = null;
  }

  // NEW: Pan tool methods
  startPanning(e) {
    console.log('EventHandler: Starting pan');
    this.isPanning = true;
    this.panStartPoint = { x: e.clientX, y: e.clientY };
    this.lastPanPoint = { x: e.clientX, y: e.clientY };
    
    e.preventDefault();
    e.stopPropagation();

    // Set pointer capture for smooth panning
    if (this.engine.canvasRef.current.setPointerCapture) {
      this.engine.canvasRef.current.setPointerCapture(e.pointerId);
    }

    // Update cursor to grabbing state
    const canvas = this.engine.canvasRef.current;
    const container = canvas.parentElement;
    if (canvas) {
      canvas.style.cursor = 'grabbing';
    }
    if (container) {
      container.classList.add('panningMode');
    }

    // Notify callbacks
    if (this.callbacks.onPanStart) {
      this.callbacks.onPanStart();
    }
  }

  continuePanning(e) {
    if (!this.isPanning || !this.lastPanPoint) return;

    const deltaX = e.clientX - this.lastPanPoint.x;
    const deltaY = e.clientY - this.lastPanPoint.y;

    // Apply panning through drawing store
    if (this.callbacks.onPan) {
      this.callbacks.onPan(deltaX, deltaY);
    } else if (this.engine.options.onPan) {
      this.engine.options.onPan(deltaX, deltaY);
    } else {
      // Fallback: directly update viewBox
      const currentViewBox = this.options.viewBox || this.engine.options.viewBox;
      if (currentViewBox) {
        const scaledDeltaX = deltaX / (this.options.zoomLevel || 1);
        const scaledDeltaY = deltaY / (this.options.zoomLevel || 1);
        
        const newViewBox = {
          x: currentViewBox.x - scaledDeltaX,
          y: currentViewBox.y - scaledDeltaY,
          width: currentViewBox.width,
          height: currentViewBox.height
        };
        
        // Update options
        this.options.viewBox = newViewBox;
        this.engine.options.viewBox = newViewBox;
        
        // Update SVG viewBox
        if (this.engine.svgRef.current) {
          this.engine.svgRef.current.setAttribute('viewBox', 
            `${newViewBox.x} ${newViewBox.y} ${newViewBox.width} ${newViewBox.height}`);
        }
      }
    }

    this.lastPanPoint = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }

  endPanning(e) {
    console.log('EventHandler: Ending pan');
    this.isPanning = false;
    this.panStartPoint = null;
    this.lastPanPoint = null;

    // Release pointer capture
    if (this.engine.canvasRef.current?.releasePointerCapture) {
      this.engine.canvasRef.current.releasePointerCapture(e.pointerId);
    }

    // Reset cursor based on current tool
    const canvas = this.engine.canvasRef.current;
    const container = canvas?.parentElement;
    if (container) {
      container.classList.remove('panningMode');
    }
    if (canvas) {
      // Reset to appropriate cursor for current tool
      switch (this.options.currentTool) {
        case 'pan':
          canvas.style.cursor = 'grab';
          break;
        case 'pen':
        case 'rectangle':
          canvas.style.cursor = 'crosshair';
          break;
        case 'eraser':
          canvas.style.cursor = 'none';
          break;
        default:
          canvas.style.cursor = 'default';
          break;
      }
    }

    // Notify callbacks
    if (this.callbacks.onPanEnd) {
      this.callbacks.onPanEnd();
    }

    e.preventDefault();
  }

  // NEW: Wheel zoom support
  handleWheel(e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      
      if (this.callbacks.onZoom) {
        this.callbacks.onZoom(zoomDelta, { x: e.clientX, y: e.clientY });
      }
    }
  }

  handleMouseEnter() {
    if (this.options.currentTool === 'eraser') {
      this.engine.showEraser = true;
      if (this.callbacks.onEraserShow) {
        this.callbacks.onEraserShow(true);
      }
    }
  }

  handleMouseLeave() {
    this.engine.showEraser = false;
    if (this.callbacks.onEraserShow) {
      this.callbacks.onEraserShow(false);
    }
  }

  createTempPath(point) {
    const svg = this.engine.svgRef.current;
    if (!svg) return;
    
    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.id = 'temp-path';
    tempPath.setAttribute('fill', this.options.strokeColor);
    tempPath.setAttribute('stroke', 'none');

    try {
      const strokeOptions = this.engine.getStrokeOptions(this.engine.inputType, this.options.strokeWidth);
      const stroke = getStroke([point], strokeOptions);
      const pathData = this.engine.getSvgPathFromStroke(stroke);
      tempPath.setAttribute('d', pathData);
    } catch (error) {
      console.warn('Error creating temp path:', error);
      const zoomLevel = this.options.viewBox ?
        this.engine.options.width / this.options.viewBox.width : 1;
      const radius = (this.options.strokeWidth / 2) / zoomLevel;

      const pathData = `M ${point[0] - radius},${point[1]}
        A ${radius},${radius} 0 1,1 ${point[0] + radius},${point[1]}
        A ${radius},${radius} 0 1,1 ${point[0] - radius},${point[1]} Z`;
      tempPath.setAttribute('d', pathData);
    }

    svg.appendChild(tempPath);
  }

  updateDrawing(point) {
    const newPath = [...this.engine.getCurrentPath(), point];
    this.engine.setCurrentPath(newPath);

    const svg = this.engine.svgRef.current;
    const tempPath = svg?.querySelector('#temp-path');

    if (tempPath && newPath.length > 1) {
      try {
        const strokeOptions = this.engine.getStrokeOptions(this.engine.inputType, this.options.strokeWidth);
        const stroke = getStroke(newPath, strokeOptions);
        const pathData = this.engine.getSvgPathFromStroke(stroke);
        tempPath.setAttribute('d', pathData);
      } catch (error) {
        console.warn('Error updating path:', error);
      }
    }
  }

  handleErase(x, y) {
    const zoomLevel = this.options.viewBox ?
      this.engine.options.width / this.options.viewBox.width : 1;
    const eraserRadius = this.options.eraserWidth / zoomLevel;

    const paths = this.engine.getPaths();
    const currentPathsToErase = new Set(this.engine.getPathsToErase());

    for (let i = 0; i < paths.length; i++) {
      const pathObj = paths[i];
      if (!pathObj || !pathObj.id || currentPathsToErase.has(pathObj.id)) continue;

      let bbox = this.engine.pathBBoxes.get(pathObj.id);
      if (!bbox) {
        if (pathObj.type === 'stroke' && pathObj.pathData) {
          bbox = this.engine.calculateBoundingBox(pathObj.pathData);
          if (bbox) {
            this.engine.pathBBoxes.set(pathObj.id, bbox);
          }
        }
      }

      if (bbox && this.engine.eraserIntersectsBoundingBox(x, y, eraserRadius, bbox)) {
        currentPathsToErase.add(pathObj.id);
      }
    }

    if (currentPathsToErase.size !== this.engine.getPathsToErase().size) {
      this.engine.setPathsToErase(currentPathsToErase);
      if (this.callbacks.onPathsMarkedForErase) {
        this.callbacks.onPathsMarkedForErase(currentPathsToErase);
      }
    }
  }

  finalizeErase() {
    const pathsToErase = this.engine.getPathsToErase();
    if (pathsToErase.size > 0) {
      const newPaths = this.engine.getPaths().filter(path => !pathsToErase.has(path.id));

      if (newPaths.length < this.engine.getPaths().length) {
        this.engine.paths = newPaths;

        pathsToErase.forEach(pathId => {
          this.engine.pathBBoxes.delete(pathId);
        });

        if (this.callbacks.onPathsErased) {
          this.callbacks.onPathsErased();
        }
      }
    }

    this.engine.setPathsToErase(new Set());
  }

  finalizeStroke(e) {
    const currentPath = this.engine.getCurrentPath();
    
    if (currentPath.length <= 1) {
      console.log('Path too short to finalize, points:', currentPath.length);
      
      const svg = this.engine.svgRef.current;
      const tempPath = svg?.querySelector('#temp-path');
      if (tempPath) {
        tempPath.remove();
      }
      
      this.engine.setCurrentPath([]);
      return;
    }

    try {
      const strokeOptions = this.engine.getStrokeOptions(this.engine.inputType, this.options.strokeWidth);
      const stroke = getStroke(currentPath, strokeOptions);
      const pathData = this.engine.getSvgPathFromStroke(stroke);
      
      if (!pathData || pathData === '') {
        console.error('Invalid path data generated:', pathData);
        const svg = this.engine.svgRef.current;
        const tempPath = svg?.querySelector('#temp-path');
        if (tempPath) {
          tempPath.remove();
        }
        
        this.engine.setCurrentPath([]);
        return;
      }

      const svg = this.engine.svgRef.current;
      const tempPath = svg?.querySelector('#temp-path');
      if (tempPath) {
        tempPath.remove();
      }

      this.engine.addPath(
        pathData,
        this.options.strokeColor,
        this.options.strokeWidth,
        this.engine.inputType,
        currentPath
      );

      this.engine.setCurrentPath([]);

      if (this.callbacks.onStrokeComplete) {
        this.callbacks.onStrokeComplete();
      }
    } catch (error) {
      console.error('Error finalizing stroke:', error);
      
      const svg = this.engine.svgRef.current;
      const tempPath = svg?.querySelector('#temp-path');
      if (tempPath) {
        tempPath.remove();
      }
      
      this.engine.setCurrentPath([]);
    }
  }

  attachListeners(element) {
    element.addEventListener('pointerdown', this.handlePointerDown);
    element.addEventListener('pointermove', this.handlePointerMove);
    element.addEventListener('pointerup', this.handlePointerUp);
    element.addEventListener('pointercancel', this.handlePointerUp);
    element.addEventListener('mouseenter', this.handleMouseEnter);
    element.addEventListener('mouseleave', this.handleMouseLeave);
    element.addEventListener('wheel', this.handleWheel, { passive: false }); // NEW: Wheel support
  }

  detachListeners(element) {
    element.removeEventListener('pointerdown', this.handlePointerDown);
    element.removeEventListener('pointermove', this.handlePointerMove);
    element.removeEventListener('pointerup', this.handlePointerUp);
    element.removeEventListener('pointercancel', this.handlePointerUp);
    element.removeEventListener('mouseenter', this.handleMouseEnter);
    element.removeEventListener('mouseleave', this.handleMouseLeave);
    element.removeEventListener('wheel', this.handleWheel); // NEW: Remove wheel listener
  }
}