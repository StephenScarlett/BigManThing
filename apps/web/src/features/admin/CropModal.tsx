/**
 * CropModal — interactive square crop UI.
 * Uses react-easy-crop for drag + zoom, then renders to a 256×256 webp blob.
 */
import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  imageSrc: string; // object URL of the raw file
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

export default function CropModal({ imageSrc, onConfirm, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
    setProcessing(false);
    onConfirm(blob);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="bg-surface rounded-xl border border-line shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h3 className="font-semibold text-sm">Crop image</h3>
          <button onClick={onCancel} className="text-ink-muted hover:text-ink transition-colors text-lg leading-none">✕</button>
        </div>

        {/* Crop area */}
        <div className="relative bg-black" style={{ height: 380 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="rect"
            showGrid
            style={{
              containerStyle: { borderRadius: 0 },
              cropAreaStyle: { border: "2px solid #E53E3E" },
            }}
          />
        </div>

        {/* Zoom slider */}
        <div className="px-4 py-3 border-t border-line space-y-1">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>Zoom</span>
            <span>{zoom.toFixed(1)}×</span>
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-brand-red"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={handleConfirm}
            disabled={processing}
            className="btn-primary flex-1"
          >
            {processing ? "Processing…" : "✓ Crop & upload"}
          </button>
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Canvas crop helper ────────────────────────────────────────────────────────

async function getCroppedBlob(imageSrc: string, cropPixels: Area): Promise<Blob> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    img,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, 256, 256,
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas to blob failed"))),
      "image/webp",
      0.88,
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}
