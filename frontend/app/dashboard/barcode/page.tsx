'use client';
import { useState, useEffect, useRef } from 'react';
import { productsAPI, inventoryAPI } from '@/lib/api';
import { QrCode, Search, AlertCircle, CheckCircle, Package, ArrowRight, Camera, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  // Focus scanner input on load
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleBarcodeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!barcode.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');
    setProduct(null);

    try {
      const res = await productsAPI.getByBarcode(barcode.trim());
      setProduct(res.data);
      setCostPerUnit('');
      setQuantity('');
      setBatchNumber(`BATCH-${Date.now().toString().slice(-6)}`);
    } catch (err: any) {
      setError(err.response?.data?.message || `No product registered with barcode "${barcode}".`);
    } finally {
      setLoading(false);
    }
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

      setSuccess(`Successfully added ${quantity} ${product.unit} of "${product.name}" to inventory.`);
      setProduct(null);
      setBarcode('');
      setQuantity('');
      setCostPerUnit('');
      setBatchNumber('');
      setExpiryDate('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error updating inventory.');
    } finally {
      setSubmitting(false);
    }
  };

  const triggerMockScan = (code: string) => {
    setBarcode(code);
    setTimeout(() => {
      // Trigger API fetch
      productsAPI.getByBarcode(code)
        .then(res => {
          setProduct(res.data);
          setBarcode(code);
          setError('');
          setSuccess('');
          setQuantity('');
          setCostPerUnit('');
          setBatchNumber(`BATCH-${Date.now().toString().slice(-6)}`);
        })
        .catch(() => {
          setError(`No product registered with barcode "${code}".`);
          setProduct(null);
        });
    }, 100);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">
      <div className="bg-card border border-border rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <QrCode className="w-8 h-8" />
        </div>
        <div className="text-center md:text-left space-y-1">
          <h2 className="text-xl font-bold text-foreground">Barcode Automation Station</h2>
          <p className="text-sm text-muted-foreground">
            Scan physical barcodes using a USB hardware scanner (which acts as a keyboard) or trigger a test scan below.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Scan Input Card */}
        <div className="md:col-span-1 bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-muted-foreground" />
            Scanner Input
          </h3>

          <form onSubmit={handleBarcodeSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Scan / Enter Barcode
              </label>
              <input
                ref={inputRef}
                type="text"
                placeholder="Place cursor here & scan..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 text-sm font-medium text-white bg-primary hover:bg-primary/95 rounded-lg transition-all"
            >
              {loading ? 'Searching...' : 'Lookup Barcode'}
            </button>
          </form>

          <hr className="border-border" />

          {/* Quick Demo Scans */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground">Mock Scanner Tests</h4>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => triggerMockScan('RICE1001')}
                className="text-left px-3 py-1.5 text-xs rounded bg-muted border border-border hover:bg-muted/80 text-foreground truncate"
              >
                Scan Rice (RICE1001)
              </button>
              <button
                onClick={() => triggerMockScan('MILK2002')}
                className="text-left px-3 py-1.5 text-xs rounded bg-muted border border-border hover:bg-muted/80 text-foreground truncate"
              >
                Scan Milk Packet (MILK2002)
              </button>
              <button
                onClick={() => triggerMockScan('UNKNOWN999')}
                className="text-left px-3 py-1.5 text-xs rounded bg-muted border border-border hover:bg-muted/80 text-foreground truncate"
              >
                Scan Unknown Barcode (UNKNOWN999)
              </button>
            </div>
          </div>
        </div>

        {/* Results / Form Card */}
        <div className="md:col-span-2 space-y-4">
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl flex items-start gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-medium">{error}</span>
                {!product && barcode && (
                  <p className="text-xs text-red-400 mt-1">
                    To register this product, go to the Products page and add a new product with code/barcode "{barcode}".
                  </p>
                )}
              </div>
            </div>
          )}

          {/* If Product Found - Show details and Add Stock form */}
          {product ? (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-md">{product.name}</h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    Code: {product.code || 'N/A'} | Category: {product.category?.name || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-3 rounded-lg border border-border/50">
                <div>
                  <span className="text-xs text-muted-foreground block">Stock Unit</span>
                  <span className="font-semibold text-foreground">{product.unit}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Minimum Level</span>
                  <span className="font-semibold text-foreground">{product.minStockLevel} {product.unit}</span>
                </div>
              </div>

              <h4 className="font-bold text-foreground text-sm pt-2">Add Stock Movement</h4>

              <form onSubmit={handleAddStock} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Quantity to Add ({product.unit}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Cost Per Unit (INR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(e.target.value)}
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
                    onChange={(e) => setBatchNumber(e.target.value)}
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
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="sm:col-span-2 flex gap-2 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setProduct(null);
                      setBarcode('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-foreground bg-muted border border-border hover:bg-muted/80 rounded-lg"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/95 rounded-lg flex items-center gap-1.5"
                  >
                    {submitting && <QrCode className="w-4 h-4 animate-spin" />}
                    Confirm & Save
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
              <QrCode className="w-16 h-16 mx-auto mb-3 opacity-20 animate-pulse text-primary" />
              <h3 className="font-bold text-foreground text-md mb-1">Ready to Scan</h3>
              <p className="text-sm">
                Place the cursor in the input field, scan a barcode using your hardware scanner, or click one of the mock tests to verify the setup.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
