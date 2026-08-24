// Konfigurasi
const CONFIG = {
    // GANTI DENGAN URL GAS ANDA
    GAS_URL: 'https://script.google.com/macros/s/AKfycby8XeGxYr_0X9M6g1RglywOgE2R2QZjWmqaonMntZhNqSA0yuRzlNYXS7RR8XQIpZPhwQ/exec',
    CACHE_DURATION: 5 * 60 * 1000 // 5 menit
};

// State
let appState = {
    isOnline: false,
    lastFetch: null,
    cachedData: null
};

// DOM Elements
const elements = {
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    checkConnectionBtn: document.getElementById('check-connection'),
    fetchDataBtn: document.getElementById('fetch-data'),
    dataContainer: document.getElementById('data-container'),
    dataForm: document.getElementById('data-form'),
    formResponse: document.getElementById('form-response'),
    nameInput: document.getElementById('name'),
    messageInput: document.getElementById('message')
};

// Utility Functions
function setStatus(status, message) {
    elements.statusIndicator.className = `status-${status}`;
    elements.statusText.textContent = message;
}

function showFormResponse(message, type = 'success') {
    const el = elements.formResponse;
    el.textContent = message;
    el.className = `response-message ${type}`;
    el.style.display = 'block';
    
    setTimeout(() => {
        el.style.display = 'none';
    }, 5000);
}

function renderData(data) {
    const container = elements.dataContainer;
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="placeholder">Tidak ada data</p>';
        return;
    }

    container.innerHTML = data.map(item => `
        <div class="data-item">
            <strong>${item.name || 'Tanpa Nama'}</strong>
            <p>${item.message || item.body || '-'}</p>
            <small style="color:#8899a6;">${item.timestamp || new Date().toLocaleString()}</small>
        </div>
    `).join('');
}

// API Functions
async function checkConnection() {
    try {
        setStatus('checking', 'Memeriksa koneksi...');
        elements.checkConnectionBtn.disabled = true;
        
        const response = await fetch(CONFIG.GAS_URL, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        appState.isOnline = true;
        setStatus('online', '✅ Terhubung dengan backend!');
        return { success: true, data };
    } catch (error) {
        console.error('Connection check failed:', error);
        appState.isOnline = false;
        setStatus('offline', '❌ Gagal terhubung ke backend');
        return { success: false, error: error.message };
    } finally {
        elements.checkConnectionBtn.disabled = false;
    }
}

async function fetchData() {
    const container = elements.dataContainer;
    container.innerHTML = '<p class="placeholder">⏳ Mengambil data...</p>';
    elements.fetchDataBtn.disabled = true;

    try {
        // Cek cache
        const now = Date.now();
        if (appState.cachedData && appState.lastFetch && 
            (now - appState.lastFetch) < CONFIG.CACHE_DURATION) {
            renderData(appState.cachedData);
            elements.fetchDataBtn.disabled = false;
            return;
        }

        const response = await fetch(CONFIG.GAS_URL, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        // Simpan cache
        appState.cachedData = data;
        appState.lastFetch = now;
        appState.isOnline = true;
        setStatus('online', '✅ Data berhasil diambil!');
        
        renderData(data);
    } catch (error) {
        console.error('Fetch data failed:', error);
        appState.isOnline = false;
        setStatus('offline', '❌ Gagal mengambil data');
        container.innerHTML = `<p class="placeholder">❌ Error: ${error.message}</p>`;
    } finally {
        elements.fetchDataBtn.disabled = false;
    }
}

async function submitData(formData) {
    try {
        const response = await fetch(CONFIG.GAS_URL, {
            method: 'POST',
            mode: 'no-cors', // Penting untuk GAS
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        // Karena mode no-cors, response tidak bisa dibaca
        // Tapi request tetap terkirim
        showFormResponse('✅ Data berhasil dikirim! (periksa GAS log untuk detail)', 'success');
        return { success: true };
    } catch (error) {
        console.error('Submit data failed:', error);
        showFormResponse(`❌ Gagal mengirim: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
}

// Event Listeners
elements.checkConnectionBtn.addEventListener('click', checkConnection);

elements.fetchDataBtn.addEventListener('click', fetchData);

elements.dataForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = elements.nameInput.value.trim();
    const message = elements.messageInput.value.trim();
    
    if (!name || !message) {
        showFormResponse('❌ Nama dan pesan harus diisi!', 'error');
        return;
    }
    
    const formData = {
        name,
        message,
        timestamp: new Date().toISOString(),
        source: 'PWA'
    };
    
    const result = await submitData(formData);
    if (result.success) {
        elements.dataForm.reset();
        // Refresh data setelah submit
        setTimeout(fetchData, 1000);
    }
});

// Inisialisasi
async function init() {
    // Cek koneksi saat startup
    await checkConnection();
    
    // Coba ambil data jika online
    if (appState.isOnline) {
        await fetchData();
    }
    
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            console.log('Service Worker registered:', registration);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
}

// Jalankan inisialisasi
document.addEventListener('DOMContentLoaded', init);
