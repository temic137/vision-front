// import { Injectable } from '@angular/core';

// @Injectable({
//   providedIn: 'root'
// })
// export class ImageDescribeService {

//   constructor() { }
// }

// import { Injectable } from '@angular/core';

// @Injectable({
//   providedIn: 'root'
// })
// export class ImageDescribeService {

//   constructor() { }
// }



import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';

export interface ImageDescriptionResponse {
  description: string;
  audio: string;
  processing_time?: {
    api: number;
    tts: number;
    total: number;
  };
  timestamp?: number;
}

export interface VoiceCommandResponse {
  command: string;
  action: string;
  message: string;
  audio?: string;
}

export type DescriptionMode = 'quick' | 'detailed' | 'camera';

@Injectable({
  providedIn: 'root'
})
export class ImageDescriptionService {
  private apiUrl = 'https://vision-back-wqzvn.kinsta.app'; // Flask backend URL
  private cache: Map<string, ImageDescriptionResponse> = new Map();

  constructor(private http: HttpClient) { }

  describeImage(imageFile: File, mode: DescriptionMode = 'detailed', isCamera: boolean = false, context: string = '', voiceType: string = 'female'): Observable<ImageDescriptionResponse> {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('mode', mode);
    formData.append('is_camera', isCamera.toString());
    formData.append('voice_type', voiceType); // Add voice type parameter

    // Add context information if available
    if (context) {
      formData.append('context', context);
    }

    // Use the cache for camera mode to reduce API calls
    const cacheKey = isCamera ? `camera-${mode}-${Date.now().toString().slice(0, -3)}` : null;

    // Log the request details
    console.log(`Sending image to backend: ${imageFile.name}, size: ${imageFile.size} bytes, type: ${imageFile.type}`);

    return this.http.post<ImageDescriptionResponse>(`${this.apiUrl}/describe-image`, formData)
      .pipe(
        timeout(60000), // Add a 60-second timeout
        retry(1), // Retry once if the request fails
        catchError(this.handleError)
      );
  }

  /**
   * Process an image from a data URL (for camera capture)
   */
  describeImageFromDataUrl(dataUrl: string, mode: DescriptionMode = 'camera', context: string = '', voiceType: string = 'female'): Observable<ImageDescriptionResponse> {
    try {
      // Convert data URL to Blob
      const blob = this.dataURLtoBlob(dataUrl);
      const imageFile = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });

      // Log the blob size
      console.log(`Created image blob from data URL, size: ${blob.size} bytes`);

      // Always set isCamera to true for data URLs (camera captures)
      return this.describeImage(imageFile, mode, true, context, voiceType);
    } catch (error) {
      console.error('Error converting data URL to blob:', error);
      return throwError(() => new Error('Failed to process camera image: ' + (error instanceof Error ? error.message : String(error))));
    }
  }

  /**
   * Helper method to convert a data URL to a Blob
   */
  private dataURLtoBlob(dataURL: string): Blob {
    try {
      if (!dataURL || dataURL.length < 100) {
        throw new Error(`Invalid data URL: too short (${dataURL.length} chars)`);
      }

      const arr = dataURL.split(',');
      if (arr.length !== 2) {
        throw new Error('Invalid data URL format: missing comma separator');
      }

      const mimeMatch = arr[0].match(/:(.*?);/);
      if (!mimeMatch) {
        throw new Error('Invalid data URL format: cannot extract MIME type');
      }

      const mime = mimeMatch[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      return new Blob([u8arr], { type: mime });
    } catch (error) {
      console.error('Error in dataURLtoBlob:', error);
      throw error;
    }
  }

  /**
   * Process a voice command
   * @param command The text command to process
   * @returns Observable with the command response
   */
  processVoiceCommand(command: string): Observable<VoiceCommandResponse> {
    const formData = new FormData();
    formData.append('command', command);

    console.log(`Sending voice command to backend: ${command}`);

    return this.http.post<VoiceCommandResponse>(`${this.apiUrl}/process-voice-command`, formData)
      .pipe(
        timeout(10000), // Add a 10-second timeout
        retry(1), // Retry once if the request fails
        catchError(this.handleError)
      );
  }

  /**
   * Process a voice command from audio data
   * @param audioBlob The audio blob containing the voice command
   * @returns Observable with the command response
   */
  processVoiceAudio(audioBlob: Blob): Observable<VoiceCommandResponse> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-command.webm');

    console.log(`Sending voice audio to backend, size: ${audioBlob.size} bytes`);

    return this.http.post<VoiceCommandResponse>(`${this.apiUrl}/process-voice-command`, formData)
      .pipe(
        timeout(10000), // Add a 10-second timeout
        retry(1), // Retry once if the request fails
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse | TimeoutError) {
    let errorMessage = '';

    if (error instanceof TimeoutError) {
      // Timeout error
      errorMessage = 'Request timed out. The server took too long to respond.';
    } else if (error instanceof HttpErrorResponse) {
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Client error: ${error.error.message}`;
      } else {
        // Server-side error
        errorMessage = `Server error: ${error.status} - ${error.statusText || ''} - ${error.error?.message || JSON.stringify(error.error) || 'Unknown error'}`;
      }
    } else {
      // Generic error
      errorMessage = `Unknown error: ${error}`;
    }

    console.error('API error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
