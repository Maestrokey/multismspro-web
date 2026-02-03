// script.js - VERSIÓN OPTIMIZADA Y DEFINITIVA
document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO ---
    const state = {
        apiKey: localStorage.getItem('onlinesim_apikey') || '',
        proxyUrl: 'https://mi-proxy-onlinesim.onrender.com/api/',
        tzid: null,
        smsInterval: null,
        isLoading: false,
        error: null
    };

    // --- DOM Elements ---
    const elements = {
        apiKey: document.getElementById('api-key'),
        saveConfigButton: document.getElementById('save-config'),
        buyKeyButton: document.getElementById('buy-key'),
        balanceDisplay: document.getElementById('balance-display'),
        countrySelect: document.getElementById('country-select'),
        statusDiv: document.getElementById('status'),
        debugButton: document.getElementById('debug-status'),
        phoneNumber: document.getElementById('phone-number'),
        tzidDisplay: document.getElementById('tzid'),
        activationCode: document.getElementById('sms-code'),
        getNumberButton: document.getElementById('get-number'),
        forceNewButton: document.getElementById('force-new'),
        copyCodeButton: document.getElementById('copy-code'),
        serviceCards: document.querySelectorAll('.service-card'),
        activeServiceDisplay: document.getElementById('active-service'),
        serviceCostDisplay: document.getElementById('service-cost'),
        activeServiceInfo: document.getElementById('active-service-info'),
        numberSection: document.getElementById('number-section'),
        codeSection: document.getElementById('code-section'),
        historyContent: document.getElementById('history-content')
    };

    // --- UI Functions ---
    const ui = {
        showSections: () => {
            if (elements.activeServiceInfo) elements.activeServiceInfo.style.display = 'block';
            if (elements.numberSection) elements.numberSection.style.display = 'block';
            if (elements.codeSection) elements.codeSection.style.display = 'block';
        },
        hideSections: () => {
            if (elements.activeServiceInfo) elements.activeServiceInfo.style.display = 'none';
            if (elements.numberSection) elements.numberSection.style.display = 'none';
            if (elements.codeSection) elements.codeSection.style.display = 'none';
        },
        updateStatus: (message, isError = false) => {
            if (elements.statusDiv) {
                elements.statusDiv.textContent = message;
                elements.statusDiv.style.color = isError ? 'red' : 'inherit';
            }
        },
        reset: () => {
            elements.phoneNumber.textContent = '+34 613 32 22 23'; // Placeholder
            elements.tzid.textContent = 'TZID: 187904510'; // Placeholder
            elements.activationCode.textContent = '---'; // Placeholder
            elements.getNumberButton.disabled = false;
            elements.forceNewButton.disabled = true;
            if (state.smsInterval) clearInterval(state.smsInterval);
            state.tzid = null;
            state.isLoading = false;
        },
        setLoading: (loading) => {
            state.isLoading = loading;
            elements.getNumberButton.disabled = loading;
            elements.phoneNumber.textContent = loading ? 'Solicitando...' : '+34 613 32 22 23';
            elements.getNumberButton.textContent = loading ? 'Comprando...' : '📞 Obtener Número';
        },
        setServiceInfo: (serviceName, price) => {
            if (elements.activeServiceDisplay) elements.activeServiceDisplay.textContent = serviceName;
            if (elements.serviceCostDisplay) elements.serviceCostDisplay.textContent = price;
        },
        setError: (error) => {
            state.error = error;
            console.error(error);
            ui.updateStatus(`🔴 Error: ${error.message}`, true);
            ui.reset();
        }
    };

    // --- API Functions ---
    const apiRequest = async (url, options = {}) => {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error en la petición:', error);
            throw error;
        }
    };

    const getBalance = async () => {
        if (!state.apiKey || state.apiKey === 'TU_API_KEY_AQUI') {
            ui.updateStatus('🔴 Esperando configuración de API Key.');
            return;
        }
        try {
            const data = await apiRequest(`${state.proxyUrl}onlinesim.io/api/getBalance.php?apikey=${state.apiKey}`);
            if (data.response === 'ACCESS_NUMBER' && elements.balanceDisplay) {
                ui.updateStatus('🟢 API Key verificada.');
                elements.balanceDisplay.textContent = `Saldo: $${parseFloat(data.balance).toFixed(2)}`;
            } else if (data.response === 'ERROR_WRONG_API_KEY') {
                ui.setError('API Key incorrecta.');
            } else {
                ui.setError('Respuesta inesperada de la API.');
            }
        } catch (error) {
            ui.setError('Error de conexión.');
        }
    };

    const buyNumber = async () => {
        const selectedServiceCard = document.querySelector('.service-card.selected');
        const selectedService = selectedServiceCard ? selectedCard.dataset.service : null;
        const selectedCountry = elements.countrySelect ? elements.countrySelect.value : null;

        if (!selectedService) {
            alert('Por favor, selecciona un servicio.');
            return;
        }
        if (!state.apiKey || state.apiKey === 'TU_API_KEY_AQUI') {
            alert('Por favor, configura tu API Key.');
            return;
        }

        ui.reset();
        ui.setLoading(true);

        try {
            const data = await apiRequest(`${state.proxyUrl}onlinesim.io/api/get_num.php?apikey=${state.apiKey}&service=${selectedService}&country=${selectedCountry}&ref=mail`);
            console.log(`🔍 Solicitando número para ${selectedService} en país ${selectedCountry}...`);

            if (data.response === 'NUMBER' && data.number) {
                state.tzid = data.tzid;
                ui.setServiceInfo(data.service, data.price);
                ui.phoneNumber.textContent = `+${data.number}`;
                ui.tzidDisplay.textContent = `TZID: ${data.tzid}`;
                ui.updateStatus(`✅ Número +${data.number} recibido. Esperando SMS...`);
                ui.setLoading(false);
                waitForSms();
            } else if (data.response === 'NO_NUMBER') {
                ui.setError('No hay números disponibles para este servicio.');
            } else if (data.response === 'ERROR_WRONG_API_KEY') {
                ui.setError('API Key incorrecta.');
            } else {
                ui.setError('Respuesta inesperada de la API.');
            }
        } catch (error) {
            ui.setError(`Error al comprar número: ${error.message}`);
        }
    };

    const waitForSms = () => {
        if (!state.tzid) return;
        if (state.smsInterval) clearInterval(state.smsInterval);
        let attempts = 0;
        const maxAttempts = 30;
        const delay = 5000;

        ui.activationCode.textContent = 'Esperando código...';
        ui.updateStatus('🔵� Esperando código SMS...');
        state.smsInterval = setInterval(async () => {
            attempts++;
            try {
                const data = await apiRequest(`${state.proxyUrl}onlinesim.io/getState.php?apikey=${state.apiKey}&tzid=${state.tzid}&message_to=1`);
                const status = data[0]?.response || data.response;
                if (status === 'TZ_NUM_ANSWER') {
                    const smsCode = data[0]?.msg || data.msg;
                    if (smsCode) {
                        clearInterval(state.smsInterval);
                        ui.activationCode.textContent = smsCode;
                        ui.updateStatus('🟢 ¡Código recibido!');
                        alert(`¡Código recibido! ${smsCode}`);
                        ui.setLoading(false);
                    }
                } else if (status === 'TZ_NUM_USED' || status === 'TZ_NUM_EXPIRED') {
                    clearInterval(state.smsInterval);
                    ui.activationCode.textContent = 'Sesión finalizada.';
                    ui.updateStatus('🔴 Sesión expiró.');
                } else if (status === 'TZ_NUM_WAIT' || status === 'TZ_NUM_EMPTY') {
                    // Seguir esperando...
                }
            } catch (error) {
                console.error(`Error verificando estado: ${error}`);
                ui.setError('Error al verificar el estado.');
                if (attempts >= maxAttempts) {
                    clearInterval(state.smsInterval);
                    ui.activationCode.textContent = 'Tiempo agotado.';
                    ui.updateStatus('🔴 Tiempo de espera agotado.');
                }
            }, delay);
        });
    };

    // --- Event Listeners ---
    if (elements.saveConfigButton) {
        elements.saveConfigButton.addEventListener('click', () => {
            const newApiKey = elements.apiKeyInput.value.trim();
            if (newApiKey) {
                state.apiKey = newApiKey;
                localStorage.setItem('onlinesim_apikey', state.apiKey);
                ui.updateStatus('✅ Configuración guardada.');
                getBalance();
            } else {
                alert('Introduce una API Key válida.');
            }
        });
    }

    if (elements.buyKeyButton) {
        elements.buyKeyButton.addEventListener('click', () => {
            window.open('https://onlinesim.io/', '_blank');
        });
    }
    
    if (elements.getNumberButton) {
        elements.getNumberButton.addEventListener('click', buyNumber);
    }
    if (elements.forceNewButton) {
        elements.forceNewButton.addEventListener('click', () => {
            if (state.tzid) {
                ui.setLoading(true);
                ui.phoneNumber.textContent = 'Forzando nuevo número...';
                state.tzid = null;
                if (state.smsInterval) clearInterval(state.smsInterval);
                state.smsInterval = null;
            }
            apiRequest(`${state.proxyUrl}onlinesim.io/get_num.php?apikey=${state.apiKey}&service=${document.querySelector('.service-card.selected').dataset.service}&country=${elements.countrySelect.value}&ref=mail`);
        });
    }

    if (elements.copyCodeButton) {
        elements.copyCodeButton.addEventListener('click', () => {
            const code = elements.activationCode.textContent;
            if (code && code !== '---' && code !== 'Esperando código...' && code !== 'Tiempo agotado.') {
                navigator.clipboard.writeText(code).then(() => {
                    alert('Código copiado al portapapeles.');
                }).catch(err => {
                    console.error('Error al copiar el código: ', err);
                });
            } else {
                alert('No hay un código válido para copiar.');
            }
        });
    }

    // Listener para las tarjetas de servicio
    elements.serviceCards.forEach(card => {
        card.addEventListener('click', () => {
            elements.serviceCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const serviceName = card.dataset.service.toLowerCase();
            const servicePrice = card.querySelector('.service-price').textContent;
            ui.setServiceInfo(serviceName, servicePrice);
        });
    });

    // --- Inicialización ---
    function initialize() {
        const savedApiKey = localStorage.getItem('onlinesim_apikey');
        if (savedApiKey) {
            state.apiKey = savedApiKey;
            if (elements.apiKeyInput) elements.apiKeyInput.value = state.apiKey;
        }
        getBalance();
        if (state.apiKey) {
            ui.showSections();
            ui.updateStatus('🟢 Listo para operar.');
        } else {
            ui.hideSections();
            ui.updateStatus('🔴 Esperando configuración de API Key.');
        }
    }

    initialize();
});
