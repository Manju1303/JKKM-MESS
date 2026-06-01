'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { productsAPI, inventoryAPI } from '@/lib/api';
import {
  QrCode, Search, AlertCircle, CheckCircle, Package,
  Camera, Keyboard, RefreshCw, X, FlipHorizontal
} from 'lucide-react';

export default function BarcodePage() {
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Stock Add Form state
  const [quantity, setQuantity] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Camera scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Focus scanner input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cleanup on unmount — stop all tracks and reset reader
  useEffect(() => {
    return () => {
      stopAllCameraResources();
    };
  }, []);

  const stopAllCameraResources = () => {
    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset(); } catch { /* ignore */ }
      codeReaderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  /**
   * Smart product lookup:
   * 1. Try GET /products/barcode/:value (matches barcode OR product code — backend tries both)
   * 2. If not found, show helpful error with register hint
   */
  const lookupProduct = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');
    setSuccess('');
    setProduct(null);

    try {
      // Backend findByBarcode now also falls back to product code lookup
      const res = await productsAPI.getByBarcode(trimmed);
      setProduct(res.data);
      setBatchNumber(`BATCH-${Date.now().toString().slice(-6)}`);
      setQuantity('');
      setCostPerUnit('');
      setExpiryDate('');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 404) {
        setError(
          `No product found for "${trimmed}". ` +
          `Make sure a product with this barcode or code is registered in the Products catalog.`
        );
      } else {
        setError(msg || 'Error looking up product. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    lookupProduct(barcode);
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !quantity || !costPerUnit) {
      setError('Please fill out quantity and unit cost.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await inventoryAPI.addStock({
        productId: product.id,
        quantity: Number(quantity),
        unit: product.unit,
        costPerUnit: Number(costPerUnit),
        batchNumber: batchNumber || undefined,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
      });
      setSuccess(`✅ Added ${quantity} ${product.unit} of "${product.name}" to inventory.`);
      setProduct(null);
      setBarcode('');
      setQuantity('');
      setCostPerUnit('');
      setBatchNumber('');
      setExpiryDate('');
      inputRef.current?.focus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error updating inventory.');
    } finally {
      setSubmitting(false);
    }
  };

  const stopScanning = () => {
    stopAllCameraResources();
    setIsScanning(false);
    setCameraError('');
  };

  /**
   * Start camera scanner.
   * FIX: Uses facingMode: { ideal: 'environment' } to prefer the REAR camera on mobile.
   * Falls back to any available camera if rear camera not accessible.
   */
  const startScanning = async () => {
    setIsScanning(true);
    setError('');
    setSuccess('');
    setCameraError('');

    // Short delay to allow video element to mount in DOM
    await new Promise(r => setTimeout(r, 200));

    try {
      const { BrowserMultiFormatReader, BrowserCodeReader } = await import('@zxing/browser');

      stopAllCameraResources();
      codeReaderRef.current = new BrowserMultiFormatReader();

      // ── Request camera with rear-camera preference ────────────────────────
      // facingMode 'environment' = rear/back camera on phones
      // facingMode 'user'        = front/selfie camera
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          // Ask for higher resolution for better barcode decode accuracy
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // If rear camera fails, fall back to any available camera
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;

      // Enumerate devices after permission is granted (labels are now populated)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(videoDevs);

      // Find device matching our stream's active track (if possible)
      const activeTrack = stream.getVideoTracks()[0];
      const activeDeviceId = activeTrack?.getSettings()?.deviceId;
      if (activeDeviceId) setSelectedDeviceId(activeDeviceId);

      if (!videoRef.current) {
        stopAllCameraResources();
        setIsScanning(false);
        return;
      }

      // Attach stream to video element for preview
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});

      // Start ZXing decode loop on our video element
      await codeReaderRef.current.decodeFromVideoElement(
        videoRef.current,
        (result: any, err: any) => {
          if (result) {
            const scannedText = result.getText();
            setBarcode(scannedText);
            lookupProduct(scannedText);
            stopScanning();
          }
          // Ignore NotFoundError — it fires continuously when no barcode is in frame
        }
      );
    } catch (err: any) {
      console.error('Camera scanner error:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings and try again.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.');
      } else if (err.name === 'NotReadableError') {
        setCameraError('Camera is already in use by another app. Close other apps using the camera and try again.');
      } else {
        setCameraError(`Could not start camera: ${err.message || err.name}. Ensure you are on HTTPS.`);
      }
      setIsScanning(false);
    }
  };

  const switchCamera = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    if (isScanning) {
      stopScanning();
      // Restart with new facing mode after state updates
      setTimeout(() => startScanning(), 300);
    }
  };

  const switchToDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (isScanning) {
      stopScanning();
      setTimeout(() => startScanning(), 300);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">
      {/* Station Header */}
      <section
        aria-label="Scanner Station Status"
        className="bg-card border border-border rounded-xl p-6 flex flex-col md:flex-row items-center gap-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <QrCode className="w-8 h-8" />
        </div>
        <div className="text-center md:text-left space-y-1">
          <h2 className="text-xl font-bold text-foreground">Barcode Automation Station</h2>
          <p className="text-sm text-muted-foreground">
            Scan physical barcodes using a USB hardware scanner or tap{' '}
            <span className="font-semibold text-primary">Start Camera Scanner</span> to use your
            device camera. You can also type a product barcode or product code manually and click{' '}
            <span className="font-semibold text-primary">Lookup</span>.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── Left: Input Controls ─────────────────────────────────── */}
        <section
          aria-label="Scanner Controls"
          className="md:col-span-1 bg-card border border-border rounded-xl p-5 space-y-4"
        >
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-muted-foreground" />
            Scanner Input
          </h3>

          <form onSubmit={handleBarcodeSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Barcode / Product Code
              </label>
              <input
                ref={inputRef}
                id="barcode-input"
                type="text"
                placeholder="Scan or type code here..."
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Works with barcode OR product code (SKU)
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || !barcode.trim()}
              className="w-full py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Searching...</>
              ) : (
                <><Search className="w-4 h-4" /> Lookup Product</>
              )}
            </button>
          </form>

          <hr className="border-border" />

          {/* Camera Scanner Controls */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-primary" /> Camera Scanner
            </h4>

            {!isScanning ? (
              <button
                type="button"
                onClick={startScanning}
                className="w-full py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-500 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" /> Start Camera Scanner
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={stopScanning}
                  className="w-full py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" /> Stop Camera
                </button>
                <button
                  type="button"
                  onClick={switchCamera}
                  className="w-full py-1.5 text-xs font-semibold text-foreground bg-muted border border-border hover:bg-muted/80 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <FlipHorizontal className="w-3.5 h-3.5 text-primary" />
                  {facingMode === 'environment' ? 'Switch to Front Camera' : 'Switch to Rear Camera'}
                </button>
              </div>
            )}

            {/* Camera device picker — only when devices are enumerated */}
            {videoDevices.length > 1 && (
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Select Camera
                </label>
                <select
                  value={selectedDeviceId}
                  onChange={e => switchToDevice(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {videoDevices.map((device, idx) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label ||
                        (device.deviceId.includes('back') || device.deviceId.includes('rear')
                          ? '📷 Back Camera'
                          : `Camera ${idx + 1}`)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {cameraError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            <div className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded border border-border">
              💡 Rear camera opens by default on mobile for best scan accuracy. Ensure
              you are on <span className="font-semibold">HTTPS</span> for camera access.
            </div>
          </div>
        </section>

        {/* ── Right: Results / Form ─────────────────────────────────── */}
        <section aria-label="Product Scan Details" className="md:col-span-2 space-y-4">
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-600 rounded-xl flex items-start gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm font-medium">{success}</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{error}</p>
                {barcode && (
                  <p className="text-xs text-red-400 mt-1.5">
                    To register this product, go to{' '}
                    <a href="/dashboard/products" className="underline font-semibold">
                      Products
                    </a>{' '}
                    and add a new product with barcode or code <code className="font-mono">"{barcode}"</code>.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Product found → Show details + stock form */}
          {product ? (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="w-10 h-10 bg-green-500/10 text-green-600 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-md">{product.name}</h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    Code: {product.code || 'N/A'} | Barcode: {product.barcode || 'N/A'} | Category: {product.category?.name || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm bg-muted/30 p-3 rounded-lg border border-border/50">
                <div>
                  <span className="text-xs text-muted-foreground block">Unit</span>
                  <span className="font-semibold text-foreground">{product.unit}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Min Level</span>
                  <span className="font-semibold text-foreground">{product.minStockLevel} {product.unit}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Type</span>
                  <span className="font-semibold text-foreground">{product.type}</span>
                </div>
              </div>

              <h4 className="font-bold text-foreground text-sm pt-1">Add Stock Movement</h4>

              <form onSubmit={handleAddStock} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Quantity ({product.unit}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Cost Per Unit (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={costPerUnit}
                    onChange={e => setCostPerUnit(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={e => setBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="sm:col-span-2 flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => { setProduct(null); setBarcode(''); setError(''); }}
                    className="px-4 py-2 text-sm font-medium text-foreground bg-muted border border-border hover:bg-muted/80 rounded-lg transition-all"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-60 rounded-lg flex items-center gap-2 transition-all"
                  >
                    {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Confirm & Save to Inventory
                  </button>
                </div>
              </form>
            </div>

          ) : isScanning ? (
            /* Camera viewfinder */
            <div className="bg-black border border-border rounded-xl overflow-hidden relative min-h-[340px] flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-cover max-h-[420px]"
                playsInline
                muted
                autoPlay
              />
              {/* Scan HUD overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-40">
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-sm" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-sm" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-sm" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-sm" />
                  {/* Scanning line */}
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary/80 animate-pulse" />
                </div>
              </div>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-4 py-1.5 rounded-full backdrop-blur-sm">
                📷 {facingMode === 'environment' ? 'Rear Camera' : 'Front Camera'} — Align barcode within the frame
              </span>
            </div>

          ) : (
            /* Idle state */
            <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground min-h-[280px] flex flex-col items-center justify-center">
              <QrCode className="w-14 h-14 mx-auto mb-4 opacity-20 text-primary" />
              <h3 className="font-bold text-foreground text-lg mb-2">Ready to Scan</h3>
              <p className="text-sm max-w-sm">
                Type or scan a <strong>barcode</strong> or <strong>product code</strong> in the
                input field and click <span className="text-primary font-semibold">Lookup Product</span>,{' '}
                or start the camera scanner to scan in real-time.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
