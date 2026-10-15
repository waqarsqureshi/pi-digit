import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Play,
  Pause,
  Download,
  Code,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Video,
  Eye,
  Layers,
  ArrowRight,
  Maximize2,
} from 'lucide-react';
import { ThemeId } from '../types/theme';

export type MorphologicalFilter =
  | 'none'
  | 'sobel'
  | 'canny'
  | 'dilation'
  | 'erosion'
  | 'threshold'
  | 'grayscale'
  | 'invert'
  | 'matrix_green'
  | 'cyberpunk';

interface PiCameraTwinProps {
  theme: ThemeId;
  onSendMatrixFrame?: (pixels: [number, number, number][]) => void;
  onLoadVisionCode?: () => void;
  onBackToWorkspace?: () => void;
}

export function PiCameraTwin({
  theme,
  onSendMatrixFrame,
  onLoadVisionCode,
  onBackToWorkspace,
}: PiCameraTwinProps) {
  const [filter, setFilter] = useState<MorphologicalFilter>('sobel');
  const [threshold, setThreshold] = useState<number>(100);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [cameraSource, setCameraSource] = useState<'webcam' | 'simulation'>('simulation');
  const [streamToMatrix, setStreamToMatrix] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(30);
  const [cameraConnected, setCameraConnected] = useState<boolean>(false);
  const [cameraModel, setCameraModel] = useState<string>('Checking...');
  const [snapshotSuccess, setSnapshotSuccess] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(performance.now());
  const frameCount = useRef<number>(0);
  const simAngle = useRef<number>(0);

  // Check hardware camera status from backend
  useEffect(() => {
    let isMounted = true;
    async function checkCameraStatus() {
      try {
        const res = await fetch('/api/camera/status');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setCameraConnected(data.connected);
            setCameraModel(data.device || (data.connected ? 'Raspberry Pi Camera Module 3' : 'Virtual / Web Simulator'));
          }
        } else {
          if (isMounted) {
            setCameraConnected(false);
            setCameraModel('Digital Twin Virtual Camera Feed');
          }
        }
      } catch {
        if (isMounted) {
          setCameraConnected(false);
          setCameraModel('Digital Twin Virtual Camera Feed');
        }
      }
    }
    checkCameraStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  // WebCam setup or fallback to simulation
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (cameraSource === 'webcam') {
      navigator.mediaDevices
        ?.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch(() => {
          // Fall back gracefully to simulation if permission denied or no webcam
          setCameraSource('simulation');
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraSource]);

  // Main rendering & computer vision morphological filter loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let running = true;

    const processFrame = () => {
      if (!running) return;

      const now = performance.now();
      frameCount.current++;
      if (now - lastFrameTime.current >= 1000) {
        setFps(frameCount.current);
        frameCount.current = 0;
        lastFrameTime.current = now;
      }

      if (isStreaming) {
        const width = canvas.width;
        const height = canvas.height;

        if (cameraSource === 'webcam' && videoRef.current && videoRef.current.readyState >= 2) {
          // Draw webcam video mirrored
          ctx.save();
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, width, height);
          ctx.restore();
        } else {
          // Draw rich animated Raspberry Pi robotics test pattern
          simAngle.current += 0.02;
          renderSimulatedScene(ctx, width, height, simAngle.current);
        }

        // Apply morphological filter
        if (filter !== 'none') {
          applyMorphologicalFilter(ctx, width, height, filter, threshold);
        }

        // Optional downsample to 8x8 Sense HAT matrix
        if (streamToMatrix && onSendMatrixFrame && frameCount.current % 4 === 0) {
          const matrixFrame = extract8x8Matrix(ctx, width, height);
          onSendMatrixFrame(matrixFrame);
        }
      }

      animFrameId.current = requestAnimationFrame(processFrame);
    };

    animFrameId.current = requestAnimationFrame(processFrame);

    return () => {
      running = false;
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [isStreaming, cameraSource, filter, threshold, streamToMatrix, onSendMatrixFrame]);

  // Helper to render interactive synthetic scene
  function renderSimulatedScene(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    angle: number
  ) {
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0a0d1a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#090514');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Grid lines for edge detection testing
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Rotating Raspberry Pi Board Silhouette / Robotics Obstacle
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(angle * 0.4);

    // Outer obstacle box
    ctx.fillStyle = '#059669';
    ctx.fillRect(-110, -75, 220, 150);

    // Connectors / GPIO Header
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-100, -70, 200, 24);
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-96 + i * 10, -68, 6, 8);
      ctx.fillRect(-96 + i * 10, -58, 6, 8);
    }

    // Broadcom SoC Chip
    ctx.fillStyle = '#18181b';
    ctx.fillRect(-35, -20, 70, 70);
    ctx.strokeStyle = '#a1a1aa';
    ctx.lineWidth = 2;
    ctx.strokeRect(-35, -20, 70, 70);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('BCM2711', -25, 20);

    // Raspberry Pi Emblem
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(60, 15, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10b981';
    ctx.fillRect(56, -10, 8, 10);

    ctx.restore();

    // Floating dynamic orbital particles for edge detection
    for (let i = 0; i < 4; i++) {
      const pAngle = angle * (1.2 + i * 0.3) + (i * Math.PI) / 2;
      const r = 130 + Math.sin(angle * 2 + i) * 35;
      const px = w / 2 + Math.cos(pAngle) * r;
      const py = h / 2 + Math.sin(pAngle) * r;

      ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#ec4899';
      ctx.beginPath();
      ctx.arc(px, py, 14 + (i % 3) * 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Onscreen telemetry overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(8, 8, 220, 48);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(8, 8, 220, 48);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`CAM: CSI-2 OV5647 (640x480)`, 16, 26);
    ctx.fillStyle = '#a7f3d0';
    ctx.font = '10px monospace';
    ctx.fillText(`MODE: REAL-TIME CV PIPELINE`, 16, 42);
  }

  // Morphological filter algorithms
  function applyMorphologicalFilter(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    filterType: MorphologicalFilter,
    thresh: number
  ) {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const output = ctx.createImageData(w, h);
    const out = output.data;

    // Helper: Grayscale pixel value at (x, y)
    const getGray = (x: number, y: number): number => {
      if (x < 0) x = 0;
      if (x >= w) x = w - 1;
      if (y < 0) y = 0;
      if (y >= h) y = h - 1;
      const idx = (y * w + x) * 4;
      return (d[idx] * 299 + d[idx + 1] * 587 + d[idx + 2] * 114) / 1000;
    };

    if (filterType === 'grayscale') {
      for (let i = 0; i < d.length; i += 4) {
        const g = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
        out[i] = g;
        out[i + 1] = g;
        out[i + 2] = g;
        out[i + 3] = 255;
      }
    } else if (filterType === 'invert') {
      for (let i = 0; i < d.length; i += 4) {
        out[i] = 255 - d[i];
        out[i + 1] = 255 - d[i + 1];
        out[i + 2] = 255 - d[i + 2];
        out[i + 3] = 255;
      }
    } else if (filterType === 'threshold') {
      for (let i = 0; i < d.length; i += 4) {
        const g = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
        const val = g >= thresh ? 255 : 0;
        out[i] = val;
        out[i + 1] = val;
        out[i + 2] = val;
        out[i + 3] = 255;
      }
    } else if (filterType === 'sobel') {
      // 3x3 Sobel Operator: Horizontal (Gx) and Vertical (Gy)
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const gx =
            -1 * getGray(x - 1, y - 1) +
            1 * getGray(x + 1, y - 1) +
            -2 * getGray(x - 1, y) +
            2 * getGray(x + 1, y) +
            -1 * getGray(x - 1, y + 1) +
            1 * getGray(x + 1, y + 1);

          const gy =
            -1 * getGray(x - 1, y - 1) +
            -2 * getGray(x, y - 1) +
            -1 * getGray(x + 1, y - 1) +
            1 * getGray(x - 1, y + 1) +
            2 * getGray(x, y + 1) +
            1 * getGray(x + 1, y + 1);

          const mag = Math.sqrt(gx * gx + gy * gy);
          const val = mag > thresh ? 255 : 0;

          const idx = (y * w + x) * 4;
          out[idx] = val === 255 ? 56 : 10;
          out[idx + 1] = val === 255 ? 189 : 10;
          out[idx + 2] = val === 255 ? 248 : 20;
          out[idx + 3] = 255;
        }
      }
    } else if (filterType === 'canny') {
      // High-pass gradient contour
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const c = getGray(x, y);
          const diff =
            Math.abs(c - getGray(x + 1, y)) +
            Math.abs(c - getGray(x, y + 1)) +
            Math.abs(c - getGray(x - 1, y)) +
            Math.abs(c - getGray(x, y - 1));
          const val = diff > thresh * 0.8 ? 255 : 0;
          const idx = (y * w + x) * 4;
          out[idx] = val === 255 ? 244 : 5;
          out[idx + 1] = val === 255 ? 63 : 5;
          out[idx + 2] = val === 255 ? 94 : 10;
          out[idx + 3] = 255;
        }
      }
    } else if (filterType === 'dilation') {
      // 3x3 Max morphological operator (widens high-contrast regions)
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          let maxVal = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const g = getGray(x + dx, y + dy);
              if (g > maxVal) maxVal = g;
            }
          }
          const idx = (y * w + x) * 4;
          out[idx] = maxVal;
          out[idx + 1] = maxVal;
          out[idx + 2] = maxVal;
          out[idx + 3] = 255;
        }
      }
    } else if (filterType === 'erosion') {
      // 3x3 Min morphological operator (erodes bright regions)
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          let minVal = 255;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const g = getGray(x + dx, y + dy);
              if (g < minVal) minVal = g;
            }
          }
          const idx = (y * w + x) * 4;
          out[idx] = minVal;
          out[idx + 1] = minVal;
          out[idx + 2] = minVal;
          out[idx + 3] = 255;
        }
      }
    } else if (filterType === 'matrix_green') {
      // Matrix Phosphor CRT green aesthetic
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const gx = -1 * getGray(x - 1, y) + 1 * getGray(x + 1, y);
          const gy = -1 * getGray(x, y - 1) + 1 * getGray(x, y + 1);
          const mag = Math.sqrt(gx * gx + gy * gy);
          const idx = (y * w + x) * 4;

          if (mag > thresh * 0.7) {
            out[idx] = 0;
            out[idx + 1] = 255; // Neon green
            out[idx + 2] = 100;
          } else {
            const dim = Math.floor(getGray(x, y) * 0.25);
            out[idx] = 0;
            out[idx + 1] = dim;
            out[idx + 2] = 0;
          }
          out[idx + 3] = 255;
        }
      }
    } else if (filterType === 'cyberpunk') {
      // Cyberpunk Laser Magenta / Cyan gradient
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const gx = -1 * getGray(x - 1, y) + 1 * getGray(x + 1, y);
          const gy = -1 * getGray(x, y - 1) + 1 * getGray(x, y + 1);
          const mag = Math.sqrt(gx * gx + gy * gy);
          const idx = (y * w + x) * 4;

          if (mag > thresh * 0.75) {
            // Neon pink edge
            out[idx] = 255;
            out[idx + 1] = 0;
            out[idx + 2] = 128;
          } else {
            // Dark electric cyan/purple base
            const g = getGray(x, y);
            out[idx] = Math.floor(g * 0.2);
            out[idx + 1] = Math.floor(g * 0.5);
            out[idx + 2] = Math.floor(g * 0.9);
          }
          out[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(output, 0, 0);
  }

  // Downsample to 8x8 RGB for Sense HAT LED matrix
  function extract8x8Matrix(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ): [number, number, number][] {
    const blockW = Math.floor(w / 8);
    const blockH = Math.floor(h / 8);
    const matrix: [number, number, number][] = [];

    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    for (let my = 0; my < 8; my++) {
      for (let mx = 0; mx < 8; mx++) {
        const cx = mx * blockW + Math.floor(blockW / 2);
        const cy = my * blockH + Math.floor(blockH / 2);
        const idx = (cy * w + cx) * 4;
        matrix.push([d[idx], d[idx + 1], d[idx + 2]]);
      }
    }

    return matrix;
  }

  const handleDownloadSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `pi_camera_${filter}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    setSnapshotSuccess(true);
    setTimeout(() => setSnapshotSuccess(false), 2000);
  };

  const FILTERS: { id: MorphologicalFilter; label: string; desc: string; icon: string }[] = [
    { id: 'sobel', label: 'Sobel Edges', desc: 'Gx / Gy Gradient Convolutions', icon: '⚡' },
    { id: 'canny', label: 'Canny Outline', desc: 'High-pass boundary contours', icon: '🔍' },
    { id: 'dilation', label: 'Dilation (Max)', desc: 'Expands bright structures', icon: '➕' },
    { id: 'erosion', label: 'Erosion (Min)', desc: 'Shrinks bright structures', icon: '➖' },
    { id: 'threshold', label: 'Binary Threshold', desc: 'High-contrast segmentation', icon: '◐' },
    { id: 'matrix_green', label: 'Matrix Hacker', desc: 'Phosphor green CRT edge glow', icon: '🟢' },
    { id: 'cyberpunk', label: 'Cyberpunk Neon', desc: 'Synthwave pink & cyan laser', icon: '🟣' },
    { id: 'grayscale', label: 'Grayscale', desc: 'Luminescence conversion', icon: '🔘' },
    { id: 'invert', label: 'Invert Color', desc: 'Photo-negative transform', icon: '🔄' },
    { id: 'none', label: 'Raw Feed', desc: 'Unfiltered camera stream', icon: '📷' },
  ];

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Top Banner Navigation & Status */}
      <div className="p-3.5 sm:p-4 rounded-xl border border-white/10 bg-[var(--theme-bg-card)] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/30 flex items-center justify-center text-[var(--theme-accent)] shrink-0 shadow-inner">
            <Camera className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-[var(--theme-text-main)] font-mono">
                Pi Camera & Morphological Computer Vision Studio
              </h2>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                  cameraConnected
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {cameraConnected ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {cameraConnected ? 'Hardware CSI-2 Camera Linked' : 'Virtual Simulator Active'}
              </span>
            </div>
            <p className="text-xs text-[var(--theme-text-sub)] mt-0.5">
              Device: <span className="font-mono text-[var(--theme-text-main)]">{cameraModel}</span> · Resolution: 640×480 · FPS: {fps}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
          {onBackToWorkspace && (
            <button
              onClick={onBackToWorkspace}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>← Back to Workspace</span>
            </button>
          )}

          {onLoadVisionCode && (
            <button
              onClick={onLoadVisionCode}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-accent-text)] transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              title="Load complete Python Computer Vision script into the editor"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Load Vision Python Code</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Video Screen on Left, Filter Pipeline Controls on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: LIVE VIDEO SCREEN VIEWPORT (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="relative rounded-2xl overflow-hidden border-2 border-[var(--theme-border)] bg-black shadow-2xl flex flex-col">
            {/* Viewport Header */}
            <div className="px-4 py-2.5 bg-black/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">
                  Live Viewport [{filter.toUpperCase()}]
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                  {fps} FPS
                </span>
                <button
                  onClick={() => setIsStreaming((prev) => !prev)}
                  className="p-1 rounded hover:bg-white/10 text-white cursor-pointer"
                  title={isStreaming ? 'Pause Stream' : 'Resume Stream'}
                >
                  {isStreaming ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
                </button>
              </div>
            </div>

            {/* Video Canvas Container */}
            <div className="relative aspect-[4/3] w-full bg-black flex items-center justify-center overflow-hidden">
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="w-full h-full object-contain"
              />

              {/* Hidden video element for local webcam capturing */}
              <video
                ref={videoRef}
                playsInline
                muted
                className="hidden"
              />

              {/* Stream overlay details */}
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-sm border border-white/10 text-[11px] font-mono text-emerald-400 flex items-center gap-2 select-none">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Filter: {FILTERS.find((f) => f.id === filter)?.label}</span>
                {filter !== 'none' && filter !== 'grayscale' && filter !== 'invert' && (
                  <span className="text-slate-400">| Thresh: {threshold}</span>
                )}
              </div>
            </div>

            {/* Viewport Action Bar */}
            <div className="p-3 bg-[var(--theme-bg-subtle)] border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCameraSource('simulation')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    cameraSource === 'simulation'
                      ? 'bg-[var(--theme-accent)] text-[var(--theme-accent-text)]'
                      : 'bg-white/10 text-slate-300 hover:bg-white/15'
                  }`}
                >
                  Robotics Test Scene
                </button>
                <button
                  onClick={() => setCameraSource('webcam')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    cameraSource === 'webcam'
                      ? 'bg-[var(--theme-accent)] text-[var(--theme-accent-text)]'
                      : 'bg-white/10 text-slate-300 hover:bg-white/15'
                  }`}
                  title="Stream from your laptop or PC webcam"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>My WebCam</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadSnapshot}
                  className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  {snapshotSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Saved!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Take Snapshot</span>
                    </>
                  )}
                </button>

                {onSendMatrixFrame && (
                  <button
                    onClick={() => setStreamToMatrix((prev) => !prev)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      streamToMatrix
                        ? 'bg-amber-400 text-slate-950 font-black animate-pulse shadow-md'
                        : 'bg-white/10 text-slate-300 hover:bg-white/15 border border-white/20'
                    }`}
                    title="Mirror filtered camera output down to the Sense HAT 8x8 LED matrix"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{streamToMatrix ? 'Streaming to Sense HAT Matrix ⚡' : 'Stream to 8x8 Matrix'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MORPHOLOGICAL FILTER PALETTE & TUNING SLIDERS (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Morphological Filter Preset Selector */}
          <div className="p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg-card)] shadow-md flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[var(--theme-accent)]" />
                <h3 className="text-xs sm:text-sm font-bold text-[var(--theme-text-main)] font-mono uppercase tracking-wider">
                  Morphological & CV Filters
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300 font-bold">
                10 Presets
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {FILTERS.map((f) => {
                const isActive = filter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      isActive
                        ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)]/15 shadow-md scale-[1.02]'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{f.icon}</span>
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-[var(--theme-accent)] animate-ping" />
                      )}
                    </div>
                    <span className="text-xs font-mono font-bold text-[var(--theme-text-main)] leading-tight">
                      {f.label}
                    </span>
                    <span className="text-[10px] text-[var(--theme-text-sub)] line-clamp-1">
                      {f.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Threshold / Sensitivity Slider */}
            {filter !== 'none' && filter !== 'grayscale' && filter !== 'invert' && (
              <div className="mt-2 pt-3 border-t border-white/10 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[var(--theme-text-sub)]">Filter Sensitivity / Threshold:</span>
                  <span className="font-bold text-[var(--theme-accent)]">{threshold}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="220"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-[var(--theme-accent)] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>Sensitive (Detailed)</span>
                  <span>Strict (Clean)</span>
                </div>
              </div>
            )}
          </div>

          {/* Educational Concept Card for Students / Teens */}
          <div className="p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg-subtle)] shadow-xs flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-mono font-bold text-[var(--theme-text-main)] uppercase">
                How It Works: Computer Vision on Pi
              </h4>
            </div>
            <p className="text-xs text-[var(--theme-text-sub)] leading-relaxed">
              <strong>Sobel Convolutions:</strong> Computes the gradient magnitude $|G| = \sqrt{'{'}G_x^2 + G_y^2{'}'}$ across horizontal and vertical 3&times;3 kernels. This is how autonomous robots and self-driving cars detect lanes and obstacles!
            </p>
            <p className="text-xs text-[var(--theme-text-sub)] leading-relaxed">
              <strong>Morphology (Dilation &amp; Erosion):</strong> Dilation expands bright foreground boundaries to bridge broken contours, while Erosion removes noise speckles.
            </p>
            {onLoadVisionCode && (
              <button
                onClick={onLoadVisionCode}
                className="mt-1 self-start text-xs font-mono text-[var(--theme-accent)] hover:underline flex items-center gap-1 cursor-pointer font-bold"
              >
                <span>Open Python Example 13 (OpenCV &amp; Edge Detection)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
