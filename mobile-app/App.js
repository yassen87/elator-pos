import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Vibration
} from 'react-native';
import { 
  SafeAreaProvider, 
  SafeAreaView 
} from 'react-native-safe-area-context';
import { 
  TrendingUp, 
  Users, 
  Package, 
  AlertCircle, 
  LogOut, 
  ShoppingCart, 
  BarChart3, 
  Settings,
  ShoppingBag,
  ChevronLeft,
  Smartphone,
  X
} from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_CONFIG, AUTH_CONFIG } from './src/config';

// Helper for API calls with Dynamic URL
const apiFetch = async (endpoint, options = {}) => {
  // Try to get saved URL, fallback to config
  const savedUrl = await AsyncStorage.getItem('server_url');
  const baseUrl = savedUrl || CLOUD_CONFIG.URL;
  
  let url = '';
  if (baseUrl.includes('.php')) {
    // Hostinger PHP Style
    const action = endpoint.split('/').pop();
    url = `${baseUrl}?action=${action}`;
  } else {
    // Node.js/Railway Style
    url = `${baseUrl}${endpoint}`;
  }
  
  const user = await AsyncStorage.getItem('user');
  const token = user ? JSON.parse(user).token : CLOUD_CONFIG.TOKEN;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  return await response.json();
};

// Smart Polling Hook for "Live" Notifications
const useLiveNotifications = (isLoggedIn, currentSales) => {
    useEffect(() => {
        if (!isLoggedIn) return;

        const interval = setInterval(async () => {
            try {
                const result = await apiFetch('/api/mobile/dashboard');
                if (result.success && result.data) {
                    const newTotal = result.data.totalSales;
                    if (currentSales > 0 && newTotal > currentSales) {
                        // SALE HAPPENED!
                        Vibration.vibrate([0, 500, 200, 500]);
                        
                        // Get details of the last sale
                        const lastSale = result.data.recentSales?.[0];
                        let message = `تم تسجيل عملية بيع جديدة.\nالاجمالي الآن: ${newTotal}`;
                        
                        if (lastSale && lastSale.items) {
                             const itemsList = lastSale.items.map(i => `- ${i.product_name} (${i.quantity})`).join('\n');
                             message += `\n\n📦 المباع:\n${itemsList}`;
                        }

                        Alert.alert('💰 مبيعة جديدة!', message);
                    }
                }
            } catch (e) {
                // Silent fail on polling
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }, [isLoggedIn, currentSales]);
};

const SetupScreen = ({ onConfigured }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    
    // data can be:
    // 1. http://192.168.x.x:5000 (Legacy/Local)
    // 2. AUTH|URL|USER|PASS (New Cloud Sync)

    if (data && data.startsWith('AUTH|')) {
        const parts = data.split('|');
        if (parts.length === 4) {
             const [_, url, username, password] = parts;
             await AsyncStorage.setItem('server_url', url);
             
             // Auto Login
             try {
                const result = await fetch(`${url}?action=login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                }).then(res => res.json());

                if (result.success) {
                    const userData = { ...result.user, token: result.token };
                    await AsyncStorage.setItem('user', JSON.stringify(userData));
                    Alert.alert('تم الاقتران بنجاح ✅', 'مرحباً بك في لوحة تحكم السحابة');
                    onConfigured();
                } else {
                    Alert.alert('فشل الدخول', 'بيانات الاعتماد في الكود غير صالحة');
                }
             } catch (e) {
                Alert.alert('خطأ', 'فشل الاتصال بالسحابة');
             }
        }
    } else if (data && data.startsWith('http')) {
        await AsyncStorage.setItem('server_url', data);
        Alert.alert('تم الربط بنجاح ✅', `تم الاتصال بالسيرفر: ${data}`);
        onConfigured();
    } else {
        Alert.alert('خطأ', 'كود غير صالح');
        setScanned(false);
    }
  };

  if (!permission) {
    return <View style={styles.container}><Text>جاري التحميل...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{textAlign: 'center', marginBottom: 20}}>نحتاج إذن الكاميرا لمسح الكود</Text>
        <TouchableOpacity onPress={requestPermission} style={{backgroundColor: '#3b82f6', padding: 15, borderRadius: 10}}>
          <Text style={{color: '#fff', fontWeight: 'bold'}}>منح الإذن</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
      <View style={{position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center'}}>
          <Text style={{color: '#fff', fontSize: 18, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 10}}>
              وجه الكاميرا نحو كود الكمبيوتر 📷
          </Text>
          {scanned && (
            <TouchableOpacity 
              onPress={() => setScanned(false)}
              style={{marginTop: 10, backgroundColor: '#3b82f6', padding: 10, borderRadius: 10}}
            >
              <Text style={{color: '#fff', fontWeight: 'bold'}}>مسح مرة أخرى</Text>
            </TouchableOpacity>
          )}
      </View>
    </View>
  );
};

export default function App() {
  const [isConfigured, setIsConfigured] = useState(false); // New Config State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncData, setSyncData] = useState({ sales: [], products: [], totalSales: 0 });
  const [activeTab, setActiveTab] = useState('dashboard');

  // Activate Polling
  useLiveNotifications(isLoggedIn, syncData.totalSales);

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    try {
      const url = await AsyncStorage.getItem('server_url');
      const savedUser = await AsyncStorage.getItem('user');
      
      if (savedUser) {
          setUser(JSON.parse(savedUser));
          setIsLoggedIn(true);
          setIsConfigured(true);
          fetchData();
      } else {
          // If not logged in, force the SETUP (QR Scan) screen immediately
          setIsConfigured(false);
          setIsLoggedIn(false);
      }
    } catch (e) {
      console.error('Login check error', e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await apiFetch('/api/mobile/dashboard');

      if (result.success) {
        const { data } = result;
        setSyncData({
          sales: data.recentSales || [],
          products: data.lowStock || [],
          totalSales: data.totalSales || 0
        });
      }
    } catch (err) {
      console.error('Fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
  };

  const handleLoginSuccess = async (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    fetchData();
  };

  if (!isConfigured) {
      return <SetupScreen onConfigured={checkLogin} />;
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLoginSuccess} />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
      <View style={styles.header}>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.welcomeText}>مرحباً يا {user?.name || 'محل العارين'} 👋</Text>
          <Text style={styles.subWelcomeText}>إليك ملخص المحل اليوم</Text>
        </View>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => setActiveTab('settings')}
        >
          <Settings size={22} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} color="#3b82f6" />
        }
      >
        {activeTab === 'dashboard' && (
          <View style={styles.tabContent}>
            {/* Main Stats Card */}
            <View style={styles.mainCard}>
              <View style={styles.cardHeader}>
                <TrendingUp size={16} color="#bfdbfe" />
                <Text style={styles.cardLabel}>مبيعات اليوم</Text>
              </View>
              <View style={styles.amountContainer}>
                <Text style={styles.amountText}>{syncData.totalSales.toLocaleString()}</Text>
                <Text style={styles.currencyText}>ج.م</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>+{syncData.sales.length} فاتورة جديدة</Text>
              </View>
            </View>

            {/* Mini Cards Row */}
            <View style={styles.miniCardsRow}>
              <View style={[styles.miniCard, { backgroundColor: '#fff7ed' }]}>
                <View style={styles.miniIconBg}><Package size={20} color="#f97316" /></View>
                <Text style={styles.miniLabel}>نواقص المخزون</Text>
                <Text style={styles.miniValue}>{syncData.products.length}</Text>
              </View>
              <View style={[styles.miniCard, { backgroundColor: '#f5f3ff' }]}>
                <View style={styles.miniIconBg}><BarChart3 size={20} color="#8b5cf6" /></View>
                <Text style={styles.miniLabel}>إجمالي العمليات</Text>
                <Text style={styles.miniValue}>{syncData.sales.length}</Text>
              </View>
            </View>

            {/* Section: Recent Sales */}
            <View style={styles.sectionHeader}>
              <TouchableOpacity onPress={() => setActiveTab('sales')}>
                <Text style={styles.viewAllText}>عرض الكل</Text>
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>آخر العمليات</Text>
            </View>

            {loading && !refreshing ? (
              <ActivityIndicator color="#3b82f6" style={{ marginTop: 20 }} />
            ) : (
              <View style={styles.salesList}>
                {syncData.sales.slice(0, 5).map((sale) => (
                  <View key={sale.id} style={styles.saleItem}>
                    <View style={styles.saleItemRight}>
                      <Text style={styles.saleAmount}>+{sale.total} ج.م</Text>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>مكتمل</Text>
                      </View>
                    </View>
                    <View style={styles.saleItemLeft}>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.saleTitle}>فاتورة #{sale.invoice_code}</Text>
                        <Text style={styles.saleTime}>{new Date(sale.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                      <View style={styles.saleIcon}>
                        <ShoppingCart size={20} color="#3b82f6" />
                      </View>
                    </View>
                  </View>
                ))}
                
                {syncData.sales.length === 0 && (
                  <View style={styles.emptyState}>
                    <BarChart3 size={40} color="#cbd5e1" />
                    <Text style={styles.emptyText}>لا يوجد مبيعات اليوم</Text>
                  </View>
                )}
              </View>
            )}

            {/* Low Stock Alerts */}
            {syncData.products.length > 0 && (
              <View style={styles.alertBox}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertTitle}>تنبيهات النواقص</Text>
                  <AlertCircle size={20} color="#ef4444" />
                </View>
                {syncData.products.slice(0, 3).map((p) => (
                  <View key={p.id} style={styles.alertItem}>
                    <Text style={styles.alertProdStock}>{p.stock_quantity} متبقي</Text>
                    <Text style={styles.alertProdName}>{p.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Tab Content Screens */}
        {activeTab === 'sales' && <SalesListScreen sales={syncData.sales} />}
        {activeTab === 'stock' && <StockListScreen products={syncData.products} />}
        <NavButton 
          icon={<Settings />} 
          label="الإعدادات" 
          active={activeTab === 'settings'} 
          onPress={() => setActiveTab('settings')} 
        />
        <NavButton 
          icon={<Package />} 
          label="المخزون" 
          active={activeTab === 'stock'} 
          onPress={() => setActiveTab('stock')} 
        />
        <NavButton 
          icon={<ShoppingCart />} 
          label="المبيعات" 
          active={activeTab === 'sales'} 
          onPress={() => setActiveTab('sales')} 
        />
        <NavButton 
          icon={<BarChart3 />} 
          label="الرئيسية" 
          active={activeTab === 'dashboard'} 
          onPress={() => setActiveTab('dashboard')} 
        />
      </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}



// Inner Component: Login Screen
const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleLogin = async () => {
    setErrorMsg(null);
    if (!username || !password) {
      setErrorMsg('يرجى إدخال جميع البيانات المطلوبة ✍️');
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      if (result.success) {
        const userData = { ...result.user, token: result.token };
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        onLogin(userData);
      } else {
        setErrorMsg(result.message || '❌ البيانات غير صحيحة');
      }
    } catch (err) {
      setErrorMsg('🌐 فشل الاتصال بالسيرفر. تأكد من تشغيل الـ API.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.loginContainer}>
      <View style={[styles.loginHeader, { alignItems: 'center' }]}>
        <View style={styles.logoIcon}>
          <ShoppingBag color="#fff" size={40} />
        </View>
        <Text style={styles.logoText}>العارين للعطور</Text>
        <Text style={styles.logoSubText}>لوحة متابعة المدير</Text>
      </View>

      <View style={styles.loginForm}>
        {errorMsg && (
          <View style={styles.errorToast}>
            <AlertCircle size={18} color="#ef4444" />
            <Text style={styles.errorToastText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>اسم المستخدم</Text>
          <TextInput 
            style={[styles.input, errorMsg && { borderColor: '#fee2e2' }]}
            placeholder="admin"
            value={username}
            onChangeText={(t) => { setUsername(t); setErrorMsg(null); }}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>كلمة المرور</Text>
          <TextInput 
            style={[styles.input, errorMsg && { borderColor: '#fee2e2' }]}
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={(t) => { setPassword(t); setErrorMsg(null); }}
          />
        </View>

        <TouchableOpacity 
          style={[styles.loginButton, loading && { opacity: 0.7 }]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>دخول آمن 🔓</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={{ marginTop: 15, padding: 10 }}
          onPress={async () => {
            await AsyncStorage.removeItem('server_url');
            Alert.alert('تم إعادة الضبط', 'سيتم إعادة تشغيل التطبيق لمسح الكود مرة أخرى');
            // Force reload by clearing and reloading
            window.location?.reload?.() || null;
          }}
        >
          <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
            🔄 إعادة ضبط الاتصال
          </Text>
        </TouchableOpacity>
        
        <View style={{ marginTop: 30, alignItems: 'center' }}>
          <Text style={{ color: '#cbd5e1', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>
            SECURE CONNECTED TO CLOUD PRO
          </Text>
        </View>
      </View>
    </View>
  );
};

// Inner Component: Navigation Button
const NavButton = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={styles.navBtn} onPress={onPress}>
    <View style={[styles.navIconBg, active && styles.navIconActive]}>
      {React.cloneElement(icon, { size: 24, color: active ? '#3b82f6' : '#94a3b8' })}
    </View>
    <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

// Inner Screens
const SalesListScreen = ({ sales }) => (
  <View style={styles.tabContent}>
    <Text style={[styles.sectionTitle, { textAlign: 'right' }]}>جميع مبيعات اليوم</Text>
    <View style={{ marginTop: 15 }}>
      {sales.map(sale => (
        <View key={sale.id} style={[styles.saleItem, { marginBottom: 10 }]}>
           <Text style={styles.saleAmount}>{sale.total} ج.م</Text>
           <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.saleTitle}>فاتورة #{sale.invoice_code}</Text>
            <Text style={styles.saleTime}>{new Date(sale.created_at).toLocaleString('ar-EG')}</Text>
          </View>
        </View>
      ))}
    </View>
  </View>
);

const StockListScreen = ({ products }) => (
  <View style={styles.tabContent}>
    <Text style={[styles.sectionTitle, { textAlign: 'right' }]}>حالة المخزون (النواقص)</Text>
    <View style={{ marginTop: 15 }}>
      {products.map(p => (
        <View key={p.id} style={[styles.saleItem, { marginBottom: 10 }]}>
          <Text style={[styles.saleAmount, { color: '#ef4444' }]}>{p.stock_quantity}</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.saleTitle}>{p.name}</Text>
            <Text style={styles.saleTime}>الفئة: {p.category}</Text>
          </View>
        </View>
      ))}
    </View>
  </View>
);

const SettingsScreen = ({ user, onLogout }) => (
  <View style={styles.tabContent}>
    <Text style={[styles.sectionTitle, { textAlign: 'right' }]}>إعدادات التطبيق</Text>
    <View style={styles.settingItem}>
       <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={{ fontWeight: '900', color: '#1e293b' }}>{user?.name || 'المدير العام'}</Text>
          <Text style={{ fontSize: 12, color: '#94a3b8' }}>صلاحية كاملة</Text>
       </View>
       <View style={{ width: 50, height: 50, backgroundColor: '#eff6ff', borderRadius: 25, alignItems: 'center', justifyContent: 'center' }}>
          <Users size={24} color="#3b82f6" />
       </View>
    </View>
    
    <TouchableOpacity style={[styles.settingItem, { marginTop: 15 }]} onPress={onLogout}>
      <Text style={{ color: '#ef4444', fontWeight: '800', flex: 1, textAlign: 'right' }}>تسجيل الخروج</Text>
      <LogOut size={20} color="#ef4444" />
    </TouchableOpacity>

    <View style={{ marginTop: 40, alignItems: 'center' }}>
      <Text style={{ color: '#cbd5e1', fontSize: 11, fontWeight: '700' }}>Al-Areen POS Platform • v1.2.0</Text>
    </View>
  </View>
);

// Unified Stylesheet
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 25,
    paddingVertical: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  welcomeText: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
  subWelcomeText: { fontSize: 12, color: '#94a3b8', marginTop: 2, fontWeight: '700' },
  headerButton: { width: 45, height: 45, backgroundColor: '#f1f5f9', borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 100 },
  tabContent: { padding: 25 },
  mainCard: {
    backgroundColor: '#3b82f6',
    borderRadius: 35,
    padding: 30,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  cardLabel: { color: '#bfdbfe', fontSize: 14, fontWeight: '700' },
  amountContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'baseline', marginTop: 10 },
  amountText: { fontSize: 42, fontWeight: '900', color: '#fff' },
  currencyText: { fontSize: 18, color: '#fff', marginLeft: 8, fontWeight: '700' },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-end', marginTop: 20 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  miniCardsRow: { flexDirection: 'row', gap: 15, marginTop: 25 },
  miniCard: { flex: 1, padding: 20, borderRadius: 30, borderWidth: 1, borderColor: '#fff' },
  miniIconBg: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  miniLabel: { fontSize: 11, color: '#64748b', fontWeight: '800', textAlign: 'right' },
  miniValue: { fontSize: 22, fontWeight: '900', color: '#1e293b', textAlign: 'right' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 35, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  viewAllText: { fontSize: 13, color: '#3b82f6', fontWeight: '800' },
  salesList: { gap: 12 },
  saleItem: { 
    backgroundColor: '#fff', padding: 16, borderRadius: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    borderWidth: 1, borderColor: '#f1f5f9' 
  },
  saleItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  saleIcon: { width: 48, height: 48, backgroundColor: '#eff6ff', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  saleTitle: { fontSize: 15, fontWeight: '900', color: '#1e293b' },
  saleTime: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },
  saleItemRight: { alignItems: 'flex-start' },
  saleAmount: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  statusBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  statusText: { color: '#16a34a', fontSize: 9, fontWeight: '800' },
  emptyState: { paddingVertical: 50, alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 30 },
  emptyText: { color: '#94a3b8', fontWeight: '700', marginTop: 10 },
  alertBox: { backgroundColor: '#fef2f2', padding: 25, borderRadius: 35, marginTop: 30, borderWidth: 1, borderColor: '#fee2e2' },
  alertHeader: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginBottom: 15 },
  alertTitle: { fontSize: 15, fontWeight: '900', color: '#991b1b' },
  alertItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#fee2e2' },
  alertProdName: { fontWeight: '700', color: '#b91c1c' },
  alertProdStock: { fontWeight: '900', color: '#ef4444' },
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 90, backgroundColor: '#fff',
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 25,
    borderTopWidth: 1, borderTopColor: '#f1f5f9'
  },
  navBtn: { alignItems: 'center', gap: 4 },
  navIconBg: { padding: 8, borderRadius: 14 },
  navIconActive: { backgroundColor: '#eff6ff' },
  navLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8' },
  navLabelActive: { color: '#3b82f6' },
  loginContainer: { flex: 1, backgroundColor: '#fff', padding: 30, justifyContent: 'center' },
  logoIcon: { 
    width: 90, height: 90, backgroundColor: '#3b82f6', borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    transform: [{ rotate: '12deg' }], shadowColor: '#3b82f6', shadowOpacity: 0.3, shadowRadius: 20
  },
  logoText: { fontSize: 28, fontWeight: '900', color: '#1e293b', marginTop: 25 },
  logoSubText: { fontSize: 14, color: '#64748b', fontWeight: '700' },
  loginForm: { marginTop: 40, gap: 20 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 13, fontWeight: '800', color: '#64748b', textAlign: 'right' },
  input: { backgroundColor: '#f8fafc', height: 60, borderRadius: 15, paddingHorizontal: 20, fontSize: 16, textAlign: 'right', borderWidth: 1, borderColor: '#f1f5f9' },
  loginButton: { backgroundColor: '#3b82f6', height: 60, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  errorToast: {
    flexDirection: 'row-reverse',
    backgroundColor: '#fef2f2',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#fee2e2',
    marginBottom: 5,
  },
  errorToastText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    textAlign: 'right',
  },
  settingItem: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 20, backgroundColor: '#fff', borderRadius: 25, borderWidth: 1, borderColor: '#f1f5f9' },
  attendanceItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  emptySmall: { textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 10, fontStyle: 'italic' }
});
