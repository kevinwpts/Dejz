import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, X, SwitchCamera, Zap, ZapOff, Image as ImageIcon, RotateCcw, Check, Loader2, AlertCircle } from 'lucide-react';
import { feedback } from '../utils/feedback';

interface ReceiptCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  isProcessing?: boolean;
  language?: string;
}

export function ReceiptCameraModal({
  isOpen,
  onClose,
  onCapture,
  isProcessing = false,
  language = 'sv',
}: ReceiptCameraModalProps) {
  const isEn = language === 'en';
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isShutterFlashing, setIsShutterFlashing] = useState(false);

  // Stop camera tracks cleanly
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    setIsCameraReady(false);
    setHasTorch(false);
    setTorchOn(false);
  }, []);

  // Start camera stream
  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    stopStream();
    setCameraError(null);
    setIsCameraReady(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(isEn ? 'Camera is not supported on this browser' : 'Kameran stöds inte i denna webbläsare');
      return;
    }

    try {
      // First try with high resolution and facingMode
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        // Fallback to simpler constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraReady(true);
      }

      // Check for torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && typeof (videoTrack as any).getCapabilities === 'function') {
        const capabilities = (videoTrack as any).getCapabilities();
        if (capabilities && 'torch' in capabilities) {
          setHasTorch(true);
        }
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      let message = isEn
        ? 'Could not access camera. Please allow camera permissions or upload an image.'
        : 'Kunde inte starta kameran. Tillåt kameraåtkomst i webbläsaren eller välj en bild från galleriet.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = isEn
          ? 'Camera permission was denied. Please allow camera access in your browser settings.'
          : 'Kameraåtkomst nekades. Tillåt kameraåtkomst i dina webbläsarinställningar.';
      }
      setCameraError(message);
    }
  }, [isEn, stopStream]);

  // Open / Close lifecycle
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCapturedBlob(null);
      startCamera(facingMode);
    } else {
      stopStream();
      setCapturedImage(null);
      setCapturedBlob(null);
      setCameraError(null);
    }

    return () => {
      stopStream();
    };
  }, [isOpen, facingMode, startCamera, stopStream]);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack || typeof (videoTrack as any).applyConstraints !== 'function') return;

    try {
      const nextState = !torchOn;
      await (videoTrack as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
      feedback.tap();
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  };

  // Flip camera between environment and user
  const toggleCamera = () => {
    feedback.tap();
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Snap photo from live video feed
  const takePhoto = () => {
    if (!videoRef.current || !isCameraReady) return;
    feedback.tap();

    // Trigger shutter flash
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 150);

    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setCapturedImage(dataUrl);
      },
      'image/jpeg',
      0.92
    );
  };

  // Retake photo
  const handleRetake = () => {
    feedback.tap();
    setCapturedImage(null);
    setCapturedBlob(null);
    if (!streamRef.current) {
      startCamera(facingMode);
    }
  };

  // Confirm and use captured photo
  const handleConfirmPhoto = () => {
    if (!capturedBlob) return;
    feedback.success();
    const file = new File([capturedBlob], `receipt_${Date.now()}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
    stopStream();
    onCapture(file);
  };

  // Handle image selected from gallery/file picker
  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    feedback.tap();
    stopStream();
    onCapture(file);
    if (e.target) e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black text-white flex flex-col select-none overflow-hidden font-barlow">
      {/* Shutter Flash Effect */}
      {isShutterFlashing && (
        <div className="absolute inset-0 z-50 bg-white opacity-80 pointer-events-none transition-opacity duration-150" />
      )}

      {/* Top Header Controls */}
      <div 
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 18px)',
        }}
        className="relative z-30 flex items-center justify-between px-5 pb-3 bg-gradient-to-b from-black/90 via-black/50 to-transparent"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            feedback.tap();
            stopStream();
            onClose();
          }}
          disabled={isProcessing}
          className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 border border-white/20 text-white flex items-center justify-center backdrop-blur-xl transition-all cursor-pointer shadow-md"
          aria-label={isEn ? 'Close' : 'Stäng'}
        >
          <X size={20} strokeWidth={2} />
        </button>

        {/* Status / Title Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 border border-white/20 backdrop-blur-xl text-xs font-semibold tracking-wide shadow-md">
          <Camera size={14} className="text-white/80" />
          <span>{isEn ? 'Receipt Scanner' : 'Kvittoskanning'}</span>
        </div>

        {/* Right Action Icons (Torch, Camera Switch) */}
        <div className="flex items-center gap-2">
          {hasTorch && !capturedImage && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/20 transition-all cursor-pointer shadow-md ${
                torchOn ? 'bg-amber-400 text-black border-amber-300' : 'bg-black/40 hover:bg-black/60 text-white active:scale-95'
              }`}
              aria-label={isEn ? 'Flashlight' : 'Ficklampa'}
            >
              {torchOn ? <Zap size={18} fill="currentColor" /> : <ZapOff size={18} />}
            </button>
          )}

          {!capturedImage && (
            <button
              type="button"
              onClick={toggleCamera}
              className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 border border-white/20 text-white flex items-center justify-center backdrop-blur-xl transition-all cursor-pointer shadow-md"
              aria-label={isEn ? 'Flip camera' : 'Vänd kamera'}
            >
              <SwitchCamera size={19} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Viewfinder Main Section */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-black">
        {/* Error Fallback */}
        {cameraError ? (
          <div className="relative z-20 max-w-xs mx-auto text-center px-6 py-8 rounded-[28px] bg-[#1C1C1C] border border-white/[0.08] space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-white/10 border border-white/10 text-white flex items-center justify-center">
              <AlertCircle size={26} strokeWidth={2} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">
                {isEn ? 'Camera unavailable' : 'Kameran är inte tillgänglig'}
              </h3>
              <p className="text-xs text-[#A8A8A8] leading-relaxed">
                {cameraError}
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-[14px] bg-white text-black font-bold text-xs hover:bg-neutral-200 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ImageIcon size={16} />
              <span>{isEn ? 'Choose photo from library' : 'Välj bild från galleri'}</span>
            </button>
          </div>
        ) : capturedImage ? (
          /* Captured Photo Review */
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={capturedImage}
              alt="Fångat kvitto"
              className="w-full h-full object-contain bg-black"
            />
          </div>
        ) : (
          /* Live Video Camera View */
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Viewfinder Frame overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
              {/* Receipt Target Box */}
              <div className="relative w-full max-w-[320px] aspect-[3/4.6] max-h-[65vh] rounded-[22px] border-2 border-white/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.48)] overflow-hidden">
                {/* 4 Corner Markers */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-[14px]" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-[14px]" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-[14px]" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-[14px]" />

                {/* Subtle animated scan sweep line */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[bounce_2.5s_infinite]" />
              </div>

              {/* Guide hint */}
              <p className="mt-4 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-[12px] font-medium text-white/90 text-center tracking-tight">
                {isEn ? 'Place receipt inside the frame' : 'Placera kvittot i rutan'}
              </p>
            </div>
          </div>
        )}

        {/* Processing Indicator Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <Loader2 size={26} className="animate-spin text-white" />
            </div>
            <p className="text-sm font-bold text-white tracking-wide">
              {isEn ? 'Reading receipt details…' : 'Läser av kvittot…'}
            </p>
            <p className="text-xs text-[#A8A8A8]">
              {isEn ? 'Extracting merchant & amount' : 'Analyserar butik, belopp och datum'}
            </p>
          </div>
        )}
      </div>

      {/* Hidden File Input for fallback gallery upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFilePicked}
      />

      {/* Bottom Controls Bar */}
      <div 
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        }}
        className="relative z-30 px-6 pt-4 bg-gradient-to-t from-black via-black/85 to-transparent"
      >
        {capturedImage ? (
          /* Retake or Use Photo buttons */
          <div className="flex items-center justify-between gap-4 max-w-sm mx-auto">
            {/* Retake */}
            <button
              type="button"
              onClick={handleRetake}
              disabled={isProcessing}
              className="flex-1 py-3.5 px-4 rounded-[14px] bg-white/10 hover:bg-white/20 active:scale-98 text-white font-bold text-xs tracking-wider flex items-center justify-center gap-2 backdrop-blur-md transition-all cursor-pointer"
            >
              <RotateCcw size={17} strokeWidth={2} />
              <span>{isEn ? 'Retake' : 'Ta om'}</span>
            </button>

            {/* Confirm / Use */}
            <button
              type="button"
              onClick={handleConfirmPhoto}
              disabled={isProcessing}
              className="flex-1 py-3.5 px-4 rounded-[14px] bg-white hover:bg-white/90 active:scale-98 text-black font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Check size={18} strokeWidth={2} />
              <span>{isEn ? 'Use receipt' : 'Använd kvitto'}</span>
            </button>
          </div>
        ) : (
          /* Live Shutter & Gallery Controls */
          <div className="flex items-center justify-between max-w-xs mx-auto">
            {/* Gallery / Photo Library button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white flex flex-col items-center justify-center gap-1 backdrop-blur-md transition-all cursor-pointer"
              title={isEn ? 'Choose photo' : 'Välj bild'}
            >
              <ImageIcon size={20} strokeWidth={2} />
            </button>

            {/* Native-feeling Shutter Button */}
            <button
              type="button"
              onClick={takePhoto}
              disabled={!isCameraReady || !!cameraError}
              className="relative w-20 h-20 rounded-full border-[3.5px] border-white/80 p-1 flex items-center justify-center active:scale-90 transition-transform cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
              aria-label={isEn ? 'Take photo' : 'Ta bild'}
            >
              <div className="w-full h-full rounded-full bg-white group-hover:scale-95 transition-transform" />
            </button>

            {/* Camera flip to balance layout */}
            <button
              type="button"
              onClick={toggleCamera}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
              title={isEn ? 'Flip camera' : 'Vänd kamera'}
            >
              <SwitchCamera size={20} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
