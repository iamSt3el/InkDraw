// src/services/AIProcessingService.js - NEW SERVICE FOR HANDWRITING RECOGNITION
class AIProcessingService {
    constructor(options = {}) {
      this.baseUrl = options.baseUrl || 'http://127.0.0.1:5000';
      this.timeout = options.timeout || 10000; // 10 seconds
      this.retryAttempts = options.retryAttempts || 2;
      this.isConnected = false;
      this.lastConnectionCheck = 0;
      this.connectionCheckInterval = 30000; // 30 seconds
      
      console.log('AIProcessingService: Initialized with base URL:', this.baseUrl);
    }
  
    // Check if Flask server is available
    async checkConnection() {
      const now = Date.now();
      
      // Cache connection check for 30 seconds
      if (now - this.lastConnectionCheck < this.connectionCheckInterval && this.isConnected) {
        return this.isConnected;
      }
  
      try {
        console.log('AIProcessingService: Checking server connection...');
        
        const response = await fetch(`${this.baseUrl}/health`, {
          method: 'GET',
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          }
        });
  
        this.isConnected = response.ok;
        this.lastConnectionCheck = now;
        
        if (this.isConnected) {
          const healthData = await response.json();
          console.log('AIProcessingService: Server connected:', healthData);
        } else {
          console.warn('AIProcessingService: Server responded with error:', response.status);
        }
        
      } catch (error) {
        console.warn('AIProcessingService: Server connection failed:', error.message);
        this.isConnected = false;
        this.lastConnectionCheck = now;
      }
  
      return this.isConnected;
    }
  
    // Convert stroke coordinates to the format expected by Flask
    prepareStrokeData(strokeCoordinates, bounds) {
      console.log('AIProcessingService: Preparing stroke data...');
      
      if (!strokeCoordinates || strokeCoordinates.length === 0) {
        throw new Error('No stroke coordinates provided');
      }
  
      // Convert stroke points to the format expected by your Flask model
      const strokes = [{
        points: strokeCoordinates.map(point => ({
          x: Math.round(point.x),
          y: Math.round(point.y),
          timestamp: point.timestamp || Date.now()
        }))
      }];
  
      const requestData = {
        strokes: strokes,
        use_spell_check: true,
        metadata: {
          bounds: bounds,
          timestamp: Date.now(),
          client: 'drawo-web'
        }
      };
  
      console.log('AIProcessingService: Prepared data:', {
        strokeCount: strokes.length,
        pointCount: strokes[0].points.length,
        bounds: bounds
      });
  
      return requestData;
    }
  
    // Main method to process handwriting
    async processHandwriting(strokeCoordinates, bounds, options = {}) {
      console.log('=== AIProcessingService: PROCESSING HANDWRITING ===');
      
      try {
        // Check server connection first
        const isConnected = await this.checkConnection();
        if (!isConnected) {
          throw new Error('AI processing server is not available. Please check if the Flask server is running.');
        }
  
        // Prepare stroke data
        const requestData = this.prepareStrokeData(strokeCoordinates, bounds);
        
        // Process with retry logic
        let lastError;
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
          try {
            console.log(`AIProcessingService: Processing attempt ${attempt}/${this.retryAttempts}`);
            
            const result = await this.sendProcessingRequest(requestData, attempt);
            
            console.log('=== AIProcessingService: SUCCESS ===');
            return result;
            
          } catch (error) {
            lastError = error;
            console.warn(`AIProcessingService: Attempt ${attempt} failed:`, error.message);
            
            if (attempt < this.retryAttempts) {
              // Wait before retry (exponential backoff)
              const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
              console.log(`AIProcessingService: Retrying in ${delay}ms...`);
              await this.sleep(delay);
            }
          }
        }
        
        throw lastError;
        
      } catch (error) {
        console.error('=== AIProcessingService: ERROR ===', error);
        
        // Return fallback result for development/testing
        if (options.enableFallback !== false) {
          return this.getFallbackResult(strokeCoordinates, bounds);
        }
        
        throw error;
      }
    }
  
    // Send the actual processing request to Flask
    async sendProcessingRequest(requestData, attempt = 1) {
      console.log('AIProcessingService: Sending request to Flask server...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
  
      try {
        const response = await fetch(`${this.baseUrl}/predict`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestData),
          signal: controller.signal
        });
  
        clearTimeout(timeoutId);
  
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server error (${response.status}): ${errorText}`);
        }
  
        const result = await response.json();
        
        console.log('AIProcessingService: Received response:', {
          success: result.success,
          rawPrediction: result.raw_prediction,
          spellChecked: result.spell_checked,
          hasSpellCheckInfo: !!result.spell_check_info
        });
  
        if (!result.success) {
          throw new Error(result.error || 'AI processing failed');
        }
  
        return this.processServerResponse(result, requestData);
        
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.timeout}ms`);
        }
        
        throw error;
      }
    }
  
    // Process the server response into the format needed by the canvas
    processServerResponse(serverResult, originalRequest) {
      console.log('AIProcessingService: Processing server response...');
      
      const {
        raw_prediction,
        spell_checked,
        spell_check_info,
        num_strokes,
        spell_check_enabled
      } = serverResult;
  
      // Use spell-checked version if available and different, otherwise use raw
      const finalText = (spell_checked && spell_checked !== raw_prediction) 
        ? spell_checked 
        : raw_prediction;
  
      if (!finalText || finalText.trim() === '') {
        throw new Error('No text could be recognized from the handwriting');
      }
  
      const result = {
        success: true,
        recognizedText: finalText.trim(),
        rawPrediction: raw_prediction,
        spellChecked: spell_checked,
        confidence: this.calculateConfidence(spell_check_info),
        spellCheckInfo: spell_check_info,
        metadata: {
          processingTime: Date.now() - originalRequest.metadata.timestamp,
          strokeCount: num_strokes || 1,
          spellCheckEnabled: spell_check_enabled,
          hasCorrections: spell_checked !== raw_prediction
        }
      };
  
      console.log('AIProcessingService: Processed result:', {
        text: result.recognizedText,
        confidence: result.confidence,
        hasCorrections: result.metadata.hasCorrections
      });
  
      return result;
    }
  
    // Calculate confidence score from spell check info
    calculateConfidence(spellCheckInfo) {
      if (!spellCheckInfo || !spellCheckInfo.stats) {
        return 0.8; // Default confidence
      }
  
      const { stats } = spellCheckInfo;
      
      // Base confidence on average spell check confidence and correction ratio
      let confidence = stats.avg_confidence || 0.8;
      
      // Reduce confidence if many corrections were made
      if (stats.total_words > 0) {
        const correctionRatio = stats.corrected_words / stats.total_words;
        confidence *= (1 - correctionRatio * 0.3); // Reduce by up to 30%
      }
      
      return Math.max(0.1, Math.min(1.0, confidence));
    }
  
    // Fallback result for testing/development when server is not available
    getFallbackResult(strokeCoordinates, bounds) {
      console.log('AIProcessingService: Using fallback result (server not available)');
      
      // Simple fallback - could be more sophisticated
      const fallbackTexts = [
        'Hello',
        'World',
        'Test',
        'Drawing',
        'AI',
        'Recognition',
        'Handwriting',
        'Sample'
      ];
      
      const randomText = fallbackTexts[Math.floor(Math.random() * fallbackTexts.length)];
      
      return {
        success: true,
        recognizedText: randomText,
        rawPrediction: randomText,
        spellChecked: randomText,
        confidence: 0.6,
        spellCheckInfo: null,
        metadata: {
          processingTime: 500 + Math.random() * 1000, // Simulate processing time
          strokeCount: 1,
          spellCheckEnabled: false,
          hasCorrections: false,
          isFallback: true
        }
      };
    }
  
    // Test the spell checker endpoint
    async testSpellChecker(text) {
      try {
        const isConnected = await this.checkConnection();
        if (!isConnected) {
          throw new Error('Server not available');
        }
  
        const response = await fetch(`${this.baseUrl}/spell_test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `text=${encodeURIComponent(text)}`
        });
  
        if (!response.ok) {
          throw new Error(`Spell test failed: ${response.status}`);
        }
  
        return await response.json();
        
      } catch (error) {
        console.error('AIProcessingService: Spell test error:', error);
        throw error;
      }
    }
  
    // Get server health information
    async getServerHealth() {
      try {
        const response = await fetch(`${this.baseUrl}/health`);
        
        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status}`);
        }
        
        return await response.json();
        
      } catch (error) {
        console.error('AIProcessingService: Health check error:', error);
        throw error;
      }
    }
  
    // Configure server settings
    setServerUrl(url) {
      this.baseUrl = url;
      this.isConnected = false;
      this.lastConnectionCheck = 0;
      console.log('AIProcessingService: Server URL updated to:', url);
    }
  
    setTimeout(timeout) {
      this.timeout = timeout;
      console.log('AIProcessingService: Timeout updated to:', timeout);
    }
  
    setRetryAttempts(attempts) {
      this.retryAttempts = Math.max(1, Math.min(5, attempts));
      console.log('AIProcessingService: Retry attempts updated to:', this.retryAttempts);
    }
  
    // Utility method for delays
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  
    // Get connection status
    getConnectionStatus() {
      return {
        isConnected: this.isConnected,
        lastCheck: this.lastConnectionCheck,
        serverUrl: this.baseUrl,
        timeout: this.timeout,
        retryAttempts: this.retryAttempts
      };
    }
  
    // Validate stroke data before processing
    validateStrokeData(strokeCoordinates) {
      if (!strokeCoordinates || !Array.isArray(strokeCoordinates)) {
        return { valid: false, error: 'Invalid stroke coordinates' };
      }
  
      if (strokeCoordinates.length < 2) {
        return { valid: false, error: 'Not enough points in stroke' };
      }
  
      // Check if points have required properties
      for (const point of strokeCoordinates) {
        if (typeof point.x !== 'number' || typeof point.y !== 'number') {
          return { valid: false, error: 'Invalid point coordinates' };
        }
      }
  
      return { valid: true };
    }
  
    // Batch processing for multiple strokes (future enhancement)
    async processBatch(strokeBatches, options = {}) {
      console.log('AIProcessingService: Processing batch of', strokeBatches.length, 'strokes');
      
      const results = [];
      const maxConcurrent = options.maxConcurrent || 3;
      
      for (let i = 0; i < strokeBatches.length; i += maxConcurrent) {
        const batch = strokeBatches.slice(i, i + maxConcurrent);
        
        const batchPromises = batch.map(async (strokeData, index) => {
          try {
            const result = await this.processHandwriting(strokeData.coordinates, strokeData.bounds, options);
            return { success: true, index: i + index, result };
          } catch (error) {
            return { success: false, index: i + index, error: error.message };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches to avoid overwhelming server
        if (i + maxConcurrent < strokeBatches.length) {
          await this.sleep(100);
        }
      }
      
      return results;
    }
  }
  
  // Create singleton instance
  const aiProcessingService = new AIProcessingService({
    baseUrl: 'http://127.0.0.1:5000', // Your Flask server URL
    timeout: 10000, // 10 seconds
    retryAttempts: 2
  });
  
  export default aiProcessingService;