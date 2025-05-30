// src/services/AIProcessingService.js - SIMPLIFIED VERSION FOR RAW COORDINATES
class AIProcessingService {
  constructor() {
    this.flaskServerUrl = 'http://127.0.0.1:5000';
    this.isFlaskAvailable = false;
    this.lastHealthCheck = 0;
    this.healthCheckInterval = 30000; // 30 seconds
  }

  // Update the convertStrokeDataForFlask method in AIProcessingService.js

  convertStrokeDataForFlask(coordinates, bounds) {
    console.log('Converting RAW stroke data for Flask...', {
      inputLength: coordinates.length,
      bounds: bounds
    });

    if (!coordinates || coordinates.length === 0) {
      console.warn('No coordinates to convert');
      return { strokes: [] };
    }

    // Sample first few points to see what we're working with
    console.log('Sample raw coordinates:', coordinates.slice(0, 5));

    const strokes = [];
    let currentStroke = [];

    for (let i = 0; i < coordinates.length; i++) {
      const point = coordinates[i];

      // Start new stroke if this point is marked as new stroke (except for first point)
      if (point.isNewStroke && i > 0 && currentStroke.length > 0) {
        // Save current stroke and start new one
        strokes.push([...currentStroke]);
        currentStroke = [];
      }

      // Add point to current stroke - these are now RAW canvas coordinates
      // Just like Flask HTML collects them
      currentStroke.push({
        x: point.x, 
        y: point.y
      });
    }

    // Add the last stroke if it has points
    if (currentStroke.length > 0) {
      strokes.push(currentStroke);
    }

    console.log('Converted RAW stroke data:', {
      inputPoints: coordinates.length,
      outputStrokes: strokes.length,
      strokeLengths: strokes.map(stroke => stroke.length),
      sampleFirstStroke: strokes.length > 0 ? strokes[0].slice(0, 3) : [],
      coordinateRanges: this.analyzeCoordinateRanges(strokes)
    });

    return { strokes };
  }

  async checkFlaskHealth() {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckInterval && this.isFlaskAvailable) {
      return this.isFlaskAvailable;
    }

    try {
      console.log('Checking Flask server health...');
      const response = await fetch(`${this.flaskServerUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        this.isFlaskAvailable = data.status === 'healthy' && data.model_loaded;
        console.log('Flask health check result:', data);
      } else {
        this.isFlaskAvailable = false;
        console.warn('Flask server unhealthy:', response.status);
      }
    } catch (error) {
      this.isFlaskAvailable = false;
      console.warn('Flask server not available:', error.message);
    }

    this.lastHealthCheck = now;
    return this.isFlaskAvailable;
  }

  async processHandwriting(coordinates, bounds, options = {}) {
    console.log('AIProcessingService: Starting handwriting processing...', {
      coordinatesLength: coordinates.length,
      bounds: bounds,
      options: options
    });

    try {
      // Check if Flask server is available
      const isFlaskHealthy = await this.checkFlaskHealth();

      if (!isFlaskHealthy) {
        if (options.enableFallback) {
          return this.getFallbackResponse(coordinates);
        } else {
          throw new Error('Flask server not available');
        }
      }

      // SIMPLIFIED: Convert data to Flask format (no complex coordinate scaling)
      const flaskData = this.convertStrokeDataForFlask(coordinates, bounds);

      // Send data in the format Flask expects
      const requestBody = {
        strokes: flaskData.strokes,
        use_spell_check: options.useSpellCheck !== false // Default to true
      };

      console.log('Sending to Flask server:', {
        url: `${this.flaskServerUrl}/predict`,
        strokeCount: requestBody.strokes.length,
        totalPoints: requestBody.strokes.reduce((sum, stroke) => sum + stroke.length, 0),
        useSpellCheck: requestBody.use_spell_check,
        coordinateRanges: this.analyzeCoordinateRanges(requestBody.strokes)
      });

      // Send request to Flask server
      const response = await fetch(`${this.flaskServerUrl}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15000) // 15 second timeout for AI processing
      });

      if (!response.ok) {
        throw new Error(`Flask server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Flask server response:', result);

      if (!result.success) {
        throw new Error(result.error || 'AI processing failed');
      }

      // Convert Flask response to our expected format
      const recognizedText = result.spell_checked || result.raw_prediction || '';

      return {
        success: true,
        recognizedText: recognizedText,
        rawPrediction: result.raw_prediction || '',
        spellChecked: result.spell_checked || result.raw_prediction || '',
        confidence: 0.8, // Flask doesn't return confidence, use default
        metadata: {
          processingTime: Date.now(),
          hasCorrections: result.spell_checked && result.spell_checked !== result.raw_prediction,
          spellCheckInfo: result.spell_check_info,
          numStrokes: requestBody.strokes.length,
          totalPoints: requestBody.strokes.reduce((sum, stroke) => sum + stroke.length, 0),
          coordinateSystem: 'simple_canvas', // Now using simple canvas coordinates
          flaskResponse: result
        }
      };

    } catch (error) {
      console.error('AIProcessingService: Error processing handwriting:', error);

      if (options.enableFallback) {
        return this.getFallbackResponse(coordinates);
      } else {
        throw error;
      }
    }
  }

  // Helper method to analyze coordinate ranges for debugging
  analyzeCoordinateRanges(strokes) {
    if (!strokes || strokes.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let totalPoints = 0;

    strokes.forEach(stroke => {
      stroke.forEach(point => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
        totalPoints++;
      });
    });

    return {
      xRange: { min: minX, max: maxX, span: maxX - minX },
      yRange: { min: minY, max: maxY, span: maxY - minY },
      totalPoints: totalPoints,
      avgPointsPerStroke: Math.round(totalPoints / strokes.length)
    };
  }

  getFallbackResponse(coordinates) {
    console.log('AIProcessingService: Using fallback response');

    // Simple fallback based on stroke characteristics
    const numPoints = coordinates.length;
    let fallbackText = '';

    if (numPoints < 10) {
      fallbackText = 'i';
    } else if (numPoints < 20) {
      fallbackText = 'a';
    } else if (numPoints < 50) {
      fallbackText = 'the';
    } else {
      fallbackText = 'hello';
    }

    return {
      success: true,
      recognizedText: fallbackText,
      rawPrediction: fallbackText,
      spellChecked: fallbackText,
      confidence: 0.3, // Low confidence for fallback
      metadata: {
        processingTime: Date.now(),
        hasCorrections: false,
        isFallback: true,
        numPoints: numPoints
      }
    };
  }

  async testConnection() {
    try {
      console.log('Testing Flask server connection...');
      const isHealthy = await this.checkFlaskHealth();

      if (isHealthy) {
        console.log('✅ Flask server is available and ready');
        return {
          success: true,
          message: 'Flask server is available and ready',
          serverUrl: this.flaskServerUrl
        };
      } else {
        console.log('❌ Flask server is not available');
        return {
          success: false,
          message: 'Flask server is not available',
          serverUrl: this.flaskServerUrl
        };
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
        serverUrl: this.flaskServerUrl
      };
    }
  }
}

// Export singleton instance
const aiProcessingService = new AIProcessingService();
export default aiProcessingService;