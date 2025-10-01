// src/components/SmoothCanvas/core/EventHandler.js - FIXED SELECTION TOOL
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

    // FIXED: Selection state with better tracking
    this.isSelecting = false;
    this.isDraggingSelection = false;
    this.isResizingSelection = false;
    this.selectionDragStart = null;
    this.resizeHandle = null;
    this.originalBounds = null;
    this.lastPointerDown = null; // Track last pointer down event

    // AI Handwriting state
    this.isCapturingAI = false;
    this.currentAIStroke = [];
    this.aiProcessingTimer = null;
    this.lastAIPoint = null;
    this.aiStartTime = null;
    this.aiStrokeCount = 0;
    this.currentStrokePoints = [];

    // FIXED: Throttling and optimization variables
    this.dragThrottleTimeout = null;
    this.lastDragUpdate = 0;
    this.dragUpdateInterval = 16; // ~60fps
    this.accumulatedDelta = { x: 0, y: 0 };
    this.isThrottling = false;

    // FIXED: Selection debugging
    this.debugSelection = true; // Enable for debugging

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

  // FIXED: Enhanced coordinate conversion for selection
  getWorldCoordinates(e) {
    if (!this.engine.canvasRef.current) return null;

    const rect = this.engine.canvasRef.current.getBoundingClientRect();
    
    // Get client coordinates
    let clientX, clientY;
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Convert to canvas coordinates
    const canvasX = (clientX - rect.left) / rect.width * this.engine.options.width;
    const canvasY = (clientY - rect.top) / rect.height * this.engine.options.height;

    // Convert to world coordinates using viewBox
    const viewBox = this.engine.options.viewBox || 
      { x: 0, y: 0, width: this.engine.options.width, height: this.engine.options.height };
    
    const worldX = viewBox.x + (canvasX / this.engine.options.width) * viewBox.width;
    const worldY = viewBox.y + (canvasY / this.engine.options.height) * viewBox.height;

    return { x: worldX, y: worldY };
  }

  // Get simple canvas coordinates for AI (like Flask HTML)
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
  // MAIN EVENT HANDLERS - FIXED SELECTION
  // ===========================================

  handlePointerDown(e) {
    if (!this.engine.canvasRef.current || !e.isPrimary) return;

    // Store the last pointer down for debugging
    this.lastPointerDown = {
      timestamp: Date.now(),
      tool: this.options.currentTool,
      clientX: e.clientX,
      clientY: e.clientY
    };

    const point = this.engine.getPointFromEvent(e);
    const worldPoint = this.getWorldCoordinates(e);

    if (this.debugSelection) {
      console.log('=== POINTER DOWN ===');
      console.log('Tool:', this.options.currentTool);
      console.log('Engine point:', point);
      console.log('World point:', worldPoint);
      console.log('ViewBox:', this.engine.options.viewBox);
    }

    // Handle AI handwriting tool
    if (this.options.currentTool === 'aiHandwriting') {
      if (this.isCapturingAI) {
        this.continueAICapture(e);
      } else {
        this.startAICapture(e);
      }

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

    // FIXED: Handle selection tool with improved logic
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
    const worldPoint = this.getWorldCoordinates(e);

    // Handle AI handwriting tool movement
    if (this.options.currentTool === 'aiHandwriting') {
      if (this.isCapturingAI && this.engine.isDrawing && e.pointerId === this.engine.activePointer) {
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

    // FIXED: Selection dragging with proper throttling
    if (this.isDraggingSelection && e.pointerId === this.engine.activePointer) {
      e.preventDefault();

      const deltaX = worldPoint.x - this.selectionDragStart.x;
      const deltaY = worldPoint.y - this.selectionDragStart.y;

      // Only accumulate if movement is significant
      if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
        this.accumulatedDelta.x += deltaX;
        this.accumulatedDelta.y += deltaY;
        this.selectionDragStart = worldPoint;

        // Start throttled updates if not already running
        if (!this.isThrottling) {
          this.isThrottling = true;
          this.dragThrottleTimeout = requestAnimationFrame(this.throttledDragUpdate);
        }
      }
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
    if (this.debugSelection) {
      console.log('=== POINTER UP ===');
      console.log('Tool:', this.options.currentTool);
      console.log('Is selecting:', this.isSelecting);
      console.log('Is dragging selection:', this.isDraggingSelection);
      console.log('Is resizing selection:', this.isResizingSelection);
    }

    // Handle AI handwriting tool end
    if (this.options.currentTool === 'aiHandwriting') {
      if (this.isCapturingAI && e.pointerId === this.engine.activePointer) {
        if (this.engine.canvasRef.current?.releasePointerCapture) {
          try {
            this.engine.canvasRef.current.releasePointerCapture(e.pointerId);
          } catch (err) {
            console.log('AI Tool: Pointer already released');
          }
        }

        this.engine.isDrawing = false;
        this.engine.activePointer = null;

        this.clearAITimer();

        if (this.currentAIStroke.length >= 2) {
          this.aiProcessingTimer = setTimeout(() => {
            this.finishAICapture();
          }, 1000);
        } else {
          this.cancelAICapture();
        }

        e.preventDefault();
        return;
      }
    }

    // Handle pan end
    if (this.isPanning) {
      this.endPanning(e);
      return;
    }

    // FIXED: Handle selection tool interactions
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

  // ===========================================
  // FIXED SELECTION METHODS
  // ===========================================

  // FIXED: Better selection pointer down handling
  handleSelectionPointerDown(e, worldPoint) {
    e.preventDefault();

    if (this.debugSelection) {
      console.log('=== SELECTION POINTER DOWN ===');
      console.log('World point:', worldPoint);
      console.log('Available paths:', this.engine.paths.length);
      console.log('Current selection:', Array.from(this.engine.selectedItems));
      console.log('Selection bounds:', this.engine.selectionBounds);
    }

    // Check for resize handle interaction first
    if (this.engine.selectionBounds && this.engine.selectedItems.size > 0) {
      const handle = this.engine.getResizeHandleAtPoint(worldPoint, this.engine.selectionBounds);
      if (handle) {
        if (this.debugSelection) {
          console.log('Clicked on resize handle:', handle);
        }
        this.startResizing(e, handle, worldPoint);
        return;
      }
    }

    // FIXED: Find item at point with better debugging
    if (this.debugSelection) {
      console.log('Starting hit test...');
    }
    
    const clickedItem = this.engine.findItemAtPoint(worldPoint);
    
    if (this.debugSelection) {
      console.log('Hit test result:', clickedItem ? {
        id: clickedItem.id,
        type: clickedItem.type,
        isSelected: this.engine.isItemSelected(clickedItem.id)
      } : 'No item found');
    }

    if (clickedItem) {
      // FIXED: Handle clicking on selected items
      if (this.engine.isItemSelected(clickedItem.id)) {
        if (this.debugSelection) {
          console.log('Clicked on selected item, starting drag');
        }
        this.startDraggingSelection(e, worldPoint);
        return;
      }

      // FIXED: Handle multi-select and single select
      if (e.ctrlKey || e.metaKey) {
        if (this.debugSelection) {
          console.log('Multi-select mode - adding to selection');
        }
        this.engine.addToSelection(clickedItem.id);
      } else {
        if (this.debugSelection) {
          console.log('Single select mode - replacing selection');
        }
        this.engine.setSelectedItems([clickedItem.id]);
      }

      // Notify callback
      if (this.callbacks.onSelectionChanged) {
        this.callbacks.onSelectionChanged(this.engine.getSelectedItems());
      }
      return;
    }

    // FIXED: Handle clicking on empty space
    if (this.debugSelection) {
      console.log('Clicked on empty space');
    }

    // Clear selection if not holding modifier keys
    if (!e.ctrlKey && !e.metaKey) {
      if (this.engine.selectedItems.size > 0) {
        if (this.debugSelection) {
          console.log('Clearing existing selection');
        }
        this.engine.clearSelection();
        if (this.callbacks.onSelectionChanged) {
          this.callbacks.onSelectionChanged([]);
        }
      }
    }

    // Start area selection
    if (this.debugSelection) {
      console.log('Starting area selection');
    }
    this.startAreaSelection(e, worldPoint);
  }

  // FIXED: Improved selection pointer move handling
  handleSelectionPointerMove(e, worldPoint) {
    // Handle area selection
    if (this.isSelecting && e.pointerId === this.engine.activePointer) {
      e.preventDefault();
      this.engine.updateAreaSelection(worldPoint);

      if (this.callbacks.onSelectionRectChanged) {
        this.callbacks.onSelectionRectChanged(this.engine.selectionRect);
      }
      return;
    }

    // Handle selection resizing
    if (this.isResizingSelection && e.pointerId === this.engine.activePointer) {
      e.preventDefault();
      
      const newBounds = this.calculateNewBounds(worldPoint);
      if (newBounds) {
        this.engine.resizeSelectedItems(newBounds);

        if (this.callbacks.onSelectionChanged) {
          this.callbacks.onSelectionChanged(this.engine.getSelectedItems());
        }
      }
      return;
    }

    // Update cursor based on what's under the pointer
    if (!this.isSelecting && !this.isDraggingSelection && !this.isResizingSelection) {
      this.updateSelectionCursor(worldPoint);
    }
  }

  // FIXED: Better selection pointer up handling
  handleSelectionPointerUp(e) {
    e.preventDefault();
    
    if (this.debugSelection) {
      console.log('=== SELECTION POINTER UP ===');
      console.log('Is selecting:', this.isSelecting);
      console.log('Is dragging:', this.isDraggingSelection);
      console.log('Is resizing:', this.isResizingSelection);
    }

    if (this.engine.canvasRef.current?.releasePointerCapture) {
      this.engine.canvasRef.current.releasePointerCapture(e.pointerId);
    }

    // Finish area selection
    if (this.isSelecting && e.pointerId === this.engine.activePointer) {
      if (this.debugSelection) {
        console.log('Finishing area selection');
      }
      
      const addToExisting = e.ctrlKey || e.metaKey;
      const selectedItems = this.engine.finishAreaSelection(addToExisting);

      if (this.debugSelection) {
        console.log('Area selection result:', selectedItems);
      }

      if (this.callbacks.onSelectionChanged) {
        this.callbacks.onSelectionChanged(selectedItems);
      }

      this.isSelecting = false;
    }

    // FIXED: Finish dragging selection with proper cleanup
    if (this.isDraggingSelection && e.pointerId === this.engine.activePointer) {
      if (this.debugSelection) {
        console.log('Finished dragging selection');
      }

      // Stop throttling and apply any remaining movement
      this.isThrottling = false;
      if (this.dragThrottleTimeout) {
        cancelAnimationFrame(this.dragThrottleTimeout);
        this.dragThrottleTimeout = null;
      }

      // Apply any accumulated movement
      const { x, y } = this.accumulatedDelta;
      if (Math.abs(x) > 0.5 || Math.abs(y) > 0.5) {
        this.engine.moveSelectedItems(x, y);
      }

      // Reset state
      this.isDraggingSelection = false;
      this.selectionDragStart = null;
      this.accumulatedDelta = { x: 0, y: 0 };

      // Notify callbacks
      if (this.callbacks.onSelectionDragEnd) {
        this.callbacks.onSelectionDragEnd();
      }

      if (this.callbacks.onSelectionMoved) {
        this.callbacks.onSelectionMoved(this.engine.getSelectedItems());
      }
    }

    // Finish resizing selection
    if (this.isResizingSelection && e.pointerId === this.engine.activePointer) {
      if (this.debugSelection) {
        console.log('Finished resizing selection');
      }
      
      this.isResizingSelection = false;
      this.resizeHandle = null;
      this.selectionDragStart = null;
      this.originalBounds = null;

      if (this.callbacks.onSelectionResized) {
        this.callbacks.onSelectionResized(this.engine.getSelectedItems());
      }
    }

    this.engine.activePointer = null;

    // Reset cursor
    if (this.options.currentTool === 'select') {
      this.engine.canvasRef.current.style.cursor = 'default';
    }
  }

  // FIXED: Throttled drag update with better performance
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

  // FIXED: Start area selection with proper setup
  startAreaSelection(e, worldPoint) {
    this.isSelecting = true;
    this.engine.startAreaSelection(worldPoint);

    if (this.engine.canvasRef.current.setPointerCapture) {
      this.engine.canvasRef.current.setPointerCapture(e.pointerId);
    }

    this.engine.activePointer = e.pointerId;
    
    if (this.debugSelection) {
      console.log('Area selection started at:', worldPoint);
    }
  }

  // FIXED: Start dragging with proper initialization
  startDraggingSelection(e, worldPoint) {
    if (this.debugSelection) {
      console.log('Starting selection drag from:', worldPoint);
    }
    
    this.isDraggingSelection = true;
    this.selectionDragStart = worldPoint;
    this.accumulatedDelta = { x: 0, y: 0 };
    this.lastDragUpdate = Date.now();

    if (this.engine.canvasRef.current.setPointerCapture) {
      this.engine.canvasRef.current.setPointerCapture(e.pointerId);
    }

    this.engine.activePointer = e.pointerId;

    // Set cursor
    this.engine.canvasRef.current.style.cursor = 'move';

    // Notify callback
    if (this.callbacks.onSelectionDragStart) {
      this.callbacks.onSelectionDragStart();
    }
  }

  // Start resizing with proper setup
  startResizing(e, handle, worldPoint) {
    if (this.debugSelection) {
      console.log('Starting resize with handle:', handle);
    }
    
    this.isResizingSelection = true;
    this.resizeHandle = handle;
    this.selectionDragStart = worldPoint;
    this.originalBounds = { ...this.engine.selectionBounds };

    if (this.engine.canvasRef.current.setPointerCapture) {
      this.engine.canvasRef.current.setPointerCapture(e.pointerId);
    }

    this.engine.activePointer = e.pointerId;

    // Set appropriate cursor
    const cursors = {
      'nw': 'nw-resize', 'n': 'n-resize', 'ne': 'ne-resize',
      'e': 'e-resize', 'se': 'se-resize', 's': 's-resize',
      'sw': 'sw-resize', 'w': 'w-resize'
    };
    this.engine.canvasRef.current.style.cursor = cursors[handle] || 'default';
  }

  // Calculate new bounds during resize
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

    // Enforce minimum size
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

  // FIXED: Update cursor based on what's under the pointer
  updateSelectionCursor(worldPoint) {
    let cursor = 'default';

    // Check for resize handles first
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
        // Check if hovering over selected item
        const item = this.engine.findItemAtPoint(worldPoint);
        if (item && this.engine.isItemSelected(item.id)) {
          cursor = 'move';
        }
      }
    } else {
      // Check if hovering over any item
      const item = this.engine.findItemAtPoint(worldPoint);
      if (item) {
        cursor = 'pointer';
      }
    }

    // Only update cursor if it changed
    if (this.engine.canvasRef.current.style.cursor !== cursor) {
      this.engine.canvasRef.current.style.cursor = cursor;
    }
  }

  // ===========================================
  // AI HANDWRITING METHODS
  // ===========================================

  startAICapture(e) {
    console.log('AI Tool: Starting NEW capture session');
    
    this.clearAITimer();
    
    const canvas = this.engine.canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    this.isCapturingAI = true;
    this.currentAIStroke = [{
      x: rawX,
      y: rawY,
      timestamp: Date.now(),
      isNewStroke: true
    }];
    this.lastAIPoint = { x: rawX, y: rawY };
    this.aiStartTime = Date.now();
    this.aiStrokeCount = 1;
    this.currentStrokePoints = [];

    this.clearAllTempAIPaths();

    const complexPoint = this.engine.getPointFromEvent(e);
    this.createTempAIPath(complexPoint, this.aiStrokeCount);
    
    this.currentStrokePoints = [complexPoint];

    if (this.callbacks.onAIStrokeStart) {
      this.callbacks.onAIStrokeStart({ x: rawX, y: rawY });
    }
  }

  continueAICapture(e) {
    this.clearAITimer();

    const simpleCoords = this.getSimpleCanvasCoordinates(e);
    if (simpleCoords) {
      this.aiStrokeCount++;
      
      this.currentAIStroke.push({
        x: simpleCoords.x,
        y: simpleCoords.y,
        timestamp: Date.now(),
        isNewStroke: true,
        strokeId: this.aiStrokeCount
      });
      
      this.lastAIPoint = { x: simpleCoords.x, y: simpleCoords.y };

      const complexPoint = this.engine.getPointFromEvent(e);
      this.createTempAIPath(complexPoint, this.aiStrokeCount);
      
      this.currentStrokePoints = [complexPoint];
    }
  }

  updateAICapture(e) {
    if (!this.isCapturingAI) return;
    
    const canvas = this.engine.canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    
    const lastPoint = this.lastAIPoint;
    const distance = Math.sqrt(Math.pow(rawX - lastPoint.x, 2) + Math.pow(rawY - lastPoint.y, 2));
    
    if (distance > 1) {
      this.currentAIStroke.push({
        x: rawX,
        y: rawY,
        timestamp: Date.now(),
        strokeId: this.aiStrokeCount
      });
      this.lastAIPoint = { x: rawX, y: rawY };
      
      const complexPoint = this.engine.getPointFromEvent(e);
      this.currentStrokePoints.push(complexPoint);
      
      this.updateTempAIPathFixed(this.aiStrokeCount);
    }
  }

  updateTempAIPathFixed(strokeId) {
    const svg = this.engine.svgRef.current;
    if (!svg) return;

    const pathId = `temp-ai-path-${strokeId}`;
    const tempPath = svg.querySelector(`#${pathId}`);

    if (tempPath && this.currentStrokePoints.length > 1) {
      const viewBox = this.options.viewBox || this.engine.options.viewBox ||
        { x: 0, y: 0, width: this.engine.options.width, height: this.engine.options.height };

      let pathData = '';

      for (let i = 0; i < this.currentStrokePoints.length; i++) {
        const point = this.currentStrokePoints[i];

        const svgX = viewBox.x + (point[0] / this.engine.options.width) * viewBox.width;
        const svgY = viewBox.y + (point[1] / this.engine.options.height) * viewBox.height;

        if (i === 0) {
          pathData = `M ${svgX.toFixed(2)},${svgY.toFixed(2)}`;
        } else {
          pathData += ` L ${svgX.toFixed(2)},${svgY.toFixed(2)}`;
        }
      }

      tempPath.setAttribute('d', pathData);
    }
  }

  finishAICapture() {
    if (!this.isCapturingAI || this.currentAIStroke.length < 2) {
      this.cancelAICapture();
      return;
    }

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

    const strokeData = {
      points: this.currentAIStroke,
      bounds: bounds,
      duration: Date.now() - this.aiStartTime,
      timestamp: Date.now(),
      strokeCount: this.aiStrokeCount
    };

    this.clearAllTempAIPaths();

    if (this.callbacks.onAIStrokeComplete) {
      this.callbacks.onAIStrokeComplete(strokeData);
    }

    this.resetAIState();
  }

  cancelAICapture() {
    this.clearAITimer();
    this.clearAllTempAIPaths();
    this.resetAIState();
  }

  clearAITimer() {
    if (this.aiProcessingTimer) {
      clearTimeout(this.aiProcessingTimer);
      this.aiProcessingTimer = null;
    }
  }

  resetAIState() {
    this.isCapturingAI = false;
    this.currentAIStroke = [];
    this.lastAIPoint = null;
    this.aiStartTime = null;
    this.aiStrokeCount = 0;
    this.aiProcessingTimer = null;
    this.currentStrokePoints = [];
  }

  createTempAIPath(point, strokeId) {
    const svg = this.engine.svgRef.current;
    if (!svg) return;

    const pathId = `temp-ai-path-${strokeId}`;
    
    const existingPath = svg.querySelector(`#${pathId}`);
    if (existingPath) {
      existingPath.remove();
    }

    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.id = pathId;
    tempPath.setAttribute('fill', 'none');
    tempPath.setAttribute('stroke', '#8b5cf6');
    tempPath.setAttribute('stroke-width', '3');
    tempPath.setAttribute('stroke-dasharray', '5,5');
    tempPath.setAttribute('opacity', '0.8');
    tempPath.setAttribute('data-stroke-id', strokeId);
    tempPath.setAttribute('stroke-linecap', 'round');
    tempPath.setAttribute('stroke-linejoin', 'round');

    const pathData = `M ${point[0].toFixed(2)},${point[1].toFixed(2)}`;
    tempPath.setAttribute('d', pathData);

    svg.appendChild(tempPath);
  }

  clearAllTempAIPaths() {
    const svg = this.engine.svgRef.current;
    if (!svg) return;

    const tempPaths = svg.querySelectorAll('[id^="temp-ai-path-"]');
    tempPaths.forEach(path => {
      path.remove();
    });
  }

  // ===========================================
  // KEYBOARD EVENT HANDLER
  // ===========================================

  handleKeyDown(e) {
    // Handle AI tool keyboard shortcuts
    if (this.options.currentTool === 'aiHandwriting') {
      switch (e.key) {
        case 'Escape':
          if (this.isCapturingAI) {
            e.preventDefault();
            this.cancelAICapture();
          }
          break;
        case 'Enter':
          if (this.isCapturingAI && this.currentAIStroke.length >= 2) {
            e.preventDefault();
            this.clearAITimer();
            this.finishAICapture();
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
  // OTHER EVENT HANDLERS
  // ===========================================

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

    if (this.options.currentTool === 'aiHandwriting' && this.isCapturingAI) {
      if (this.currentAIStroke.length >= 2) {
        this.clearAITimer();
        this.aiProcessingTimer = setTimeout(() => {
          this.finishAICapture();
        }, 500);
      } else {
        this.cancelAICapture();
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
  // RECTANGLE DRAWING METHODS
  // ===========================================

  startRectangleDrawing(e) {
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
  // PAN TOOL METHODS
  // ===========================================

  startPanning(e) {
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
  // DRAWING METHODS (PEN/ERASER)
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
  // CLEANUP AND LIFECYCLE
  // ===========================================

  cleanup() {
    if (this.dragThrottleTimeout) {
      cancelAnimationFrame(this.dragThrottleTimeout);
      this.dragThrottleTimeout = null;
    }

    // AI cleanup
    this.clearAITimer();
    this.clearAllTempAIPaths();
    this.resetAIState();

    // Reset all state
    this.isThrottling = false;
    this.isDraggingSelection = false;
    this.isSelecting = false;
    this.isResizingSelection = false;
    this.isPanning = false;

    this.accumulatedDelta = { x: 0, y: 0 };
    this.selectionDragStart = null;
    this.lastPanPoint = null;
    this.panStartPoint = null;
    this.lastPointerDown = null;
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