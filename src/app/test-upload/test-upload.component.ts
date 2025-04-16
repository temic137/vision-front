import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-test-upload',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 p-4 md:p-8">
      <div class="max-w-5xl mx-auto">
        <!-- Header with navigation -->
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mr-2" viewBox="0 0 24 24" fill="none" stroke="url(#eye-gradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <defs>
                <linearGradient id="eye-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#14b8a6" />
                  <stop offset="100%" stop-color="#9333ea" />
                </linearGradient>
              </defs>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <h1 class="text-2xl font-bold bg-gradient-to-r from-teal-500 to-purple-600 dark:from-teal-400 dark:to-purple-500 text-transparent bg-clip-text">Vision AI</h1>
          </div>
          <a routerLink="/" class="flex items-center gap-2 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm py-2 px-5 rounded-full shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Back to Home</span>
          </a>
        </div>

        <!-- Main content -->
        <div class="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-8 rounded-2xl shadow-xl mb-10 border border-gray-200/50 dark:border-gray-700/50">
          <div class="flex items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div class="w-12 h-12 rounded-full bg-gradient-to-r from-teal-500 to-purple-600 flex items-center justify-center mr-4 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
                <line x1="14" y1="7" x2="14" y2="11"></line>
                <line x1="12" y1="9" x2="16" y2="9"></line>
              </svg>
            </div>
            <h2 class="text-2xl font-bold bg-gradient-to-r from-teal-500 to-purple-600 dark:from-teal-400 dark:to-purple-500 text-transparent bg-clip-text">Test Image Upload</h2>
          </div>

          <p class="text-gray-700 dark:text-gray-300 mb-8">This tool allows you to test the image description API directly. Upload an image to see how the AI interprets it.</p>

          <div class="flex flex-col items-center gap-5 mb-8">
            <input type="file" id="imageInput" accept="image/*" (change)="onFileSelected($event)" class="hidden" />
            <label
              for="imageInput"
              class="group flex items-center justify-center gap-3 bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-600 hover:to-purple-700 text-white py-4 px-7 rounded-xl cursor-pointer transition-all duration-300 w-full max-w-xs shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
                <line x1="14" y1="7" x2="14" y2="11"></line>
                <line x1="12" y1="9" x2="16" y2="9"></line>
              </svg>
              <span class="font-medium text-lg">Choose an image</span>
            </label>

            <button
              class="group flex items-center justify-center gap-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white py-4 px-7 rounded-xl cursor-pointer transition-all duration-300 w-full max-w-xs shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              (click)="uploadImage()"
              [disabled]="!selectedFile || isLoading"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <span class="font-medium text-lg">Analyze Image</span>
            </button>
          </div>

          <!-- File info and preview -->
          <div class="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-md p-5 rounded-xl mb-6 border border-gray-200/50 dark:border-gray-700/50 shadow-md" *ngIf="selectedFile">
            <h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-teal-500 dark:text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              Selected File
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <!-- Image preview -->
              <div class="bg-white/90 dark:bg-gray-900/90 p-4 rounded-xl shadow-md border border-gray-200/50 dark:border-gray-700/50 flex items-center justify-center">
                <img *ngIf="imagePreview" [src]="imagePreview" class="max-w-full max-h-64 rounded-lg object-contain" alt="Image preview" />
                <div *ngIf="!imagePreview" class="flex items-center justify-center h-48 w-full bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p class="text-gray-500 dark:text-gray-400">Preview loading...</p>
                </div>
              </div>

              <!-- File details -->
              <div class="flex flex-col gap-3">
                <div class="bg-white/80 dark:bg-gray-900/80 p-3 rounded-lg">
                  <span class="text-gray-500 dark:text-gray-400">Name:</span>
                  <span class="text-gray-800 dark:text-gray-200 font-medium ml-2">{{ selectedFile.name }}</span>
                </div>
                <div class="bg-white/80 dark:bg-gray-900/80 p-3 rounded-lg">
                  <span class="text-gray-500 dark:text-gray-400">Size:</span>
                  <span class="text-gray-800 dark:text-gray-200 font-medium ml-2">{{ (selectedFile.size / 1024).toFixed(2) }} KB</span>
                </div>
                <div class="bg-white/80 dark:bg-gray-900/80 p-3 rounded-lg">
                  <span class="text-gray-500 dark:text-gray-400">Type:</span>
                  <span class="text-gray-800 dark:text-gray-200 font-medium ml-2">{{ selectedFile.type }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Loading indicator -->
          <div
            class="flex flex-col items-center justify-center p-12 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl shadow-xl mb-10 border border-gray-200/50 dark:border-gray-700/50"
            *ngIf="isLoading"
          >
            <div class="relative w-20 h-20 mb-8">
              <div class="absolute inset-0 rounded-full bg-gradient-to-r from-teal-500 via-purple-500 to-pink-500 opacity-30 animate-pulse"></div>
              <div class="absolute inset-1 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                <div class="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 border-t-teal-500 border-r-purple-500 border-b-pink-500 rounded-full animate-spin"></div>
              </div>
              <div class="absolute inset-0 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gradient bg-gradient-to-r from-teal-500 to-purple-600 text-transparent bg-clip-text animate-pulse" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
            </div>
            <p class="text-gray-700 dark:text-gray-300 font-medium flex items-center text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-teal-500 dark:text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 12H2"/>
                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
                <line x1="6" y1="16" x2="6.01" y2="16"/>
                <line x1="10" y1="16" x2="10.01" y2="16"/>
              </svg> Processing image...
            </p>
          </div>

          <!-- Error message -->
          <div
            class="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 p-6 rounded-2xl border border-red-100 dark:border-red-800/30 mb-10 shadow-lg backdrop-blur-sm"
            *ngIf="errorMessage"
          >
            <div class="flex items-center">
              <div class="w-12 h-12 rounded-full bg-gradient-to-r from-red-500 to-rose-600 flex items-center justify-center mr-4 shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-red-800 dark:text-red-300 mb-1">Error</h3>
                <p class="text-gray-800 dark:text-gray-200">{{ errorMessage }}</p>
              </div>
            </div>
          </div>

          <!-- Success message -->
          <div *ngIf="successMessage && responseData" class="mb-10">
            <div class="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl border border-green-100 dark:border-green-800/30 mb-6 shadow-lg backdrop-blur-sm">
              <div class="flex items-center">
                <div class="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center mr-4 shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-green-800 dark:text-green-300 mb-1">Success</h3>
                  <p class="text-gray-800 dark:text-gray-200">{{ successMessage }}</p>
                </div>
              </div>
            </div>

            <!-- Response data -->
            <div class="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50">
              <h3 class="text-xl font-bold bg-gradient-to-r from-teal-500 to-purple-600 dark:from-teal-400 dark:to-purple-500 text-transparent bg-clip-text mb-4">API Response</h3>

              <div class="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-md p-6 rounded-xl mb-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
                <h4 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Description</h4>
                <p class="text-gray-700 dark:text-gray-300 leading-relaxed">{{ responseData.description }}</p>
              </div>

              <div class="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-md p-6 rounded-xl mb-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg" *ngIf="responseData.processing_time">
                <h4 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Processing Times</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="bg-white/80 dark:bg-gray-900/80 p-4 rounded-lg shadow-sm">
                    <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">API Processing</div>
                    <div class="text-xl font-medium text-teal-600 dark:text-teal-400">{{ responseData.processing_time.api }}s</div>
                  </div>
                  <div class="bg-white/80 dark:bg-gray-900/80 p-4 rounded-lg shadow-sm">
                    <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">TTS Generation</div>
                    <div class="text-xl font-medium text-purple-600 dark:text-purple-400">{{ responseData.processing_time.tts }}s</div>
                  </div>
                  <div class="bg-white/80 dark:bg-gray-900/80 p-4 rounded-lg shadow-sm">
                    <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Time</div>
                    <div class="text-xl font-medium text-pink-600 dark:text-pink-400">{{ responseData.processing_time.total }}s</div>
                  </div>
                </div>
              </div>

              <div class="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-md p-6 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg" *ngIf="responseData.audio">
                <h4 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-teal-500 dark:text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                  </svg>
                  Audio Narration
                </h4>
                <div class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md p-4 rounded-xl shadow-md border border-gray-200/50 dark:border-gray-700/50">
                  <audio controls class="w-full max-w-md rounded">
                    <source [src]="'data:audio/mp3;base64,' + responseData.audio" type="audio/mp3">
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>

              <div class="mt-6">
                <button
                  class="group flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-xl cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 shadow-md"
                  (click)="resetForm()"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M23 4v6h-6"></path>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class TestUploadComponent {
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  responseData: any = null;

  constructor(private http: HttpClient) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.errorMessage = null;
      this.successMessage = null;
      this.responseData = null;

      // Create image preview
      this.createImagePreview();

      console.log(`Selected file: ${this.selectedFile.name}, size: ${this.selectedFile.size} bytes, type: ${this.selectedFile.type}`);
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

  uploadImage(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select an image first';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.responseData = null;

    const formData = new FormData();
    formData.append('image', this.selectedFile);
    formData.append('mode', 'detailed');
    formData.append('is_camera', 'false');
    formData.append('voice_type', 'nova'); // Using high-quality TTS voice

    // Log the request details
    console.log(`Sending test image to backend: ${this.selectedFile.name}, size: ${this.selectedFile.size} bytes, type: ${this.selectedFile.type}`);

    this.http.post('https://vision-back-bfbwfhgmfndmgaf3.canadacentral-01.azurewebsites.net/describe-image', formData)
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          this.successMessage = 'Image uploaded and processed successfully!';
          this.responseData = response;
          console.log('Response:', response);
        },
        error: (error: any) => {
          this.isLoading = false;
          console.error('Error uploading image:', error);

          let errorMsg = 'An error occurred while uploading the image.';

          if (error.error instanceof ErrorEvent) {
            // Client-side error
            errorMsg = `Client error: ${error.error.message}`;
          } else if (error.status) {
            // Server-side error with status
            errorMsg = `Server error: ${error.status} - ${error.statusText || ''} - ${error.error?.message || JSON.stringify(error.error) || 'Unknown error'}`;
          } else if (error.message) {
            // Error with message
            errorMsg = error.message;
          }

          this.errorMessage = errorMsg;
        }
      });
  }

  resetForm(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.errorMessage = null;
    this.successMessage = null;
    this.responseData = null;
    this.isLoading = false;
  }
}
