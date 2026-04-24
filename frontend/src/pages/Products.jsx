import { useState, useEffect } from 'react'
import { getProducts, createProduct, deleteProduct } from '../services/api'
import BarcodeDisplay from '../components/BarcodeDisplay'
import Toast from '../components/Toast'

function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ sku: '', name: '', category: '', initial_quantity: '' })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const data = await getProducts()
      setProducts(data)
    } catch (error) {
      setToast({ message: 'Failed to load products', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createProduct(form)
      setToast({ message: 'Product created successfully!', type: 'success' })
      setForm({ sku: '', name: '', category: '', initial_quantity: '' })
      setShowAddForm(false)
      fetchProducts()
    } catch (error) {
      if (error.status === 409) {
        setToast({ message: 'SKU already exists', type: 'error' })
      } else {
        setToast({ message: 'Failed to create product', type: 'error' })
      }
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this product? This will also delete all stock history.')) return
    try {
      await deleteProduct(id)
      setToast({ message: 'Product deleted', type: 'success' })
      fetchProducts()
    } catch (error) {
      setToast({ message: 'Failed to delete product', type: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Products</h2>
          <p className="text-gray-500 mt-1">Manage your product catalog</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
        >
          {showAddForm ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {/* Add Product Form */}
      {showAddForm && (
        <div className="card border-primary-200 bg-primary-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Product</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU (Barcode) *</label>
                <input 
                  type="text" 
                  value={form.sku}
                  onChange={(e) => setForm({...form, sku: e.target.value})}
                  className="input-field"
                  placeholder="e.g., 801"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Quantity</label>
                <input 
                  type="number"
                  min="0"
                  value={form.initial_quantity}
                  onChange={(e) => setForm({...form, initial_quantity: e.target.value})}
                  className="input-field"
                  placeholder="e.g., 100"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input 
                  type="text" 
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  className="input-field"
                  placeholder="Product name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input 
                  type="text" 
                  value={form.category}
                  onChange={(e) => setForm({...form, category: e.target.value})}
                  className="input-field"
                  placeholder="Category"
                />
              </div>
            </div>
            {form.sku && (
              <div className="flex justify-center py-2">
                <BarcodeDisplay value={form.sku} width={1.5} height={60} fontSize={14} />
              </div>
            )}
            <div>
              <button type="submit" className="btn-success">
                Create Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Barcode</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">SKU</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Category</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Stock</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Status</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map(product => {
                const stock = parseInt(product.current_stock)
                let status = 'OK'
                let statusClass = 'bg-green-100 text-green-700'
                if (stock <= 0) {
                  status = 'Out'
                  statusClass = 'bg-red-100 text-red-700'
                } else if (stock < 10) {
                  status = 'Low'
                  statusClass = 'bg-yellow-100 text-yellow-700'
                }

                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><BarcodeDisplay value={product.sku} width={1} height={35} fontSize={10} /></td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-900">{product.sku}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{product.category || '-'}</td>
                    <td className={`px-4 py-3 text-right font-mono text-sm font-medium ${stock < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                      {stock}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${statusClass}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {products.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No products yet</p>
            <p className="text-sm mt-1">Add products using the button above or use the Receive page</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Products
