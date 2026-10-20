import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';

const cameraMessage = (error) => {
  if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
    return 'Chưa được cấp quyền camera. Hãy cho phép camera trong trình duyệt hoặc dùng máy quét/nhập mã.';
  }
  if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
    return 'Không tìm thấy camera phù hợp. Bạn có thể dùng máy quét hoặc nhập mã vé.';
  }
  if (error.name === 'NotReadableError') {
    return 'Không mở được camera. Hãy đóng ứng dụng khác đang sử dụng camera rồi thử lại.';
  }
  return 'Không khởi động được camera. Vui lòng thử lại hoặc dùng máy quét/nhập mã.';
};

export default function CameraQrScanner({ onScan, paused, onRestart }) {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const scanRef = useRef(onScan);
  const pausedRef = useRef(paused);

  useEffect(() => { scanRef.current = onScan; }, [onScan]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let stream;
    let controls;
    const video = videoRef.current;
    const stop = () => {
      controls?.stop();
      stream?.getTracks().forEach(track => track.stop());
      if (video) video.srcObject = null;
    };

    const start = async () => {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          if (!disposed) {
            setError('Camera cần kết nối HTTPS hoặc localhost. Bạn vẫn có thể dùng máy quét/nhập mã.');
            setEnabled(false);
          }
          return;
        }
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        if (disposed) return;
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false, video: { facingMode: { ideal: 'environment' } },
        });
        if (disposed) { stop(); return; }
        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 150, delayBetweenScanSuccess: 700,
        });
        controls = await reader.decodeFromStream(stream, video, (result) => {
          if (!disposed && !pausedRef.current && result) {
            // Latch immediately, before React renders the pending API request.
            pausedRef.current = true;
            scanRef.current(result.getText());
          }
        });
        if (disposed) { stop(); return; }
        setReady(true);
      } catch (cause) {
        stop();
        if (!disposed) {
          setError(cameraMessage(cause));
          setEnabled(false);
          setReady(false);
        }
      }
    };
    start();
    return () => { disposed = true; stop(); };
  }, [enabled]);

  return (
    <div className="w-full space-y-4 text-center">
      <h2 className="text-xl font-bold text-gray-200">Quét QR trên vé bằng camera</h2>
      <div className="relative aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-black border border-white/20">
        <video ref={videoRef} muted playsInline autoPlay aria-label="Camera quét mã QR" className="w-full h-full object-cover" />
        {!enabled && <div className="absolute inset-0 flex items-center justify-center"><Camera className="w-20 h-20 text-gray-500" /></div>}
        {enabled && !ready && <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-gray-200">Đang mở camera...</div>}
        {enabled && paused && <div className="absolute inset-0 flex items-center justify-center bg-black/65 text-white px-5">Đã nhận mã. Hãy xem kết quả kiểm tra vé.</div>}
      </div>
      {error && <p role="alert" className="text-sm text-orange-300">{error}</p>}
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => {
          setError(''); setReady(false);
          if (!enabled) onRestart();
          setEnabled(value => !value);
        }} className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 flex items-center gap-2">
          {enabled ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
          {enabled ? 'Tắt camera' : 'Bật camera'}
        </button>
        {enabled && paused && <button type="button" onClick={onRestart} className="px-4 py-3 rounded-xl bg-primary hover:bg-primary/90 font-bold">Quét vé tiếp theo</button>}
      </div>
      <p className="text-sm text-gray-400">Đưa trọn mã QR vào khung hình và giữ máy ổn định.</p>
    </div>
  );
}
