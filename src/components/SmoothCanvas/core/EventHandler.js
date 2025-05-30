// src/components/SmoothCanvas/core/EventHandler.js - FIXED WITH DUAL COORDINATE COLLECTION
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

    // Selection state
    this.isSelecting = false;
    this.isDraggingSelection = false;
    this.isResizingSelection = false;
    this.selectionDragStart = null;
    this.resizeHandle = null;
    this.originalBounds = null;

    // AI Handwriting state - ENHANCED
    this.isCapturingAI = false;
    this.currentAIStroke = [];
    this.aiProcessingTimer = null;
    this.lastAIPoint = null;
    this.aiStartTime = null;

    // FIXED: Add throttling and optimization variables
    this.dragThrottleTimeout = null;
    this.lastDragUpdate = 0;
    this.dragUpdateInterval = 16; // ~60fps
    this.accumulatedDelta = { x: 0, y: 0 };
    this.isThrottling = false;

    // Bind methods
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // NEW: Get simple canvas coordinates for AI (like Flask HTML)
  getSimpleCanvasCoordinates(e) {
    if (!this.engine.canvasRef.current) return null;

    const canvas = this.engine.canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Scale factors to match actual canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;

    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Simple canvas coordinates (like Flask HTML)
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    return { x, y };
  }

  // ===========================================
  // AI HANDWRITING METHODS - FIXED WITH RAW COORDINATES
  // ===========================================

  startAICapture(e) {
    // Get raw canvas coordinates (like Flask HTML)
    const canvas = this.engine.canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    console.log('AI Tool: Starting capture with raw coordinates:', { rawX, rawY });

    this.isCapturingAI = true;
    this.currentAIStroke = [{
      x: rawX,
      y: rawY,
      timestamp: Date.now(),
      isNewStroke: true
    }];
    this.lastAIPoint = { x: rawX, y: rawY };
    this.aiStartTime = Date.now();

    // Clear any existing timer
    if (this.aiProcessingTimer) {
      clearTimeout(this.aiProcessingTimer);
      this.aiProcessingTimer = null;
    }

    // Create visual feedback using complex coordinates
    const complexPoint = this.engine.getPointFromEvent(e);
    this.createTempAIPath(complexPoint);

    // Notify start
    if (this.callbacks.onAIStrokeStart) {
      this.callbacks.onAIStrokeStart({ x: rawX, y: rawY });
    }
  }

  updateAICapture(e) {
    if (!this.isCapturingAI) return;
    
    // Get raw canvas coordinates
    const canvas = this.engine.canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    
    // FIXED: Don't use coalesced events for AI - just the main event
    // This keeps point density similar to Flask's natural mouse events
    const lastPoint = this.lastAIPoint;
    if (Math.abs(rawX - lastPoint.x) > 1 || Math.abs(rawY - lastPoint.y) > 1) {
      this.currentAIStroke.push({
        x: rawX,
        y: rawY,
        timestamp: Date.now()
      });
      this.lastAIPoint = { x: rawX, y: rawY };
      
      this.updateTempAIPath();
    }
  }

  finishAICapture() {
    if (!this.isCapturingAI || this.currentAIStroke.length < 2) {
      console.log('AI Tool: Cannot finish capture - insufficient points');
      this.cancelAICapture();
      return;
    }

    console.log('AI Tool: Finishing capture with', this.currentAIStroke.length, 'raw points');

    // Calculate bounds using raw coordinates
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    this.currentAIStroke.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });

    const bounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };

    console.log('AI Tool: Raw bounds:', bounds);

    // Prepare stroke data with raw coordinates
    const strokeData = {
      points: this.currentAIStroke,
      bounds: bounds,
      duration: Date.now() - this.aiStartTime,
      timestamp: Date.now()
    };

    // Clear visual feedback
    this.clearTempAIPath();

    // Send raw data to AI processing
    if (this.callbacks.onAIStrokeComplete) {
      this.callbacks.onAIStrokeComplete(strokeData);
    }

    // Reset state
    this.isCapturingAI = false;
    this.currentAIStroke = [];
    this.aiProcessingTimer = null;
    this.lastAIPoint = null;
    this.aiStartTime = null;
  }

  cancelAICapture() {
    console.log('EventHandler: Cancelling AI capture');

    if (this.aiProcessingTimer) {
      clearTimeout(this.aiProcessingTimer);
      this.aiProcessingTimer = null;
    }

    this.clearTempAIPath();

    this.isCapturingAI = false;
    this.currentAIStroke = [];
    this.lastAIPoint = null;
    this.aiStartTime = null;
  }

  // FIXED: Visual feedback still uses complex coordinates for display
  createTempAIPath(point) {
    const svg = this.engine.svgRef.current;
    if (!svg) return;

    // Remove existing temp AI path
    const existingPath = svg.querySelector('#temp-ai-path');
    if (existingPath) {
      existingPath.remove();
    }

    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.id = 'temp-ai-path';
    tempPath.setAttribute('fill', 'none');
    tempPath.setAttribute('stroke', '#8b5cf6'); // Purple color for AI
    tempPath.setAttribute('stroke-width', '3');
    tempPath.setAttribute('stroke-dasharray', '5,5');
    tempPath.setAttribute('opacity', '0.8');

    const pathData = `M ${point[0]},${point[1]}`;
    tempPath.setAttribute('d', pathData);

    svg.appendChild(tempPath);
  }

  // updateTempAIPath() {
  //   const svg = this.engine.svgRef.current;
  //   const tempPath = svg?.querySelector('#temp-ai-path');

  //   if (tempPath && this.currentAIStroke.length > 1) {
  //     // Convert AI stroke points (simple coords) to SVG path for visual feedback
  //     let pathData = '';

  //     // Transform simple AI coordinates to viewBox coordinates for display
  //     const viewBox = this.options.viewBox || this.engine.options.viewBox || 
  //       { x: 0, y: 0, width: this.engine.options.width, height: this.engine.options.height };

  //     for (let i = 0; i < this.currentAIStroke.length; i++) {
  //       const point = this.currentAIStroke[i];

  //       // Convert simple canvas coordinates to viewBox coordinates for display
  //       const svgX = viewBox.x + (point.x / this.engine.options.width) * viewBox.width;
  //       const svgY = viewBox.y + (point.y / this.engine.options.height) * viewBox.height;

  //       if (point.isNewStroke && i > 0) {
  //         pathData += ` M ${svgX},${svgY}`;
  //       } else if (i === 0) {
  //         pathData = `M ${svgX},${svgY}`;
  //       } else {
  //         pathData += ` L ${svgX},${svgY}`;
  //       }
  //     }

  //     tempPath.setAttribute('d', pathData);
  //   }
  // }

  updateTempAIPath() {
    const svg = this.engine.svgRef.current;
    const tempPath = svg?.querySelector('#temp-ai-path');

    if (tempPath && this.currentAIStroke.length > 1) {
      // Convert raw AI coordinates to SVG coordinates for visual display
      const viewBox = this.options.viewBox || this.engine.options.viewBox ||
        { x: 0, y: 0, width: this.engine.options.width, height: this.engine.options.height };

      let pathData = '';

      for (let i = 0; i < this.currentAIStroke.length; i++) {
        const point = this.currentAIStroke[i];

        // Convert raw canvas coordinates to viewBox coordinates for display
        const svgX = viewBox.x + (point.x / this.engine.options.width) * viewBox.width;
        const svgY = viewBox.y + (point.y / this.engine.options.height) * viewBox.height;

        if (point.isNewStroke && i > 0) {
          pathData += ` M ${svgX},${svgY}`;
        } else if (i === 0) {
          pathData = `M ${svgX},${svgY}`;
        } else {
          pathData += ` L ${svgX},${svgY}`;
        }
      }

      tempPath.setAttribute('d', pathData);
    }
  }

  clearTempAIPath() {
    const svg = this.engine.svgRef.current;
    if (!svg) return;

    const tempPath = svg.querySelector('#temp-ai-path');
    if (tempPath) {
      tempPath.remove();
    }
  }

  // Calculate bounds using simple coordinates
  calculateSimpleStrokeBounds(stroke) {
    if (stroke.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const point of stroke) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  }

  // Keep the original complex bounds calculation for visual elements
  calculateStrokeBounds(stroke) {
    if (stroke.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const point of stroke) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  }

  // ===========================================
  // MAIN EVENT HANDLERS - ENHANCED WITH AI SUPPORT
  // ===========================================

  handlePointerDown(e) {
    if (!this.engine.canvasRef.current || !e.isPrimary) return;

    const point = this.engine.getPointFromEvent(e);
    const worldPoint = { x: point[0], y: point[1] };

    console.log('Pointer down:', {
      tool: this.options.currentTool,
      point: worldPoint,
      isCapturingAI: this.isCapturingAI
    });

    // Handle AI handwriting tool - FIXED WITH SIMPLE COORDINATES
    if (this.options.currentTool === 'aiHandwriting') {
      console.log('AI Tool: Pointer down detected');

      // Check if we're starting a new stroke while already capturing (multi-stroke word)
      if (this.isCapturingAI) {
        console.log('AI Tool: Adding new stroke to existing capture');

        // Clear any pending timer since user is still writing
        if (this.aiProcessingTimer) {
          clearTimeout(this.aiProcessingTimer);
          this.aiProcessingTimer = null;
        }

        // Get simple coordinates for AI data
        const simpleCoords = this.getSimpleCanvasCoordinates(e);
        if (simpleCoords) {
          // Add a stroke separator
          this.currentAIStroke.push({
            x: simpleCoords.x,
            y: simpleCoords.y,
            timestamp: Date.now(),
            isNewStroke: true // Mark as start of new stroke
          });
        }
      } else {
        console.log('AI Tool: Starting new capture session');
        this.startAICapture(e);
      }

      // Set the active pointer and capture
      this.engine.activePointer = e.pointerId;
      this.engine.isDrawing = true;

      if (this.engine.canvasRef.current.setPointerCapture) {
        this.engine.canvasRef.current.setPointerCapture(e.pointerId);
      }

      e.preventDefault();
      return;
    }

    // Handle pan tool
    if (this.options.currentTool === 'pan' || e.altKey || e.buttons === 4) {
      this.startPanning(e);
      return;
    }

    // Handle selection tool
    if (this.options.currentTool === 'select') {
      this.handleSelectionPointerDown(e, worldPoint);
      return;
    }

    // Handle rectangle tool
    if (this.options.currentTool === 'rectangle') {
      this.startRectangleDrawing(e);
      return;
    }

    // Existing drawing logic for pen and eraser
    this.engine.isDrawing = true;
    this.engine.activePointer = e.pointerId;
    e.preventDefault();

    if (this.engine.canvasRef.current.setPointerCapture) {
      this.engine.canvasRef.current.setPointerCapture(e.pointerId);
    }

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

    const point = this.engine.getPointFromEvent(e);
    const worldPoint = { x: point[0], y: point[1] };

    // Handle AI handwriting tool movement - FIXED WITH SIMPLE COORDINATES
    if (this.options.currentTool === 'aiHandwriting') {
      // Only update if we're actively capturing AND this is the active pointer
      if (this.isCapturingAI && e.pointerId === this.engine.activePointer) {
        console.log('AI Tool: Pointer move, updating capture with simple coordinates');
        this.updateAICapture(e);
        e.preventDefault();
      }
      return;
    }

    // Handle panning
    if (this.isPanning) {
      this.continuePanning(e);
      return;
    }

    // FIXED: Optimized selection dragging
    if (this.isDraggingSelection && e.pointerId === this.engine.activePointer) {
      e.preventDefault();

      // FIXED: Accumulate movement instead of applying immediately
      const deltaX = worldPoint.x - this.selectionDragStart.x;
      const deltaY = worldPoint.y - this.selectionDragStart.y;

      // Only accumulate if movement is significant
      if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
        this.accumulatedDelta.x += deltaX;
        this.accumulatedDelta.y += deltaY;
        this.selectionDragStart = worldPoint;
      }

      // The actual movement is handled by throttledDragUpdate
      return;
    }

    // Handle selection tool interactions
    if (this.options.currentTool === 'select') {
      this.handleSelectionPointerMove(e, worldPoint);
      return;
    }

    // Handle rectangle drawing
    if (this.options.currentTool === 'rectangle' && this.engine.isDrawingShape()) {
      this.updateRectangleDrawing(e);
      return;
    }

    // Handle pan tool hover (show grab cursor)
    if (this.options.currentTool === 'pan' && !this.engine.isDrawing) {
      return;
    }

    // Update eraser position
    if (this.options.currentTool === 'eraser') {
      this.engine.eraserPosition = { x: point[0], y: point[1] };
      this.engine.showEraser = true;

      if (this.callbacks.onEraserMove) {
        this.callbacks.onEraserMove(this.engine.eraserPosition);
      }
    }

    if (!this.engine.isDrawing || e.pointerId !== this.engine.activePointer) return;
    e.preventDefault();

    if (this.engine.isErasing) {
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
    console.log('Pointer up event:', {
      tool: this.options.currentTool,
      isCapturingAI: this.isCapturingAI,
      pointerId: e.pointerId,
      activePointer: this.engine.activePointer
    });

    // Handle AI handwriting tool end - FIXED
    if (this.options.currentTool === 'aiHandwriting') {
      console.log('AI Tool: Pointer up detected');

      // Only handle if this is the active pointer and we're capturing
      if (this.isCapturingAI && e.pointerId === this.engine.activePointer) {
        console.log('AI Tool: Handling pointer up for active capture');

        // Release pointer capture
        if (this.engine.canvasRef.current?.releasePointerCapture) {
          this.engine.canvasRef.current.releasePointerCapture(e.pointerId);
        }

        // Reset engine state
        this.engine.isDrawing = false;
        this.engine.activePointer = null;

        // NOW start/reset the timer when user stops drawing
        if (this.currentAIStroke.length >= 2) {
          // Clear any existing timer
          if (this.aiProcessingTimer) {
            clearTimeout(this.aiProcessingTimer);
          }

          // Start new 1-second timer
          console.log('AI Tool: Starting 1-second processing timer');
          this.aiProcessingTimer = setTimeout(() => {
            console.log('AI Tool: Timer expired, finishing capture');
            this.finishAICapture();
          }, 1000);
        } else {
          // Not enough points, cancel
          this.cancelAICapture();
        }

        console.log('AI Tool: Timer set, ready for next stroke or processing');

        e.preventDefault();
        return;
      }
    }

    // Handle pan end
    if (this.isPanning) {
      this.endPanning(e);
      return;
    }

    // Handle selection tool interactions
    if (this.options.currentTool === 'select') {
      this.handleSelectionPointerUp(e);
      return;
    }

    // Handle rectangle drawing end
    if (this.options.currentTool === 'rectangle' && this.engine.isDrawingShape()) {
      this.finishRectangleDrawing(e);
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

  // ... (keeping all other existing methods unchanged - selection, pan, drawing, etc.)
  // For brevity, I'll only include the method signatures here, but the full implementation remains the same

  // FIXED: Throttled drag update method
  throttledDragUpdate = () => {
    if (!this.isThrottling || !this.isDraggingSelection) {
      return;
    }

    const now = Date.now();
    if (now - this.lastDragUpdate >= this.dragUpdateInterval) {
      const { x, y } = this.accumulatedDelta;

      if (Math.abs(x) > 0.5 || Math.abs(y) > 0.5) {
        this.engine.moveSelectedItems(x, y);
        this.accumulatedDelta = { x: 0, y: 0 };
        this.lastDragUpdate = now;

        if (this.callbacks.onSelectionMoved) {
          this.callbacks.onSelectionMoved(this.engine.getSelectedItems());
        }
      }
    }

    if (this.isDraggingSelection) {
      this.dragThrottleTimeout = requestAnimationFrame(this.throttledDragUpdate);
    } else {
      this.isThrottling = false;
    }
  };

  handleSelectionPointerDown(e, worldPoint) {
    e.preventDefault();

    console.log('=== SELECTION CLICK DEBUG ===');
    console.log('World point:', worldPoint);
    console.log('Available paths:', this.engine.paths.length);

    if (this.engine.selectionBounds) {
      const handle = this.engine.getResizeHandleAtPoint(worldPoint, this.engine.selectionBounds);
      if (handle) {
        console.log('Clicked on resize handle:', handle);
        this.startResizing(e, handle, worldPoint);
        return;
      }
    }

    console.log('Starting hit test...');
    const clickedItem = this.engine.findItemAtPoint(worldPoint);
    console.log('Hit test result:', clickedItem);

    if (clickedItem) {
      console.log('Found clicked item:', {
        id: clickedItem.id,
        type: clickedItem.type,
        isSelected: this.engine.isItemSelected(clickedItem.id)
      });

      if (this.engine.isItemSelected(clickedItem.id)) {
        console.log('Clicked on selected item, starting drag');
        this.startDraggingSelection(e, worldPoint);
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        console.log('Multi-select mode');
        this.engine.addToSelection(clickedItem.id);
      } else {
        console.log('Single select mode');
        this.engine.setSelectedItems([clickedItem.id]);
      }

      if (this.callbacks.onSelectionChanged) {
        this.callbacks.onSelectionChanged(this.engine.getSelectedItems());
      }
      return;
    }

    console.log('Clicked on empty space');

    if (!e.ctrlKey && !e.metaKey) {
      this.engine.clearSelection();
      if (this.callbacks.onSelectionChanged) {
        this.callbacks.onSelectionChanged([]);
      }
    }

    console.log('Starting area selection');
    this.startAreaSelection(e, worldPoint);
  }

  startAreaSelection(e, worldPoint) {
    this.isSelecting = true;
    this.engine.startAreaSelection(worldPoint);

    if (this.engine.canvasRef.current.setPointerCapture) {
      this.engine.canvasRef.current.setPointerCapture(e.pointerId);
    }

    this.engine.activePointer = e.pointerId;
  }

  startDraggingSelection(e, worldPoint) {
    console.log('FIXED: Starting selection drag');
    this.isDraggingSelection = true;
    this.selectionDragStart = worldPoint;
    this.accumulatedDelta = { x: 0, y: 0 };
    this.lastDragUpdate = Date.now();

    if (this.engine.canvasRef.current.setPointerCapture) {
      this.engine.canvasRef.current.setPointerCapture(e.pointerId);
    }

    this.engine.activePointer = e.pointerId;

    this.isThrottling = true;
    this.dragThrottleTimeout = requestAnimationFrame(this.throttledDragUpdate);

    if (this.callbacks.onSelectionDragStart) {
      this.callbacks.onSelectionDragStart();
    }

    this.engine.canvasRef.current.style.cursor = 'move';
  }

  startResizing(e, handle, worldPoint) {
    this.isResizingSelection = true;
    this.resizeHandle = handle;
    this.selectionDragStart = worldPoint;
    this.originalBounds = { ...this.engine.selectionBounds };

    if (this.engine.canvasRef.current.setPointerCapture) {
      this.engine.canvasRef.current.setPointerCapture(e.pointerId);
    }

    this.engine.activePointer = e.pointerId;

    const cursors = {
      'nw': 'nw-resize', 'n': 'n-resize', 'ne': 'ne-resize',
      'e': 'e-resize', 'se': 'se-resize', 's': 's-resize',
      'sw': 'sw-resize', 'w': 'w-resize'
    };
    this.engine.canvasRef.current.style.cursor = cursors[handle] || 'default';
  }

  handleSelectionPointerMove(e, worldPoint) {
    if (this.isSelecting && e.pointerId === this.engine.activePointer) {
      e.preventDefault();
      this.engine.updateAreaSelection(worldPoint);

      if (this.callbacks.onSelectionRectChanged) {
        this.callbacks.onSelectionRectChanged(this.engine.selectionRect);
      }
      return;
    }

    if (this.isResizingSelection && e.pointerId === this.engine.activePointer) {
      e.preventDefault();
      console.log('Resizing selection');

      const newBounds = this.calculateNewBounds(worldPoint);
      if (newBounds) {
        this.engine.resizeSelectedItems(newBounds);

        if (this.callbacks.onSelectionChanged) {
          this.callbacks.onSelectionChanged(this.engine.getSelectedItems());
        }
      }
      return;
    }

    if (!this.isSelecting && !this.isDraggingSelection && !this.isResizingSelection) {
      this.updateSelectionCursor(worldPoint);
    }
  }

  calculateNewBounds(currentPoint) {
    if (!this.originalBounds || !this.resizeHandle) return null;

    const { x, y, width, height } = this.originalBounds;
    const deltaX = currentPoint.x - this.selectionDragStart.x;
    const deltaY = currentPoint.y - this.selectionDragStart.y;

    let newBounds = { x, y, width, height };

    switch (this.resizeHandle) {
      case 'nw':
        newBounds.x = x + deltaX;
        newBounds.y = y + deltaY;
        newBounds.width = width - deltaX;
        newBounds.height = height - deltaY;
        break;
      case 'n':
        newBounds.y = y + deltaY;
        newBounds.height = height - deltaY;
        break;
      case 'ne':
        newBounds.y = y + deltaY;
        newBounds.width = width + deltaX;
        newBounds.height = height - deltaY;
        break;
      case 'e':
        newBounds.width = width + deltaX;
        break;
      case 'se':
        newBounds.width = width + deltaX;
        newBounds.height = height + deltaY;
        break;
      case 's':
        newBounds.height = height + deltaY;
        break;
      case 'sw':
        newBounds.x = x + deltaX;
        newBounds.width = width - deltaX;
        newBounds.height = height + deltaY;
        break;
      case 'w':
        newBounds.x = x + deltaX;
        newBounds.width = width - deltaX;
        break;
    }

    const minSize = 10;
    if (newBounds.width < minSize) {
      if (this.resizeHandle.includes('w')) {
        newBounds.x = newBounds.x + newBounds.width - minSize;
      }
      newBounds.width = minSize;
    }
    if (newBounds.height < minSize) {
      if (this.resizeHandle.includes('n')) {
        newBounds.y = newBounds.y + newBounds.height - minSize;
      }
      newBounds.height = minSize;
    }

    return newBounds;
  }

  updateSelectionCursor(worldPoint) {
    let cursor = 'default';

    if (this.engine.selectionBounds) {
      const handle = this.engine.getResizeHandleAtPoint(worldPoint, this.engine.selectionBounds);
      if (handle) {
        const cursors = {
          'nw': 'nw-resize', 'n': 'n-resize', 'ne': 'ne-resize',
          'e': 'e-resize', 'se': 'se-resize', 's': 's-resize',
          'sw': 'sw-resize', 'w': 'w-resize'
        };
        cursor = cursors[handle] || 'default';
      } else {
        const item = this.engine.findItemAtPoint(worldPoint);
        if (item && this.engine.isItemSelected(item.id)) {
          cursor = 'move';
        }
      }
    } else {
      const item = this.engine.findItemAtPoint(worldPoint);
      if (item) {
        cursor = 'pointer';
      }
    }

    this.engine.canvasRef.current.style.cursor = cursor;
  }

  handleSelectionPointerUp(e) {
    e.preventDefault();
    console.log('Selection pointer up');

    if (this.engine.canvasRef.current?.releasePointerCapture) {
      this.engine.canvasRef.current.releasePointerCapture(e.pointerId);
    }

    // Finish area selection
    if (this.isSelecting && e.pointerId === this.engine.activePointer) {
      console.log('Finishing area selection');
      const addToExisting = e.ctrlKey || e.metaKey;
      const selectedItems = this.engine.finishAreaSelection(addToExisting);

      console.log('Area selection result:', selectedItems);

      if (this.callbacks.onSelectionChanged) {
        this.callbacks.onSelectionChanged(selectedItems);
      }

      this.isSelecting = false;
    }

    // FIXED: Finish dragging selection with proper cleanup
    if (this.isDraggingSelection && e.pointerId === this.engine.activePointer) {
      console.log('FIXED: Finished dragging selection');

      this.isThrottling = false;
      if (this.dragThrottleTimeout) {
        cancelAnimationFrame(this.dragThrottleTimeout);
        this.dragThrottleTimeout = null;
      }

      const { x, y } = this.accumulatedDelta;
      if (Math.abs(x) > 0.5 || Math.abs(y) > 0.5) {
        this.engine.moveSelectedItems(x, y);
      }

      this.isDraggingSelection = false;
      this.selectionDragStart = null;
      this.accumulatedDelta = { x: 0, y: 0 };

      if (this.callbacks.onSelectionDragEnd) {
        this.callbacks.onSelectionDragEnd();
      }

      if (this.callbacks.onSelectionMoved) {
        this.callbacks.onSelectionMoved(this.engine.getSelectedItems());
      }
    }

    // Finish resizing selection
    if (this.isResizingSelection && e.pointerId === this.engine.activePointer) {
      console.log('Finished resizing selection');
      this.isResizingSelection = false;
      this.resizeHandle = null;
      this.selectionDragStart = null;
      this.originalBounds = null;

      if (this.callbacks.onSelectionResized) {
        this.callbacks.onSelectionResized(this.engine.getSelectedItems());
      }
    }

    this.engine.activePointer = null;

    if (this.options.currentTool === 'select') {
      this.engine.canvasRef.current.style.cursor = 'default';
    }
  }

  // FIXED: Keyboard event handler with proper arrow key movement and AI tool support
  handleKeyDown(e) {
    // NEW: Handle AI tool keyboard shortcuts
    if (this.options.currentTool === 'aiHandwriting') {
      switch (e.key) {
        case 'Escape':
          if (this.isCapturingAI) {
            e.preventDefault();
            this.cancelAICapture();
          }
          break;
      }
      return;
    }

    if (this.options.currentTool !== 'select') return;

    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        if (this.engine.selectedItems.size > 0) {
          e.preventDefault();
          this.engine.deleteSelectedItems();
          if (this.callbacks.onSelectionChanged) {
            this.callbacks.onSelectionChanged([]);
          }
        }
        break;

      case 'a':
      case 'A':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const allItems = this.engine.getPaths().map(item => item.id);
          this.engine.setSelectedItems(allItems);
          if (this.callbacks.onSelectionChanged) {
            this.callbacks.onSelectionChanged(allItems);
          }
        }
        break;

      case 'Escape':
        if (this.engine.selectedItems.size > 0) {
          e.preventDefault();
          this.engine.clearSelection();
          if (this.callbacks.onSelectionChanged) {
            this.callbacks.onSelectionChanged([]);
          }
        }
        break;

      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        if (this.engine.selectedItems.size > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          let deltaX = 0, deltaY = 0;

          switch (e.key) {
            case 'ArrowUp': deltaY = -step; break;
            case 'ArrowDown': deltaY = step; break;
            case 'ArrowLeft': deltaX = -step; break;
            case 'ArrowRight': deltaX = step; break;
          }

          console.log('FIXED: Moving selection by keyboard:', { deltaX, deltaY });

          this.engine.moveSelectedItems(deltaX, deltaY);
          this.engine.selectionBounds = this.engine.getSelectionBounds(this.engine.selectedItems);

          if (this.callbacks.onSelectionMoved) {
            this.callbacks.onSelectionMoved(this.engine.getSelectedItems());
          }
        }
        break;
    }
  }

  // ===========================================
  // RECTANGLE DRAWING METHODS - EXISTING
  // ===========================================

  startRectangleDrawing(e) {
    console.log('Starting rectangle drawing');
    e.preventDefault();

    if (this.engine.canvasRef.current.setPointerCapture) {
      this.engine.canvasRef.current.setPointerCapture(e.pointerId);
    }

    const point = this.engine.getPointFromEvent(e);
    this.engine.startRectangle(point);
    this.engine.activePointer = e.pointerId;
  }

  updateRectangleDrawing(e) {
    if (!this.engine.isDrawingShape() || e.pointerId !== this.engine.activePointer) return;

    e.preventDefault();
    const point = this.engine.getPointFromEvent(e);
    this.engine.updateRectangle(point);
  }

  finishRectangleDrawing(e) {
    console.log('Finishing rectangle drawing');
    e.preventDefault();

    if (this.engine.canvasRef.current?.releasePointerCapture) {
      this.engine.canvasRef.current.releasePointerCapture(e.pointerId);
    }

    const createdShape = this.engine.finishRectangle();
    this.engine.activePointer = null;

    if (createdShape && this.callbacks.onShapeComplete) {
      this.callbacks.onShapeComplete(createdShape);
    } else if (this.callbacks.onStrokeComplete) {
      this.callbacks.onStrokeComplete();
    }
  }

  // ===========================================
  // PAN TOOL METHODS - EXISTING
  // ===========================================

  startPanning(e) {
    console.log('EventHandler: Starting pan');
    this.isPanning = true;
    this.panStartPoint = { x: e.clientX, y: e.clientY };
    this.lastPanPoint = { x: e.clientX, y: e.clientY };

    e.preventDefault();
    e.stopPropagation();

    if (this.engine.canvasRef.current.setPointerCapture) {
      this.engine.canvasRef.current.setPointerCapture(e.pointerId);
    }

    const canvas = this.engine.canvasRef.current;
    const container = canvas.parentElement;
    if (canvas) {
      canvas.style.cursor = 'grabbing';
    }
    if (container) {
      container.classList.add('panningMode');
    }

    if (this.callbacks.onPanStart) {
      this.callbacks.onPanStart();
    }
  }

  continuePanning(e) {
    if (!this.isPanning || !this.lastPanPoint) return;

    const deltaX = e.clientX - this.lastPanPoint.x;
    const deltaY = e.clientY - this.lastPanPoint.y;

    if (this.callbacks.onPan) {
      this.callbacks.onPan(deltaX, deltaY);
    } else if (this.engine.options.onPan) {
      this.engine.options.onPan(deltaX, deltaY);
    } else {
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

        this.options.viewBox = newViewBox;
        this.engine.options.viewBox = newViewBox;

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

    if (this.engine.canvasRef.current?.releasePointerCapture) {
      this.engine.canvasRef.current.releasePointerCapture(e.pointerId);
    }

    const canvas = this.engine.canvasRef.current;
    const container = canvas?.parentElement;
    if (container) {
      container.classList.remove('panningMode');
    }
    if (canvas) {
      switch (this.options.currentTool) {
        case 'pan':
          canvas.style.cursor = 'grab';
          break;
        case 'pen':
          canvas.style.cursor = 'crosshair';
          break;
        case 'rectangle':
          canvas.style.cursor = 'crosshair';
          break;
        case 'eraser':
          canvas.style.cursor = 'none';
          break;
        case 'select':
          canvas.style.cursor = 'default';
          break;
        case 'aiHandwriting':
          canvas.style.cursor = 'crosshair';
          break;
        default:
          canvas.style.cursor = 'default';
          break;
      }
    }

    if (this.callbacks.onPanEnd) {
      this.callbacks.onPanEnd();
    }

    e.preventDefault();
  }

  // ===========================================
  // WHEEL ZOOM SUPPORT - EXISTING
  // ===========================================

  handleWheel(e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();

      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;

      if (this.callbacks.onZoom) {
        this.callbacks.onZoom(zoomDelta, { x: e.clientX, y: e.clientY });
      }
    }
  }

  // ===========================================
  // MOUSE ENTER/LEAVE HANDLERS - ENHANCED WITH AI SUPPORT
  // ===========================================

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

    if (this.options.currentTool === 'rectangle' && this.engine.isDrawingShape()) {
      this.engine.cancelRectangle();
    }

    if (this.options.currentTool === 'select' && this.isSelecting) {
      this.engine.clearSelection();
      this.isSelecting = false;
    }

    // NEW: Handle AI capture when mouse leaves - FIXED
    if (this.options.currentTool === 'aiHandwriting' && this.isCapturingAI) {
      console.log('AI Tool: Mouse left canvas during capture, finishing');
      if (this.currentAIStroke.length >= 2) {
        this.finishAICapture();
      } else {
        this.cancelAICapture();
      }
    }
  }

  // ===========================================
  // DRAWING METHODS - EXISTING (PEN/ERASER)
  // ===========================================

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
        } else if (pathObj.type === 'shape') {
          bbox = this.engine.calculateBoundingBox(pathObj);
        } else if (pathObj.type === 'aiText') {
          bbox = this.engine.calculateTextBounds(pathObj);
        }
        if (bbox) {
          this.engine.pathBBoxes.set(pathObj.id, bbox);
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
          this.engine.removeFromSelection(pathId);
          this.engine.aiTextElements.delete(pathId);
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

  // ===========================================
  // CLEANUP AND LIFECYCLE - ENHANCED WITH AI CLEANUP
  // ===========================================

  cleanup() {
    console.log('EventHandler: Cleaning up');

    if (this.dragThrottleTimeout) {
      cancelAnimationFrame(this.dragThrottleTimeout);
      this.dragThrottleTimeout = null;
    }

    if (this.aiProcessingTimer) {
      clearTimeout(this.aiProcessingTimer);
      this.aiProcessingTimer = null;
    }
    this.clearTempAIPath();

    this.isThrottling = false;
    this.isDraggingSelection = false;
    this.isSelecting = false;
    this.isResizingSelection = false;
    this.isPanning = false;

    this.isCapturingAI = false;
    this.currentAIStroke = [];
    this.lastAIPoint = null;
    this.aiStartTime = null;

    this.accumulatedDelta = { x: 0, y: 0 };
    this.selectionDragStart = null;
    this.lastPanPoint = null;
    this.panStartPoint = null;
  }

  attachListeners(element) {
    element.addEventListener('pointerdown', this.handlePointerDown);
    element.addEventListener('pointermove', this.handlePointerMove);
    element.addEventListener('pointerup', this.handlePointerUp);
    element.addEventListener('pointercancel', this.handlePointerUp);
    element.addEventListener('mouseenter', this.handleMouseEnter);
    element.addEventListener('mouseleave', this.handleMouseLeave);
    element.addEventListener('wheel', this.handleWheel, { passive: false });

    document.addEventListener('keydown', this.handleKeyDown);
  }

  detachListeners(element) {
    this.cleanup();

    element.removeEventListener('pointerdown', this.handlePointerDown);
    element.removeEventListener('pointermove', this.handlePointerMove);
    element.removeEventListener('pointerup', this.handlePointerUp);
    element.removeEventListener('pointercancel', this.handlePointerUp);
    element.removeEventListener('mouseenter', this.handleMouseEnter);
    element.removeEventListener('mouseleave', this.handleMouseLeave);
    element.removeEventListener('wheel', this.handleWheel);

    document.removeEventListener('keydown', this.handleKeyDown);
  }
}