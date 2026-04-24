import { useRef, useEffect } from 'react'
import JsBarcode from 'jsbarcode'

function BarcodeDisplay({ value, width = 2, height = 80, fontSize = 16, className = '' }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue: true,
          fontSize,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000'
        })
      } catch (err) {
        console.error('Barcode render error:', err)
      }
    }
  }, [value, width, height, fontSize])

  if (!value) return null

  return (
    <div className={`flex justify-center ${className}`}>
      <svg ref={svgRef} />
    </div>
  )
}

export default BarcodeDisplay
