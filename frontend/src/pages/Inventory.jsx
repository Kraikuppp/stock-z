import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BarcodeInput from '../components/BarcodeInput'
import Toast from '../components/Toast'
import { createProduct, getStock, getProductBySku } from '../services/api'

function Inventory() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanValue, setScanValue] = useState('')
  const [scanLoading, setScanLoading] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    try {
      setLoading(true)
      const data = await getStock()
      setItems(data)
    } catch {
      setToast({ message: 'โหลดข้อมูลคลังสินค้าไม่สำเร็จ', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const parseScanPayload = (raw) => {
    const text = raw?.trim()
    if (!text) throw new Error('EMPTY_QR')

    // Support both:
    // - New QR: SKU plain text (recommended)
    // - New QR (link): https://.../qr-receive?sku=XXX
    // - Old QR: JSON payload with { sku, ... }
    try {
      const payload = JSON.parse(text)
      if (!payload?.sku) throw new Error('MISSING_SKU')
      return {
        sku: String(payload.sku).trim(),
        name: payload.name ? String(payload.name).trim() : '',
        category: payload.category ? String(payload.category).trim() : '',
        payload
      }
    } catch (e) {
      if (e?.message === 'MISSING_SKU') throw e
      // try parse as URL
      try {
        const url = new URL(text)
        const sku = url.searchParams.get('sku')
        if (sku) {
          const cleanSku = String(sku).trim()
          return { sku: cleanSku, name: '', category: '', payload: { sku: cleanSku } }
        }
      } catch {
        // ignore
      }

      // treat as plain SKU
      const sku = text
      return {
        sku,
        name: '',
        category: '',
        payload: { sku }
      }
    }
  }

  const handleScanSubmit = async (rawScanned) => {
    try {
      setScanLoading(true)
      const parsed = parseScanPayload(rawScanned)

      let productExists = true
      try {
        await getProductBySku(parsed.sku)
      } catch (error) {
        if (error.status !== 404) throw error
        productExists = false

        await createProduct({
          sku: parsed.sku,
          name: parsed.name || `Product ${parsed.sku}`,
          category: parsed.category || null
        })
      }

      setScanValue('')
      navigate('/qr-receive', {
        state: {
          scan: {
            ...parsed,
            productExists
          }
        }
      })
    } catch (error) {
      if (error.message === 'MISSING_SKU') {
        setToast({ message: 'QR ไม่มีข้อมูล SKU', type: 'error' })
      } else if (error.message === 'EMPTY_QR') {
        setToast({ message: 'กรุณาสแกนหรือวางข้อมูล QR', type: 'warning' })
      } else {
        setToast({ message: 'ประมวลผลการสแกนไม่สำเร็จ', type: 'error' })
      }
    } finally {
      setScanLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h2 className="text-2xl font-bold text-gray-900">คลังสินค้า</h2>
        <p className="text-gray-500 mt-1">สแกน QR Preset เพื่อเลือกสินค้า แล้วระบบจะพาไปหน้ากรอกจำนวน</p>
      </div>

      <div className="card">
        <BarcodeInput
          value={scanValue}
          onChange={setScanValue}
          onSubmit={handleScanSubmit}
          placeholder="สแกน QR (SKU) จาก Code Generator..."
          disabled={scanLoading}
          label="QR Scan Input"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">SKU</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">ชื่อสินค้า</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">หมวดหมู่</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">คงเหลือ</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => {
                const stock = parseInt(item.current_stock, 10) || 0
                let status = 'ปกติ'
                let statusClass = 'bg-green-100 text-green-700'

                if (stock <= 0) {
                  status = 'หมด'
                  statusClass = 'bg-red-100 text-red-700'
                } else if (stock < 10) {
                  status = 'ใกล้หมด'
                  statusClass = 'bg-yellow-100 text-yellow-700'
                }

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm text-gray-900">{item.sku}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.category || '-'}</td>
                    <td className={`px-4 py-3 text-right font-mono text-sm font-medium ${stock < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                      {stock}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${statusClass}`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!loading && items.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">ยังไม่มีสินค้าในคลัง</p>
            <p className="text-sm mt-1">สแกน QR Preset เพื่อเพิ่มสินค้าเข้าในระบบ</p>
          </div>
        )}
        {loading && (
          <div className="text-center py-12 text-gray-500">
            กำลังโหลดข้อมูล...
          </div>
        )}
      </div>
    </div>
  )
}

export default Inventory
