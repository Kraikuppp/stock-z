import { supabase } from './supabase'

// Product Types API
export async function getProductTypes() {
  const { data, error } = await supabase
    .from('product_types')
    .select('*')
    .order('is_default', { ascending: false })
    .order('label', { ascending: true })

  if (error) throw error

  return (data || []).map(item => ({
    key: item.type_key,
    label: item.label,
    icon: item.icon || '📦',
    isDefault: item.is_default,
    fields: item.fields || []
  }))
}

export async function createProductType(payload) {
  const { data, error } = await supabase
    .from('product_types')
    .insert({
      type_key: payload.key,
      label: payload.label,
      icon: payload.icon || '📦',
      fields: payload.fields || [],
      is_default: false
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      const conflict = new Error('Product type already exists')
      conflict.status = 409
      throw conflict
    }
    if (error.code === '42501' || error.status === 401 || error.status === 403) {
      const unauthorized = new Error('Not authorized to insert product types')
      unauthorized.status = 401
      throw unauthorized
    }
    throw error
  }

  return {
    key: data.type_key,
    label: data.label,
    icon: data.icon || '📦',
    isDefault: data.is_default,
    fields: data.fields || []
  }
}

export async function deleteProductType(key) {
  const { error } = await supabase
    .from('product_types')
    .delete()
    .eq('type_key', key)
    .eq('is_default', false)

  if (error) {
    if (error.code === '42501' || error.status === 401 || error.status === 403) {
      const unauthorized = new Error('Not authorized to delete product types')
      unauthorized.status = 401
      throw unauthorized
    }
    throw error
  }
}

// Products API
export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      sku,
      name,
      category,
      created_at,
      stock_movements(type, quantity)
    `)
    .order('sku')

  if (error) throw error

  return data.map(p => {
    const movements = p.stock_movements || []
    const stockIn = movements.filter(m => m.type === 'IN').reduce((sum, m) => sum + m.quantity, 0)
    const stockOut = movements.filter(m => m.type === 'OUT').reduce((sum, m) => sum + m.quantity, 0)
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      current_stock: stockIn - stockOut,
      created_at: p.created_at
    }
  })
}

export async function getProductBySku(sku) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      sku,
      name,
      category,
      created_at,
      stock_movements(type, quantity)
    `)
    .eq('sku', sku)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      const notFound = new Error('Product not found')
      notFound.status = 404
      throw notFound
    }
    throw error
  }

  const movements = data.stock_movements || []
  const stockIn = movements.filter(m => m.type === 'IN').reduce((sum, m) => sum + m.quantity, 0)
  const stockOut = movements.filter(m => m.type === 'OUT').reduce((sum, m) => sum + m.quantity, 0)

  return {
    id: data.id,
    sku: data.sku,
    name: data.name,
    category: data.category,
    current_stock: stockIn - stockOut,
    created_at: data.created_at
  }
}

export async function createProduct(productData) {
  const { data, error } = await supabase
    .from('products')
    .insert({
      sku: productData.sku,
      name: productData.name,
      category: productData.category || null
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      const conflict = new Error('SKU already exists')
      conflict.status = 409
      throw conflict
    }
    throw error
  }

  // Auto-create initial stock IN movement if quantity provided
  const initialQty = parseInt(productData.initial_quantity) || 0
  if (initialQty > 0) {
    const { error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        product_id: data.id,
        type: 'IN',
        quantity: initialQty
      })
    if (movementError) throw movementError
  }

  return { ...data, current_stock: initialQty }
}

export async function deleteProduct(id) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Stock API
export async function getStock() {
  return getProducts()
}

export async function getStockMovements() {
  const { data, error } = await supabase
    .from('stock_movements')
    .select(`
      id,
      type,
      quantity,
      created_at,
      product_id,
      products(sku, name)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error

  return data.map(m => ({
    id: m.id,
    product_id: m.product_id,
    type: m.type,
    quantity: m.quantity,
    created_at: m.created_at,
    sku: m.products?.sku,
    name: m.products?.name
  }))
}

export async function receiveStock(sku, quantity, options = {}) {
  const product = await getProductBySku(sku)
  const source = options.source || 'MANUAL'
  const scanPayload = options.scanPayload || null

  const { data: movement, error } = await supabase
    .from('stock_movements')
    .insert({
      product_id: product.id,
      type: 'IN',
      quantity: quantity,
      source,
      scan_payload: scanPayload
    })
    .select()
    .single()

  if (error) throw error

  const updatedProduct = await getProductBySku(sku)

  return {
    movement,
    product: updatedProduct
  }
}

export async function sellStock(sku, quantity = 1) {
  const product = await getProductBySku(sku)

  if (product.current_stock < quantity) {
    const err = new Error('Insufficient stock')
    err.status = 400
    err.currentStock = product.current_stock
    err.requested = quantity
    throw err
  }

  const { data: movement, error } = await supabase
    .from('stock_movements')
    .insert({
      product_id: product.id,
      type: 'OUT',
      quantity: quantity
    })
    .select()
    .single()

  if (error) throw error

  const updatedProduct = await getProductBySku(sku)

  return {
    movement,
    product: {
      sku: updatedProduct.sku,
      name: updatedProduct.name,
      previous_stock: product.current_stock,
      current_stock: updatedProduct.current_stock
    }
  }
}

// Generated Codes API
export async function getGeneratedCodes() {
  const { data, error } = await supabase
    .from('generated_codes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error

  return (data || []).map(item => ({
    id: item.id,
    productType: item.product_type,
    sku: item.sku,
    name: item.name,
    category: item.category,
    extraFields: item.extra_fields || {},
    codeType: item.code_type,
    qrValue: item.qr_value,
    barcodeValue: item.barcode_value,
    labelText: item.label_text,
    createdAt: item.created_at
  }))
}

export async function saveGeneratedCode(payload) {
  const { data, error } = await supabase
    .from('generated_codes')
    .insert({
      product_type: payload.productType,
      sku: payload.sku,
      name: payload.name,
      category: payload.category || null,
      extra_fields: payload.extraFields || {},
      code_type: payload.codeType,
      qr_value: payload.qrValue,
      barcode_value: payload.barcodeValue,
      label_text: payload.labelText || null
    })
    .select()
    .single()

  if (error) throw error

  return {
    id: data.id,
    productType: data.product_type,
    sku: data.sku,
    name: data.name,
    category: data.category,
    extraFields: data.extra_fields || {},
    codeType: data.code_type,
    qrValue: data.qr_value,
    barcodeValue: data.barcode_value,
    labelText: data.label_text,
    createdAt: data.created_at
  }
}

export async function deleteGeneratedCode(id) {
  const { error } = await supabase
    .from('generated_codes')
    .delete()
    .eq('id', id)

  if (error) throw error
}
