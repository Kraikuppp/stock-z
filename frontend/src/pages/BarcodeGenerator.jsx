import { useState, useRef, useEffect } from 'react'
import JsBarcode from 'jsbarcode'
import { QRCodeSVG } from 'qrcode.react'
import Toast from '../components/Toast'
import {
  createProductType,
  deleteGeneratedCode,
  deleteProductType,
  getGeneratedCodes,
  getProductTypes,
  saveGeneratedCode
} from '../services/api'

const STORAGE_KEY = 'stockz_code_presets'
const COMMON_FIELDS = [
  { key: 'size', label: 'ไซส์ (Size)', placeholder: 'S, M, L, XL, XXL' },
  { key: 'color', label: 'สี (Color)', placeholder: 'เช่น ดำ, ขาว, น้ำเงิน' },
  { key: 'dimension', label: 'ขนาด (Dimension)', placeholder: 'เช่น 30x20 cm' }
]

function withCommonFields(fields = []) {
  const byKey = new Map()
  COMMON_FIELDS.forEach((f) => byKey.set(f.key, f))
  fields.forEach((f) => {
    if (f?.key) byKey.set(f.key, { ...byKey.get(f.key), ...f })
  })
  return Array.from(byKey.values())
}

function loadPresets() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch { return [] }
}

function savePresets(presets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

function BarcodeGenerator() {
  const [productTypes, setProductTypes] = useState({})
  const [productType, setProductType] = useState('')
  const [newTypeName, setNewTypeName] = useState('')
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [codeType, setCodeType] = useState('qrcode')
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [extraFields, setExtraFields] = useState({})
  const [presets, setPresets] = useState(loadPresets)
  const [generatedItems, setGeneratedItems] = useState([])
  const [loadingGenerated, setLoadingGenerated] = useState(true)
  const [savingCode, setSavingCode] = useState(false)
  const [toast, setToast] = useState(null)
  const printRef = useRef(null)

  // Reset extra fields when product type changes
  useEffect(() => {
    setExtraFields({})
  }, [productType])

  useEffect(() => {
    fetchProductTypes()
    fetchGeneratedCodes()
  }, [])

  const fetchProductTypes = async () => {
    try {
      setLoadingTypes(true)
      const rows = await getProductTypes()
      const asMap = rows.reduce((acc, item) => {
        acc[item.key] = {
          label: item.label,
          icon: item.icon || '📦',
          fields: withCommonFields(item.fields || []),
          isDefault: item.isDefault
        }
        return acc
      }, {})
      setProductTypes(asMap)
      if (!productType || !asMap[productType]) {
        setProductType(rows[0]?.key || '')
      }
    } catch (error) {
      if (error.status === 401) {
        setToast({ message: 'ไม่มีสิทธิ์เข้าถึงตาราง product_types กรุณารัน schema/policy ใน Supabase ก่อน', type: 'error' })
      } else {
        setToast({ message: 'โหลดประเภทสินค้าไม่สำเร็จ', type: 'error' })
      }
    } finally {
      setLoadingTypes(false)
    }
  }

  const handleAddProductType = async () => {
    const raw = newTypeName.trim()
    if (!raw) {
      setToast({ message: 'กรุณากรอกชื่อประเภทสินค้า', type: 'error' })
      return
    }

    const key = raw.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '_').replace(/^_+|_+$/g, '')
    if (!key) {
      setToast({ message: 'ชื่อประเภทสินค้าไม่ถูกต้อง', type: 'error' })
      return
    }

    if (productTypes[key]) {
      setProductType(key)
      setNewTypeName('')
      setToast({ message: 'มีประเภทนี้อยู่แล้ว เลือกให้แล้ว', type: 'warning' })
      return
    }

    try {
      const created = await createProductType({
        key,
        label: raw,
        icon: '📦',
        fields: withCommonFields([
          { key: 'spec', label: 'รายละเอียด (Spec)', placeholder: 'ระบุรายละเอียดเพิ่มเติม' }
        ])
      })
      setProductTypes(prev => ({
        ...prev,
        [created.key]: {
          label: created.label,
          icon: created.icon,
          fields: created.fields,
          isDefault: created.isDefault
        }
      }))
      setProductType(created.key)
      setNewTypeName('')
      setToast({ message: `เพิ่มประเภทสินค้า "${raw}" สำเร็จ`, type: 'success' })
    } catch (error) {
      if (error.status === 409) {
        setToast({ message: 'ชื่อประเภทสินค้านี้มีอยู่แล้วในฐานข้อมูล', type: 'warning' })
      } else if (error.status === 401) {
        setToast({ message: 'ไม่มีสิทธิ์เพิ่มประเภทสินค้า (product_types). ให้รัน schema/policy ใน Supabase', type: 'error' })
      } else {
        setToast({ message: 'เพิ่มประเภทสินค้าไม่สำเร็จ', type: 'error' })
      }
    }
  }

  const handleDeleteProductType = async (key) => {
    if (productTypes[key]?.isDefault) {
      setToast({ message: 'ไม่สามารถลบประเภทพื้นฐานของระบบได้', type: 'warning' })
      return
    }

    try {
      await deleteProductType(key)
      const next = { ...productTypes }
      delete next[key]
      setProductTypes(next)

      if (productType === key) {
        const fallback = Object.keys(next)[0] || ''
        setProductType(fallback)
        setExtraFields({})
      }

      setToast({ message: 'ลบประเภทสินค้าที่เพิ่มเองแล้ว', type: 'success' })
    } catch (error) {
      if (error.status === 401) {
        setToast({ message: 'ไม่มีสิทธิ์ลบประเภทสินค้า (product_types). ให้รัน schema/policy ใน Supabase', type: 'error' })
      } else {
        setToast({ message: 'ลบประเภทสินค้าไม่สำเร็จ', type: 'error' })
      }
    }
  }

  const fetchGeneratedCodes = async () => {
    try {
      setLoadingGenerated(true)
      const data = await getGeneratedCodes()
      setGeneratedItems(data)
    } catch {
      setToast({ message: 'โหลดประวัติ Code จากฐานข้อมูลไม่สำเร็จ', type: 'error' })
    } finally {
      setLoadingGenerated(false)
    }
  }

  // Build the data payload for QR code
  const buildPayload = () => {
    const data = { type: productType, sku, name }
    const fields = productTypes[productType]?.fields || []
    fields.forEach(f => {
      if (extraFields[f.key]) data[f.key] = extraFields[f.key]
    })
    return data
  }

  // Build display label text
  const buildLabelText = () => {
    const parts = [name || sku]
    const fields = productTypes[productType]?.fields || []
    fields.forEach(f => {
      if (extraFields[f.key]) parts.push(`${f.label.split('(')[0].trim()}:${extraFields[f.key]}`)
    })
    return parts.join(' | ')
  }

  // Generate code
  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!sku) {
      setToast({ message: 'กรุณากรอก SKU', type: 'error' })
      return
    }

    const labelText = buildLabelText()
    // QR should open the web receive page directly.
    const publicBaseUrl = (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, '')
    const qrLinkForSku = (targetSku) =>
      `${publicBaseUrl}/qr-receive?sku=${encodeURIComponent(String(targetSku || '').trim())}`
    const qrValue = qrLinkForSku(sku)

    const itemPayload = {
      productType,
      sku,
      name: name || sku,
      extraFields: { ...extraFields },
      codeType,
      qrValue,
      barcodeValue: sku,
      labelText,
    }

    try {
      setSavingCode(true)
      const saved = await saveGeneratedCode(itemPayload)
      setGeneratedItems(prev => [saved, ...prev])
      setToast({ message: `สร้างและบันทึก ${codeType === 'barcode' ? 'Barcode' : codeType === 'qrcode' ? 'QR Code' : 'Barcode + QR Code'} ลงฐานข้อมูลสำเร็จ`, type: 'success' })
    } catch {
      setToast({ message: 'สร้าง Code สำเร็จแต่บันทึกลงฐานข้อมูลไม่สำเร็จ', type: 'error' })
    } finally {
      setSavingCode(false)
    }
  }

  // Save current form as preset
  const handleSavePreset = () => {
    if (!sku && !name) {
      setToast({ message: 'กรุณากรอก SKU หรือชื่อสินค้า', type: 'error' })
      return
    }
    const preset = {
      id: Date.now(),
      productType,
      sku,
      name,
      extraFields: { ...extraFields },
      label: `${productTypes[productType]?.icon || '📦'} ${name || sku} ${Object.values(extraFields).filter(Boolean).join('/')}`
    }
    const updated = [preset, ...presets.filter(p => p.sku !== sku || p.productType !== productType)]
    setPresets(updated)
    savePresets(updated)
    setToast({ message: 'บันทึก Preset สำเร็จ!', type: 'success' })
  }

  // Load preset into form
  const handleLoadPreset = (preset) => {
    setProductType(preset.productType)
    setSku(preset.sku)
    setName(preset.name)
    setExtraFields(preset.extraFields || {})
    setToast({ message: `โหลด Preset: ${preset.label}`, type: 'success' })
  }

  // Delete preset
  const handleDeletePreset = (id) => {
    const updated = presets.filter(p => p.id !== id)
    setPresets(updated)
    savePresets(updated)
  }

  // Remove generated item
  const handleRemoveItem = async (id) => {
    try {
      await deleteGeneratedCode(id)
      setGeneratedItems(prev => prev.filter(i => i.id !== id))
      setToast({ message: 'ลบรายการ Code ออกจากฐานข้อมูลแล้ว', type: 'success' })
    } catch {
      setToast({ message: 'ลบรายการไม่สำเร็จ', type: 'error' })
    }
  }

  // Print all generated items
  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Code Labels</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: sans-serif; display: flex; flex-wrap: wrap; gap: 8px; padding: 8px; }
          .label {
            border: 1px dashed #ccc;
            padding: 10px;
            text-align: center;
            page-break-inside: avoid;
            width: 240px;
          }
          .label svg { display: block; margin: 0 auto; }
          .label .lbl-name { font-size: 12px; font-weight: bold; margin-bottom: 2px; }
          .label .lbl-detail { font-size: 9px; color: #555; margin-bottom: 1px; }
          .label .lbl-qty { font-size: 10px; font-weight: bold; color: #1a7f37; }
          @media print { body { padding: 0; gap: 0; } .label { border: none; padding: 4px; } }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 300)
  }

  // Clear form
  const handleClear = () => {
    setSku('')
    setName('')
    setExtraFields({})
  }

  const currentTypeConfig = productTypes[productType] || { label: 'ทั่วไป', icon: '📦', fields: COMMON_FIELDS }
  const publicBaseUrl = (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, '')
  const qrLinkForSku = (targetSku) =>
    `${publicBaseUrl}/qr-receive?sku=${encodeURIComponent(String(targetSku || '').trim())}`

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Code Generator</h2>
        <p className="text-gray-500 mt-1">สร้าง Barcode / QR Code สำหรับสินค้าโดยไม่กำหนดจำนวน (ไปกรอกจำนวนตอนสแกนที่หน้าคลังสินค้า)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Form */}
        <div className="space-y-4">
          {/* Product Type */}
          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทสินค้า</label>
            <div className="flex gap-2">
              {Object.entries(productTypes).map(([key, cfg]) => {
                const isDefaultType = Boolean(cfg.isDefault)
                return (
                  <div key={key} className="flex-1 min-w-0">
                    <button
                      onClick={() => setProductType(key)}
                      className={`w-full px-2 py-2 rounded-lg text-sm font-medium transition-colors border ${
                        productType === key
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="block text-lg mb-0.5">{cfg.icon}</span>
                      <span className="block text-xs truncate">{cfg.label.split('(')[0].trim()}</span>
                    </button>
                    {!isDefaultType && (
                      <button
                        type="button"
                        onClick={() => handleDeleteProductType(key)}
                        className="mt-1 w-full text-xs text-red-600 hover:text-red-700"
                      >
                        ลบประเภทนี้
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            {loadingTypes && <p className="text-xs text-gray-500 mt-2">กำลังโหลดประเภทสินค้า...</p>}
            {!loadingTypes && Object.keys(productTypes).length === 0 && (
              <p className="text-xs text-red-500 mt-2">ยังไม่มีประเภทสินค้าในฐานข้อมูล กรุณาเพิ่มอย่างน้อย 1 ประเภท</p>
            )}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                className="input-field"
                placeholder="เพิ่มประเภทสินค้าใหม่"
              />
              <button type="button" onClick={handleAddProductType} className="btn-primary whitespace-nowrap">
                + เพิ่ม
              </button>
            </div>
          </div>

          {/* Product Info Form */}
          <form onSubmit={handleGenerate} className="card space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">{currentTypeConfig.icon} ข้อมูลสินค้า</h3>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SKU / บาร์โค้ด *</label>
              <input type="text" value={sku} onChange={e => setSku(e.target.value)} className="input-field" placeholder="เช่น 801" required />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อสินค้า</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="เช่น เสื้อโปโล" />
            </div>

            {/* Dynamic fields based on product type */}
            {currentTypeConfig.fields.map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input
                  type="text"
                  value={extraFields[f.key] || ''}
                  onChange={e => setExtraFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="input-field"
                  placeholder={f.placeholder}
                />
              </div>
            ))}

            {/* Code Type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">ประเภท Code</label>
              <div className="flex gap-2">
                {[
                  { key: 'barcode', label: 'Barcode' },
                  { key: 'qrcode', label: 'QR Code' },
                  { key: 'both', label: 'ทั้งคู่' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setCodeType(opt.key)}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      codeType === opt.key
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={savingCode} className="btn-success flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
                สร้าง Code
              </button>
              <button type="button" onClick={handleSavePreset} className="btn-primary bg-yellow-500 hover:bg-yellow-600 flex-1">
                บันทึก Preset
              </button>
            </div>
            <button type="button" onClick={handleClear} className="text-sm text-gray-500 hover:text-gray-700 w-full text-center">
              ล้างฟอร์ม
            </button>
          </form>

          {/* Saved Presets */}
          {presets.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Presets ที่บันทึกไว้</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {presets.map(p => (
                  <div key={p.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <button onClick={() => handleLoadPreset(p)} className="flex-1 text-left text-sm hover:bg-gray-100 rounded px-2 py-1 transition-colors">
                      <span className="font-medium">{p.label}</span>
                    </button>
                    <button onClick={() => handleDeletePreset(p.id)} className="text-red-400 hover:text-red-600 text-xs px-1">
                      ลบ
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Generated Codes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Code ที่สร้างแล้ว ({generatedItems.length})
              </h3>
              {generatedItems.length > 0 && (
                <button onClick={handlePrint} className="btn-primary text-sm">
                  Print All
                </button>
              )}
            </div>

            {loadingGenerated ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg">กำลังโหลดข้อมูลจากฐานข้อมูล...</p>
              </div>
            ) : generatedItems.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg">ยังไม่มี Code ที่สร้าง</p>
                <p className="text-sm mt-1">กรอกข้อมูลสินค้าแล้วกด "สร้าง Code"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedItems.map(item => (
                  <div key={item.id} className="border-2 border-gray-200 rounded-lg p-4 bg-white relative">
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-lg leading-none"
                    >
                      &times;
                    </button>

                    {/* Header */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{productTypes[item.productType]?.icon || '📦'}</span>
                        <span className="font-semibold text-gray-900">{item.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        SKU: {item.sku}
                        {item.createdAt && ` | ${new Date(item.createdAt).toLocaleString('th-TH')}`}
                      </div>
                      {/* Extra fields detail */}
                      <div className="text-xs text-gray-400 mt-1">
                        {(productTypes[item.productType]?.fields || []).map(f => 
                          item.extraFields[f.key] ? `${f.label.split('(')[0].trim()}: ${item.extraFields[f.key]}` : null
                        ).filter(Boolean).join(' | ')}
                      </div>
                    </div>

                    {/* Code Display */}
                    <div className="flex justify-center gap-4">
                      {(item.codeType === 'barcode' || item.codeType === 'both') && (
                        <div className="text-center">
                          <div className="text-[10px] text-gray-400 mb-1">BARCODE</div>
                          <InlineBarcode value={item.barcodeValue} />
                        </div>
                      )}
                      {(item.codeType === 'qrcode' || item.codeType === 'both') && (
                        <div className="text-center">
                          <div className="text-[10px] text-gray-400 mb-1">QR CODE</div>
                          <QRCodeSVG value={qrLinkForSku(item.sku)} size={item.codeType === 'both' ? 100 : 140} />
                          <div className="text-[10px] text-gray-400 mt-1 font-mono max-w-[140px] break-all">{item.sku}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden print container */}
            <div ref={printRef} className="hidden">
              {generatedItems.map(item => (
                <div key={item.id} className="label">
                  <div className="lbl-name">{item.name}</div>
                  {(productTypes[item.productType]?.fields || []).map(f => 
                    item.extraFields[f.key] ? <div key={f.key} className="lbl-detail">{f.label.split('(')[0].trim()}: {item.extraFields[f.key]}</div> : null
                  )}
                  {(item.codeType === 'barcode' || item.codeType === 'both') && <InlineBarcode value={item.barcodeValue} />}
                  {(item.codeType === 'qrcode' || item.codeType === 'both') && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                      <QRCodeSVG value={qrLinkForSku(item.sku)} size={80} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InlineBarcode({ value }) {
  if (!value) return null
  return (
    <svg
      ref={(el) => {
        if (el && value) {
          try {
            JsBarcode(el, value, {
              format: 'CODE128',
              width: 1.5,
              height: 50,
              displayValue: true,
              fontSize: 12,
              margin: 5,
              background: '#ffffff',
              lineColor: '#000000'
            })
          } catch (err) {
            console.error('Barcode error:', err)
          }
        }
      }}
    />
  )
}

export default BarcodeGenerator
