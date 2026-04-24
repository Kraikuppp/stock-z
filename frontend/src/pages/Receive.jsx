import { useState, useRef } from 'react'
import BarcodeInput from '../components/BarcodeInput'
import BarcodeDisplay from '../components/BarcodeDisplay'
import Toast from '../components/Toast'
import { getProductBySku, receiveStock, createProduct } from '../services/api'

function Receive() {
  const [barcode, setBarcode] = useState('')
  const [quantity, setQuantity] = useState('')
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [showNewProductForm, setShowNewProductForm] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', category: '', initial_quantity: '' })
  const quantityInputRef = useRef(null)

  // Handle barcode scan
  const handleBarcodeSubmit = async (scannedBarcode) => {
    try {
      setLoading(true)
      const productData = await getProductBySku(scannedBarcode)
      setProduct(productData)
      setShowNewProductForm(false)
      setToast({ message: `Found: ${productData.name}`, type: 'success' })
      // Focus quantity input after finding product
      setTimeout(() => quantityInputRef.current?.focus(), 100)
    } catch (error) {
      if (error.status === 404) {
        setProduct(null)
        setShowNewProductForm(true)
        setToast({ message: 'Product not found. Create new product?', type: 'warning' })
      } else {
        setToast({ message: 'Error looking up product', type: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }

  // Create new product
  const handleCreateProduct = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const created = await createProduct({
        sku: barcode,
        name: newProduct.name,
        category: newProduct.category,
        initial_quantity: newProduct.initial_quantity
      })
      const qtyMsg = newProduct.initial_quantity ? ` with ${newProduct.initial_quantity} units` : ''
      setToast({ message: `Product created${qtyMsg}!`, type: 'success' })
      setShowNewProductForm(false)
      handleBarcodeSubmit(barcode)
      setNewProduct({ name: '', category: '', initial_quantity: '' })
    } catch (error) {
      setToast({ message: 'Failed to create product', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Submit stock receive
  const handleReceive = async (e) => {
    e.preventDefault()
    if (!product || !quantity) return

    try {
      setLoading(true)
      const result = await receiveStock(product.sku, parseInt(quantity))
      setToast({ 
        message: `Received ${quantity} units of ${product.name}. New stock: ${result.product.current_stock}`, 
        type: 'success' 
      })
      // Reset form
      setBarcode('')
      setQuantity('')
      setProduct(null)
    } catch (error) {
      setToast({ message: 'Failed to receive stock', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Receive Stock</h2>
        <p className="text-gray-500 mt-1">Scan barcode to receive products into inventory</p>
      </div>

      {/* Barcode Input */}
      <div className="card">
        <BarcodeInput
          value={barcode}
          onChange={setBarcode}
          onSubmit={handleBarcodeSubmit}
          placeholder="Scan or type barcode..."
          disabled={loading || product !== null}
        />
      </div>

      {/* New Product Form */}
      {showNewProductForm && (
        <div className="card border-yellow-300 bg-yellow-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Product</h3>
          <form onSubmit={handleCreateProduct} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU (Barcode)</label>
              <div className="flex gap-3 items-end">
                <input 
                  type="text" 
                  value={barcode} 
                  disabled 
                  className="input-field bg-gray-100 flex-1"
                />
                {barcode && <BarcodeDisplay value={barcode} width={1} height={40} fontSize={10} className="flex-shrink-0" />}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <input 
                type="text" 
                value={newProduct.name}
                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                className="input-field"
                placeholder="Enter product name"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input 
                type="text" 
                value={newProduct.category}
                onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                className="input-field"
                placeholder="e.g., Beverages, Snacks"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Initial Quantity</label>
              <input 
                type="number"
                min="0"
                value={newProduct.initial_quantity}
                onChange={(e) => setNewProduct({...newProduct, initial_quantity: e.target.value})}
                className="input-field"
                placeholder="e.g., 100"
              />
              <p className="text-xs text-gray-500 mt-1">Will auto-create IN movement</p>
            </div>
            <div className="flex gap-3">
              <button 
                type="submit" 
                disabled={loading}
                className="btn-success flex-1"
              >
                Create Product
              </button>
              <button 
                type="button" 
                onClick={() => { setShowNewProductForm(false); setBarcode(''); }}
                className="btn-primary bg-gray-500 hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Product Found - Quantity Input */}
      {product && (
        <div className="card border-green-300 bg-green-50">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-shrink-0">
              <BarcodeDisplay value={product.sku} width={1.5} height={60} fontSize={14} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{product.name}</h3>
              <p className="text-sm text-gray-500">SKU: {product.sku}</p>
              <p className="text-lg font-bold text-green-700 mt-1">Stock: {product.current_stock}</p>
            </div>
          </div>
          
          <form onSubmit={handleReceive} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity to Receive *
              </label>
              <input
                ref={quantityInputRef}
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="input-field text-center text-2xl font-bold"
                placeholder="0"
                required
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button 
                type="submit" 
                disabled={loading || !quantity}
                className="btn-success flex-1 text-lg py-3"
              >
                Confirm Receive
              </button>
              <button 
                type="button" 
                onClick={() => { setProduct(null); setBarcode(''); setQuantity(''); }}
                className="btn-primary bg-gray-500 hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default Receive
