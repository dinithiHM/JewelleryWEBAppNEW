/**
 * Compresses an image file to reduce its size
 * @param file The image file to compress
 * @param maxSizeMB Maximum size in MB
 * @param maxWidthOrHeight Maximum width or height in pixels
 * @returns A promise that resolves to a base64 string of the compressed image
 */
export const compressImage = async (
  file: File,
  maxSizeMB: number = 1,
  maxWidthOrHeight: number = 1024
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        // Create a canvas to resize the image
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidthOrHeight) {
            height = Math.round(height * maxWidthOrHeight / width);
            width = maxWidthOrHeight;
          }
        } else {
          if (height > maxWidthOrHeight) {
            width = Math.round(width * maxWidthOrHeight / height);
            height = maxWidthOrHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw the resized image on the canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with reduced quality
        const quality = 0.7; // 70% quality
        const compressedBase64 = canvas.toDataURL(file.type, quality);
        
        // Check if the compressed image is still too large
        const base64Size = (compressedBase64.length * 3) / 4 / 1024 / 1024; // Size in MB
        
        if (base64Size > maxSizeMB) {
          // If still too large, compress more aggressively
          const furtherQuality = Math.min(maxSizeMB / base64Size * quality, 0.5);
          const furtherCompressed = canvas.toDataURL(file.type, furtherQuality);
          resolve(furtherCompressed);
        } else {
          resolve(compressedBase64);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Error loading image'));
      };
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
  });
};
