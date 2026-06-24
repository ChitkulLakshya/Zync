import React, { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RotateCw, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ProfilePhotoCropperProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area, rotation: number): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const rotRad = (rotation * Math.PI) / 180;

  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d')!;
  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas is empty'));
        }
      },
      'image/jpeg',
      0.92
    );
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (e) => reject(e));
    image.crossOrigin = 'anonymous';
    image.src = url;
  });
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

const ProfilePhotoCropper: React.FC<ProfilePhotoCropperProps> = ({
  open,
  imageSrc,
  onClose,
  onCropComplete,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropChange = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) {
      return;
    }
    setSaving(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onCropComplete(croppedBlob);
    } catch (e) {
      console.error('Crop failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleRotateLeft = () => setRotation((r) => (r - 90 + 360) % 360);
  const handleRotateRight = () => setRotation((r) => (r + 90) % 360);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Adjust Profile Photo</DialogTitle>
          <DialogDescription className="sr-only">
            Crop, zoom, and rotate your profile image before saving.
          </DialogDescription>
        </DialogHeader>

        {}
        <div className="relative w-full h-[350px] bg-background/90">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropChange}
          />
        </div>

        {}
        <div className="px-6 py-4 space-y-4">
          {}
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.05}
              onValueChange={(v) => setZoom(v[0])}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>

          {}
          <div className="flex items-center gap-3">
            <RotateCcw className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider
              value={[rotation]}
              min={0}
              max={360}
              step={1}
              onValueChange={(v) => setRotation(v[0])}
              className="flex-1"
            />
            <RotateCw className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>

          {}
          <div className="flex justify-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleRotateLeft}>
              <RotateCcw className="w-4 h-4 mr-1" /> 90°
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleRotateRight}>
              <RotateCw className="w-4 h-4 mr-1" /> 90°
            </Button>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Photo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePhotoCropper;
