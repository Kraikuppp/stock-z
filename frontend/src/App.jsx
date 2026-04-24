import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Receive from './pages/Receive'
import Sell from './pages/Sell'
import Products from './pages/Products'
import Movements from './pages/Movements'
import BarcodeGenerator from './pages/BarcodeGenerator'
import Inventory from './pages/Inventory'
import QrReceive from './pages/QrReceive'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/receive" element={<Receive />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/products" element={<Products />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/qr-receive" element={<QrReceive />} />
        <Route path="/movements" element={<Movements />} />
        <Route path="/barcodes" element={<BarcodeGenerator />} />
      </Routes>
    </Layout>
  )
}

export default App
