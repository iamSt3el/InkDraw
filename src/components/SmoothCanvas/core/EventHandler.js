// src/components/SmoothCanvas/core/EventHandler.js - Updated with Selection Support
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

  handlePointerDown(e) {
    if (!this.engine.canvasRef.current || !e.isPrimary) return;

    const point = this.engine.getPointFromEvent(e);
    const worldPoint = { x: point[0], y: point[1] };

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

  handleSelectionPointerDown(e, worldPoint) {
    e.preventDefault();

    // ADD COMPREHENSIVE DEBUG LOGGING
    console.log('=== SELECTION CLICK DEBUG ===');
    console.log('World point:', worldPoint);
    console.log('Event details:', {
      clientX: e.clientX,
      clientY: e.clientY,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      button: e.button,
      buttons: e.buttons
    });
    console.log('Available paths:', this.engine.paths.length);

    // Log all path bounding boxes
    this.engine.paths.forEach((path, index) => {
      const bbox = this.engine.pathBBoxes.get(path.id);
      console.log(`Path ${index} (${path.id}):`, {
        type: path.type,
        bbox: bbox,
        transform: path.transform
      });
    });

    // Check if clicking on a resize handle first
    if (this.engine.selectionBounds) {
      const handle = this.engine.getResizeHandleAtPoint(worldPoint, this.engine.selectionBounds);
      if (handle) {
        console.log('Clicked on resize handle:', handle);
        this.startResizing(e, handle, worldPoint);
        return;
      }
    }

    // Find what item was clicked - ADD MORE DEBUG
    console.log('Starting hit test...');
    const clickedItem = this.engine.findItemAtPoint(worldPoint);
    console.log('Hit test result:', clickedItem);

    if (clickedItem) {
      console.log('Found clicked item:', {
        id: clickedItem.id,
        type: clickedItem.type,
        isSelected: this.engine.isItemSelected(clickedItem.id)
      });

      // Check if clicking on already selected item (for dragging)
      if (this.engine.isItemSelected(clickedItem.id)) {
        console.log('Clicked on selected item, starting drag');
        this.startDraggingSelection(e, worldPoint);
        return;
      }

      // Clicking on unselected item
      if (e.ctrlKey || e.metaKey) {
        console.log('Multi-select mode');
        this.engine.addToSelection(clickedItem.id);
      } else {
        console.log('Single select mode');
        this.engine.setSelectedItems([clickedItem.id]);
      }

      // Notify selection change
      if (this.callbacks.onSelectionChanged) {
        this.callbacks.onSelectionChanged(this.engine.getSelectedItems());
      }
      return;
    }

    // Clicking on empty space
    console.log('Clicked on empty space');

    // Clear selection if not holding Ctrl
    if (!e.ctrlKey && !e.metaKey) {
      this.engine.clearSelection();
      if (this.callbacks.onSelectionChanged) {
        this.callbacks.onSelectionChanged([]);
      }
    }

    // Start area selection
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
    this.isDraggingSelection = true;
    this.selectionDragStart = worldPoint;

    if (this.engine.canvasRef.current.setPointerCapture) {
      this.engine.canvasRef.current.setPointerCapture(e.pointerId);
    }

    this.engine.activePointer = e.pointerId;

    // ADD: Notify drag start
    if (this.callbacks.onSelectionDragStart) {
      this.callbacks.onSelectionDragStart();
    }

    // Change cursor to indicate dragging
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

    // Set appropriate cursor for resize direction
    const cursors = {
      'nw': 'nw-resize', 'n': 'n-resize', 'ne': 'ne-resize',
      'e': 'e-resize', 'se': 'se-resize', 's': 's-resize',
      'sw': 'sw-resize', 'w': 'w-resize'
    };
    this.engine.canvasRef.current.style.cursor = cursors[handle] || 'default';
  }

  handlePointerMove(e) {
    if (!this.engine.canvasRef.current) return;

    const point = this.engine.getPointFromEvent(e);
    const worldPoint = { x: point[0], y: point[1] };

    // Handle panning
    if (this.isPanning) {
      this.continuePanning(e);
      return;
    }

    if (this.isDraggingSelection && e.pointerId === this.engine.activePointer) {
      e.preventDefault();

      // THROTTLE: Only update every few pixels to prevent excessive updates
      if (!this.lastDragPoint ||
        Math.abs(worldPoint.x - this.lastDragPoint.x) > 2 ||
        Math.abs(worldPoint.y - this.lastDragPoint.y) > 2) {

        console.log('Dragging selection');

        const deltaX = worldPoint.x - this.selectionDragStart.x;
        const deltaY = worldPoint.y - this.selectionDragStart.y;

        this.engine.moveSelectedItems(deltaX, deltaY);
        this.selectionDragStart = worldPoint;
        this.lastDragPoint = worldPoint;

        // THROTTLED: Only notify occasionally during drag
        if (this.callbacks.onSelectionMoved) {
          this.callbacks.onSelectionMoved(this.engine.getSelectedItems());
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

  handleSelectionPointerMove(e, worldPoint) {
    // Handle area selection
    if (this.isSelecting && e.pointerId === this.engine.activePointer) {
      e.preventDefault();
      console.log('Updating area selection to:', worldPoint);
      this.engine.updateAreaSelection(worldPoint);

      if (this.callbacks.onSelectionRectChanged) {
        this.callbacks.onSelectionRectChanged(this.engine.selectionRect);
      }
      return;
    }

    // Handle dragging selection
    if (this.isDraggingSelection && e.pointerId === this.engine.activePointer) {
      e.preventDefault();
      console.log('Dragging selection');

      const deltaX = worldPoint.x - this.selectionDragStart.x;
      const deltaY = worldPoint.y - this.selectionDragStart.y;

      this.engine.moveSelectedItems(deltaX, deltaY);
      this.selectionDragStart = worldPoint;

      if (this.callbacks.onSelectionChanged) {
        this.callbacks.onSelectionChanged(this.engine.getSelectedItems());
      }
      return;
    }

    // Handle resizing selection
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

    // Update cursor based on what's under the mouse (only when not actively doing something)
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

    // Ensure minimum size
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

    // Check for resize handles
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
        // Check if over selected items
        const item = this.engine.findItemAtPoint(worldPoint);
        if (item && this.engine.isItemSelected(item.id)) {
          cursor = 'move';
        }
      }
    } else {
      // Check if over any item
      const item = this.engine.findItemAtPoint(worldPoint);
      if (item) {
        cursor = 'pointer';
      }
    }

    this.engine.canvasRef.current.style.cursor = cursor;
  }

  handlePointerUp(e) {
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

    // Finish dragging selection
    if (this.isDraggingSelection && e.pointerId === this.engine.activePointer) {
      console.log('Finished dragging selection');
      this.isDraggingSelection = false;
      this.selectionDragStart = null;

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

    // Reset cursor
    if (this.options.currentTool === 'select') {
      this.engine.canvasRef.current.style.cursor = 'default';
    }
  }

  // Keyboard event handler for selection operations
  handleKeyDown(e) {
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
          // Select all items
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

      // FIX: Arrow key movement - the bug is here
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

          // BUG WAS HERE: Don't clear selection after moving!
          console.log('Moving selection by:', { deltaX, deltaY });
          this.engine.moveSelectedItems(deltaX, deltaY);

          // Update selection bounds after moving
          this.engine.selectionBounds = this.engine.getSelectionBounds(this.engine.selectedItems);

          // IMPORTANT: Keep selection active and notify of movement (not selection change)
          if (this.callbacks.onSelectionMoved) {
            this.callbacks.onSelectionMoved(this.engine.getSelectedItems());
          }

          // Force re-render to show moved items
          const currentPaths = this.engine.getPaths();
          // Trigger canvas update - this might need to be handled differently depending on your setup
        }
        break;
    }
  }
  // Existing methods (pan, rectangle, drawing, etc.)...

  // Rectangle drawing methods
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

  // Pan tool methods
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

  // Wheel zoom support
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

    // Cancel any ongoing operations if mouse leaves
    if (this.options.currentTool === 'rectangle' && this.engine.isDrawingShape()) {
      this.engine.cancelRectangle();
    }

    if (this.options.currentTool === 'select' && this.isSelecting) {
      // Optionally cancel area selection
      this.engine.clearSelection();
      this.isSelecting = false;
    }
  }

  // Drawing methods (existing)
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
          // Remove from selection if erased
          this.engine.removeFromSelection(pathId);
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
    element.addEventListener('wheel', this.handleWheel, { passive: false });

    // Add keyboard event listener to document for selection shortcuts
    document.addEventListener('keydown', this.handleKeyDown);
  }

  detachListeners(element) {
    element.removeEventListener('pointerdown', this.handlePointerDown);
    element.removeEventListener('pointermove', this.handlePointerMove);
    element.removeEventListener('pointerup', this.handlePointerUp);
    element.removeEventListener('pointercancel', this.handlePointerUp);
    element.removeEventListener('mouseenter', this.handleMouseEnter);
    element.removeEventListener('mouseleave', this.handleMouseLeave);
    element.removeEventListener('wheel', this.handleWheel);

    // Remove keyboard event listener
    document.removeEventListener('keydown', this.handleKeyDown);
  }
}