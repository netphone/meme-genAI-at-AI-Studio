import React, { useRef, useEffect, useState } from 'react';
import { MemeText } from '../types';

interface MemeCanvasProps {
  imageSrc: string | null;
  texts: MemeText[];
  onTextUpdate: (id: string, updates: Partial<MemeText>) => void;
  onTextSelect: (id: string) => void;
  selectedTextId: string | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  className?: string;
}

const MemeCanvas: React.FC<MemeCanvasProps> = ({ 
  imageSrc, 
  texts, 
  onTextUpdate, 
  onTextSelect, 
  selectedTextId,
  canvasRef,
  className = "bg-gray-950/50"
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    // Allow loading from external sources if needed (CORS)
    img.crossOrigin = "anonymous";
    
    const draw = () => {
       // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw background image
      // We want to fit the image into the canvas while maintaining aspect ratio, 
      // but for a meme generator, typically the canvas resizes to the image.
      // Here we will draw the image full size of the canvas.
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw texts
      texts.forEach(text => {
        ctx.font = `bold ${text.fontSize}px Impact`;
        ctx.fillStyle = text.color;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = text.fontSize / 15;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Stroke
        ctx.strokeText(text.text, text.x, text.y);
        // Fill
        ctx.fillText(text.text, text.x, text.y);

        // Selection indicator
        if (text.id === selectedTextId) {
          ctx.strokeStyle = '#6366f1'; // Indigo-500
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          const metrics = ctx.measureText(text.text);
          const height = text.fontSize;
          const width = metrics.width;
          ctx.strokeRect(
            text.x - width / 2 - 10, 
            text.y - height / 2 - 5, 
            width + 20, 
            height + 10
          );
          ctx.setLineDash([]);
        }
      });
    };

    if (imageSrc) {
        img.src = imageSrc;
        img.onload = () => {
            // Resize canvas to match image aspect ratio, but keep max width
            const maxWidth = 800; // Max display width
            const scale = Math.min(1, maxWidth / img.width);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            
            // Adjust texts if canvas resized (optional optimization, ignored for simplicity)
            draw();
        };
    } else {
        // Default blank canvas
        canvas.width = 600;
        canvas.height = 400;
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0,0, 600, 400);
        ctx.fillStyle = '#4b5563';
        ctx.textAlign = 'center';
        ctx.font = '20px sans-serif';
        ctx.fillText('Upload an image to start', 300, 200);
    }
  }, [imageSrc, texts, selectedTextId, canvasRef]);

  // Handle Mouse/Touch Interaction for Dragging
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Check hit detection (reverse order to pick top-most)
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clickedTextId: string | null = null;

    for (let i = texts.length - 1; i >= 0; i--) {
      const text = texts[i];
      ctx.font = `bold ${text.fontSize}px Impact`;
      const metrics = ctx.measureText(text.text);
      const width = metrics.width;
      const height = text.fontSize; // Approx height

      // Simple bounding box check
      if (
        x >= text.x - width / 2 &&
        x <= text.x + width / 2 &&
        y >= text.y - height / 2 &&
        y <= text.y + height / 2
      ) {
        clickedTextId = text.id;
        break;
      }
    }

    if (clickedTextId) {
      onTextSelect(clickedTextId);
      setIsDragging(true);
      setDragStart({ x, y });
    } else {
      onTextSelect(''); // Deselect
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedTextId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // Calculate scale factor between display size and actual canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    const dx = currentX - dragStart.x;
    const dy = currentY - dragStart.y;

    const text = texts.find(t => t.id === selectedTextId);
    if (text) {
        onTextUpdate(selectedTextId, {
            x: text.x + dx,
            y: text.y + dy
        });
        setDragStart({ x: currentX, y: currentY });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div className={`relative w-full flex justify-center rounded-xl overflow-hidden border shadow-2xl p-4 ${className}`} ref={containerRef}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="max-w-full h-auto cursor-crosshair touch-none shadow-lg"
      />
    </div>
  );
};

export default MemeCanvas;