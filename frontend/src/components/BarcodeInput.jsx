import { useRef, useEffect } from 'react'

/**
 * BarcodeInput Component
 * 
 * Barcode scanners act like a keyboard:
 * - They type characters rapidly
 * - Usually end with Enter/Return key
 * - This component handles that behavior
 */
function BarcodeInput({ 
  value, 
  onChange, 
  onSubmit, 
  placeholder = "Scan barcode...",
  autoFocus = true,
  disabled = false,
  label = "Barcode"
}) {
  const inputRef = useRef(null)
  const lastKeyTime = useRef(0)
  const accumulatedValue = useRef('')

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // Handle rapid key input (barcode scanner behavior)
  const handleKeyDown = (e) => {
    const now = Date.now()
    const timeDiff = now - lastKeyTime.current
    
    // If more than 50ms between keys, it's likely manual typing, not scanner
    // Reset accumulated value
    if (timeDiff > 50 && accumulatedValue.current.length > 0 && e.key !== 'Enter') {
      accumulatedValue.current = ''
    }
    
    lastKeyTime.current = now

    // If Enter is pressed quickly after input, it's likely a scanner
    if (e.key === 'Enter') {
      // Prevent form submission if it's a scanner Enter
      if (timeDiff < 50 || accumulatedValue.current.length > 0) {
        e.preventDefault()
        const scannedValue = value || accumulatedValue.current
        if (scannedValue.trim()) {
          onSubmit?.(scannedValue.trim())
          accumulatedValue.current = ''
        }
      }
    }
  }

  const handleChange = (e) => {
    accumulatedValue.current = e.target.value
    onChange?.(e.target.value)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="input-field barcode-input text-lg font-mono"
          autoComplete="off"
          spellCheck="false"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
          🔍
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Tip: Focus this field and scan with barcode scanner
      </p>
    </div>
  )
}

export default BarcodeInput
