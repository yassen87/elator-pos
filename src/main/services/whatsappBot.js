import { app, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import getDB from '../db'
import { formatPhoneNumber } from './whatsappService'

// Helper for local logging to console and UI
const log = (msg) => {
  console.log(`[WhatsAppBot] ${msg}`)
}

class WhatsAppBot {
  constructor() {
    this.client = null
    this.status = 'DISCONNECTED' // DISCONNECTED, INITIALIZING, QR_READY, CONNECTED, AUTH_FAILURE
    this.qr = null
    this.webContents = null
    this.MessageMedia = null
    this.settings = {}
    this.isInitializing = false
  }

  // Aggressive helper to sweep for browser lock files and zombie processes
  cleanupLockFiles() {
    try {
      const userData = app.getPath('userData');
      const sessionPath = path.join(userData, 'wa-session', 'session-elator-pos');
      log(`Scanning for locks and zombies in: ${sessionPath}`);
      
      // 1. Programmatic Zombie Kill (Windows Only)
      if (process.platform === 'win32') {
          try {
              const { execSync } = require('child_process');
              // Kill any chrome/edge processes that are using our specific userDataDir
              // This is a bit aggressive but necessary for reliability in many environments
              const cmd = `wmic process where "name='chrome.exe' or name='msedge.exe'" get commandline,processid`;
              const output = execSync(cmd).toString();
              const lines = output.split('\n');
              
              lines.forEach(line => {
                  if (line.includes('wa-session') && line.includes('session-elator-pos')) {
                      const match = line.match(/\s+(\d+)\s*$/);
                      if (match) {
                          const pid = match[1];
                          log(`Killing zombie process PID: ${pid}`);
                          try { execSync(`taskkill /F /PID ${pid}`); } catch (e) {}
                      }
                  }
              });
          } catch (processErr) {
              log(`Note: Process cleanup skipped or failed: ${processErr.message}`);
          }
      }

      // 2. File Lock Cleanup
      if (fs.existsSync(sessionPath)) {
        const files = fs.readdirSync(sessionPath);
        const lockPatterns = [/lock/i, /Singleton/i, /DevTools/i];
        
        files.forEach(file => {
          if (lockPatterns.some(pattern => pattern.test(file))) {
            const fullPath = path.join(sessionPath, file);
            if (fs.statSync(fullPath).isFile()) {
              log(`Found potential lock file: ${file}. Attempting removal...`);
              try {
                fs.unlinkSync(fullPath);
                log(`Successfully removed: ${file}`);
              } catch (unlinkErr) {
                log(`Failed to remove ${file}: ${unlinkErr.message}`);
              }
            }
          }
        });
      } else {
        log('Session directory does not exist yet. No locks to clean.');
      }
    } catch (err) {
      log(`Error during lock cleanup: ${err.message}`);
    }
  }

  findBrowserPath() {
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      // User specific paths
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe'),
      // Brave fallback
      'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware\\Brave-Browser\\Application\\brave.exe')
    ]

    for (const p of paths) {
      if (fs.existsSync(p)) {
        console.log(`[WhatsAppBot] Found system browser at: ${p}`)
        return p
      }
    }
    
    console.warn('[WhatsAppBot] No system Chrome or Edge found in standard paths.')
    return null
  }

  async initialize(webContents) {
    if (this.isInitializing) {
        log('Initialization already in progress. Skipping.');
        return;
    }
    
    this.isInitializing = true;
    this.webContents = webContents
    
    // STRICT CHECK: Is feature enabled?
    try {
      const db = getDB()
      this.settings = db.prepare('SELECT key, value FROM settings').all().reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {})
      const enabled = this.settings.whatsapp_enabled === 'true'
      if (!enabled) {
        console.log('[WhatsAppBot] Feature is disabled in settings. Aborting init.')
        this.status = 'DISABLED'
        this.sendStatus('الخدمة معطلة من الإعدادات')
        this.isInitializing = false
        return
      }
    } catch (e) {
      console.error('[WhatsAppBot] DB Check failed:', e)
    }

    this.status = 'INITIALIZING'
    
    // Simple cleanup
    if (this.client) {
      try { await this.client.destroy(); } catch (e) {}
      this.client = null;
    }

    // New: Robust cleanup of lock files
    this.cleanupLockFiles();

    this.sendStatus('جاري بدء التشغيل (الوضع القياسي)...')

    try {
      const wwjs = await import('whatsapp-web.js')
      const wwjsModule = wwjs.default || wwjs
      
      const { Client, LocalAuth, MessageMedia } = wwjsModule
      this.MessageMedia = MessageMedia

      console.log('[WhatsAppBot] Library components loaded:', { 
        hasClient: !!Client, 
        hasLocalAuth: !!LocalAuth, 
        hasMedia: !!MessageMedia 
      })

      if (!Client || !LocalAuth) {
        throw new Error('مكتبة الواتساب غير مثبتة أو لم يتم تحميل مكوناتها بشكل صحيح')
      }

      if (!MessageMedia) {
        console.warn('[WhatsAppBot] MessageMedia not found in import, falling back to named export attempt...')
        this.MessageMedia = wwjsModule.MessageMedia || wwjs.MessageMedia
      } else {
        this.MessageMedia = MessageMedia
      }

      if (!this.MessageMedia) {
        console.error('[WhatsAppBot] CRITICAL: MessageMedia is missing from whatsapp-web.js')
      }

      const qrcode = await import('qrcode')
      const qrcodeLib = qrcode.default || qrcode

      this.sendStatus('جاري فتح المتصفح واتساب...')

      const browserPath = this.findBrowserPath()
      const puppeteerOptions = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
          '--no-default-browser-check',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--no-first-run',
          '--disable-notifications',
          '--disable-infobars'
        ],
        ignoreHTTPSErrors: true,
        authTimeoutMs: 60000
      }

      if (browserPath) {
        log(`Using system browser at: ${browserPath}`)
        puppeteerOptions.executablePath = browserPath
      } else if (app.isPackaged) {
          const errorMsg = '❌ لم يتم العثور على متصفح (Chrome أو Edge) على جهازك. يرجى تثبيت أحدهما لتشغيل الواتساب.'
          log(errorMsg)
          this.sendStatus(errorMsg)
          this.isInitializing = false
          return // Stop initialization
      }

      log(`[WhatsAppBot] Launching client with options: ${JSON.stringify(puppeteerOptions)}`)

      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'elator-pos',
          dataPath: path.join(app.getPath('userData'), 'wa-session')
        }),
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1012170943-alpha.html',
        },
        puppeteer: puppeteerOptions
      })

      this.client.on('qr', async (qr) => {
        this.status = 'QR_READY'
        this.qr = await qrcodeLib.toDataURL(qr)
        this.sendStatus('تفضل مسح الرمز الضوئي')
      })

      this.client.on('loading_screen', (percent, message) => {
        this.status = 'INITIALIZING'
        this.qr = null
        this.sendStatus(`جاري التحميل: ${percent}%`)
      })

      this.client.on('ready', () => {
        this.status = 'CONNECTED'
        this.qr = null
        this.sendStatus('✅ تم الاتصال بنجاح!')
        console.log('WhatsApp Client is ready!')
      })

      // Feedback Flow Listener
      this.client.on('message', async (msg) => {
        const text = msg.body.trim().toLowerCase();
        // Support numbers or Arabic/English words
        if (text === '1' || text.includes('راضي') || text.includes('excellent') || text.includes('good')) {
          await msg.reply('شكراً جزيلاً لتقييمك! نسعد بخدمتكم دائماً ✨ ونكون في انتظاركم مرة أخرى.');
        } else if (text === '2' || text.includes('غير راضي') || text.includes('bad') || text.includes('مش راضي')) {
          const shopPhone = this.settings.shop_phone || '';
          await msg.reply(`نأسف جداً لعدم رضاكم. نحن نهتم بجودة خدمتنا. يرجى التواصل معنا مباشرة لحل أي مشكلة: ${shopPhone} `);
        }
      });

      this.client.on('authenticated', () => {
        this.sendStatus('تم التحقق، جاري الدخول...')
        console.log('WhatsApp Client authenticated')

        // WATCHDOG: Force 'ready' if the DOM is actually loaded but the event is missed
        let checkCount = 0;
        const readyWatchdog = setInterval(async () => {
          checkCount++;
          if (this.status === 'CONNECTED' || checkCount > 60) {
            clearInterval(readyWatchdog);
            return;
          }

          try {
            // Check for common elements that indicate WhatsApp is loaded (Chat List)
            const isLoaded = await this.client.pupPage.evaluate(() => {
              return !!(document.querySelector('#pane-side') || document.querySelector('[data-icon="chat"]'));
            });

            if (isLoaded) {
              console.log('[Watchdog] Main interface detected! Forcing READY state...');
              clearInterval(readyWatchdog);
              
              this.status = 'CONNECTED';
              this.qr = null;
              this.sendStatus('✅ تم الاتصال بنجاح! (تم اكتشاف الواجهة)');
              this.client.emit('ready'); // Manually emit ready
            }
          } catch (e) {
            // Ignore errors during evaluation (page might be navigating)
          }
        }, 1000);
      })

      this.client.on('auth_failure', (msg) => {
        this.status = 'AUTH_FAILURE'
        this.sendStatus('فشل التحقق: ' + msg)
        console.error('WhatsApp Auth failure:', msg)
      })

      this.client.on('disconnected', (reason) => {
        log(`WhatsApp Disconnected: ${reason}`);
        this.status = 'DISCONNECTED'
        this.sendStatus(`تم قطع الاتصال: ${reason}. جاري محاولة إعادة الاتصال...`)
        this.client = null

        // Auto-reconnect after 10 seconds
        setTimeout(() => {
          if (this.webContents && !this.isInitializing) {
            log('Attempting auto-reconnection...');
            this.initialize(this.webContents);
          }
        }, 10000);
      })

      await this.client.initialize()
    } catch (error) {
      this.status = 'ERROR'
      this.sendStatus('فشل التشغيل: ' + error.message)
      console.error('Failed to initialize WhatsApp client:', error)
      this.client = null
    } finally {
      this.isInitializing = false;
    }
  }

  sendStatus(message = '') {
    if (this.webContents) {
      this.webContents.send('whatsapp:status', {
        status: this.status,
        qr: this.qr,
        message: message
      })
    }
  }

  getStatus() {
    return {
      status: this.status,
      qr: this.qr
    }
  }

  async logout() {
    if (this.client) {
      try {
        await this.client.logout()
      } catch (e) {
        console.error('Logout error:', e)
      }
      this.client = null
      this.status = 'DISCONNECTED'
      this.sendStatus()
    }
  }

  async deleteSession() {
    try {
      if (this.client) {
        await this.client.destroy()
        this.client = null
      }
      const sessionPath = path.join(app.getPath('userData'), 'wa-session')
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true })
        console.log('[WhatsApp] Session deleted manually.')
      }
      this.status = 'DISCONNECTED'
      this.sendStatus('تم حذف الجلسة. يمكنك البدء من جديد.')
    } catch (e) {
      console.error('Delete Session Error:', e)
      this.sendStatus('فشل حذف الجلسة: ' + e.message)
    }
  }

  async sendInvoice(phoneNumber, pdfPath, caption) {
    console.log(`[WhatsAppBot] Attempting to send invoice. Status: ${this.status}, Phone: ${phoneNumber}`);
    if (this.status !== 'CONNECTED' || !this.client) {
      console.warn(`[WhatsAppBot] Cannot send invoice: Not connected (status: ${this.status})`);
      throw new Error('واتساب غير متصل. يرجى المسح الضوئي للكود أولاً.')
    }

    if (!this.MessageMedia) {
      console.error('[WhatsAppBot] MessageMedia class is null. Re-attempting import...');
      try {
        const wwjs = await import('whatsapp-web.js');
        const wwjsModule = wwjs.default || wwjs;
        this.MessageMedia = wwjsModule.MessageMedia || wwjs.MessageMedia;
      } catch (e) {
        console.error('[WhatsAppBot] Re-import failed:', e);
      }
    }

    if (!this.MessageMedia) {
      throw new Error('فشل تحميل مكاتب الواتساب (Media). يرجى إعادة تشغيل البرنامج.');
    }

    if (!fs.existsSync(pdfPath)) {
      console.error(`[WhatsAppBot] PDF file not found: ${pdfPath}`);
      throw new Error('ملف الفاتورة غير موجود. قد يكون هناك مشكلة في حفظ الملف.');
    }

    const formattedNum = formatPhoneNumber(phoneNumber);
    const chatId = formattedNum + '@c.us'
    
    let lastError = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[WhatsApp Bot] Send attempt ${attempt} for ${chatId}`)
        
        console.log(`[WhatsApp Bot] Preparing media from: ${pdfPath}`);
        const media = this.MessageMedia.fromFilePath(pdfPath)
        
        if (!media) {
             throw new Error('فشل في تحويل الفاتورة لصيغة واتساب.');
        }

        console.log(`[WhatsApp Bot] Media object created. Filename: ${media.filename}, Mimetype: ${media.mimetype}`)
        
        console.log(`[WhatsApp Bot] Sending media message now...`);
        // Use client.sendMessage directly with chatId instead of chat object
        const sentMsg = await this.client.sendMessage(chatId, media, { 
          caption,
          sendMediaAsDocument: true,
          sendSeen: false
        })
        console.log(`[WhatsApp Bot] Message sent! ID: ${sentMsg?.id?._serialized || 'unknown'}`)
        return { success: true, id: sentMsg?.id?._serialized } // Success!
      } catch (err) {
        lastError = err
        console.error(`[WhatsApp Bot] Attempt ${attempt} failed:`, err.message)
        
        if (err.message.includes('markedUnread') || err.message.includes('undefined')) {
          console.log('[WhatsApp Bot] Internal WA error detected. Attempting to force refresh store...')
          try { await this.client.getNumberId(chatId); } catch(e) {}
        }

        if (err.message.includes('markedUnread')) {
          console.log('[WhatsApp Bot] Retrying after internal error...')
        } else if (err.message.includes('غير مسجل') || err.message.includes('not found')) {
          throw new Error('❌ الرقم غير مسجل على واتساب أو غير متاح حالياً.')
        } else if (err.message.includes('detached Frame') || err.message.includes('Target closed') || err.message.includes('Session closed')) {
          throw new Error('⚠️ تم إغلاق متصفح الواتساب تلقائياً! يرجى إعادة توصيل واتساب من الإعدادات.')
        } else if (err.message.includes('Protocol error')) {
            console.warn('[WhatsApp Bot] Protocol error, usually recoverable after delay.')
        }
        
        if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    // Final error message in Arabic for the user
    throw new Error(lastError.message || 'فشل إرسال الرسالة بعد 3 محاولات. يرجى التحقق من اتصال الإنترنت.')
  }

  async sendMessage(phoneNumber, message) {
    if (this.status !== 'CONNECTED' || !this.client) {
      throw new Error('واتساب غير متصل.')
    }

    const formattedNum = formatPhoneNumber(phoneNumber);
    const chatId = formattedNum + '@c.us'
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[WhatsApp Bot] Sending text message to ${chatId} (Attempt ${attempt})...`);
        // Use client.sendMessage directly with chatId
        await this.client.sendMessage(chatId, message)
        console.log(`[WhatsApp Bot] Text message sent successfully to ${chatId}`)
        return
      } catch (err) {
        console.error(`[WhatsApp Bot] Send message attempt ${attempt} failed:`, err.message)
        if (err.message.includes('markedUnread')) {
           console.log('[WhatsApp Bot] Retrying after internal error...')
           try { await this.client.getNumberId(chatId); } catch(e) {}
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
  }

  scheduleFollowUp(phoneNumber) {
    console.log(`[WhatsApp Bot] Scheduling follow-up message for ${phoneNumber} in 2 minutes...`)
    
    // Convert 2 minutes to ms
    const delay = 120000;
    
    setTimeout(async () => {
      try {
        console.log(`[WhatsApp Bot] Sending scheduled follow-up for ${phoneNumber}`)
        const surveyText = `نتمنى أن تكون تجربتك معنا اليوم قد نالت إعجابكم! ✨\nبرجاء تقييم خدمتنا بالرد برقم:\n1. راضي جداً 😊\n2. غير راضي 😞`
        await this.sendMessage(phoneNumber, surveyText)
      } catch (err) {
        console.error(`[WhatsApp Bot] Failed to send scheduled follow-up:`, err.message)
      }
    }, delay)
  }

  async toggle(enabled) {
    try {
      const db = getDB()
      db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(enabled ? 'true' : 'false', 'whatsapp_enabled')
      
      if (enabled) {
        console.log('[WhatsAppBot] Enabling service...')
        // Get webContents if not already set
        if (!this.webContents) {
          const { BrowserWindow } = await import('electron')
          const mainWindow = BrowserWindow.getAllWindows()[0]
          if (mainWindow) {
            this.webContents = mainWindow.webContents
          }
        }
        
        if (this.webContents) {
          await this.initialize(this.webContents)
        } else {
          console.error('[WhatsAppBot] No webContents available for initialization')
          return { success: false, error: 'No window available' }
        }
      } else {
        console.log('[WhatsAppBot] Disabling service...')
        if (this.client) {
          try {
            await this.client.destroy()
          } catch (e) {
            console.error('[WhatsAppBot] Error destroying client:', e)
          }
          this.client = null
        }
        this.status = 'DISABLED'
        this.sendStatus('الخدمة معطلة')
      }
      
      return { success: true, enabled }
    } catch (error) {
      console.error('[WhatsAppBot] Toggle failed:', error)
      return { success: false, error: error.message }
    }
  }
}

export const whatsappBot = new WhatsAppBot()
