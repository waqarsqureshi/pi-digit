import { useState, useEffect, useRef } from 'react';
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
  Layers,
  ArrowRight,
  RefreshCw,
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
  const [cameraSource, setCameraSource] = useState<'hardware' | 'webcam' | 'simulation'>('hardware');
  const [streamToMatrix, setStreamToMatrix] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(30);
  const [cameraConnected, setCameraConnected] = useState<boolean>(false);
  const [cameraModel, setCameraModel] = useState<string>('Checking Raspberry Pi Camera Module...');
  const [cameraBackend, setCameraBackend] = useState<string>('Network Stream');
  const [snapshotSuccess, setSnapshotSuccess] = useState<boolean>(false);
  const [streamKey, setStreamKey] = useState<number>(Date.now());

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgStreamRef = useRef<HTMLImageElement | null>(null);
  const lastFrameTime = useRef<number>(performance.now());
  const frameCount = useRef<number>(0);
  const simAngle = useRef<number>(0);

  // Check hardware camera status from backend daemon
  useEffect(() => {
    let isMounted = true;
    async function checkCameraStatus() {
      try {
        const res = await fetch('/api/camera/status');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setCameraConnected(data.connected);
            setCameraModel(data.device || (data.connected ? 'Raspberry Pi Camera / V4L2' : 'Digital Twin Video Stream'));
            setCameraBackend(data.backend || 'MJPEG Stream');
            if (data.fps) setFps(data.fps);
          }
        }
      } catch {
        if (isMounted) {
          setCameraConnected(false);
          setCameraModel('Digital Twin Virtual Camera Stream');
        }
      }
    }
    checkCameraStatus();
    const interval = setInterval(checkCameraStatus, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Update morphological filter on the Raspberry Pi camera service daemon
  const handleSelectFilter = (newFilter: MorphologicalFilter) => {
    setFilter(newFilter);
    fetch('/api/camera/filter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter: newFilter }),
    }).catch(() => {});
  };

  // Local WebCam setup if user switches to webcam mode
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
          setCameraSource('hardware');
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
    let animId: number;

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

        if (cameraSource === 'hardware' && imgStreamRef.current && imgStreamRef.current.complete && imgStreamRef.current.naturalWidth > 0) {
          ctx.drawImage(imgStreamRef.current, 0, 0, width, height);
          applyClientMorphology(ctx, width, height, filter, threshold);
        } else if (cameraSource === 'webcam' && videoRef.current && videoRef.current.readyState >= 2) {
          ctx.save();
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, width, height);
          ctx.restore();
          applyClientMorphology(ctx, width, height, filter, threshold);
        } else {
          // Synthetic digital twin camera scene generator
          renderSimulationFrame(ctx, width, height, simAngle.current, filter, threshold);
          simAngle.current += 0.04;
        }

        // Stream edge detection output to 8x8 Sense HAT LED matrix if toggled
        if (streamToMatrix && onSendMatrixFrame && frameCount.current % 4 === 0) {
          const matrix8x8 = downsampleTo8x8(ctx, width, height);
          onSendMatrixFrame(matrix8x8);
        }
      }

      animId = requestAnimationFrame(processFrame);
    };

    animId = requestAnimationFrame(processFrame);
    return () => {
      running = false;
      cancelAnimationFrame(animId);
    };
  }, [isStreaming, cameraSource, filter, threshold, streamToMatrix, onSendMatrixFrame]);

  // Pure canvas simulated scene
  function renderSimulationFrame(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    angle: number,
    filterType: MorphologicalFilter,
    thresh: number
  ) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Coordinate grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const cx = w / 2 + Math.sin(angle) * 120;
    const cy = h / 2 + Math.cos(angle) * 70;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle * 1.5);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(-45, -45, 90, 90);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.strokeRect(-45, -45, 90, 90);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 75, 0, Math.PI * 2);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 25, h / 2);
    ctx.lineTo(w / 2 + 25, h / 2);
    ctx.moveTo(w / 2, h / 2 - 25);
    ctx.lineTo(w / 2, h / 2 + 25);
    ctx.stroke();

    applyClientMorphology(ctx, w, h, filterType, thresh);
  }

  // Client-side morphological filter processor
  function applyClientMorphology(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    filterType: MorphologicalFilter,
    thresh: number
  ) {
    if (filterType === 'none') return;

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const outData = ctx.createImageData(w, h);
    const out = outData.data;

    const getGray = (x: number, y: number) => {
      const idx = (y * w + x) * 4;
      return (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
    };

    if (filterType === 'sobel') {
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const gx =
            -1 * getGray(x - 1, y - 1) + 1 * getGray(x + 1, y - 1) +
            -2 * getGray(x - 1, y)     + 2 * getGray(x + 1, y) +
            -1 * getGray(x - 1, y + 1) + 1 * getGray(x + 1, y + 1);

          const gy =
            -1 * getGray(x - 1, y - 1) - 2 * getGray(x, y - 1) - 1 * getGray(x + 1, y - 1) +
             1 * getGray(x - 1, y + 1) + 2 * getGray(x, y + 1) + 1 * getGray(x + 1, y + 1);

          const mag = Math.sqrt(gx * gx + gy * gy);
          const idx = (y * w + x) * 4;

          if (mag > thresh) {
            out[idx] = 0;
            out[idx + 1] = 255; // Cyan edge contour
            out[idx + 2] = 230;
          } else {
            out[idx] = 12;
            out[idx + 1] = 18;
            out[idx + 2] = 28;
          }
          out[idx + 3] = 255;
        }
      }
    } else if (filterType === 'canny') {
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const gx = -1 * getGray(x - 1, y) + 1 * getGray(x + 1, y);
          const gy = -1 * getGray(x, y - 1) + 1 * getGray(x, y + 1);
          const mag = Math.sqrt(gx * gx + gy * gy);
          const idx = (y * w + x) * 4;

          if (mag > thresh * 0.8) {
            out[idx] = 255;
            out[idx + 1] = 255;
            out[idx + 2] = 255;
          } else {
            out[idx] = 0;
            out[idx + 1] = 0;
            out[idx + 2] = 0;
          }
          out[idx + 3] = 255;
        }
      }
    } else if (filterType === 'threshold') {
      for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
        const val = gray >= thresh ? 255 : 0;
        out[i] = val;
        out[i + 1] = val;
        out[i + 2] = val;
        out[i + 3] = 255;
      }
    } else if (filterType === 'grayscale') {
      for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
        out[i] = gray;
        out[i + 1] = gray;
        out[i + 2] = gray;
        out[i + 3] = 255;
      }
    } else if (filterType === 'dilation') {
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
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const gx = -1 * getGray(x - 1, y) + 1 * getGray(x + 1, y);
          const gy = -1 * getGray(x, y - 1) + 1 * getGray(x, y + 1);
          const mag = Math.sqrt(gx * gx + gy * gy);
          const idx = (y * w + x) * 4;
          if (mag > thresh * 0.7) {
            out[idx] = 0;
            out[idx + 1] = 255;
            out[idx + 2] = 100;
          } else {
            out[idx] = 0;
            out[idx + 1] = Math.floor(getGray(x, y) * 0.25);
            out[idx + 2] = 0;
          }
          out[idx + 3] = 255;
        }
      }
    } else if (filterType === 'cyberpunk') {
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const gx = -1 * getGray(x - 1, y) + 1 * getGray(x + 1, y);
          const gy = -1 * getGray(x, y - 1) + 1 * getGray(x, y + 1);
          const mag = Math.sqrt(gx * gx + gy * gy);
          const idx = (y * w + x) * 4;
          if (mag > thresh * 0.75) {
            out[idx] = 255;
            out[idx + 1] = 0;
            out[idx + 2] = 160;
          } else {
            out[idx] = Math.floor(getGray(x, y) * 0.15);
            out[idx + 1] = Math.floor(getGray(x, y) * 0.2);
            out[idx + 2] = Math.floor(getGray(x, y) * 0.4);
          }
          out[idx + 3] = 255;
        }
      }
    } else if (filterType === 'invert') {
      for (let i = 0; i < data.length; i += 4) {
        out[i] = 255 - data[i];
        out[i + 1] = 255 - data[i + 1];
        out[i + 2] = 255 - data[i + 2];
        out[i + 3] = 255;
      }
    }

    ctx.putImageData(outData, 0, 0);
  }

  function downsampleTo8x8(ctx: CanvasRenderingContext2D, w: number, h: number): [number, number, number][] {
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
    { id: 'sobel', label: 'Sobel Edges', desc: 'Morphological 3x3 gradient convolutions', icon: '⚡' },
    { id: 'canny', label: 'Canny Outline', desc: 'High-pass boundary contours', icon: '🔍' },
    { id: 'dilation', label: 'Dilation (Max)', desc: 'Expands bright structures', icon: '➕' },
    { id: 'erosion', label: 'Erosion (Min)', desc: 'Shrinks bright structures', icon: '➖' },
    { id: 'threshold', label: 'Binary Threshold', desc: 'High-contrast black & white', icon: '◐' },
    { id: 'matrix_green', label: 'Matrix Hacker', desc: 'Phosphor CRT green edge glow', icon: '🟢' },
    { id: 'cyberpunk', label: 'Cyberpunk Neon', desc: 'Synthwave pink & cyan laser', icon: '🟣' },
    { id: 'grayscale', label: 'Grayscale', desc: 'Luminescence conversion', icon: '🔘' },
    { id: 'invert', label: 'Invert Color', desc: 'Photo-negative transform', icon: '🔄' },
    { id: 'none', label: 'Raw Feed', desc: 'Unfiltered camera stream', icon: '📷' },
  ];

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Hidden elements for media capture */}
      <video ref={videoRef} className="hidden" playsInline muted autoPlay />
      <img
        ref={imgStreamRef}
        src={`/api/camera/stream?t=${streamKey}`}
        alt="Camera Stream"
        crossOrigin="anonymous"
        className="hidden"
        onLoad={() => {
          if (!cameraConnected) setCameraConnected(true);
        }}
        onError={() => {
          // If stream drops, fall back gracefully
          setTimeout(() => setStreamKey(Date.now()), 2000);
        }}
      />

      {/* Top Banner Navigation & Hardware Status (Proper Sharp Corners) */}
      <div className="p-4 sm:p-5 rounded-none border border-slate-300 bg-[var(--theme-bg-card)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-none bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/40 flex items-center justify-center text-[var(--theme-accent)] shrink-0 shadow-inner">
            <Camera className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-[var(--theme-text-main)] font-mono">
                Pi Camera & Computer Vision Studio
              </h2>
              <span
                className={`text-xs font-mono px-2.5 py-0.5 rounded-none font-bold flex items-center gap-1.5 border ${
                  cameraConnected
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {cameraConnected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {cameraConnected ? 'Camera Online (Network Stream)' : 'Digital Twin Video Pipeline'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--theme-text-sub)] mt-1 font-mono">
              Device: <span className="font-bold text-[var(--theme-text-main)]">{cameraModel}</span> · Backend: {cameraBackend} · Resolution: 640×480 · FPS: {fps}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-end md:self-center">
          {onBackToWorkspace && (
            <button
              onClick={onBackToWorkspace}
              className="px-4 py-2 rounded-none text-xs sm:text-sm font-mono font-bold bg-white/10 hover:bg-white/20 text-[var(--theme-text-main)] border border-white/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <span>← Back to Workspace</span>
            </button>
          )}

          {onLoadVisionCode && (
            <button
              onClick={onLoadVisionCode}
              className="px-4 py-2 rounded-none text-xs sm:text-sm font-mono font-bold bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-accent-text)] transition-all cursor-pointer shadow-md flex items-center gap-2 active:scale-95"
            >
              <Code className="w-4 h-4" />
              <span>Load Python Vision Script</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column Viewport & Morphological Toolbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Video Viewport & Controls (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3.5">
          <div className="relative border-2 border-slate-700 bg-black rounded-none overflow-hidden shadow-xl aspect-4/3 flex items-center justify-center">
            {/* Real-time Filtered Canvas */}
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="w-full h-full object-contain"
            />

            {/* Live Video OSD HUD */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-none bg-black/80 text-white border border-white/20 backdrop-blur-md flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-none ${isStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span>{isStreaming ? 'LIVE' : 'PAUSED'}</span>
              </span>
              <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-none bg-black/80 text-cyan-300 border border-cyan-500/30 backdrop-blur-md">
                {filter.toUpperCase()}
              </span>
              <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-none bg-black/80 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                {fps} FPS
              </span>
            </div>

            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                onClick={() => setStreamKey(Date.now())}
                className="px-2.5 py-1 text-xs font-mono font-bold rounded-none bg-black/80 hover:bg-black text-white border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
                title="Refresh network stream"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Stream</span>
              </button>
            </div>
          </div>

          {/* Action Toolbar with Big Touch Targets for Motor Skills */}
          <div className="p-3 sm:p-4 rounded-none border border-slate-300 bg-[var(--theme-bg-card)] flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => setIsStreaming(!isStreaming)}
                className={`px-4 py-2.5 rounded-none text-xs sm:text-sm font-mono font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                  isStreaming
                    ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700'
                }`}
              >
                {isStreaming ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isStreaming ? 'Pause Stream' : 'Resume Stream'}</span>
              </button>

              <button
                onClick={handleDownloadSnapshot}
                className="px-4 py-2.5 rounded-none text-xs sm:text-sm font-mono font-bold bg-white/10 hover:bg-white/20 text-[var(--theme-text-main)] border border-white/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>{snapshotSuccess ? 'Snapshot Saved!' : 'Save Snapshot'}</span>
              </button>

              {onSendMatrixFrame && (
                <button
                  onClick={() => setStreamToMatrix(!streamToMatrix)}
                  className={`px-4 py-2.5 rounded-none text-xs sm:text-sm font-mono font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                    streamToMatrix
                      ? 'bg-[var(--theme-accent)] text-[var(--theme-accent-text)] border-[var(--theme-accent)] shadow-sm'
                      : 'bg-white/10 hover:bg-white/20 text-[var(--theme-text-main)] border-white/20'
                  }`}
                  title="Project live edge detection contours to Sense HAT 8x8 LED matrix"
                >
                  <Layers className="w-4 h-4" />
                  <span>{streamToMatrix ? 'Matrix Mirror: ON' : 'Mirror to 8x8 Matrix'}</span>
                </button>
              )}
            </div>

            {/* Video Input Source Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/15 rounded-none">
              <button
                onClick={() => setCameraSource('hardware')}
                className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold transition-all cursor-pointer ${
                  cameraSource === 'hardware'
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'text-white/60 hover:text-white'
                }`}
                title="Direct network stream from physical Raspberry Pi Camera Module"
              >
                Pi Hardware
              </button>
              <button
                onClick={() => setCameraSource('webcam')}
                className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold transition-all cursor-pointer ${
                  cameraSource === 'webcam'
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'text-white/60 hover:text-white'
                }`}
                title="Use local browser webcam"
              >
                WebCam
              </button>
              <button
                onClick={() => setCameraSource('simulation')}
                className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold transition-all cursor-pointer ${
                  cameraSource === 'simulation'
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'text-white/60 hover:text-white'
                }`}
                title="Digital Twin mathematical simulator"
              >
                Simulator
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Morphological Filter Selector (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3.5">
          <div className="p-4 rounded-none border border-slate-300 bg-[var(--theme-bg-card)] flex flex-col gap-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--theme-border)] pb-2.5">
              <span className="text-sm sm:text-base font-bold font-mono text-[var(--theme-text-main)] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[var(--theme-accent)]" />
                <span>Morphological Filters</span>
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-none bg-[var(--theme-accent)]/20 text-[var(--theme-accent)] font-bold">
                OpenCV
              </span>
            </div>

            {/* Sensitivity Slider with Big Touch Track */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs sm:text-sm font-mono">
                <span className="text-[var(--theme-text-sub)] font-bold">Gradient Sensitivity:</span>
                <span className="text-[var(--theme-accent)] font-bold text-base">{threshold}</span>
              </div>
              <input
                type="range"
                min="20"
                max="220"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-[var(--theme-accent)] h-3 bg-slate-300 rounded-none cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-[var(--theme-text-muted)]">
                <span>More Edges (Sensitive)</span>
                <span>Strong Edges Only</span>
              </div>
            </div>

            {/* Filter Buttons Grid (Large Hitboxes for Motor Skill Accessibility) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 pt-1">
              {FILTERS.map((f) => {
                const isActive = filter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => handleSelectFilter(f.id)}
                    className={`p-3 rounded-none border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-[var(--theme-accent)]/20 border-[var(--theme-accent)] text-[var(--theme-text-main)] shadow-sm'
                        : 'bg-white/5 hover:bg-white/10 border-slate-300 text-[var(--theme-text-sub)] hover:text-[var(--theme-text-main)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl shrink-0">{f.icon}</span>
                      <div>
                        <div className="text-xs sm:text-sm font-bold font-mono text-[var(--theme-text-main)]">
                          {f.label}
                        </div>
                        <div className="text-[11px] text-[var(--theme-text-muted)] leading-tight">
                          {f.desc}
                        </div>
                      </div>
                    </div>
                    {isActive && (
                      <span className="w-2.5 h-2.5 rounded-none bg-[var(--theme-accent)] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
