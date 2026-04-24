import { useState, useEffect, useCallback } from 'react'
import BarcodeInput from '../components/BarcodeInput'
import BarcodeDisplay from '../components/BarcodeDisplay'
import Toast from '../components/Toast'
import { getProductBySku, sellStock } from '../services/api'

function Sell() {
  const [barcode, setBarcode] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [recentSales, setRecentSales] = useState([])

  // Handle barcode scan - auto-sell with quantity 1 if no manual quantity set
  const handleBarcodeSubmit = async (scannedBarcode) => {
    try {
      setLoading(true)
      const productData = await getProductBySku(scannedBarcode)
      
      if (parseInt(productData.current_stock) < quantity) {
        setToast({ 
          message: `Insufficient stock! Only ${productData.current_stock} available`, 
          type: 'error' 
        })
        setProduct(productData)
        return
      }

      setProduct(productData)
      
      // Auto-sell if quantity is 1 (default), otherwise wait for confirmation
      if (quantity === 1) {
        await processSale(productData, 1)
      }
    } catch (error) {
      if (error.status === 404) {
        setToast({ message: `Product not found: ${scannedBarcode}`, type: 'error' })
      } else {
        setToast({ message: 'Error processing sale', type: 'error' })
      }
      setProduct(null)
    } finally {
      setLoading(false)
    }
  }

  const processSale = async (productData, qty) => {
    try {
      const result = await sellStock(productData.sku, qty)
      
      // Add to recent sales
      const sale = {
        id: Date.now(),
        sku: productData.sku,
        name: productData.name,
        quantity: qty,
        remaining: result.product.current_stock,
        timestamp: new Date()
      }
      setRecentSales(prev => [sale, ...prev.slice(0, 9)])
      
      setToast({ 
        message: `Sold ${qty} x ${productData.name}. Remaining: ${result.product.current_stock}`, 
        type: 'success' 
      })
      
      // Reset for next scan
      setBarcode('')
      setProduct(null)
      setQuantity(1)
    } catch (error) {
      if (error.message === 'Insufficient stock') {
        setToast({ 
          message: `Insufficient stock! Available: ${error.currentStock}`, 
          type: 'error' 
        })
      } else {
        setToast({ message: 'Failed to process sale', type: 'error' })
      }
    }
  }

  const handleManualSell = async (e) => {
    e.preventDefault()
    if (!product || quantity < 1) return
    await processSale(product, quantity)
  }

  // Quick quantity buttons
  const quickQuantities = [1, 2, 5, 10]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sell Product</h2>
          <p className="text-gray-500 mt-1">Scan barcode to sell products</p>
        </div>

        {/* Barcode Input */}
        <div className="card">
          <BarcodeInput
            value={barcode}
            onChange={setBarcode}
            onSubmit={handleBarcodeSubmit}
            placeholder="Scan barcode to sell..."
            disabled={loading}
          />
        </div>

        {/* Quantity Selector */}
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Quantity (for manual sell)
          </label>
          <div className="flex gap-2 mb-4">
            {quickQuantities.map(qty => (
              <button
                key={qty}
                onClick={() => setQuantity(qty)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  quantity === qty 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {qty}
              </button>
            ))}
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center"
            />
          </div>
          <p className="text-xs text-gray-500">
            Scan barcode to auto-sell 1 unit, or set quantity and confirm below
          </p>
        </div>

        {/* Product & Manual Sell */}
        {product && (
          <div className="card border-orange-300 bg-orange-50">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0">
                <BarcodeDisplay value={product.sku} width={1.5} height={60} fontSize={14} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                <p className="text-lg font-bold mt-1">
                  Available: <span className={parseInt(product.current_stock) < 10 ? 'text-red-600' : 'text-green-700'}>{product.current_stock}</span>
                </p>
              </div>
            </div>
            
            <form onSubmit={handleManualSell} className="space-y-3">
              <div className="flex gap-3">
                <button 
                  type="submit" 
                  disabled={loading || parseInt(product.current_stock) < quantity}
                  className="btn-danger flex-1 text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sell {quantity} Unit{quantity > 1 ? 's' : ''}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setProduct(null); setBarcode(''); setQuantity(1); }}
                  className="btn-primary bg-gray-500 hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
              {parseInt(product.current_stock) < quantity && (
                <p className="text-red-600 text-sm text-center">
                  Insufficient stock! Only {product.current_stock} available.
                </p>
              )}
            </form>
          </div>
        )}
      </div>

      {/* Recent Sales */}
      <div className="space-y-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sales</h3>
          {recentSales.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sales yet. Scan a barcode to sell.</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {recentSales.map(sale => (
                <div 
                  key={sale.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm">
                      ✓
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{sale.name}</p>
                      <p className="text-xs text-gray-500">{sale.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">-{sale.quantity}</p>
                    <p className="text-xs text-gray-500">Stock: {sale.remaining}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="card bg-blue-50 border-blue-200">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Session Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-blue-900">
                {recentSales.reduce((sum, s) => sum + s.quantity, 0)}
              </p>
              <p className="text-sm text-blue-600">Items Sold</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-900">
                {recentSales.length}
              </p>
              <p className="text-sm text-blue-600">Transactions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sell
