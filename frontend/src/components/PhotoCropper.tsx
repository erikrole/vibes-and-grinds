import { useState, useRef } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface Props {
  imageUrl: string;
  onComplete: (file: File) => void;
  onCancel: () => void;
}

export default function PhotoCropper({ imageUrl, onComplete, onCancel }: Props) {
  const [crop, setCrop] = useState<Crop | undefined>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | Crop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize crop when image loads
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const aspect = 4 / 5;

    // Calculate the largest 4:5 crop that fits
    let cropWidth, cropHeight;
    if (width / height > aspect) {
      // Image is wider than 4:5, constrain by height
      cropHeight = height;
      cropWidth = height * aspect;
    } else {
      // Image is taller than 4:5, constrain by width
      cropWidth = width;
      cropHeight = width / aspect;
    }

    // Center the crop
    const x = (width - cropWidth) / 2;
    const y = (height - cropHeight) / 2;

    const initialCrop: Crop = {
      unit: 'px',
      x,
      y,
      width: cropWidth,
      height: cropHeight,
    };

    setCrop(initialCrop);
    setCompletedCrop(initialCrop);
  };

  const handleCropComplete = async () => {
    const image = imgRef.current;
    const canvas = canvasRef.current;

    if (!image || !canvas) {
      return;
    }

    // Use completedCrop if available, otherwise fall back to current crop
    const cropToUse: any = completedCrop || crop;

    if (!cropToUse || !cropToUse.width || !cropToUse.height) {
      console.error('Invalid crop dimensions');
      return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    // Calculate pixel crop dimensions
    const pixelCrop = {
      x: cropToUse.x || 0,
      y: cropToUse.y || 0,
      width: cropToUse.width,
      height: cropToUse.height,
    };

    // If crop is in percentage, convert to pixels
    if (cropToUse.unit === '%') {
      pixelCrop.x = (cropToUse.x || 0) * image.width / 100;
      pixelCrop.y = (cropToUse.y || 0) * image.height / 100;
      pixelCrop.width = cropToUse.width * image.width / 100;
      pixelCrop.height = cropToUse.height * image.height / 100;
    }

    canvas.width = pixelCrop.width * scaleX;
    canvas.height = pixelCrop.height * scaleY;

    ctx.drawImage(
      image,
      pixelCrop.x * scaleX,
      pixelCrop.y * scaleY,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY,
      0,
      0,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY
    );

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Canvas is empty');
        return;
      }
      const file = new File([blob], 'cropped-photo.jpg', { type: 'image/jpeg' });
      onComplete(file);
    }, 'image/jpeg', 0.95);
  };

  return (
    <div className="fixed inset-0 z-[1003] overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-full items-end sm:items-center justify-center sm:p-4">
        <div className="relative bg-white dark:bg-stone-800 rounded-t-2xl sm:rounded-2xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-y-auto transition-colors">
          <div className="p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-stone-900 dark:text-stone-50">Crop Photo</h2>

            <div className="mb-4">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={4 / 5}
              >
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Crop preview"
                  crossOrigin="anonymous"
                  onLoad={onImageLoad}
                  style={{ maxHeight: '55vh' }}
                />
              </ReactCrop>
            </div>

            {/* Hidden canvas for cropping */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleCropComplete}
                className="btn-primary flex-1"
              >
                Done
              </button>
              <button
                onClick={onCancel}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
