/**
 * Reads a File object and returns a base64 thumbnail (64×64 JPEG).
 * Keeps file size small enough for IndexedDB storage.
 */
export function resizeImageToBase64(file, size = 64) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");

        // Centre-crop to square
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;

        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);

        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };

      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


