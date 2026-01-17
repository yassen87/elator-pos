import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import Login from './components/Login'
import AdminDashboard from './components/AdminDashboard'
import CashierPanel from './components/CashierPanel'
import DeveloperDashboard from './components/DeveloperDashboard'

function App() {
  const [user, setUser] = useState(null)
  const [toast, setToast] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const askConfirm = (title, message, onConfirm) => {
    setConfirmModal({ title, message, onConfirm })
  }

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-noto overflow-hidden relative" dir="rtl">
      {user.role === 'super_admin' ? (
        <DeveloperDashboard
          user={user}
          onLogout={handleLogout}
          notify={showToast}
          ask={askConfirm}
        />
      ) : user.role === 'admin' ? (
        <AdminDashboard
          user={user}
          onLogout={handleLogout}
          notify={showToast}
          ask={askConfirm}
        />
      ) : (
        <CashierPanel
          user={user}
          onLogout={handleLogout}
          notify={showToast}
          ask={askConfirm}
        />
      )}

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' :
              toast.type === 'success' ? 'bg-green-50 border-green-100 text-green-600' :
                'bg-white border-slate-200 text-slate-600'
              }`}
          >
            {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
              toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
                <Info className="w-5 h-5 text-brand-primary" />}
            <span className="font-bold text-sm">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:bg-black/5 p-1 rounded-lg">
              <X className="w-4 h-4 opacity-40" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setConfirmModal(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 shadow-2xl w-full max-w-md relative z-10 border border-slate-100"
            >
              <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8 text-brand-primary" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">{confirmModal.title}</h3>
              <p className="text-slate-500 font-bold mb-8 leading-relaxed whitespace-pre-line">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="flex-1 bg-brand-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-brand-primary/20 hover:bg-brand-primary/90 transition-all active:scale-95"
                >
                  تأكيد العملية
                </button>
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                >
                  تراجع
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
