document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    // IMPORTANTE: Reemplaza 'TU_API_KEY_AQUI' por tu clave real de OnlineSim.
    // Para compartir, es mejor usar placeholders como este.
    let currentApiKey = 'TU_API_KEY_AQUI';

    // CAMBIO CLAVE: Usamos un proxy más estable para evitar el error 429.
    // Si este falla, la única solución definitiva es crear tu propio proxy en la nube (Render, Heroku).
    const PROXY_URL = 'https://api.allorigins.win/raw?url=';

    // --- ELEMENTOS DEL DOM ---
    const serviceSelect = document.getElementById('service-select');
    const countrySelect = document.getElementById('country-select');
    const buyButton = document.getElementById('buy-button'); // Asumiendo que tu botón tiene este ID
    const phoneNumberSpan = document.getElementById('phone-number');
    const activationCodeSpan = document.getElementById('activation-code');
    const tzidSpan = document.getElementById('tzid');
    const balanceSpan = document.getElementById('balance');
    const saveConfigButton = document.getElementById('save-config');
    const apiKeyInput = document.getElementById('api-key'); // ID del input de API Key en tu HTML
    const activeServiceDisplay = document.getElementById('active-service');
    const serviceCostDisplay = document.getElementById('service-cost');
    const statusDiv = document.getElementById('status');
    const forceNewButton = document.getElementById('force-new');

    // --- ESTADO ---
    let activeTzid = null;
    let smsInterval = null;

    // --- FUNCIONES PRINCIPALES ---

    // Función principal para comprar un número
    async function buyNumber() {
        const selectedService = serviceSelect.value;
        const selectedCountry = countrySelect.value;

        if (!currentApiKey || currentApiKey === 'TU_API_KEY_AQUI') {
            alert('Por favor, configura tu API Key en la sección de configuración.');
            return;
        }

        resetUI();
        setUIState('loading');
        phoneNumberSpan.textContent = 'Solicitando número...';

        try {
            // Usamos el endpoint correcto para obtener un número de un solo uso
            const getNumUrl = `${PROXY_URL}https://onlinesim.io/api/get_num.php?apikey=${currentApiKey}&service=${selectedService}&country=${selectedCountry}&ref=mail`;
            console.log(`🔍 Solicitando número para ${selectedService} en país ${selectedCountry}...`);
            
            const response = await fetch(getNumUrl);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            console.log('✅ Respuesta de get_num:', data);

            // --- MANEJO CORRECTO DE LA RESPUESTA ---
            if (data.response === 'NUMBER' && data.number) {
                // ÉXITO: La API te da el número directamente
                const phoneNumber = data.number;
                activeTzid = data.tzid;

                phoneNumberSpan.textContent = `+${phoneNumber}`;
                tzidSpan.textContent = `TZID: ${activeTzid}`;
                alert(`¡Número obtenido con éxito! +${phoneNumber}`);
                setUIState('received');
                waitForSms(activeTzid);

            } else if (data.response === 'NO_NUMBER') {
                throw new Error('No hay números disponibles para este servicio en este momento.');
            } else if (data.response === 'ERROR_NO_SERVICE') {
                throw new Error('El servicio seleccionado no es válido.');
            } else if (data.response === 'ERROR_WRONG_API_KEY') {
                throw new Error('Tu API Key es incorrecta o está bloqueada.');
            } else {
                // Si la API devuelve solo el TZID (lo que te pasaba antes), es un comportamiento inesperado para get_num
                if (data.response === 1 && data.tzid) {
                    throw new Error('La API devolvió solo TZID. Esto puede indicar un problema con el servicio o el endpoint. Revisa la consola.');
                }
                throw new Error('La API devolvió una respuesta inesperada.');
            }

        } catch (error) {
            console.error('❌ Error al comprar el número:', error);
            phoneNumberSpan.textContent = `Error: ${error.message}`;
            alert(`Ocurrió un error: ${error.message}`);
            setUIState('error');
        }
    }

    // Función para esperar el código SMS
    function waitForSms(tzid) {
        if (smsInterval) clearInterval(smsInterval);
        
        let attempts = 0;
        const maxAttempts = 30; // 30 intentos * 5 seg = 150 segundos (2.5 min)
        const delay = 5000; // 5 segundos

        activationCodeSpan.textContent = 'Esperando código...';
        statusDiv.textContent = '🔵 Esperando código SMS...';

        smsInterval = setInterval(async () => {
            attempts++;
            console.log(`⏳ Esperando SMS (intento ${attempts}/${maxAttempts}) para TZID: ${tzid}`);
            
            try {
                const stateUrl = `${PROXY_URL}https://onlinesim.io/api/getState.php?apikey=${currentApiKey}&tzid=${tzid}&message_to=1`;
                const stateResponse = await fetch(stateUrl);
                const stateData = await stateResponse.json();
                
                // La API a veces devuelve un array, a veces un objeto. Manejamos ambos.
                const status = stateData[0]?.response || stateData.response;

                if (status === 'TZ_NUM_ANSWER') {
                    const smsCode = stateData[0]?.msg || stateData.msg;
                    if (smsCode) {
                        clearInterval(smsInterval);
                        activationCodeSpan.textContent = smsCode;
                        statusDiv.textContent = '✅ Código recibido';
                        alert(`¡Código recibido! ${smsCode}`);
                        setUIState('code');
                    }
                } else if (status === 'TZ_NUM_USED' || status === 'TZ_NUM_EXPIRED') {
                    clearInterval(smsInterval);
                    activationCodeSpan.textContent = 'Sesión finalizada';
                    statusDiv.textContent = '🔴 Número usado o expirado';
                    alert('El número fue usado o la sesión expiró.');
                    setUIState('error');
                } else if (status === 'TZ_NUM_WAIT' || status === 'TZ_NUM_EMPTY') {
                    // Seguir esperando...
                }

            } catch (error) {
                console.error(`Error al verificar el estado del TZID ${tzid}:`, error);
            }

            if (attempts >= maxAttempts) {
                clearInterval(smsInterval);
                activationCodeSpan.textContent = 'Tiempo agotado';
                statusDiv.textContent = '🔴 Tiempo de espera agotado';
                alert('No se recibió el SMS a tiempo.');
                setUIState('error');
            }
        }, delay);
    }

    // Función para obtener el balance
    async function getBalance() {
        if (!currentApiKey || currentApiKey === 'TU_API_KEY_AQUI') {
            balanceSpan.textContent = 'N/A';
            return;
        }
        try {
            const balanceUrl = `${PROXY_URL}https://onlinesim.io/api/getBalance.php?apikey=${currentApiKey}`;
            const response = await fetch(balanceUrl);
            const data = await response.json();
            if (data.response === 'ACCESS_NUMBER') {
                balanceSpan.textContent = `$${parseFloat(data.balance).toFixed(2)}`;
            } else if (data.response === 'ERROR_WRONG_API_KEY') {
                balanceSpan.textContent = 'API Key Inválida';
            } else {
                balanceSpan.textContent = 'Error';
            }
        } catch (error) {
            console.error('Error obteniendo balance:', error);
            balanceSpan.textContent = 'Error de conexión';
        }
    }

    // Función para resetear la UI
    function resetUI() {
        phoneNumberSpan.textContent = '';
        activationCodeSpan.textContent = '---';
        tzidSpan.textContent = '';
        if (smsInterval) {
            clearInterval(smsInterval);
            smsInterval = null;
        }
        activeTzid = null;
    }

    // Función para cambiar el estado de los botones y la UI
    function setUIState(state) {
        buyButton.disabled = (state === 'loading');
        forceNewButton.disabled = (state !== 'received' && state !== 'code');
        if (state === 'loading') {
            buyButton.textContent = 'Comprando...';
        } else {
            buyButton.textContent = '📞 Obtener Número';
        }
    }
    
    // Función para forzar un nuevo número (cancela el actual y pide otro)
    async function forceNewNumber() {
        if (!activeTzid) {
            alert('No hay ninguna operación activa para cancelar.');
            return;
        }
        if (!confirm('¿Estás seguro de que quieres cancelar este número y solicitar otro? Se te cobrará de nuevo.')) {
            return;
        }

        try {
            const banUrl = `${PROXY_URL}https://onlinesim.io/api/setOperationOk.php?apikey=${currentApiKey}&tzid=${activeTzid}&ban=1`;
            await fetch(banUrl);
            console.log(`Operación ${activeTzid} cancelada.`);
            resetUI();
            buyNumber(); // Inicia la compra de un nuevo número
        } catch (error) {
            console.error('Error al forzar nuevo número:', error);
            alert('No se pudo cancelar la operación actual.');
        }
    }


    // --- EVENT LISTENERS ---
    if (buyButton) buyButton.addEventListener('click', buyNumber);
    if (forceNewButton) forceNewButton.addEventListener('click', forceNewNumber);
    
    if (saveConfigButton) {
        saveConfigButton.addEventListener('click', () => {
            const newApiKey = apiKeyInput.value.trim();
            if (newApiKey) {
                currentApiKey = newApiKey;
                localStorage.setItem('onlinesim_apikey', currentApiKey);
                alert('Configuración guardada.');
                getBalance(); // Actualizar balance con la nueva key
            } else {
                alert('Por favor, introduce una API Key válida.');
            }
        });
    }

    // Listener para actualizar el servicio activo y su coste
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.addEventListener('click', () => {
            serviceCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const serviceName = card.dataset.service.toLowerCase();
            const servicePrice = card.querySelector('.service-price').textContent;
            
            if (activeServiceDisplay) activeServiceDisplay.textContent = serviceName;
            if (serviceCostDisplay) serviceCostDisplay.textContent = servicePrice;
            if (serviceSelect) serviceSelect.value = card.dataset.service; // Sincroniza con el select si existe
        });
    });


    // --- INICIALIZACIÓN ---
    function initialize() {
        // Cargar API Key desde localStorage si existe
        const savedApiKey = localStorage.getItem('onlinesim_apikey');
        if (savedApiKey) {
            currentApiKey = savedApiKey;
            if (apiKeyInput) apiKeyInput.value = currentApiKey;
        }
        
        // Cargar balance inicial
        getBalance();
    }

    initialize();
});
