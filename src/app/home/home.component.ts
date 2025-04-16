// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-home',
//   imports: [],
//   templateUrl: './home.component.html',
//   styleUrl: './home.component.css'
// })
// export class HomeComponent {

// }

// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-home',
//   imports: [],
//   templateUrl: './home.component.html',
//   styleUrl: './home.component.css'
// })
// export class HomeComponent {

// }


import { Component, OnInit, OnDestroy, ElementRef, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImageDescriptionService, ImageDescriptionResponse, DescriptionMode, VoiceCommandResponse } from '../image-describe.service';
import { Subject, interval, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  descriptionResult: ImageDescriptionResponse | null = null;
  previousDescription: string | null = null; // Store previous description to avoid repetition
  isDuplicateDescription = false; // Flag to indicate when a description is a duplicate
  similarityThreshold = 0.7; // Threshold for semantic similarity (0.0 to 1.0)
  currentSimilarity = 0; // Current similarity percentage for display

  // Context awareness
  recentDescriptions: string[] = []; // Store recent descriptions for context
  maxRecentDescriptions = 5; // Number of recent descriptions to keep
  detectedContext: string = ''; // Current detected context (room, outdoor, etc.)

  // Camera related properties
  isCameraMode = false;
  isCameraActive = false;
  cameraStream: MediaStream | null = null;
  captureInterval: Subscription | null = null;
  processingImage = false;
  descriptionMode: DescriptionMode = 'detailed';
  lastProcessedTime = 0;
  processingThrottleTime = 5000; // 5 seconds between processing
  isBlindAssistantMode = false; // New mode specifically for blind users
  autoPlayAudio = true; // Auto-play audio for blind users
  selectedVoice = 'nova'; // Default voice type using Groq's PlayAI TTS voices

  // Voice recognition properties
  isListening = false;
  speechRecognition: any;
  voiceCommandResult: string | null = null;
  voiceCommandError: string | null = null;

  // For cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private imageDescriptionService: ImageDescriptionService,
    private ngZone: NgZone
  ) {
    // Initialize speech recognition if available in the browser
    this.initSpeechRecognition();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.createImagePreview();
    }
  }

  createImagePreview(): void {
    if (!this.selectedFile) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
    };
    reader.readAsDataURL(this.selectedFile);
  }

  onSubmit(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select an image first';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    // Clear previous result to avoid overlapping responses
    this.descriptionResult = null;

    // Stop any audio that might be playing
    const audioElements = document.getElementsByTagName('audio');
    for (let i = 0; i < audioElements.length; i++) {
      audioElements[i].pause();
    }

    this.imageDescriptionService.describeImage(this.selectedFile, this.descriptionMode, false, this.detectedContext, this.selectedVoice).subscribe({
      next: (response: ImageDescriptionResponse) => {
        this.isLoading = false;

        // Check if the description is semantically similar to the previous one
        this.currentSimilarity = this.previousDescription ?
          this.calculateSimilarity(this.previousDescription, response.description) : 0;

        this.isDuplicateDescription = this.currentSimilarity >= this.similarityThreshold;

        if (this.isDuplicateDescription) {
          console.log(`Semantically similar description detected (${(this.currentSimilarity * 100).toFixed(0)}% similar), skipping audio playback`);
          // Still update the result for display purposes
          this.descriptionResult = response;
        } else {
          // New description - update previous and play audio
          this.previousDescription = response.description;
          this.descriptionResult = response;

          // Update context awareness with the new description
          this.updateContext(response.description);

          // Auto-play audio if enabled
          if (response.audio && this.autoPlayAudio) {
            this.playAudio();
          }
        }
      },
      error: (error: any) => {
        console.error('Error describing image:', error);
        // Extract more detailed error message if available
        const errorMsg = error.message || 'Unknown error';
        this.errorMessage = `An error occurred while processing the image: ${errorMsg}. Please try again.`;
        this.isLoading = false;
      }
    });
  }

  playAudio(): void {
    if (!this.descriptionResult?.audio) return;

    const audio = new Audio(`data:audio/mp3;base64,${this.descriptionResult.audio}`);
    audio.play();
  }

  /**
   * Update context awareness based on recent descriptions
   */
  updateContext(newDescription: string): void {
    // Add the new description to recent descriptions
    this.recentDescriptions.unshift(newDescription);

    // Keep only the most recent descriptions
    if (this.recentDescriptions.length > this.maxRecentDescriptions) {
      this.recentDescriptions = this.recentDescriptions.slice(0, this.maxRecentDescriptions);
    }

    // Analyze recent descriptions to detect context
    const allText = this.recentDescriptions.join(' ').toLowerCase();

    // Detect environment context
    const indoorTerms = ['room', 'kitchen', 'living', 'bedroom', 'bathroom', 'office', 'indoor', 'inside', 'home', 'house', 'building', 'ceiling', 'floor', 'wall', 'furniture'];
    const outdoorTerms = ['street', 'road', 'sidewalk', 'outdoor', 'outside', 'park', 'garden', 'tree', 'sky', 'building', 'car', 'vehicle', 'sun', 'cloud'];

    let indoorScore = 0;
    let outdoorScore = 0;

    // Calculate scores
    indoorTerms.forEach(term => {
      if (allText.includes(term)) indoorScore++;
    });

    outdoorTerms.forEach(term => {
      if (allText.includes(term)) outdoorScore++;
    });

    // Determine context
    if (indoorScore > outdoorScore && indoorScore > 1) {
      this.detectedContext = 'indoor';
    } else if (outdoorScore > indoorScore && outdoorScore > 1) {
      this.detectedContext = 'outdoor';
    } else {
      this.detectedContext = '';
    }

    console.log(`Context updated: ${this.detectedContext} (Indoor: ${indoorScore}, Outdoor: ${outdoorScore})`);
  }

  /**
   * Calculate semantic similarity between two text descriptions
   * Returns a value between 0 (completely different) and 1 (identical)
   */
  calculateSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    // Convert to lowercase and remove punctuation
    const normalize = (text: string) => {
      return text.toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
        .replace(/\s{2,}/g, ' ');
    };

    const normalizedText1 = normalize(text1);
    const normalizedText2 = normalize(text2);

    // Extract key nouns and objects (improved approach)
    const extractKeywords = (text: string) => {
      // Split into words
      const words = text.split(' ');

      // Remove common stop words
      const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'is', 'are', 'am', 'was', 'were',
                        'this', 'that', 'these', 'those', 'it', 'its', 'of', 'from', 'as', 'has', 'have', 'had', 'been', 'will', 'would', 'could', 'should'];

      // Filter out stop words and short words
      const filteredWords = words.filter(word => word.length > 2 && !stopWords.includes(word));

      // Extract key entities (nouns, objects, locations)
      const entities = [];
      const locationTerms = ['left', 'right', 'top', 'bottom', 'above', 'below', 'behind', 'front', 'side', 'center', 'middle', 'corner', 'edge'];
      const objectTerms = ['table', 'chair', 'desk', 'wall', 'floor', 'ceiling', 'door', 'window', 'room', 'building', 'street', 'road', 'car', 'person', 'man', 'woman', 'child', 'tree', 'plant', 'book', 'phone', 'computer'];

      // Give higher weight to important terms by adding them multiple times
      for (const word of filteredWords) {
        entities.push(word); // Add each word once

        // Add location terms twice (more important)
        if (locationTerms.includes(word)) {
          entities.push(word);
        }

        // Add object terms twice (more important)
        if (objectTerms.includes(word)) {
          entities.push(word);
        }
      }

      return entities;
    };

    const keywords1 = extractKeywords(normalizedText1);
    const keywords2 = extractKeywords(normalizedText2);

    // Count matching keywords with improved algorithm
    let matchCount = 0;
    const matched = new Set();

    // First pass: exact matches
    for (const word of keywords1) {
      if (keywords2.includes(word) && !matched.has(word)) {
        matchCount++;
        matched.add(word);
      }
    }

    // Second pass: partial matches (for compound words)
    for (const word1 of keywords1) {
      if (matched.has(word1)) continue; // Skip already matched words

      for (const word2 of keywords2) {
        if (matched.has(word2)) continue; // Skip already matched words

        // Check if one word contains the other (for compound words)
        if ((word1.length > 4 && word2.includes(word1)) ||
            (word2.length > 4 && word1.includes(word2))) {
          matchCount += 0.5; // Partial match
          matched.add(word1);
          matched.add(word2);
          break;
        }
      }
    }

    // Calculate weighted Jaccard similarity coefficient
    const uniqueWords = new Set([...keywords1, ...keywords2]);
    const similarity = matchCount / uniqueWords.size;

    console.log(`Enhanced similarity between descriptions: ${similarity.toFixed(2)}`);
    console.log(`Text 1 keywords (${keywords1.length}): ${keywords1.join(', ')}`);
    console.log(`Text 2 keywords (${keywords2.length}): ${keywords2.join(', ')}`);
    console.log(`Matching keywords: ${matchCount.toFixed(1)} out of ${uniqueWords.size} unique words`);

    return similarity;
  }

  resetForm(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.descriptionResult = null;
    this.errorMessage = null;
    this.previousDescription = null;
    this.isDuplicateDescription = false;
    this.currentSimilarity = 0;
    this.stopCamera();
  }

  ngOnInit(): void {
    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Start speech recognition automatically
    this.startSpeechRecognition();
  }

  /**
   * Set up keyboard shortcuts for accessibility
   */
  setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // Use NgZone to ensure Angular detects the changes
      this.ngZone.run(() => {
        // Alt+V: Toggle voice recognition
        if (event.altKey && event.key === 'v') {
          this.toggleVoiceRecognition();
          event.preventDefault();
        }

        // Alt+C: Toggle camera mode
        if (event.altKey && event.key === 'c') {
          this.toggleCameraMode();
          event.preventDefault();
        }

        // Alt+M: Toggle description mode
        if (event.altKey && event.key === 'm') {
          this.toggleDescriptionMode();
          event.preventDefault();
        }

        // Alt+B: Toggle blind assistant mode directly
        if (event.altKey && event.key === 'b') {
          if (!this.isBlindAssistantMode) {
            // Cycle through modes until we reach blind assistant mode
            while (this.descriptionMode !== 'camera') {
              this.toggleDescriptionMode();
            }
          } else {
            // Switch to detailed mode (which turns off blind assistant)
            this.toggleDescriptionMode();
          }
          event.preventDefault();
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopCamera();
    this.stopSpeechRecognition();
  }

  /**
   * Initialize speech recognition if available in the browser
   */
  initSpeechRecognition(): void {
    // Check if the browser supports the Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // Create a speech recognition instance
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      this.speechRecognition = new SpeechRecognition();

      // Configure speech recognition
      this.speechRecognition.continuous = false; // We'll manually restart it for better control
      this.speechRecognition.interimResults = false;
      this.speechRecognition.lang = 'en-US';

      // Set up event handlers
      this.speechRecognition.onresult = (event: any) => {
        const command = event.results[0][0].transcript;
        console.log('Voice command recognized:', command);
        console.log('Confidence level:', event.results[0][0].confidence);

        // Use NgZone to ensure Angular detects the changes
        this.ngZone.run(() => {
          this.isListening = false;

          // Pre-process the command to handle common variations
          let processedCommand = command.toLowerCase().trim();

          // Handle common variations for blind assistant commands
          if (processedCommand.includes('blind') &&
              (processedCommand.includes('on') ||
               processedCommand.includes('start') ||
               processedCommand.includes('enable') ||
               processedCommand.includes('activate'))) {
            processedCommand = 'turn on blind assistant';
            console.log('Normalized to:', processedCommand);
          } else if (processedCommand.includes('blind') &&
                    (processedCommand.includes('off') ||
                     processedCommand.includes('stop') ||
                     processedCommand.includes('disable') ||
                     processedCommand.includes('deactivate'))) {
            processedCommand = 'turn off blind assistant';
            console.log('Normalized to:', processedCommand);
          }

          this.processRecognizedCommand(processedCommand);
        });
      };

      this.speechRecognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);

        this.ngZone.run(() => {
          this.isListening = false;
          this.voiceCommandError = `Speech recognition error: ${event.error}`;
        });
      };

      this.speechRecognition.onend = () => {
        this.ngZone.run(() => {
          this.isListening = false;

          // Always restart speech recognition after a short delay
          console.log('Speech recognition ended, restarting...');
          // Add a small delay before restarting to prevent rapid restarts
          setTimeout(() => {
            this.startSpeechRecognition();
          }, 1000);
        });
      };
    } else {
      console.warn('Speech recognition not supported in this browser');
    }
  }

  /**
   * Toggle speech recognition on/off
   */
  toggleVoiceRecognition(): void {
    if (this.isListening) {
      this.stopSpeechRecognition();
    } else {
      this.startSpeechRecognition();
    }
  }

  /**
   * Start speech recognition
   */
  startSpeechRecognition(): void {
    if (!this.speechRecognition) {
      this.voiceCommandError = 'Speech recognition not supported in this browser';
      return;
    }

    try {
      this.speechRecognition.start();
      this.isListening = true;
      this.voiceCommandError = null;
      this.voiceCommandResult = null;

      // Provide vibration feedback for blind users
      if (this.isBlindAssistantMode && 'vibrate' in navigator) {
        navigator.vibrate(100);
      }
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.voiceCommandError = `Error starting speech recognition: ${error}`;
      this.isListening = false;
    }
  }

  /**
   * Stop speech recognition
   */
  stopSpeechRecognition(): void {
    if (this.speechRecognition && this.isListening) {
      try {
        this.speechRecognition.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
      this.isListening = false;
    }
  }

  /**
   * Process a recognized voice command
   */
  processRecognizedCommand(command: string): void {
    console.log('Processing voice command:', command);

    // If not in blind assistant mode, only process commands to turn it on
    if (!this.isBlindAssistantMode) {
      // Check if the command is to turn on blind assistant
      if (command.toLowerCase().includes('blind assistant') &&
          (command.toLowerCase().includes('turn on') ||
           command.toLowerCase().includes('start') ||
           command.toLowerCase().includes('enable') ||
           command.toLowerCase().includes('activate'))) {

        console.log('Recognized command to turn on blind assistant mode');

        // Manually handle turning on blind assistant mode
        if (!this.isBlindAssistantMode) {
          // First make sure camera is on
          if (!this.isCameraMode) {
            console.log('Turning on camera first for blind assistant mode');
            this.toggleCameraMode();
          }

          // Cycle through modes until we reach blind assistant mode
          while (this.descriptionMode !== 'camera') {
            this.toggleDescriptionMode();
          }

          // Provide feedback
          this.voiceCommandResult = 'Blind assistant mode activated';

          // Provide vibration feedback
          if ('vibrate' in navigator) {
            navigator.vibrate(200);
          }

          // Clear the notification after 5 seconds
          setTimeout(() => {
            this.ngZone.run(() => {
              this.voiceCommandResult = null;
            });
          }, 5000);
        }

        return; // Don't process other commands when not in blind assistant mode
      } else {
        console.log('Ignoring command in non-blind assistant mode:', command);
        return; // Ignore other commands when not in blind assistant mode
      }
    }

    // If we get here, we're in blind assistant mode or processing a command to turn it on
    // Send the command to the backend for processing
    this.imageDescriptionService.processVoiceCommand(command).subscribe({
      next: (response: VoiceCommandResponse) => {
        this.voiceCommandResult = response.message;

        // Play audio response if available
        if (response.audio) {
          const audio = new Audio(`data:audio/wav;base64,${response.audio}`);
          audio.play();
        }

        // Handle the action based on the response
        this.handleVoiceCommandAction(response.action);

        // Provide vibration feedback for blind users
        if (this.isBlindAssistantMode && 'vibrate' in navigator) {
          navigator.vibrate(200);
        }

        // Clear the notification after 5 seconds
        setTimeout(() => {
          this.ngZone.run(() => {
            this.voiceCommandResult = null;
          });
        }, 5000);
      },
      error: (error: any) => {
        console.error('Error processing voice command:', error);
        this.voiceCommandError = `Error processing voice command: ${error.message || 'Unknown error'}`;

        // Clear the error notification after 5 seconds
        setTimeout(() => {
          this.ngZone.run(() => {
            this.voiceCommandError = null;
          });
        }, 5000);
      }
    });
  }

  /**
   * Handle the action from a voice command response
   */
  handleVoiceCommandAction(action: string): void {
    console.log(`Handling voice command action: ${action}`);

    switch (action) {
      case 'camera_on':
        console.log(`Camera ON command received. Current camera mode: ${this.isCameraMode}`);
        if (!this.isCameraMode) {
          this.toggleCameraMode();
        }
        break;

      case 'camera_off':
        console.log(`Camera OFF command received. Current camera mode: ${this.isCameraMode}`);
        if (this.isCameraMode) {
          this.toggleCameraMode();
        }
        break;

      case 'blind_assistant_on':
        console.log(`Blind Assistant ON command received. Current blind assistant mode: ${this.isBlindAssistantMode}, description mode: ${this.descriptionMode}`);
        if (!this.isBlindAssistantMode) {
          // First make sure camera is on
          if (!this.isCameraMode) {
            console.log('Turning on camera first');
            this.toggleCameraMode();
          }

          // Then cycle through modes until we reach blind assistant mode
          console.log('Cycling through modes to reach blind assistant mode');
          while (this.descriptionMode !== 'camera') {
            this.toggleDescriptionMode();
          }

          console.log(`After cycling: blind assistant mode: ${this.isBlindAssistantMode}, description mode: ${this.descriptionMode}`);
        } else {
          console.log('Blind assistant mode is already active');
        }
        break;

      case 'blind_assistant_off':
        console.log(`Blind Assistant OFF command received. Current blind assistant mode: ${this.isBlindAssistantMode}`);
        if (this.isBlindAssistantMode) {
          // Switch to detailed mode (which turns off blind assistant)
          this.toggleDescriptionMode();
        }
        break;

      default:
        console.log(`Unknown action: ${action}`);
        break;
    }
  }

  toggleCameraMode(): void {
    this.isCameraMode = !this.isCameraMode;

    // Reset previous description when switching modes
    this.previousDescription = null;
    this.isDuplicateDescription = false;
    this.currentSimilarity = 0;

    if (this.isCameraMode) {
      this.startCamera();
    } else {
      this.stopCamera();
    }
  }

  async startCamera(): Promise<void> {
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile devices
      });

      if (this.videoElement && this.videoElement.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.cameraStream;
        this.isCameraActive = true;

        // Start periodic capture if in quick or camera mode
        if (this.descriptionMode === 'quick' || this.descriptionMode === 'camera') {
          this.startPeriodicCapture();
        }
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      this.errorMessage = 'Could not access camera. Please check permissions.';
      this.isCameraMode = false;
    }
  }

  stopCamera(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }

    if (this.captureInterval) {
      this.captureInterval.unsubscribe();
      this.captureInterval = null;
    }

    this.isCameraActive = false;
  }

  startPeriodicCapture(): void {
    // Stop any existing interval
    if (this.captureInterval) {
      this.captureInterval.unsubscribe();
      this.captureInterval = null;
    }

    // Use 5 seconds for all modes
    const captureIntervalTime = 4000;
    console.log(`Starting periodic capture with interval: ${captureIntervalTime}ms, mode: ${this.descriptionMode}`);

    // Create a new interval that captures based on the mode
    this.captureInterval = interval(captureIntervalTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('Interval triggered, checking if we should capture...');
        if (!this.processingImage && this.isCameraActive) {
          console.log('Conditions met, capturing image...');
          this.captureAndProcessImage();

          // Provide subtle vibration feedback in blind assistant mode
          if (this.isBlindAssistantMode && 'vibrate' in navigator) {
            navigator.vibrate(50); // Very short vibration to indicate capture
          }
        } else {
          console.log(`Skipping capture - processingImage: ${this.processingImage}, isCameraActive: ${this.isCameraActive}`);
        }
      });
  }

  captureAndProcessImage(): void {
    const now = Date.now();
    const timeSinceLastProcess = now - this.lastProcessedTime;

    if (timeSinceLastProcess < this.processingThrottleTime) {
      console.log(`Throttling capture - only ${timeSinceLastProcess}ms since last capture (need ${this.processingThrottleTime}ms)`);
      return; // Skip if we processed an image recently
    }

    if (!this.videoElement || !this.canvasElement) {
      console.error('Missing video or canvas element');
      return;
    }

    if (this.processingImage) {
      console.log('Already processing an image, skipping capture');
      return;
    }

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;

    // Make sure video is playing
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

    // Process the image
    this.processCameraImage(imageDataUrl);
  }

  processCameraImage(imageDataUrl: string): void {
    console.log(`Processing camera image in ${this.descriptionMode} mode`);
    this.processingImage = true;
    this.isLoading = true;

    // Clear previous result to avoid overlapping responses
    this.descriptionResult = null;

    // Stop any audio that might be playing
    const audioElements = document.getElementsByTagName('audio');
    for (let i = 0; i < audioElements.length; i++) {
      audioElements[i].pause();
    }

    this.lastProcessedTime = Date.now();

    // Show processing feedback for blind users
    if (this.isBlindAssistantMode && 'vibrate' in navigator) {
      navigator.vibrate([100, 100, 100]); // Pattern to indicate processing started
      console.log('Vibration feedback sent for processing start');
    }

    this.imageDescriptionService.describeImageFromDataUrl(imageDataUrl, this.descriptionMode, this.detectedContext, this.selectedVoice)
      .subscribe({
        next: (response: ImageDescriptionResponse) => {
          this.isLoading = false;
          this.processingImage = false;

          // Check if the description is semantically similar to the previous one
          this.currentSimilarity = this.previousDescription ?
            this.calculateSimilarity(this.previousDescription, response.description) : 0;

          this.isDuplicateDescription = this.currentSimilarity >= this.similarityThreshold;

          if (this.isDuplicateDescription) {
            console.log(`Semantically similar description detected (${(this.currentSimilarity * 100).toFixed(0)}% similar), skipping audio playback`);
            // Still update the result for display purposes
            this.descriptionResult = response;

            // Provide subtle feedback for duplicate in blind assistant mode
            if (this.isBlindAssistantMode && 'vibrate' in navigator) {
              navigator.vibrate([50, 50]); // Short double-pulse to indicate duplicate
            }
          } else {
            // New description - update previous and play audio
            this.previousDescription = response.description;
            this.descriptionResult = response;

            // Update context awareness with the new description
            this.updateContext(response.description);

            // Auto-play audio for accessibility
            if (response.audio && (this.autoPlayAudio || this.isBlindAssistantMode)) {
              this.playAudio();

              // Provide completion feedback for blind users
              if (this.isBlindAssistantMode && 'vibrate' in navigator) {
                navigator.vibrate(200); // Single vibration to indicate completion
              }
            }
          }

          // Log processing time if available
          if (response.processing_time) {
            console.log(`Processing times - API: ${response.processing_time.api}s, TTS: ${response.processing_time.tts}s, Total: ${response.processing_time.total}s`);
          }
        },
        error: (error: any) => {
          console.error('Error processing camera image:', error);

          // Extract more detailed error message if available
          const errorMsg = error.message || 'Unknown error';
          this.errorMessage = `An error occurred while processing the camera image: ${errorMsg}`;

          // Log additional details for debugging
          if (error.status) {
            console.error(`HTTP Status: ${error.status}, Status Text: ${error.statusText || 'None'}`);
          }

          this.isLoading = false;
          this.processingImage = false;

          // Error feedback for blind users
          if (this.isBlindAssistantMode && 'vibrate' in navigator) {
            navigator.vibrate([100, 100, 100, 100, 100]); // Pattern to indicate error
          }
        }
      });
  }

  captureImage(): void {
    if (this.isCameraActive) {
      this.captureAndProcessImage();
    }
  }

  toggleDescriptionMode(): void {
    console.log(`Toggling description mode from ${this.descriptionMode}`);

    // Reset previous description when switching modes
    this.previousDescription = null;
    this.isDuplicateDescription = false;
    this.currentSimilarity = 0;

    // Cycle through modes: detailed -> quick -> camera (for blind assistant)
    if (this.descriptionMode === 'detailed') {
      this.descriptionMode = 'quick';
      console.log('Switched to quick mode');
    } else if (this.descriptionMode === 'quick') {
      this.descriptionMode = 'camera';
      this.isBlindAssistantMode = true;
      this.processingThrottleTime = 5000; // 5 seconds for blind assistant mode
      console.log('Switched to camera mode (blind assistant)');

      // Ensure camera is turned on when blind assistant mode is activated
      if (!this.isCameraMode) {
        console.log('Automatically turning on camera for blind assistant mode');
        this.toggleCameraMode(); // This will turn on the camera
      }
    } else {
      this.descriptionMode = 'detailed';
      this.isBlindAssistantMode = false;
      this.processingThrottleTime = 5000; // 5 seconds for all modes
      console.log('Switched to detailed mode');
    }

    // If in camera mode and switching to quick or camera, start periodic capture
    if (this.isCameraActive && (this.descriptionMode === 'quick' || this.descriptionMode === 'camera')) {
      console.log('Camera is active and mode is quick/camera - starting periodic capture');
      this.startPeriodicCapture();
    }
    // If switching to detailed mode, stop periodic capture
    else if (this.captureInterval && this.descriptionMode === 'detailed') {
      console.log('Stopping periodic capture');
      this.captureInterval.unsubscribe();
      this.captureInterval = null;
    }

    // Always keep voice recognition active, but with different behaviors based on mode
    if (this.isBlindAssistantMode) {
      this.autoPlayAudio = true;
      // Provide vibration feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(200); // Short vibration to indicate mode change
      }

      // Announce that full voice commands are available (in a real app, this would use TTS)
      setTimeout(() => {
        // This is just a placeholder - in a real app, you would use proper TTS
        console.log('Full voice commands are now available');
      }, 1000);
    } else {
      // When exiting blind assistant mode, announce that limited commands are available
      setTimeout(() => {
        console.log('Limited voice commands are available. Say "turn on blind assistant" to re-enable full voice control.');
      }, 1000);
    }

    // Always ensure speech recognition is active
    if (!this.isListening) {
      this.startSpeechRecognition();
    }
  }
}
