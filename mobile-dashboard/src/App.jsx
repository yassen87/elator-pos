import React, { useState, useEffect } from 'react'
import {
  TrendingUp, Users, Package, AlertCircle,
  LogOut, ShoppingCart, Calendar, ChevronRight,
  BarChart3, Settings
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@supabase/supabase-js'

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [syncData, setSyncData] = useState({ sales: [], products: [], totalSales: 0 })
  const [activeTab, setActiveTab] = useState('dashboard')

  // Cloud Config
  const [cloudSettings, setCloudSettings] = useState({
    url: localStorage.getItem('supabase_url') || '',
    key: localStorage.getItem('supabase_key') || ''
  })

  useEffect(() => {
    if (cloudSettings.url && cloudSettings.key) {
      fetchData()
    }
  }, [cloudSettings])

  const fetchData = async () => {
    if (!cloudSettings.url || !cloudSettings.key) return

    setLoading(true)
    const supabase = createClient(cloudSettings.url, cloudSettings.key)

    try {
      // Get Today's Sales
      const today = new Date().toISOString().split('T')[0]
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', today)

      // Get Low Stock Products
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('*')
        .lte('stock_quantity', 10) // threshold

      const totalToday = sales?.reduce((acc, s) => acc + s.total, 0) || 0

      setSyncData({
        sales: sales || [],
        products: products || [],
        totalSales: totalToday
      })
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={(u) => setIsLoggedIn(true)} />
  }

  return (
    <div className="min-h-screen bg-slate-50 font-noto pb-24" dir="rtl">
      {/* Header */}
      <div className="bg-white px-6 py-6 shadow-sm border-b border-slate-100 sticky top-0 z-50">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-slate-800">مرحباً يا {user?.name || 'مدير'} 👋</h1>
            <p className="text-xs text-slate-400 font-bold">إليك ملخص المحل اليوم</p>
          </div>
          <button className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Main Stats Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl" />
          <div className="relative z-10">
            <span className="text-blue-100 font-bold text-sm">مبيعات اليوم</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h2 className="text-4xl font-black">{syncData.totalSales.toLocaleString()}</h2>
              <span className="text-lg font-bold">ج.م</span>
            </div>
            <div className="mt-6 flex items-center gap-2 bg-white/20 w-max px-3 py-1 rounded-full backdrop-blur-md">
              <TrendingUp className="w-4 h-4 text-green-300" />
              <span className="text-xs font-bold">+{syncData.sales.length} فاتورة جديدة</span>
            </div>
          </div>
        </motion.div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatMiniCard
            icon={<Package className="text-orange-500" />}
            label="نواقص المخزون"
            value={syncData.products.length}
            color="bg-orange-50"
          />
          <StatMiniCard
            icon={<Users className="text-purple-500" />}
            label="العملاء الجدد"
            value="12"
            color="bg-purple-50"
          />
        </div>

        {/* Recent Transactions List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-slate-800 text-lg">آخر العمليات</h3>
            <button className="text-blue-600 font-bold text-sm">عرض الكل</button>
          </div>

          <div className="space-y-3">
            {syncData.sales.slice(0, 5).map((sale, i) => (
              <motion.div
                key={sale.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-slate-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black text-slate-800">فاتورة #{sale.invoice_code}</p>
                    <p className="text-xs text-slate-400 font-bold">{new Date(sale.created_at).toLocaleTimeString('ar-EG')}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-black text-slate-800">+{sale.total} ج.م</p>
                  <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">مكتمل</span>
                </div>
              </motion.div>
            ))}

            {syncData.sales.length === 0 && (
              <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <BarChart3 className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 font-bold">لا يوجد مبيعات بعد لهذا اليوم</p>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Section */}
        {syncData.products.length > 0 && (
          <div className="bg-red-50 rounded-3xl p-6 border border-red-100">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h3 className="font-black text-red-800">تنبيهات النواقص</h3>
            </div>
            <div className="space-y-3">
              {syncData.products.slice(0, 3).map(p => (
                <div key={p.id} className="flex justify-between items-center">
                  <span className="font-bold text-red-700">{p.name}</span>
                  <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded-lg font-black">{p.stock_quantity} متبقي</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-6 py-4 flex justify-around items-center z-50">
        <NavButton icon={<BarChart3 />} label="الرئيسية" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <NavButton icon={<ShoppingCart />} label="المبيعات" active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} />
        <NavButton icon={<Package />} label="المخزون" active={activeTab === 'stock'} onClick={() => setActiveTab('stock')} />
        <NavButton icon={<Settings />} label="إعدادات" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </div>
    </div>
  )
}

function StatMiniCard({ icon, label, value, color }) {
  return (
    <div className={`${color} p-5 rounded-3xl border border-white shadow-sm`}>
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-3 shadow-sm">
        {icon}
      </div>
      <p className="text-xs text-slate-500 font-bold mb-1">{label}</p>
      <p className="text-xl font-black text-slate-800">{value}</p>
    </div>
  )
}

function NavButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-blue-600' : 'text-slate-400'}`}
    >
      <div className={`p-2 rounded-xl ${active ? 'bg-blue-50' : ''}`}>
        {React.cloneElement(icon, { className: 'w-6 h-6' })}
      </div>
      <span className="text-[10px] font-black">{label}</span>
    </button>
  )
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [url, setUrl] = useState(localStorage.getItem('supabase_url') || '')
  const [key, setKey] = useState(localStorage.getItem('supabase_key') || '')
  const [showConfig, setShowConfig] = useState(!localStorage.getItem('supabase_url'))

  const handleLogin = () => {
    if (url && key) {
      localStorage.setItem('supabase_url', url)
      localStorage.setItem('supabase_key', key)
      onLogin({ name: username })
    } else {
      alert('يرجى إكمال إعدادات السحاب أولاً')
      setShowConfig(true)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 font-noto" dir="rtl">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-6 rotate-12">
            <ShoppingBag className="w-10 h-10 text-white -rotate-12" />
          </div>
          <h1 className="text-3xl font-black text-slate-800">العارين للعطور</h1>
          <p className="text-slate-400 font-bold mt-2">لوحة متابعة المدير</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 mr-2">اسم المستخدم</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/10 font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 mr-2">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/10 font-bold"
              />
            </div>
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95 text-lg"
          >
            تسجيل الدخول
          </button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="w-full text-slate-400 font-bold text-sm"
          >
            {showConfig ? 'إخفاء إعدادات السحاب' : 'ضبط إعدادات السحاب'}
          </button>

          {showConfig && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="space-y-4 pt-4 border-t border-slate-100"
            >
              <div className="space-y-2">
                <label className="text-xs font-black text-blue-500 mr-2">Supabase URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-3 text-xs font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-blue-500 mr-2">Anon Key</label>
                <input
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-3 text-xs font-mono"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

function ShoppingBag(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24" height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}
