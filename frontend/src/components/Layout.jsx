import { NavLink } from 'react-router-dom'

const menuItems = [
  { path: '/inventory', label: 'คลังสินค้า', icon: '🏬' },
  { path: '/barcodes', label: 'Barcode Generator', icon: '🏷️' },
]

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Stock-Z
          </h1>
          <p className="text-xs text-gray-500 mt-1">Inventory Management</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">
            Stock-Z v1.0
          </p>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout
