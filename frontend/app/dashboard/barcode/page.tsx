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
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Stock form state
  const [quantity, setQuantity] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Camera state
  const [isScanning, setIsScanning] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState('');
  const [scanStatus, setScanStatus] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  // ZXing IScannerControls — has .stop() to halt the decode loop
  const scanControlsRef = useRef<{ stop: () => void } | null>(null);
  // Raw MediaStream — so we can stop tracks on cleanup
  const streamRef = useRef<MediaStream | null>(null);

  // Focus barcode input on mount & load products catalog
  useEffect(() => {
    inputRef.current?.focus();
    productsAPI.getAll()
      .then(res => setAllProducts(res.data || []))
      .catch(err => console.error('Failed to load products for datalist:', err));
  }, []);

  // ── Camera resource cleanup ─────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    // Stop ZXing decode loop first
    if (scanControlsRef.current) {
      try { scanControlsRef.current.stop(); } catch { /* ignore */ }
      scanControlsRef.current = null;
    }
    // Then stop all video tracks on the raw stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  const stopScanning = () => {
    stopCamera();
    setIsScanning(false);
    setScanStatus('');
    setCameraError('');
  };

  // ── Product lookup ──────────────────────────────────────────────────────────
  const lookupProduct = useCallback(async (value: string) => {
    const v = value.trim();
    if (!v) return;
    setLoading(true);
    setError('');
    setSuccess('');
    setProduct(null);

    try {
      // Backend tries barcode field first, then product code field as fallback
      const res = await productsAPI.getByBarcode(v);
      setProduct(res.data);
      setBatchNumber(`BATCH-${Date.now().toString().slice(-6)}`);
      setQuantity('');
      setCostPerUnit('');
      setExpiryDate('');
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError(
          `No product found for "${v}". ` +
          `Register it first in the Products catalog with this barcode or code.`
        );
      } else {
        setError(err.response?.data?.message || 'Lookup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    lookupProduct(barcode);
  };

  // ── Stock submission ────────────────────────────────────────────────────────
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !quantity || !costPerUnit) {
      setError('Please fill in quantity and cost per unit.');
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
      setError(err.response?.data?.message || 'Failed to save stock. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Camera scanner ──────────────────────────────────────────────────────────
  /**
   * Uses BrowserMultiFormatReader from @zxing/browser.
   *
   * CRITICAL FIX: Must use decodeFromStream(stream, videoEl, callback) NOT
   * decodeFromVideoElement(). decodeFromVideoElement() is a one-shot decode and
   * does NOT continuously scan. decodeFromStream() starts a proper decode loop.
   *
   * Flow:
   *   1. getUserMedia() with facingMode: { ideal: 'environment' } for rear camera
   *   2. Attach stream to <video> srcObject for preview
   *   3. Pass the SAME stream to decodeFromStream() — ZXing reads frames continuously
   *   4. On decode: stop controls + stop stream tracks + look up product
   */
  const startScanning = async (facing: 'environment' | 'user' = cameraFacing) => {
    setIsScanning(true);
    setError('');
    setSuccess('');
    setCameraError('');
    setScanStatus('Starting camera…');

    // Ensure previous session is fully stopped before starting new one
    stopCamera();

    // Allow React to render the <video> element before we attach a stream
    await new Promise(r => setTimeout(r, 250));

    if (!videoRef.current) {
      setCameraError('Video element not ready. Please try again.');
      setIsScanning(false);
      return;
    }

    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const codeReader = new BrowserMultiFormatReader();

      // ── Step 1: Get camera stream with rear-camera preference ───────────────
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },   // 'environment' = rear, 'user' = front
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
      } catch {
        // Some devices don't support facingMode — fall back to default camera
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      setScanStatus('Camera active — point at a barcode');

      // ── Step 2: Attach stream to video for preview ──────────────────────────
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => { });

      // ── Step 3: Start continuous ZXing decode loop ──────────────────────────
      // decodeFromStream() returns IScannerControls with a .stop() method.
      // The callback fires on EVERY frame: result is set when barcode is found,
      // err is set (NotFoundError) when no barcode is visible (normal — ignore it).
      const controls = await codeReader.decodeFromStream(
        stream,
        videoRef.current,
        (result, _err) => {
          if (result) {
            const text = result.getText();
            // ── Step 4: Stop scanner and look up the product ────────────────
            controls.stop();
            scanControlsRef.current = null;
            stopCamera();
            setIsScanning(false);
            setScanStatus('');
            setBarcode(text);
            lookupProduct(text);
          }
          // Ignore err — NotFoundError fires every frame when no barcode is in view
        }
      );

      scanControlsRef.current = controls;

    } catch (err: any) {
      console.error('Scanner error:', err);
      stopCamera();
      setIsScanning(false);
      setScanStatus('');

      if (err.name === 'NotAllowedError') {
        setCameraError(
          'Camera permission denied. Allow camera access in your browser settings, then try again.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError(
          'Camera is already in use by another app. Close other apps using the camera and try again.'
        );
      } else if (err.name === 'OverconstrainedError') {
        // Retry without constraints
        setCameraError('');
        setScanStatus('Retrying with default camera…');
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            await videoRef.current.play().catch(() => { });
          }
          const { BrowserMultiFormatReader } = await import('@zxing/browser');
          const reader2 = new BrowserMultiFormatReader();
          const controls2 = await reader2.decodeFromStream(
            fallbackStream,
            videoRef.current!,
            (result) => {
              if (result) {
                controls2.stop();
                scanControlsRef.current = null;
                stopCamera();
                setIsScanning(false);
                setScanStatus('');
                const text = result.getText();
                setBarcode(text);
                lookupProduct(text);
              }
            }
          );
          scanControlsRef.current = controls2;
          setIsScanning(true);
          setScanStatus('Camera active — point at a barcode');
        } catch (e2: any) {
          stopCamera();
          setIsScanning(false);
          setScanStatus('');
          setCameraError(`Could not start camera: ${e2.message || e2.name}`);
        }
      } else {
        setCameraError(
          `Camera error: ${err.message || err.name}. Make sure you are on HTTPS.`
        );
      }
    }
  };

  const flipCamera = () => {
    const newFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(newFacing);
    if (isScanning) {
      startScanning(newFacing);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">
      {/* Header */}
      <section
        aria-label="Scanner Station"
        className="bg-card border border-border rounded-xl p-6 flex flex-col md:flex-row items-center gap-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <QrCode className="w-8 h-8" />
        </div>
        <div className="text-center md:text-left space-y-1">
          <h2 className="text-xl font-bold text-foreground">Barcode Automation Station</h2>
          <p className="text-sm text-muted-foreground">
            Scan with a USB hardware scanner (auto-submits on scan), or tap{' '}
            <span className="font-semibold text-primary">Start Camera Scanner</span> to use your
            device camera. You can also type a product barcode or product code manually.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── Left Panel: Input + Camera Controls ─────────────── */}
        <section
          aria-label="Scanner Controls"
          className="md:col-span-1 bg-card border border-border rounded-xl p-5 space-y-4"
        >
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-muted-foreground" />
            Manual / USB Input
          </h3>

          <form onSubmit={handleBarcodeSubmit} className="space-y-3">
            <div>
              <label htmlFor="barcode-input" className="block text-xs font-semibold text-muted-foreground mb-1">
                Barcode / Product Code
              </label>
              <input
                ref={inputRef}
                id="barcode-input"
                list="products-datalist"
                type="text"
                placeholder="Scan, type or search product name…"
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <datalist id="products-datalist">
                {allProducts.map(p => (
                  <option key={p.id} value={p.barcode || p.code}>
                    {p.name} ({p.type} - {p.unit})
                  </option>
                ))}
              </datalist>
              <p className="text-[10px] text-muted-foreground mt-1">
                Matches product barcode <strong>or</strong> product code/name
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || !barcode.trim()}
              className="w-full py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Searching…</>
                : <><Search className="w-4 h-4" /> Lookup Product</>}
            </button>
          </form>

          <hr className="border-border" />

          {/* Camera Controls */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-primary" /> Camera Scanner
            </h4>

            {!isScanning ? (
              <button
                type="button"
                onClick={() => startScanning()}
                className="w-full py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-500 rounded-lg transition-all flex items-center justify-center gap-2"
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
                  onClick={flipCamera}
                  className="w-full py-1.5 text-xs font-semibold text-foreground bg-muted border border-border hover:bg-muted/80 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <FlipHorizontal className="w-3.5 h-3.5 text-primary" />
                  {cameraFacing === 'environment' ? 'Switch to Front Camera' : 'Switch to Rear Camera'}
                </button>
                {scanStatus && (
                  <p className="text-xs text-center text-muted-foreground animate-pulse">
                    {scanStatus}
                  </p>
                )}
              </div>
            )}

            {cameraError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            <div className="text-[10px] text-muted-foreground bg-muted/50 p-2.5 rounded border border-border leading-relaxed">
              💡 <strong>Tips for best scan accuracy:</strong><br />
              • Hold barcode 10–20 cm from camera<br />
              • Ensure good lighting<br />
              • Keep barcode flat and steady<br />
              • Must be on <strong>HTTPS</strong> for camera access
            </div>
          </div>
        </section>

        {/* ── Right Panel: Camera View / Product Form / Idle ───── */}
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
                    Go to{' '}
                    <a href="/dashboard/products" className="underline font-semibold">Products</a>
                    {' '}and add a product with barcode/code <code className="font-mono">&quot;{barcode}&quot;</code>.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Camera viewfinder */}
          {isScanning && (
            <div className="bg-black border border-border rounded-xl overflow-hidden relative min-h-[340px] flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-cover max-h-[420px]"
                playsInline
                muted
                autoPlay
              />
              {/* Corner-bracket overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-44">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br" />
                  {/* Animated scan line */}
                  <div
                    className="absolute inset-x-2 h-0.5 bg-primary/90 rounded-full"
                    style={{ animation: 'scan-line 2s ease-in-out infinite', top: '50%' }}
                  />
                </div>
              </div>
              <div className="absolute bottom-4 inset-x-0 flex justify-center">
                <span className="bg-black/70 text-white text-xs px-4 py-1.5 rounded-full backdrop-blur-sm">
                  {cameraFacing === 'environment' ? '📷 Rear' : '🤳 Front'} — Hold barcode within the frame
                </span>
              </div>
            </div>
          )}

          {/* Product found → stock form */}
          {product && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="w-10 h-10 bg-green-500/10 text-green-600 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{product.name}</h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    Code: {product.code || '—'} | Barcode: {product.barcode || '—'} | {product.category?.name}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm bg-muted/30 p-3 rounded-lg border border-border/50">
                <div><span className="text-xs text-muted-foreground block">Unit</span><span className="font-semibold">{product.unit}</span></div>
                <div><span className="text-xs text-muted-foreground block">Min Level</span><span className="font-semibold">{product.minStockLevel} {product.unit}</span></div>
                <div><span className="text-xs text-muted-foreground block">Type</span><span className="font-semibold">{product.type}</span></div>
              </div>

              <h4 className="font-bold text-foreground text-sm pt-1">Add Stock Movement</h4>

              <form onSubmit={handleAddStock} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Quantity ({product.unit}) *</label>
                  <input type="number" step="0.01" min="0.01" placeholder="0.00" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary" required autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Cost Per Unit (₹) *</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00" value={costPerUnit} onChange={e => setCostPerUnit(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Batch Number</label>
                  <input type="text" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Expiry Date</label>
                  <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="sm:col-span-2 flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => { setProduct(null); setBarcode(''); setError(''); }} className="px-4 py-2 text-sm font-medium bg-muted border border-border hover:bg-muted/80 rounded-lg transition-all">Clear</button>
                  <button type="submit" disabled={submitting} className="px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-60 rounded-lg flex items-center gap-2 transition-all">
                    {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Confirm & Save
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Idle state (no scan, no product) */}
          {!isScanning && !product && (
            <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground min-h-[280px] flex flex-col items-center justify-center">
              <QrCode className="w-14 h-14 mx-auto mb-4 opacity-20 text-primary" />
              <h3 className="font-bold text-foreground text-lg mb-2">Ready to Scan</h3>
              <p className="text-sm max-w-sm">
                Type or scan a <strong>barcode</strong> or <strong>product code</strong> in the input,
                or tap <span className="text-primary font-semibold">Start Camera Scanner</span> to scan with your camera.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Scan line animation */}
      <style jsx>{`
        @keyframes scan-line {
          0%, 100% { transform: translateY(-60px); opacity: 0.4; }
          50% { transform: translateY(60px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
