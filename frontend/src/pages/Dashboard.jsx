import { useState, useEffect } from 'react'
import { getStock } from '../services/api'
import BarcodeDisplay from '../components/BarcodeDisplay'
import Toast from '../components/Toast'

function Dashboard() {
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchStock()
  }, [])

  const fetchStock = async () => {
    try {
      setLoading(true)
      const data = await getStock()
      setStock(data)
    } catch (error) {
      setToast({ message: 'Failed to load stock data', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const lowStock = stock.filter(item => item.current_stock < 10 && item.current_stock > 0)
  const outOfStock = stock.filter(item => item.current_stock <= 0)
  const totalProducts = stock.length
  const totalStock = stock.reduce((sum, item) => sum + parseInt(item.current_stock), 0)

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
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">Overview of your inventory</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-600 font-medium">Total Products</p>
          <p className="text-3xl font-bold text-blue-900 mt-2">{totalProducts}</p>
        </div>
        <div className="card bg-green-50 border-green-200">
          <p className="text-sm text-green-600 font-medium">Total Stock</p>
          <p className="text-3xl font-bold text-green-900 mt-2">{totalStock}</p>
        </div>
        <div className="card bg-yellow-50 border-yellow-200">
          <p className="text-sm text-yellow-600 font-medium">Low Stock</p>
          <p className="text-3xl font-bold text-yellow-900 mt-2">{lowStock.length}</p>
        </div>
        <div className="card bg-red-50 border-red-200">
          <p className="text-sm text-red-600 font-medium">Out of Stock</p>
          <p className="text-3xl font-bold text-red-900 mt-2">{outOfStock.length}</p>
        </div>
      </div>

      {/* Stock Table */}
      <div className="card overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Stock Levels</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Barcode</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Product Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Category</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Stock</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stock.map(item => {
                const stockLevel = parseInt(item.current_stock)
                let statusBadge = ''
                if (stockLevel <= 0) {
                  statusBadge = <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">Out of Stock</span>
                } else if (stockLevel < 10) {
                  statusBadge = <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Low Stock</span>
                } else {
                  statusBadge = <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">OK</span>
                }

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><BarcodeDisplay value={item.sku} width={1} height={35} fontSize={10} /></td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.category || '-'}</td>
                    <td className={`px-4 py-3 text-right font-mono text-sm font-medium ${stockLevel < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                      {stockLevel}
                    </td>
                    <td className="px-4 py-3">{statusBadge}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
