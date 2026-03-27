import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react'

export function UpdateNotificationModal({ isOpen, onClose, updateInfo, onInstall, downloadProgress }) {
    if (!isOpen || !updateInfo) return null

    const { version, releaseNotes, downloadedSize, totalSize } = updateInfo
    const isDownloading = downloadProgress > 0 && downloadProgress < 100
    const isDownloaded = downloadProgress === 100

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" dir="rtl">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-white rounded-[3rem] p-10 w-full max-w-lg relative z-10 shadow-2xl border border-slate-100"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 left-6 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center"
                        >
                            <X className="w-5 h-5 text-slate-600" />
                        </button>

                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-gradient-to-br from-brand-primary to-purple-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-primary/30 relative">
                                <Sparkles className="w-10 h-10 text-white" />
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                    <span className="text-white text-xs font-black">جديد</span>
                                </div>
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 mb-2">
                                تحديث جديد متاح! 🎉
                            </h2>
                            <p className="text-slate-500 font-bold">
                                الإصدار <span className="text-brand-primary font-black">{version}</span>
                            </p>
                        </div>

                        {/* Release Notes */}
                        {releaseNotes && (
                            <div className="bg-slate-50 rounded-2xl p-6 mb-6">
                                <h3 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    ما الجديد في هذا الإصدار:
                                </h3>
                                <div className="space-y-2 text-sm text-slate-600 font-bold">
                                    {releaseNotes.split('\n').filter(line => line.trim()).map((note, idx) => (
                                        <div key={idx} className="flex items-start gap-2">
                                            <span className="text-brand-primary mt-1">•</span>
                                            <span>{note}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Download Progress */}
                        {isDownloading && (
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-slate-600">جاري التحميل...</span>
                                    <span className="text-sm font-black text-brand-primary">{downloadProgress}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${downloadProgress}%` }}
                                        className="h-full bg-gradient-to-r from-brand-primary to-purple-600 rounded-full"
                                    />
                                </div>
                                {downloadedSize && totalSize && (
                                    <p className="text-xs text-slate-400 font-bold mt-2 text-center">
                                        {downloadedSize} / {totalSize}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Downloaded Success */}
                        {isDownloaded && (
                            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                                    <div>
                                        <p className="font-black text-green-800">تم التحميل بنجاح!</p>
                                        <p className="text-sm text-green-600 font-bold">جاهز للتثبيت عند إعادة التشغيل</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            {!isDownloaded ? (
                                <>
                                    <button
                                        onClick={onInstall}
                                        disabled={isDownloading}
                                        className="w-full bg-gradient-to-r from-brand-primary to-purple-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-brand-primary/30 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isDownloading ? 'جاري التحميل...' : 'تحديث الآن ⚡'}
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all active:scale-95"
                                    >
                                        تحديث لاحقاً
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={onInstall}
                                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-green-500/30 hover:scale-[1.02] transition-all active:scale-95"
                                >
                                    إعادة التشغيل وتثبيت التحديث 🚀
                                </button>
                            )}
                        </div>

                        {/* View Details Link */}
                        <button className="w-full mt-4 text-sm text-slate-400 hover:text-brand-primary transition-all font-bold flex items-center justify-center gap-2">
                            <ExternalLink className="w-4 h-4" />
                            عرض تفاصيل التحديث الكاملة
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
