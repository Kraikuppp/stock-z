import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Toast from '../components/Toast'
import { createProduct, getProductBySku, receiveStock } from '../services/api'

function QrReceive() {
  const navigate = useNavigate()
  const location = useLocation()
  const qtyRef = useRef(null)

  const querySku = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search || '')
      const sku = params.get('sku')
      return sku ? String(sku).trim() : ''
    } catch {
      return ''
    }
  }, [location.search])

  const initialScan = location.state?.scan || (querySku ? { sku: querySku, payload: { sku: querySku } } : null)
  const [scan, setScan] = useState(initialScan)
  const [productName, setProductName] = useState(initialScan?.name || '')
  const [qty, setQty] = useState('1')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    setScan(initialScan)
    setProductName(initialScan?.name || '')
  }, [initialScan])

  useEffect(() => {
    const ensureProduct = async () => {
      if (!scan?.sku) return
      try {
        const existing = await getProductBySku(scan.sku)
        setScan((prev) => prev ? ({ ...prev, productExists: true, name: existing.name }) : prev)
        setProductName(existing.name || '')
      } catch (error) {
        if (error.status !== 404) return
        const created = await createProduct({
          sku: scan.sku,
          name: scan.name || `Product ${scan.sku}`,
          category: null
        })
        setScan((prev) => prev ? ({ ...prev, productExists: false, name: created.name }) : prev)
        setProductName(created.name || '')
      }
    }
    ensureProduct()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan?.sku])

  useEffect(() => {
    setTimeout(() => qtyRef.current?.focus(), 50)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!scan?.sku) return

    const parsedQty = parseInt(qty, 10)
    if (Number.isNaN(parsedQty) || parsedQty < 1) {
      setToast({ message: 'จำนวนต้องมากกว่า 0', type: 'error' })
      return
    }

    try {
      setLoading(true)
      const result = await receiveStock(scan.sku, parsedQty, {
        source: 'QR_SCAN',
        scanPayload: scan.payload || null
      })
      setToast({
        message: `${scan.productExists ? 'รับเข้า' : 'สร้างสินค้าและรับเข้า'} ${parsedQty} ชิ้น: ${result.product.name} (คงเหลือ ${result.product.current_stock})`,
        type: 'success'
      })

      setTimeout(() => {
        navigate('/inventory', { replace: true })
      }, 600)
    } catch {
      setToast({ message: 'บันทึกรายการรับเข้าไม่สำเร็จ', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (!scan?.sku) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div className="card border-yellow-300 bg-yellow-50">
          <h2 className="text-xl font-bold text-gray-900">รับสินค้าเข้าคลัง (QR)</h2>
          <p className="text-gray-700 mt-2">ไม่พบข้อมูลการสแกน กรุณากลับไปที่หน้าคลังสินค้าแล้วสแกนใหม่</p>
          <div className="mt-4">
            <button onClick={() => navigate('/inventory')} className="btn-primary">
              กลับหน้าคลังสินค้า
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h2 className="text-2xl font-bold text-gray-900">รับสินค้าเข้าคลัง (QR)</h2>
        <p className="text-gray-500 mt-1">กรอกจำนวนสินค้าแล้วบันทึก</p>
      </div>

      <div className="card border-green-300 bg-green-50">
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            SKU: <span className="font-mono">{scan.sku}</span>
          </p>
          <p className="text-sm text-gray-600">
            ชื่อ: <span className="font-medium">{productName || scan.name || '-'}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนที่รับเข้า</label>
            <input
              ref={qtyRef}
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="input-field text-center text-2xl font-bold"
              required
            />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-success flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
              บันทึกรับเข้า
            </button>
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="btn-primary bg-gray-500 hover:bg-gray-600"
              disabled={loading}
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default QrReceive

