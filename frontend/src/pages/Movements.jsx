import { useState, useEffect } from 'react'
import { getStockMovements, getProducts } from '../services/api'
import Toast from '../components/Toast'

function Movements() {
  const [movements, setMovements] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState({ type: 'all', productId: 'all' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [movementsData, productsData] = await Promise.all([
        getStockMovements(),
        getProducts()
      ])
      setMovements(movementsData)
      setProducts(productsData)
    } catch (error) {
      setToast({ message: 'Failed to load data', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const filteredMovements = movements.filter(m => {
    if (filter.type !== 'all' && m.type !== filter.type) return false
    if (filter.productId !== 'all' && m.product_id !== parseInt(filter.productId)) return false
    return true
  })

  // Calculate totals
  const totalIn = movements.filter(m => m.type === 'IN').reduce((sum, m) => sum + parseInt(m.quantity), 0)
  const totalOut = movements.filter(m => m.type === 'OUT').reduce((sum, m) => sum + parseInt(m.quantity), 0)

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

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Stock Movements</h2>
        <p className="text-gray-500 mt-1">History of all stock transactions</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-green-50 border-green-200">
          <p className="text-sm text-green-600 font-medium">Total IN</p>
          <p className="text-3xl font-bold text-green-900 mt-2">+{totalIn}</p>
        </div>
        <div className="card bg-red-50 border-red-200">
          <p className="text-sm text-red-600 font-medium">Total OUT</p>
          <p className="text-3xl font-bold text-red-900 mt-2">-{totalOut}</p>
        </div>
        <div className="card bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-600 font-medium">Net Change</p>
          <p className={`text-3xl font-bold mt-2 ${totalIn - totalOut >= 0 ? 'text-green-900' : 'text-red-900'}`}>
            {totalIn - totalOut >= 0 ? '+' : ''}{totalIn - totalOut}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select 
              value={filter.type}
              onChange={(e) => setFilter({...filter, type: e.target.value})}
              className="input-field w-32"
            >
              <option value="all">All</option>
              <option value="IN">IN (Receive)</option>
              <option value="OUT">OUT (Sell)</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select 
              value={filter.productId}
              onChange={(e) => setFilter({...filter, productId: e.target.value})}
              className="input-field"
            >
              <option value="all">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="card overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Movements ({filteredMovements.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Time</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">SKU</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Product</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">Type</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMovements.map(movement => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(movement.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-900">{movement.sku}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{movement.name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      movement.type === 'IN' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {movement.type === 'IN' ? 'IN' : 'OUT'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono text-sm font-medium ${
                    movement.type === 'IN' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {movement.type === 'IN' ? '+' : '-'}{movement.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredMovements.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No movements found matching your filters</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Movements
