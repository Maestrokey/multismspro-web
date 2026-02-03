// script.js - VERSIÓN FINAL Y COMPLETA

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    let currentApiKey = localStorage.getItem('onlinesim_apikey') || '';
    const PROXY_URL = 'https://mi-proxy-onlinesim.onrender.com/api/';

    // --- ELEMENTOS DEL DOM ---
    const apiKeyInput = document.getElementById('api-key');
    const saveConfigButton = document.getElementById('save-config');
    const buyKeyButton = document.getElementById('buy-key'); // Botón para comprar llave
    const balanceDisplay = document.getElementById('balance-display');
    const countrySelect = document.getElementById('country-select');
    const statusDiv = document.getElementById('status');
    const debugButton = document.getElementById('debug-status');

    // Secciones que se mostrarán/ocultarán
    const numberSection = document.getElementById('number-section');
    const codeSection = document.getElementById('code-section');
    const activeServiceInfo = document.getElementById('active-service-info');

    // Elementos dentro de las secciones
    const phoneNumberSpan = document.getElementById('phone-number');
    const tzidSpan = document.getElementById('tzid');
    const activationCodeSpan = document.getElementById('sms-code');
    const activeServiceDisplay = document.getElementById('active-service');
    const serviceCostDisplay = document.getElementById('service-cost');
    const getNumberButton = document.getElementById('get-number');
    const forceNewButton = document.getElementById('force-new');
    const copyCodeButton = document.getElementById('copy-code');

    // --- ESTADO ---
    let activeTzid = null;
    let smsInterval = null;

    // --- FUNCIONES DE UI ---
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
        if (tzidSpan) tzidSpan.textContent = '';
        if (activationCodeSpan) activationCodeSpan.textContent = '---';
        if (getNumberButton) getNumberButton.disabled = false;
        if (forceNewButton) forceNewButton.disabled = true;
        if (smsInterval) clearInterval(smsInterval);
        activeTzid = null;
    }

    // --- FUNCIONES PRINCIPALES ---

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
                updateStatus('🟢 API Key configurada y saldo cargado.');
            } else if (data.response === 'ERROR_WRONG_API_KEY') {
                throw new Error('API Key inválida.');
            }
        } catch (error) {
            console.error('Error obteniendo balance:', error);
            if (balanceDisplay) balanceDisplay.textContent = 'Saldo: Error';
            updateStatus('🔴 Error al verificar la API Key.', true);
        }
    }

    async function buyNumber() {
        const selectedServiceCard = document.querySelector('.service-card.selected');
        const selectedService = selectedServiceCard ? selectedServiceCard.dataset.service : null;
        const selectedCountry = countrySelect ? countrySelect.value : null;

        if (!currentApiKey) {
            alert('Por favor, guarda tu API Key primero.');
            return;
        }
        if (!selectedService) {
            alert('Por favor, selecciona un servicio.');
            return;
        }

        resetUI();
        if (getNumberButton) getNumberButton.disabled = true;
        updateStatus('🔵 Solicitando número...', false);
        if (phoneNumberSpan) phoneNumberSpan.textContent = 'Solicitando...';

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
            } else {
                throw new Error('La API devolvió una respuesta inesperada.');
            }

        } catch (error) {
            console.error('❌ Error:', error);
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
                    updateStatus('🔴 Número usado o expiró.', true);
                }
            } catch (error) {
                console.error(`Error verificando estado:`, error);
            }

            if (attempts >= maxAttempts) {
                clearInterval(smsInterval);
                if (activationCodeSpan) activationCodeSpan.textContent = 'Tiempo agotado';
                updateStatus('🔴 Tiempo de espera agotado.', true);
            }
        }, delay);
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
            // Redirige al usuario a la página de compra de claves de OnlineSim
            window.open('https://onlinesim.io/pay', '_blank');
        });
    }
    
    if (getNumberButton) getNumberButton.addEventListener('click', buyNumber);

    if (copyCodeButton) {
        copyCodeButton.addEventListener('click', () => {
            const code = activationCodeSpan ? activationCodeSpan.textContent : '';
            if (code && code !== '---' && code !== 'Esperando código...' && code !== 'Tiempo agotado') {
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
        });
    });

    if (debugButton) {
        debugButton.addEventListener('click', () => {
            console.log('--- ESTADO DE DEPURACIÓN ---');
            console.log('API Key:', currentApiKey ? 'Configurada' : 'No configurada');
            console.log('Servicio seleccionado:', document.querySelector('.service-card.selected')?.dataset.service);
            console.log('País seleccionado:', countrySelect?.value);
            console.log('TZID activo:', activeTzid);
            console.log('--------------------------');
        });
    }

    // --- INICIALIZACIÓN ---
    function initialize() {
        if (apiKeyInput) apiKeyInput.value = currentApiKey;
        
        if (currentApiKey) {
            getBalance();
            showSections();
            updateStatus('🟢 Listo para operar.');
        } else {
            hideSections();
            updateStatus('🔴 Esperando configuración de API Key.');
        }
    }

    initialize();
});

