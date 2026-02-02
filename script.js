console.log('🚀 Multi-SMS Pro Web iniciado');

// Variables globales
let apiKey = '';
let balance = 0;
let currentService = null;
let currentNumber = null;
let operationHistory = [];

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

// Cargar configuración guardada
function loadConfig() {
    try {
        const savedApiKey = localStorage.getItem('multisms_api_key');
        const savedBalance = localStorage.getItem('multisms_balance');
        
        if (savedApiKey) {
            apiKey = savedApiKey;
            elements.apiKey.value = apiKey;
            balance = parseFloat(savedBalance) || 0;
            elements.balanceDisplay.textContent = `Saldo: $${balance.toFixed(2)}`;
            elements.status.textContent = '🟢 Configuración cargada';
            enableServices();
        } else {
            elements.status.textContent = '🔴 Esperando configuración';
        }
    } catch (error) {
        console.error('Error cargando configuración:', error);
        elements.status.textContent = '🔴 Error cargando configuración';
    }
}

// Guardar configuración
elements.saveConfig.addEventListener('click', () => {
    try {
        apiKey = elements.apiKey.value.trim();
        if (!apiKey) {
            updateStatus('🔴 Por favor ingresa una API Key válida', 'error');
            return;
        }
        
        localStorage.setItem('multisms_api_key', apiKey);
        localStorage.setItem('multisms_balance', balance.toString());
        
        elements.balanceDisplay.textContent = `Saldo: $${balance.toFixed(2)}`;
        updateStatus('🟢 Configuración guardada correctamente', 'success');
        enableServices();
    } catch (error) {
        console.error('Error guardando configuración:', error);
        updateStatus('🔴 Error guardando configuración', 'error');
    }
});

// Comprar llave (simulado)
elements.buyKey.addEventListener('click', () => {
    updateStatus('🔵 Contactando para comprar llave...', 'info');
    setTimeout(() => {
        updateStatus('🟡 Por favor contacta al proveedor para comprar una llave', 'warning');
    }, 2000);
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

// Obtener número (simulado)
elements.getNumber.addEventListener('click', async () => {
    if (!currentService) return;
    
    try {
        updateStatus('🔵 Obteniendo número...', 'info');
        
        // Simulación de obtención de número
        setTimeout(() => {
            currentNumber = '+34' + Math.floor(Math.random() * 900000000 + 100000000);
            elements.phoneNumber.textContent = currentNumber;
            elements.codeSection.style.display = 'block';
            elements.getNumber.disabled = true;
            elements.forceNew.disabled = false;
            
            updateStatus('🟢 Número obtenido correctamente', 'success');
            addToHistory(`Número obtenido: ${currentNumber}`);
            
            // Simular recepción de código
            setTimeout(() => {
                const code = Math.floor(Math.random() * 900000 + 100000);
                elements.smsCode.textContent = code;
                updateStatus('🟢 Código SMS recibido', 'success');
                addToHistory(`Código recibido: ${code}`);
            }, 5000);
        }, 2000);
    } catch (error) {
        console.error('Error obteniendo número:', error);
        updateStatus('🔴 Error obteniendo número', 'error');
    }
});

// Forzar nuevo número
elements.forceNew.addEventListener('click', () => {
    try {
        if (confirm('¿Estás seguro de solicitar un nuevo número?')) {
            currentNumber = null;
            elements.phoneNumber.textContent = '---';
            elements.smsCode.textContent = '---';
            elements.getNumber.disabled = false;
            elements.forceNew.disabled = true;
            elements.codeSection.style.display = 'none';
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

// Debug
elements.debugStatus.addEventListener('click', () => {
    try {
        console.log('Estado actual:', {
            apiKey,
            balance,
            currentService,
            currentNumber,
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