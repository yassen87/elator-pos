import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, X, MessageCircle } from 'lucide-react'
import Login from './components/Login'
import AdminDashboard from './components/AdminDashboard'
import CashierPanel from './components/CashierPanel'
import DeveloperDashboard from './components/DeveloperDashboard'
import SuperDashboard from './components/SuperDashboard'

function App() {
  const [user, setUser] = useState(null)
  const [toast, setToast] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const [isLocked, setIsLocked] = useState(false)
  const [lockMessage, setLockMessage] = useState('')

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const handleRemoteCommand = (_, data) => {
      console.log('[RemoteCommand] Received:', data)
      if (data.type === 'DISABLE_APP') {
        setIsLocked(true)
        setLockMessage('🚨 تم إيقاف هذه النسخة من قبل الإدارة.\n\nيرجى التواصل مع الدعم الفني: 01141058632')
      } else if (data.type === 'ENABLE_APP') {
        setIsLocked(false)
      } else {
        showToast(data.message || 'تم استقبال أمر عن بعد من ElatorHub', data.type === 'BACKUP' ? 'success' : 'info')
      }
    }

    if (window.api && window.api.on) {
      window.api.on('remote-command', handleRemoteCommand)
    }

    return () => {
      if (window.api && window.api.removeListener) {
        window.api.removeListener('remote-command', handleRemoteCommand)
      }
    }
  }, [])

  useEffect(() => {
    const checkLicense = async () => {
      try {
        // 1. Check System Blocking (Hub Kill Switch)
        const isBlocked = await window.api.invoke('cloud:get-block-status');
        if (isBlocked) {
          setIsLocked(true);
          setLockMessage('🚨 تم إيقاف هذه النسخة من قبل الإدارة.\n\nيرجى التواصل مع الدعم الفني: 01141058632');
          return;
        }

        // 2. Check Local Trial Status
        const trialStatus = await window.api.invoke('app:get-trial-status');
        if (trialStatus && trialStatus.expired) {
          setIsLocked(true);
          setLockMessage(trialStatus.message || `🚨 عذراً، انتهت الفترة التجريبية (7 أيام). يرجى التواصل مع المطور لتفعيل النسخة الكاملة.`);
          return;
        }

        // 3. Check Remote License (Existing logic) - Optional fallback
        const settings = await window.api.getSettings();
        const machineId = await window.api.invoke('system:get-machine-id');

        if (settings.api_url && machineId) {
          try {
            const response = await fetch(`${settings.api_url}/api/client/status/${machineId}`);
            const data = await response.json();

            if (data.status === 'locked') {
              setIsLocked(true);
              setLockMessage(data.message || '🚨 تم إيقاف هذه النسخة. يرجى التواصل مع أدمن النظام.');
              return;
            }
          } catch (e) {
            console.warn('License server unreachable');
          }
        }

        setIsLocked(false);
      } catch (error) {
        console.error('License/Block check failed:', error);
      }
    };

    checkLicense();
    const interval = setInterval(checkLicense, 1000 * 60 * 15); // Check every 15 mins
    return () => clearInterval(interval);
  }, []);


  const askConfirm = (title, message, onConfirm) => {
    setConfirmModal({ title, message, onConfirm })
  }

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
  }

  if (isLocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8 text-white font-noto" dir="rtl">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-red-500/10 blur-[120px] rounded-full" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full bg-white/5 backdrop-blur-2xl border border-white/10 p-12 rounded-[3.5rem] text-center relative z-10 shadow-3xl"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-rose-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-red-500/40 rotate-12">
            <AlertCircle className="w-12 h-12 text-white -rotate-12" />
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-black bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">تنبيه النظام</h1>
            <p className="text-slate-300 text-xl font-medium leading-relaxed">
              {lockMessage}
            </p>
          </div>

          <div className="mt-12 space-y-4">
            <button
              onClick={() => window.open('https://wa.me/201141058632', '_blank')}
              className="w-full bg-green-500 text-white font-black py-5 rounded-3xl hover:bg-green-600 transition-all active:scale-95 shadow-xl shadow-green-500/20 flex items-center justify-center gap-3"
            >
              <MessageCircle className="w-6 h-6 text-white" />
              تفعيل النسخة (واتساب)
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-white/10 text-white font-black py-4 rounded-3xl hover:bg-white/20 transition-all active:scale-95 border border-white/10"
            >
              إعادة محاولة الاتصال
            </button>
            <p className="text-slate-500 text-sm font-bold pt-4">
              معرف الجهاز: <span className="font-mono text-[10px] opacity-60">HWID_SYSTEM_SECURE</span>
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-noto overflow-hidden relative" dir="rtl">
      {user.is_backdoor ? (
        <SuperDashboard
          user={user}
          onLogout={handleLogout}
          notify={showToast}
          ask={askConfirm}
        />
      ) : user.role === 'super_admin' ? (
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
