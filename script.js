// script.js - VERSIÓN FINAL Y CORREGIDA
document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    let currentApiKey = localStorage.getItem('onlinesim_apikey') || '';
    // CAMBIO CLAVE: Usa tu URL de Render aquí.
    const PROXY_URL = 'https://mi-proxy-onlinesim.onrender.com/api/';
    
    // --- ELEMENTOS DEL DOM ---
    const apiKeyInput = document.getElementById('api-key');
    const saveConfigButton = document.getElementById('save-config');
    const buyKeyButton = document.getElementById('buy-key');
    const balanceDisplay = document.getElementById('balance-display');
    const countrySelect = document.getElementById('country-select');
    const statusDiv = const.getElementById('status');
    const debugButton = document.getElementById('debug-status');

    // Secciones que se mostrarán/ocultarán
    const numberSection = document.getElementById('number-section');
    const codeSection = codeSection = document.getElementById('code-section');
    const activeServiceInfo = document.getElementById('active-service-info');
    const getNumberButton = document.getElementById('get-number');
    const forceNewButton = document.getElementById('force-new');
    const copyCodeButton = document.getElementById('copy-code');

    // --- ESTADO ---
    let activeTzid = null;
    let smsInterval = null;

    // --- FUNCIONES PRINCIPALES ---

    function showSections() {
        if (activeServiceInfo) activeServiceInfo.style.display = 'block';
        if (numberSection) numberSection.style.display = 'block';
        if (codeSection) codeSection.style.display = 'block';
    }

    function hideSections() {
        if (activeServiceInfo) activeServiceInfo.style.display = 'none';
        if (numberSection) numberSection.style.display = 'none';
        if (codeSection) codeSection.style.display = 'none';
    }

    function updateStatus(message, isError = false) {
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.style.color = isError ? 'red' : 'inherit';
        }
    }

    function resetUI() {
        if (phoneNumberSpan) phoneNumberSpan.textContent = '';
        if (activationCodeSpan) activationCodeSpan.textContent = '---';
        if (smsInterval) clearInterval(smsInterval);
        activeTzid = null;
        if (getNumberButton) getNumberButton.disabled = false;
        if (forceNewButton) forceNewButton.disabled = true;
    }

    async function getBalance() {
        if (!currentApiKey) {
            if (balanceDisplay) balanceDisplay.textContent = 'Saldo: N/A';
            return;
        }
        try {
            const balanceUrl = `${PROXY_URL}https://onlinesim.io/api/getBalance.php?apikey=${currentApiKey}`;
            const response = await fetch(balanceUrl);
            const data = await response.json();
            if (data.response === 'ACCESS_NUMBER' && balanceDisplay) {
                balanceDisplay.textContent = `Saldo: $${parseFloat(data.balance).toFixed(2)}`;
                updateStatus('🟢 API Key verificada.');
            } else if (data.response === 'ERROR_WRONG_API_KEY') {
                updateStatus('🔴 Error al verificar la API Key.', true);
            }
        } catch (error) {
            console.error('Error obteniendo balance:', error);
            updateStatus('🔴 Error de conexión al verificar la API Key.', true);
        }
    }

    async function buyNumber() {
        const selectedServiceCard = document.querySelector('.service-card.selected');
        const selectedService = selectedServiceCard ? selectedService.dataset.service : null;
        const selectedCountry = countrySelect ? countrySelect.value : null;

        if (!selectedService) {
            alert('Por favor, selecciona un servicio.');
            return;
        }
        if (!currentApiKey || currentApiKey === 'TU_API_KEY_AQUI') {
            alert('Por favor, configura tu API Key.');
            return;
        }

        resetUI();
        setUIState('loading');
        if (phoneNumberSpan) phoneNumberSpan.textContent = 'Solicitando número...';

        try {
            const getNumUrl = `${PROXY_URL}https://onlinesim.io/api/get_num.php?apikey=${currentApiKey}&service=${selectedService}&country=${selectedCountry}&ref=mail`;
            console.log(`🔍 Solicitando número para ${selectedService} en país ${selectedCountry}...`);
            
            const response = await fetch(getNumUrl);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            const data = await response.json();
            console.log('✅ Respuesta de get_num:', data);

            if (data.response === 'NUMBER' && data.number) {
                const phoneNumber = data.number;
                activeTzid = data.tzid;

                if (phoneNumberSpan) phoneNumberSpan.textContent = `+${phoneNumber}`;
                if (tzidSpan) tzidSpan.textContent = `TZID: ${activeTzid}`;
                updateStatus(`✅ Número +${phoneNumber} recibido. Esperando SMS...`);
                if (forceNewButton) forceNewButton.disabled = false;
                waitForSms(activeTzid);

            } else if (data.response === 'NO_NUMBER') {
                throw new Error('No hay números disponibles para este servicio.');
            } else if (data.response === 'ERROR_WRONG_API_KEY') {
                throw new Error('Tu API Key es incorrecta.');
            } else {
                throw new Error('La API devolvió una respuesta inesperada.');
            }

        } catch (error) {
            console.error('❌� Error:', error);
            updateStatus(`🔴 Error: ${error.message}`, true);
            if (phoneNumberSpan) phoneNumberSpan.textContent = `Error: ${error.message}`;
            alert(`Ocurrió un error: ${error.message}`);
        } finally {
            if (getNumberButton) getNumberButton.disabled = false;
        }
    }

    function waitForSms(tzid) {
        if (smsInterval) clearInterval(smsInterval);
        let attempts = 0;
        const maxAttempts = 30;
        const delay = 5000;

        if (activationCodeSpan) activationCodeSpan.textContent = 'Esperando código...';
        updateStatus('🔵 Esperando código SMS...');

        smsInterval = setInterval(async () => {
            attempts++;
            try {
                const stateUrl = `${PROXY_URL}https://onlinesim.io/api/getState.php?apikey=${currentApiKey}&tzid=${tzid}&message_to=1`;
                const stateResponse = await fetch(stateUrl);
                const stateData = await stateResponse.json();
                const status = stateData[0]?.response || stateData.response;

                if (status === 'TZ_NUM_ANSWER') {
                    const smsCode = stateData[0]?.msg || stateData.msg;
                    if (smsCode) {
                        clearInterval(smsInterval);
                        if (activationCodeSpan) activationCodeSpan.textContent = smsCode;
                        updateStatus('🟢 ¡Código recibido!');
                        alert(`¡Código recibido! ${smsCode}`);
                    }
                } else if (status === 'TZ_NUM_USED' || status === 'TZ_NUM_EXPIRED') {
                    clearInterval(smsInterval);
                    if (activationCodeSpan) activationCodeSpan.textContent = 'Sesión finalizada';
                    updateStatus('🔴 Sesión expiró.');
                }
                } else if (status === 'TZ_NUM_WAIT' || status === 'TZ_NUM_EMPTY') {
                    // Seguir esperando...
                }

            } catch (error) {
                console.error(`Error verificando estado: ${error}`);
            }

            if (attempts >= maxAttempts) {
                clearInterval(smsInterval);
                if (activationCodeSpan) activationCodeSpan.textContent = 'Tiempo agotado.';
                updateStatus('🔴 Tiempo de espera agotado.', true);
            }
        }, delay);
    }

    function setUIState(state) {
        if (getNumberButton) getNumberButton.disabled = (state === 'loading');
        if (forceNewButton) forceNewButton.disabled = (state !== 'received' && state !== 'code');
        if (getNumberButton) {
            getNumberButton.textContent = (state === 'loading') ? 'Comprando...' : '📞 Obtener Número';
        }
    }

    // --- EVENT LISTENERS ---
    if (saveConfigButton) {
        saveConfigButton.addEventListener('click', () => {
            const newApiKey = apiKeyInput.value.trim();
            if (newApiKey) {
                currentApiKey = newApiKey;
                localStorage.setItem('onlinesim_apikey', currentApiKey);
                alert('Configuración guardada.');
                getBalance();
            } else {
                alert('Introduce una API Key válida.');
            }
        });
    }

    if (buyKeyButton) {
        buyKeyButton.addEventListener('click', () => {
            window.open('https://onlinesim.io/', '_blank');
        });
    }
    
    if (getNumberButton) getNumberButton.addEventListener('click', buyNumber);
    if (forceNewButton) forceNewButton.addEventListener('click', () => {
        forceNewNumber();
    });

    if (copyCodeButton) {
        copyCodeButton.addEventListener('click', () => {
            const code = activationCodeSpan ? activationCodeSpan.textContent : '';
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
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.addEventListener('click', () => {
            serviceCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const serviceName = card.dataset.service.toLowerCase();
            const servicePrice = card.querySelector('.service-price').textContent;
            if (activeServiceDisplay) activeServiceDisplay.textContent = serviceName;
            if (serviceCostDisplay) serviceCostDisplay.textContent = servicePrice;
            if (serviceSelect) serviceSelect.value = card.dataset.service;
        });
    });

    // --- INICIALIZACIÓN ---
    function initialize() {
        const savedApiKey = localStorage.getItem('onlinesim_apikey');
        if (savedApiKey) {
            currentApiKey = savedApiKey;
            if (apiKeyInput) apiKeyInput.value = currentApiKey;
        }
        getBalance();
        if (currentApiKey) {
            showSections();
            updateStatus('🟢 Listo para operar.');
        } else {
            hideSections();
            updateStatus('🔴 Esperando configuración de API Key.');
        }
    }

    initialize();
});
