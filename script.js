console.log('🚀 Multi-SMS Pro Web iniciado');

// Variables globales
let apiKey = '';
let realBalance = 0;
let currentService = null;
let currentNumber = null;
let operationHistory = [];
let tzid = null;

// Elementos del DOM
const elements = {
    apiKey: document.getElementById('api-key'),
    saveConfig: document.getElementById('save-config'),
    buyKey: document.getElementById('buy-key'),
    countrySelect: document.getElementById('country-select'),
    servicesGrid: document.getElementById('services-grid'),
    balanceDisplay: document.getElementById('balance-display'),
    activeServiceInfo: document.getElementById('active-service-info'),
    activeService: document.getElementById('active-service'),
    serviceCost: document.getElementById('service-cost'),
    numberSection: document.getElementById('number-section'),
    phoneNumber: document.getElementById('phone-number'),
    getNumber: document.getElementById('get-number'),
    forceNew: document.getElementById('force-new'),
    codeSection: document.getElementById('code-section'),
    smsCode: document.getElementById('sms-code'),
    copyCode: document.getElementById('copy-code'),
    historySection: document.getElementById('history-section'),
    historyContent: document.getElementById('history-content'),
    status: document.getElementById('status'),
    debugStatus: document.getElementById('debug-status')
};

// Función para hacer peticiones a la API
async function makeApiCall(endpoint, params = '') {
    try {
        const url = `https://onlinesim.ru/api/${endpoint}.php?apikey=${apiKey}&${params}`;
        console.log('🔍 Llamada API:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📋 Respuesta API:', data);
        return data;
    } catch (error) {
        console.error('❌ Error API:', error);
        throw error;
    }
}

// Cargar configuración guardada
function loadConfig() {
    try {
        const savedApiKey = localStorage.getItem('multisms_api_key');
        
        if (savedApiKey) {
            apiKey = savedApiKey;
            elements.apiKey.value = apiKey;
            elements.status.textContent = '🔵 Verificando API Key...';
            
            // Verificar API Key y obtener saldo real
            verifyApiKey();
        } else {
            elements.status.textContent = '🔴 Esperando configuración';
        }
    } catch (error) {
        console.error('Error cargando configuración:', error);
        elements.status.textContent = '🔴 Error cargando configuración';
    }
}

// Verificar API Key con la API real
async function verifyApiKey() {
    try {
        const data = await makeApiCall('getBalance');
        
        if (data.balance !== undefined) {
            realBalance = parseFloat(data.balance);
            elements.balanceDisplay.textContent = `Saldo: $${realBalance.toFixed(2)}`;
            
            // Verificar si hay saldo suficiente
            if (realBalance < 0.9) {
                elements.status.textContent = '🔡 Saldo insuficiente para wallapop ($0.9)';
            } else {
                elements.status.textContent = '🟢 API Key válida';
                enableServices();
            }
        } else {
            throw new Error('API Key inválida');
        }
    } catch (error) {
        console.error('Error verificando API Key:', error);
        elements.status.textContent = '🔴 API Key inválida';
        localStorage.removeItem('multisms_api_key');
    }
}

// Guardar configuración
elements.saveConfig.addEventListener('click', async () => {
    try {
        apiKey = elements.apiKey.value.trim();
        if (!apiKey) {
            updateStatus('🔴 Por favor ingresa una API Key válida', 'error');
            return;
        }
        
        elements.status.textContent = '🔵 Verificando API Key...';
        
        // Verificar API Key antes de guardar
        const data = await makeApiCall('getBalance');
        
        if (data.balance !== undefined) {
            localStorage.setItem('multisms_api_key', apiKey);
            realBalance = parseFloat(data.balance);
            elements.balanceDisplay.textContent = `Saldo: $${realBalance.toFixed(2)}`;
            updateStatus('🟢 API Key guardada y verificada', 'success');
            enableServices();
        } else {
            throw new Error('API Key inválida');
        }
    } catch (error) {
        console.error('Error guardando configuración:', error);
        updateStatus('🔴 API Key inválida. Verifícala e intenta nuevamente.', 'error');
    }
});

// Comprar llave
elements.buyKey.addEventListener('click', () => {
    updateStatus('🔵 Abriendo tu canal de Telegram...', 'info');
    
    // Abrir directamente en navegador (más compatible)
    window.open('https://t.me/Multi_SMSPro', '_blank');
    
    // Mostrar instrucciones adicionales
    setTimeout(() => {
        updateStatus('📋 Sigue las instrucciones en Telegram', 'info');
    }, 1000);
});

// Seleccionar servicio
function enableServices() {
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.addEventListener('click', () => selectService(card));
    });
}

function selectService(card) {
    try {
        document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        
        currentService = card.dataset.service;
        const serviceName = card.querySelector('.service-name').textContent;
        const servicePrice = card.querySelector('.service-price').textContent;
        
        elements.activeService.textContent = serviceName;
        elements.serviceCost.textContent = servicePrice;
        elements.activeServiceInfo.style.display = 'block';
        elements.numberSection.style.display = 'block';
        
        elements.getNumber.disabled = false;
        elements.forceNew.disabled = false;
        
        updateStatus(`🟢 Servicio seleccionado: ${serviceName}`, 'success');
    } catch (error) {
        console.error('Error seleccionando servicio:', error);
        updateStatus('🔴 Error seleccionando servicio', 'error');
    }
}

// Obtener número real
elements.getNumber.addEventListener('click', async () => {
    if (!currentService) return;
    
    try {
        updateStatus('🔵 Obteniendo número real...', 'info');
        
        // Obtener número real de la API
        const data = await makeApiCall('getNum', `service=${currentService}&country=${elements.countrySelect.value}`);
        
        console.log('Respuesta completa de getNum:', data); // Debug
        
        // Verificar diferentes formatos de respuesta
        if (data && data.tzid) {
            tzid = data.tzid;
            elements.phoneNumber.textContent = data.number || `TZID: ${tzid}`;
            elements.codeSection.style.display = 'block';
            elements.getNumber.disabled = true;
            elements.forceNew.disabled = false;
            
            updateStatus('🟢 Número obtenido correctamente', 'success');
            addToHistory(`Número obtenido: ${data.number || tzid}`);
            
            // Comenzar a verificar el código
            startCodeVerification();
        } else if (data && data.response === 'NO_NUMBER') {
            updateStatus('🔴 No hay números disponibles para este servicio', 'error');
        } else if (data && data.response === 'NO_BALANCE') {
            updateStatus('🔴 Saldo insuficiente', 'error');
        } else if (data && data.response === 'EXCEPTION') {
            updateStatus('🔴 Error temporal del servidor. Intenta en 1 minuto.', 'error');
        } else if (data && Object.keys(data).length === 0) {
            updateStatus('🔴 Respuesta vacía. Intenta con otro país.', 'error');
        } else {
            console.error('Respuesta inesperada:', data);
            updateStatus('🔴 Error desconocido. Revisa la consola.', 'error');
        }
    } catch (error) {
        console.error('Error obteniendo número:', error);
        updateStatus('🔴 Error de conexión con la API', 'error');
    }
});

// Verificar código SMS real
async function startCodeVerification() {
    try {
        updateStatus('🔵 Esperando código SMS...', 'info');
        
        const checkInterval = setInterval(async () => {
            try {
                const data = await makeApiCall('getState', `tzid=${tzid}`);
                
                if (data.response === 'STATUS_OK') {
                    clearInterval(checkInterval);
                    elements.smsCode.textContent = data.msg || data.code || 'Código recibido';
                    updateStatus('🟢 Código SMS recibido', 'success');
                    addToHistory(`Código recibido: ${data.msg || data.code}`);
                    
                    // Actualizar saldo
                    setTimeout(() => updateBalance(), 2000);
                } else if (data.response === 'STATUS_WAIT_CODE') {
                    updateStatus('🔵 Esperando código...', 'info');
                } else if (data.response === 'STATUS_CANCEL') {
                    clearInterval(checkInterval);
                    updateStatus('🔴 Operación cancelada', 'error');
                }
            } catch (error) {
                console.error('Error verificando código:', error);
            }
        }, 3000); // Verificar cada 3 segundos
        
        // Detener después de 5 minutos máximo
        setTimeout(() => {
            clearInterval(checkInterval);
            if (elements.smsCode.textContent === '---') {
                updateStatus('🔴 Tiempo de espera agotado', 'error');
            }
        }, 300000);
        
    } catch (error) {
        console.error('Error iniciando verificación:', error);
        updateStatus('🔴 Error iniciando verificación', 'error');
    }
}

// Forzar nuevo número
elements.forceNew.addEventListener('click', async () => {
    try {
        if (confirm('¿Estás seguro de solicitar un nuevo número?')) {
            // Cancelar operación actual
            if (tzid) {
                await makeApiCall('setOperationOk', `tzid=${tzid}&ban=1`);
            }
            
            // Resetear estado
            tzid = null;
            currentNumber = null;
            elements.phoneNumber.textContent = '---';
            elements.smsCode.textContent = '---';
            elements.getNumber.disabled = false;
            elements.forceNew.disabled = true;
            elements.codeSection.style.display = 'no';
            
            updateStatus('🔵 Listo para obtener nuevo número', 'info');
        }
    } catch (error) {
        console.error('Error forzando nuevo número:', error);
        updateStatus('🔴 Error forzando nuevo número', 'error');
    }
});

// Copiar código
elements.copyCode.addEventListener('click', () => {
    try {
        const code = elements.smsCode.textContent;
        if (code && code !== '---') {
            navigator.clipboard.writeText(code).then(() => {
                updateStatus('🟢 Código copiado al portapapeles', 'success');
            }).catch(() => {
                updateStatus('🔴 Error copiando código', 'error');
            });
        }
    } catch (error) {
        console.error('Error copiando código:', error);
        updateStatus('🔴 Error copiando código', 'error');
    }
});

// Actualizar saldo
async function updateBalance() {
    try {
        const data = await makeApiCall('getBalance');
        if (data.balance !== undefined) {
            realBalance = parseFloat(data.balance);
            elements.balanceDisplay.textContent = `Saldo: $${realBalance.toFixed(2)}`;
        }
    } catch (error) {
        console.error('Error actualizando saldo:', error);
    }
}

// Debug
elements.debugStatus.addEventListener('click', () => {
    try {
        console.log('Estado actual:', {
            apiKey,
            realBalance,
            currentService,
            currentNumber,
            tzid,
            history: operationHistory
        });
        alert('Debug: Revisa la consola (F12)');
    } catch (error) {
        console.error('Error en debug:', error);
    }
});

// Funciones auxiliares
function updateStatus(message, type = 'info') {
    try {
        elements.status.textContent = message;
        console.log(`[${type.toUpperCase()}] ${message}`);
    } catch (error) {
        console.error('Error actualizando estado:', error);
    }
}

function addToHistory(action) {
    try {
        const timestamp = new Date().toLocaleTimeString();
        operationHistory.unshift({ action, timestamp });
        
        if (operationHistory.length > 10) {
            operationHistory.pop();
        }
        
        updateHistoryDisplay();
    } catch (error) {
        console.error('Error añadiendo al historial:', error);
    }
}

function updateHistoryDisplay() {
    try {
        if (operationHistory.length === 0) {
            elements.historyContent.innerHTML = '<p class="no-history">No hay operaciones recientes</p>';
            return;
        }
        
        elements.historyContent.innerHTML = operationHistory
            .map(item => `
                <div class="history-item">
                    <strong>${item.timestamp}</strong> - ${item.action}
                </div>
            `).join('');
    } catch (error) {
        console.error('Error actualizando historial:', error);
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Web iniciada');
    loadConfig();
    updateHistoryDisplay();
});
