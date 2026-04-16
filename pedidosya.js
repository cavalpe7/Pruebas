/**
 * pedidosya.js — Módulo PedidosYa Courier API (MODO DEMO / SIMULADO)
 * Panuts Logística v2.0
 *
 * IMPORTANTE: Este archivo simula la integración con PedidosYa Courier API.
 * Para producción real, las llamadas API deben pasar por un backend seguro
 * (Node.js / PHP / Laravel) que maneje tokens y autenticación.
 *
 * API Reference: https://developers.pedidosya.com/courier-doc/shipping-delivery
 *
 * CONDICIÓN: Solo habilitado para warehouseId === 'WH001' (ALMACÉN SURQUILLO)
 */

const PedidosYa = (() => {

    // ─── Constantes ───────────────────────────────────────────────────────────
    const SURQUILLO_WAREHOUSE_ID = 'WH001';
    const PEDIDOSYA_ORANGE = '#FF5A00';

    // Estados posibles de PedidosYa Courier API
    const PEDIDOSYA_STATES = {
        pending:    { label: 'Pendiente',       color: '#f59e0b', icon: '⏳' },
        assigned:   { label: 'Rider Asignado',  color: '#3b82f6', icon: '🛵' },
        picked_up:  { label: 'Recogido',        color: '#8b5cf6', icon: '📦' },
        in_transit: { label: 'En Tránsito',     color: '#06b6d4', icon: '🚴' },
        delivered:  { label: 'Entregado',       color: '#10b981', icon: '✅' },
        canceled:   { label: 'Cancelado',       color: '#ef4444', icon: '❌' }
    };

    // Riders mock para demostración
    const MOCK_RIDERS = [
        { id: 'PYR001', name: 'Carlos Rider PY', phone: '+51987001001', vehicle: 'Moto' },
        { id: 'PYR002', name: 'Ana Motoflash PY', phone: '+51987001002', vehicle: 'Bicicleta' },
        { id: 'PYR003', name: 'Luis Veloz PY',    phone: '+51987001003', vehicle: 'Moto' }
    ];

    // ─── Validaciones ─────────────────────────────────────────────────────────

    /** Verifica si un pedido pertenece al almacén Surquillo */
    function isSurquilloOrder(order) {
        return order && order.warehouseId === SURQUILLO_WAREHOUSE_ID;
    }

    /** Genera un shipping_id único simulado */
    function _generateShippingId() {
        const ts = Date.now().toString(36).toUpperCase();
        const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `PY-${ts}-${rnd}`;
    }

    // ─── API Simulada ─────────────────────────────────────────────────────────

    /**
     * MÓDULO 1 — Valida y sugiere dirección
     * Simula: POST /v1/address/validate
     * @returns {Promise<{valid: boolean, suggested: string, lat: number, lng: number}>}
     */
    function validateAddress(rawAddress, district) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Simulación de corrección y geocodificación
                const cleaned = rawAddress.trim().toUpperCase();
                const suggestions = [
                    cleaned,
                    cleaned.replace('AV.', 'AVENIDA').replace('JR.', 'JIRÓN').replace('CA.', 'CALLE'),
                    cleaned + `, ${district}, LIMA, PERÚ`
                ];
                resolve({
                    valid: true,
                    original: rawAddress,
                    suggested: suggestions[2],
                    lat: -12.0464 + (Math.random() - 0.5) * 0.1,
                    lng: -77.0428 + (Math.random() - 0.5) * 0.1,
                    confidence: 0.92
                });
            }, 800); // Simula latencia de red
        });
    }

    /**
     * MÓDULO 1 — Crea un envío en PedidosYa
     * Simula: POST /v1/shippings
     * @returns {Promise<{shipping_id: string, status: string, estimated_time: string}>}
     */
    function createShipping(order, confirmedAddress) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (!isSurquilloOrder(order)) {
                    reject(new Error('Este pedido no pertenece al almacén SURQUILLO. No se puede crear shipping PedidosYa.'));
                    return;
                }
                const shipping_id = _generateShippingId();
                const now = new Date();
                const eta = new Date(now.getTime() + 45 * 60000); // +45 minutos

                resolve({
                    shipping_id,
                    status: 'pending',
                    estimated_delivery_time: eta.toISOString(),
                    tracking_url: `https://pedidosya.com/track/${shipping_id}`,
                    rider: null, // Se asigna después
                    confirmed_address: confirmedAddress
                });
            }, 1200);
        });
    }

    /**
     * MÓDULO 9 — Consulta estado actual de un shipping
     * Simula: GET /v1/shippings/{id}
     */
    function getShippingStatus(shippingId) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Recuperar estado guardado o simular progresión
                const savedStatuses = JSON.parse(localStorage.getItem('panuts_py_statuses') || '{}');
                const currentStatus = savedStatuses[shippingId] || 'pending';

                const rider = currentStatus !== 'pending'
                    ? MOCK_RIDERS[Math.floor(Math.random() * MOCK_RIDERS.length)]
                    : null;

                resolve({
                    shipping_id: shippingId,
                    status: currentStatus,
                    rider,
                    updated_at: new Date().toISOString()
                });
            }, 500);
        });
    }

    /**
     * MÓDULO 9 — Obtiene confirmación real de entrega (Proof of Delivery)
     * Simula: GET /v1/shippings/{id}/proof-of-delivery
     */
    function getProofOfDelivery(shippingId) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Recuperar datos guardados del pedido (rider, delivered_at real)
                const savedEvents = JSON.parse(localStorage.getItem('panuts_py_events') || '{}');
                const events = savedEvents[shippingId] || {};

                const savedRiders = JSON.parse(localStorage.getItem('panuts_py_riders') || '{}');
                const rider = savedRiders[shippingId] || MOCK_RIDERS[0];

                resolve({
                    shipping_id:    shippingId,
                    proof_url:      `https://api.pedidosya.com/v1/shippings/${shippingId}/proof-of-delivery`,
                    signature_url:  `https://api.pedidosya.com/v1/shippings/${shippingId}/signature`,
                    delivered_at:   events.delivered_at || new Date().toISOString(),
                    recipient_name: events.recipient_name || 'Cliente / Recepcionista',
                    rider_name:     rider.name,
                    rider_phone:    rider.phone,
                    // Timeline de eventos PedidosYa
                    event_log:      events.log || []
                });
            }, 400);
        });
    }

    /**
     * MÓDULO 10 — Simula un evento de Webhook
     * En producción real: POST /webhook/pedidosya desde servidor PedidosYa
     * REGLA 3: Guarda estado, fecha/hora del evento, rider y entrega final
     */
    function updateShippingWebhook(shippingId, newStatus, extra = {}) {
        const now = new Date().toISOString();

        // ─── Persistir estado actual ───────────────────────
        const savedStatuses = JSON.parse(localStorage.getItem('panuts_py_statuses') || '{}');
        savedStatuses[shippingId] = newStatus;
        localStorage.setItem('panuts_py_statuses', JSON.stringify(savedStatuses));

        // ─── Persistir log de eventos con timestamps ────────
        const savedEvents = JSON.parse(localStorage.getItem('panuts_py_events') || '{}');
        if (!savedEvents[shippingId]) savedEvents[shippingId] = { log: [] };
        savedEvents[shippingId].log.push({
            status:    newStatus,
            label:     PEDIDOSYA_STATES[newStatus]?.label || newStatus,
            timestamp: now,
            rider:     extra.rider || null
        });

        // Si se entregó, guardar delivered_at y nombre del receptor
        if (newStatus === 'delivered') {
            savedEvents[shippingId].delivered_at    = now;
            savedEvents[shippingId].recipient_name  = extra.recipient_name || 'Cliente';
        }
        localStorage.setItem('panuts_py_events', JSON.stringify(savedEvents));

        // ─── Persistir rider asignado ───────────────────────
        if (extra.rider) {
            const savedRiders = JSON.parse(localStorage.getItem('panuts_py_riders') || '{}');
            savedRiders[shippingId] = extra.rider;
            localStorage.setItem('panuts_py_riders', JSON.stringify(savedRiders));
        }

        // ─── Actualizar appState ────────────────────────────
        if (typeof appState !== 'undefined') {
            const savedRiders = JSON.parse(localStorage.getItem('panuts_py_riders') || '{}');
            const riderData   = savedRiders[shippingId];

            appState.orders = appState.orders.map(o => {
                if (o.shipping_id !== shippingId) return o;
                const updated = {
                    ...o,
                    estado_pedidosya: newStatus,
                    rider_name:  riderData?.name  || o.rider_name  || null,
                    rider_phone: riderData?.phone || o.rider_phone || null
                };
                if (newStatus === 'delivered') {
                    updated.fecha_entrega_real = now;
                    updated.status            = 'Entregado';
                    updated.proof_of_delivery_url = `https://api.pedidosya.com/v1/shippings/${shippingId}/proof-of-delivery`;
                }
                if (newStatus === 'canceled') {
                    updated.status = 'Rechazado';
                }
                return updated;
            });
            if (typeof saveState === 'function') saveState();
            if (typeof renderCurrentView === 'function') renderCurrentView();
        }

        console.log(`[PedidosYa Webhook] ${shippingId} → ${newStatus} (${now})`);
    }

    /**
     * MÓDULO 10 — Simulador de Webhook automático
     * REGLA 3: Progresa estados, asigna rider real en 'assigned', registra entrega final
     */
    function setupWebhookSimulator() {
        const stateFlow = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered'];

        setInterval(() => {
            if (typeof appState === 'undefined') return;

            const pyOrders = appState.orders.filter(o =>
                o.shipping_id &&
                o.estado_pedidosya &&
                o.estado_pedidosya !== 'delivered' &&
                o.estado_pedidosya !== 'canceled'
            );

            pyOrders.forEach(order => {
                const currentIdx = stateFlow.indexOf(order.estado_pedidosya);
                if (currentIdx >= 0 && currentIdx < stateFlow.length - 1) {
                    if (Math.random() < 0.4) {
                        const nextStatus = stateFlow[currentIdx + 1];

                        // REGLA 3: Asignar rider cuando pasa a 'assigned'
                        let extra = {};
                        if (nextStatus === 'assigned' || nextStatus === 'picked_up') {
                            const rider = MOCK_RIDERS[Math.floor(Math.random() * MOCK_RIDERS.length)];
                            extra.rider = rider;
                        }
                        if (nextStatus === 'delivered') {
                            extra.recipient_name = order.client || 'Cliente';
                        }

                        updateShippingWebhook(order.shipping_id, nextStatus, extra);

                        const stateLabel = PEDIDOSYA_STATES[nextStatus]?.label || nextStatus;
                        const riderInfo  = extra.rider ? ` · Rider: ${extra.rider.name}` : '';
                        _showToast(`🛵 PedidosYa: ${order.id} → ${stateLabel}${riderInfo}`, PEDIDOSYA_ORANGE);
                    }
                }
            });
        }, 30000);
    }

    // ─── UI: Helpers ──────────────────────────────────────────────────────────

    function _showToast(message, bgColor = '#1e293b') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; bottom: 24px; right: 24px; z-index: 99999;
            background: ${bgColor}; color: white;
            padding: 14px 20px; border-radius: 12px;
            font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease;
            max-width: 360px;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    /** Renderiza badge de estado PedidosYa */
    function renderBadge(status) {
        const state = PEDIDOSYA_STATES[status];
        if (!state) return '';
        return `
            <span class="badge-pedidosya" style="
                background: ${state.color}20; color: ${state.color};
                border: 1px solid ${state.color}50;
                padding: 3px 10px; border-radius: 20px;
                font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;
            ">
                ${state.icon} ${state.label}
            </span>
            <span style="font-size: 10px; color: #FF5A00; font-weight: 600; margin-left: 4px;">PY Rider</span>
        `;
    }

    // ─── UI: Modal PedidosYa ──────────────────────────────────────────────────

    /**
     * Abre el modal de asignación PedidosYa
     * @param {string[]} orderIds — IDs de pedidos seleccionados
     */
    function openModal(orderIds) {
        // Validar que todos sean de SURQUILLO
        const orders = orderIds.map(id => appState.orders.find(o => o.id === id)).filter(Boolean);
        const nonSurquillo = orders.filter(o => !isSurquilloOrder(o));

        if (nonSurquillo.length > 0) {
            alert(`❌ Los siguientes pedidos NO son del almacén SURQUILLO y no pueden asignarse a PedidosYa:\n${nonSurquillo.map(o => `• ${o.id} (${o.warehouseId})`).join('\n')}`);
            return;
        }

        if (orders.length === 0) {
            alert('No hay pedidos válidos seleccionados.');
            return;
        }

        // Usar solo el primer pedido si se seleccionaron múltiples (por simplicidad del flujo)
        const order = orders[0];
        if (orders.length > 1) {
            const ok = confirm(`Se seleccionaron ${orders.length} pedidos. PedidosYa asigna un rider por pedido. Se procesará el primero: ${order.id}.\n\n¿Continuar?`);
            if (!ok) return;
        }

        _renderModal(order);
    }

    function _renderModal(order) {
        // Eliminar modal previo si existe
        const prev = document.getElementById('py-modal-overlay');
        if (prev) prev.remove();

        const overlay = document.createElement('div');
        overlay.id = 'py-modal-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 10000;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            padding: 20px; animation: fadeInOverlay 0.2s ease;
        `;

        overlay.innerHTML = `
        <div id="py-modal-card" style="
            background: white; border-radius: 20px; width: 100%; max-width: 640px;
            box-shadow: 0 24px 80px rgba(0,0,0,0.4);
            overflow: hidden; animation: slideUpModal 0.3s ease;
        ">
            <!-- Header -->
            <div style="
                background: linear-gradient(135deg, #FF5A00, #FF8C00);
                padding: 20px 24px; display: flex; align-items: center; justify-content: space-between;
            ">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="
                        width: 40px; height: 40px; background: white; border-radius: 10px;
                        display: flex; align-items: center; justify-content: center;
                        font-size: 20px;
                    ">🛵</div>
                    <div>
                        <div style="color: white; font-weight: 700; font-size: 16px;">Asignar a PedidosYa</div>
                        <div style="color: rgba(255,255,255,0.8); font-size: 12px;">Pedido: ${order.id} · Almacén SURQUILLO</div>
                    </div>
                </div>
                <button onclick="document.getElementById('py-modal-overlay').remove()"
                    style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px;
                           border-radius: 8px; cursor: pointer; font-size: 18px; display:flex; align-items:center; justify-content:center;">
                    ✕
                </button>
            </div>

            <!-- Steps -->
            <div id="py-modal-steps" style="padding: 24px; max-height: 80vh; overflow-y: auto;">
                
                <!-- PASO 1: Info del pedido + dirección -->
                <div id="py-step-1">
                    <h4 style="margin: 0 0 16px; color: #1e293b; font-size: 15px;">
                        📋 Paso 1: Confirmar Dirección de Entrega
                    </h4>

                    <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid #e2e8f0;">
                        <div style="display: grid; grid-template-columns: 110px 1fr; gap: 8px; font-size: 13px;">
                            <span style="color: #64748b; font-weight: 600;">Cliente:</span>
                            <span style="font-weight: 500;">${order.client}</span>
                            <span style="color: #64748b; font-weight: 600;">Teléfono:</span>
                            <span>${order.phone || 'N/A'}</span>
                            <span style="color: #64748b; font-weight: 600;">Distrito:</span>
                            <span>${order.district}</span>
                        </div>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px;">
                            Dirección de entrega <span style="color: #ef4444;">*</span>
                        </label>
                        <textarea id="py-address-input"
                            style="width: 100%; padding: 10px 12px; border: 1.5px solid #e2e8f0; border-radius: 10px;
                                   font-family: 'Inter', sans-serif; font-size: 14px; resize: vertical; min-height: 80px;
                                   transition: border-color 0.2s;"
                            onfocus="this.style.borderColor='#FF5A00'"
                            onblur="this.style.borderColor='#e2e8f0'"
                        >${order.address}${order.addrRef && order.addrRef !== '-' ? ', ' + order.addrRef : ''}, ${order.district}, Lima</textarea>

                        <!-- MEJORA 5: Panel de mapa interactivo sincronizado con la dirección -->
                        <div style="margin-top:8px;">
                            <button onclick="PedidosYa._toggleAddrMap()"
                                style="width:100%;padding:8px;background:none;border:1px dashed #e2e8f0;
                                       border-radius:8px;cursor:pointer;font-size:12px;color:#64748b;
                                       font-family:'Inter',sans-serif;transition:border-color 0.2s;"
                                onmouseover="this.style.borderColor='#FF5A00';this.style.color='#FF5A00';"
                                onmouseout="this.style.borderColor='#e2e8f0';this.style.color='#64748b';">
                                🗺️ Mostrar mapa de referencia / Ajustar dirección
                            </button>
                        </div>

                        <!-- Panel del mapa (oculto por defecto) -->
                        <div class="addr-edit-panel" id="py-addr-map-panel" style="display:none;margin-top:8px;">
                            <div class="addr-edit-toolbar">
                                <label>🗺️ Mapa de referencia</label>
                                <span style="flex:1;font-size:11px;color:var(--color-text-muted);">Edita la dirección y sincroniza el mapa</span>
                                <button class="addr-sync-btn" onclick="PedidosYa._syncMapFromAddress()">
                                    🔄 Actualizar mapa
                                </button>
                            </div>
                            <iframe id="py-addr-iframe" class="addr-map-frame"
                                src="" loading="lazy" allowfullscreen
                                referrerpolicy="no-referrer-when-downgrade"
                                title="Mapa interactivo de dirección">
                            </iframe>
                            <div class="addr-map-actions">
                                <span style="font-size:11px;color:var(--color-text-muted);">
                                    💡 Si el mapa no coincide, edita la dirección arriba y presiona "Actualizar mapa".
                                    Puedes abrir Google Maps para copiar las coordenadas exactas.
                                </span>
                                <a id="py-addr-gmaps-link" href="#" target="_blank"
                                    style="font-size:11px;font-weight:600;color:#FF5A00;white-space:nowrap;
                                           text-decoration:none;margin-left:auto;">
                                    Abrir en Maps →
                                </a>
                            </div>
                        </div>
                    </div>

                    <div id="py-address-suggestion" style="display: none; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 12px; margin-bottom: 16px; font-size: 13px;">
                        <div style="font-weight: 600; color: #c2410c; margin-bottom: 6px;">📍 Dirección sugerida por PedidosYa:</div>
                        <div id="py-suggested-address" style="color: #1e293b;"></div>
                        <div style="margin-top: 10px; display: flex; gap: 8px;">
                            <button onclick="PedidosYa._useSuggestedAddress()"
                                style="flex:1; padding: 8px; background: #FF5A00; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px;">
                                ✅ Usar dirección sugerida
                            </button>
                            <button onclick="document.getElementById('py-address-suggestion').style.display='none'"
                                style="padding: 8px 14px; background: #f1f5f9; color: #64748b; border: none; border-radius: 8px; cursor: pointer; font-size: 13px;">
                                Mantener la mía
                            </button>
                        </div>
                    </div>

                    <div id="py-step1-actions" style="display: flex; gap: 10px;">
                        <button onclick="PedidosYa._validateAddressStep('${order.id}')"
                            id="py-btn-validate"
                            style="flex: 1; padding: 12px; background: #FF5A00; color: white; border: none;
                                   border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 14px;
                                   font-family: 'Inter', sans-serif; transition: background 0.2s;">
                            🔍 Validar Dirección con PedidosYa
                        </button>
                    </div>

                    <div id="py-validate-loading" style="display: none; text-align: center; padding: 12px; color: #FF5A00; font-size: 13px; font-weight: 600;">
                        ⏳ Validando dirección...
                    </div>
                </div>

                <!-- PASO 2: Cotización y confirmación -->
                <div id="py-step-2" style="display: none;">
                    <h4 style="margin: 0 0 16px; color: #1e293b; font-size: 15px;">
                        💰 Paso 2: Cotización del Servicio
                    </h4>
                    <div id="py-estimate-card" style="
                        background: linear-gradient(135deg, #fff7ed, #fff);
                        border: 2px solid #fed7aa; border-radius: 12px; padding: 20px; margin-bottom: 16px;
                    ">
                        <!-- Dinamically filled -->
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="PedidosYa._goToStep(1)"
                            style="padding: 12px 20px; background: #f1f5f9; color: #374151; border: none;
                                   border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 14px; font-family: 'Inter', sans-serif;">
                            ← Volver
                        </button>
                        <button onclick="PedidosYa._createShippingStep('${order.id}')"
                            id="py-btn-create"
                            style="flex: 1; padding: 12px; background: #FF5A00; color: white; border: none;
                                   border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 14px;
                                   font-family: 'Inter', sans-serif;">
                            🚀 Crear Envío PedidosYa
                        </button>
                    </div>
                </div>

                <!-- PASO 3: Éxito -->
                <div id="py-step-3" style="display: none; text-align: center; padding: 16px 0;">
                    <div style="font-size: 64px; margin-bottom: 16px;">🎉</div>
                    <h3 style="color: #1e293b; margin-bottom: 8px;">¡Envío creado exitosamente!</h3>
                    <div id="py-success-info" style="
                        background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px;
                        padding: 16px; margin: 16px 0; text-align: left; font-size: 13px;
                    "></div>
                    <button onclick="document.getElementById('py-modal-overlay').remove()"
                        style="padding: 12px 32px; background: #FF5A00; color: white; border: none;
                               border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 14px; font-family: 'Inter', sans-serif;">
                        ✅ Cerrar
                    </button>
                </div>

            </div>
        </div>`;

        document.body.appendChild(overlay);

        // Cerrar al hacer click en overlay
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    }

    // ─── Modal Steps Logic ────────────────────────────────────────────────────

    /** Guarda la dirección validada temporalmente */
    let _validatedAddress = null;
    let _currentOrderId = null;

    function _goToStep(step) {
        document.getElementById('py-step-1').style.display = step === 1 ? 'block' : 'none';
        document.getElementById('py-step-2').style.display = step === 2 ? 'block' : 'none';
        document.getElementById('py-step-3').style.display = step === 3 ? 'block' : 'none';
    }

    function _useSuggestedAddress() {
        const suggested = document.getElementById('py-suggested-address');
        if (suggested) {
            document.getElementById('py-address-input').value = suggested.textContent;
            document.getElementById('py-address-suggestion').style.display = 'none';
        }
    }

    // ─── Almacén Surquillo — coordenadas reales ──────────────────────────
    // Fuente: https://maps.app.goo.gl/7vCYg88dS9oEzQFeA (Samiria 139, Lima)
    const SURQUILLO_LAT   = -12.1155163;
    const SURQUILLO_LNG   = -77.0088747;
    const SURQUILLO_LABEL = 'Almacén Surquillo — Samiria 139, Lima';
    const SURQUILLO_URL   = 'https://maps.app.goo.gl/7vCYg88dS9oEzQFeA';

    /**
     * Distancia aproximada en km entre dos puntos (Haversine).
     * Se usa como estimado — la distancia real por ruta es ~20-30% mayor.
     */
    function _haversineKm(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const toRad = x => x * Math.PI / 180;
        const dLat  = toRad(lat2 - lat1);
        const dLng  = toRad(lng2 - lng1);
        const a = Math.sin(dLat/2)**2
                + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    // ─── Coordenadas centrales por distrito de Lima (fallback sin internet) ──
    // Permite calcular distancia aproximada aunque Nominatim no responda.
    const DISTRICT_COORDS = {
        'Surquillo':        { lat: -12.1117, lng: -77.0122 },
        'Miraflores':       { lat: -12.1211, lng: -77.0282 },
        'San Isidro':       { lat: -12.0976, lng: -77.0370 },
        'Barranco':         { lat: -12.1477, lng: -77.0225 },
        'Chorrillos':       { lat: -12.1697, lng: -77.0200 },
        'San Borja':        { lat: -12.1011, lng: -76.9951 },
        'Ate':              { lat: -12.0286, lng: -76.9183 },
        'La Molina':        { lat: -12.0764, lng: -76.9431 },
        'Santiago de Surco':{ lat: -12.1393, lng: -76.9907 },
        'San Juan de Miraflores':{ lat: -12.1570, lng: -76.9709 },
        'Villa María del Triunfo':{ lat: -12.1733, lng: -76.9450 },
        'Villa El Salvador': { lat: -12.1973, lng: -76.9424 },
        'Lince':            { lat: -12.0839, lng: -77.0344 },
        'Jesús María':      { lat: -12.0726, lng: -77.0453 },
        'Magdalena del Mar':{ lat: -12.0895, lng: -77.0694 },
        'San Miguel':       { lat: -12.0774, lng: -77.0916 },
        'Pueblo Libre':     { lat: -12.0758, lng: -77.0617 },
        'Breña':            { lat: -12.0611, lng: -77.0456 },
        'Lima Cercado':     { lat: -12.0431, lng: -77.0282 },
        'Rímac':            { lat: -12.0297, lng: -77.0278 },
        'San Martín de Porres':{ lat: -11.9997, lng: -77.0703 },
        'Los Olivos':       { lat: -11.9933, lng: -77.0756 },
        'Independencia':    { lat: -11.9972, lng: -77.0519 },
        'Comas':            { lat: -11.9385, lng: -77.0544 },
        'Carabayllo':       { lat: -11.8890, lng: -77.0361 },
        'Puente Piedra':    { lat: -11.8666, lng: -77.0753 },
        'Callao':           { lat: -12.0565, lng: -77.1184 },
        'Bellavista':       { lat: -12.0620, lng: -77.1117 },
        'La Perla':         { lat: -12.0691, lng: -77.1189 },
        'Lurigancho':       { lat: -11.9902, lng: -76.8750 },
        'San Juan de Lurigancho':{ lat: -11.9833, lng: -77.0108 },
        'El Agustino':      { lat: -12.0418, lng: -77.0000 },
        'Santa Anita':      { lat: -12.0472, lng: -76.9714 },
        'Chaclacayo':       { lat: -11.9767, lng: -76.7733 },
        'Pachacámac':       { lat: -12.2319, lng: -76.8697 },
        'Lurín':            { lat: -12.2736, lng: -76.8736 },
        'Punta Hermosa':    { lat: -12.3381, lng: -76.8061 },
        'San Luis':         { lat: -12.0681, lng: -76.9947 },
        'La Victoria':      { lat: -12.0650, lng: -77.0158 }
    };

    /**
     * Geocodificación con doble estrategia:
     * 1. Intenta Nominatim con la dirección simplificada (solo calle + distrito).
     * 2. Si falla, usa las coordenadas del distrito desde la tabla local.
     * Siempre devuelve un resultado — nunca null.
     */
    function _geocodeAddress(address, districtHint) {
        // Simplificar dirección: quitar "DPTO", apartados y repeticiones
        const simplified = address
            .replace(/DPTO?\s*[\w\d-]+[,\s]*/gi, '')
            .replace(/INT\.\s*[\w\d]+[,\s]*/gi, '')
            .replace(/PISO\s*\d+[,\s]*/gi, '')
            .replace(/\bPERÚ\b/gi, '')
            .replace(/,\s*,/g, ',')
            .replace(/Lima,\s*Lima/gi, 'Lima')
            .trim()
            .replace(/,\s*$/, '');

        const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=pe&q='
                    + encodeURIComponent(simplified);

        return fetch(url, { headers: { 'Accept-Language': 'es' }, signal: AbortSignal.timeout(5000) })
            .then(r => r.json())
            .then(data => {
                if (data && data.length > 0) {
                    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), source: 'nominatim' };
                }
                // Fallback: coordenadas por distrito
                return _getDistrictCoords(districtHint, address);
            })
            .catch(() => _getDistrictCoords(districtHint, address));
    }

    /**
     * Devuelve coordenadas del distrito desde la tabla local.
     * Busca coincidencia parcial (case-insensitive) para mayor tolerancia.
     */
    function _getDistrictCoords(districtHint, fullAddress) {
        // Intentar match con el hint del pedido
        if (districtHint) {
            const key = Object.keys(DISTRICT_COORDS).find(k =>
                k.toLowerCase() === districtHint.toLowerCase() ||
                districtHint.toLowerCase().includes(k.toLowerCase())
            );
            if (key) return { ...DISTRICT_COORDS[key], source: 'district' };
        }
        // Intentar extraer distrito de la dirección completa
        const key = Object.keys(DISTRICT_COORDS).find(k =>
            fullAddress.toLowerCase().includes(k.toLowerCase())
        );
        if (key) return { ...DISTRICT_COORDS[key], source: 'district' };
        // Fallback final: centro de Lima
        return { lat: -12.0464, lng: -77.0428, source: 'fallback' };
    }

    function _validateAddressStep(orderId) {
        _currentOrderId = orderId;
        const addressInput = document.getElementById('py-address-input');
        const rawAddress   = addressInput.value.trim();
        if (!rawAddress) { alert('Por favor ingresa una dirección.'); return; }

        const order   = appState.orders.find(o => o.id === orderId);
        const btn     = document.getElementById('py-btn-validate');
        const loading = document.getElementById('py-validate-loading');

        btn.style.display     = 'none';
        loading.style.display = 'block';
        loading.innerHTML     = '⏳ Validando dirección y calculando distancia...';

        validateAddress(rawAddress, order.district).then(result => {

            if (result.valid && result.suggested !== rawAddress) {
                document.getElementById('py-suggested-address').textContent = result.suggested;
                document.getElementById('py-address-suggestion').style.display = 'block';
            }
            _validatedAddress = result.suggested || rawAddress;

            loading.innerHTML = '📏 Calculando distancia desde Surquillo...';

            // Geocodificación con fallback garantizado por distrito
            return _geocodeAddress(_validatedAddress, order.district);

        }).then(geo => {
            loading.style.display = 'none';

            // Siempre tenemos coordenadas (Nominatim, distrito, o Lima centro)
            const hasRealCoords = true;
            const destLat = geo.lat;
            const destLng = geo.lng;
            const geoSource = geo.source; // 'nominatim' | 'district' | 'fallback'

            // ── Distancia y tiempo ────────────────────────────────────────
            const distKm  = _haversineKm(SURQUILLO_LAT, SURQUILLO_LNG, destLat, destLng);
            // Factor de corrección por ruta real (~1.3x la distancia en línea recta)
            const distKmRuta = distKm * 1.3;
            const distLabel  = distKmRuta < 1
                ? Math.round(distKmRuta * 1000) + ' m'
                : distKmRuta.toFixed(1) + ' km';
            const etaMin = Math.round(15 + distKmRuta * 3);
            const etaLabel = etaMin < 60
                ? etaMin + ' min'
                : Math.floor(etaMin/60) + 'h ' + (etaMin % 60) + 'min';
            let cost = '—'; // sin costo para PedidosYa

            // Nota de precisión según la fuente de coordenadas
            const precisionNote = geoSource === 'nominatim'
                ? ''
                : geoSource === 'district'
                ? `<div style="font-size:11px;color:#64748b;margin-top:4px;">📍 Distancia calculada al centro del distrito <strong>${order.district}</strong> (aprox.)</div>`
                : `<div style="font-size:11px;color:#f59e0b;margin-top:4px;">⚠️ Distancia aproximada al centro de Lima — simplifica la dirección para mayor precisión.</div>`;

            // ── URL de ruta en Google Maps (origen: Surquillo → destino: dirección) ──
            const addressForMap  = encodeURIComponent(_validatedAddress);
            const directionsUrl  = 'https://www.google.com/maps/dir/?api=1'
                + '&origin=' + encodeURIComponent(SURQUILLO_LAT + ',' + SURQUILLO_LNG)
                + '&destination=' + addressForMap
                + '&travelmode=driving';

            const estimateCard = document.getElementById('py-estimate-card');
            estimateCard.innerHTML = `
                <!-- Métricas: sin costo estimado + km destacado -->
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
                    <!-- Tarjeta 1: Sin costo estimado (PedidosYa gestiona el cobro directamente) -->
                    <div style="text-align:center;padding:14px 8px;background:white;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                        <div class="py-no-cost-badge" style="font-size:13px;justify-content:center;">✅ Sin costo</div>
                        <div style="font-size:11px;color:#64748b;margin-top:6px;">Cobrado por PedidosYa</div>
                    </div>
                    <!-- Tarjeta 2: Distancia en km calculada siempre -->
                    <div style="text-align:center;padding:14px 8px;background:white;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                        <div class="py-km-badge" style="justify-content:center;font-size:18px;">
                            📏 ${distLabel}
                        </div>
                        <div style="font-size:11px;color:#64748b;margin-top:6px;">Desde Surquillo</div>
                    </div>
                    <!-- Tarjeta 3: Tiempo estimado -->
                    <div style="text-align:center;padding:14px 8px;background:white;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                        <div style="font-size:20px;font-weight:800;color:#10b981;">${etaLabel}</div>
                        <div style="font-size:11px;color:#64748b;margin-top:3px;">Tiempo estimado</div>
                    </div>
                </div>
                ${precisionNote}

                <!-- Dirección destino -->
                <div style="background:white;border-radius:8px;padding:10px 12px;margin-bottom:14px;border:1px solid #e2e8f0;">
                    <div style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:4px;">📍 DIRECCIÓN DESTINO</div>
                    <div style="font-size:13px;color:#1e293b;font-weight:500;">${_validatedAddress}</div>
                </div>

                <!-- Botón de ruta — reemplaza el iframe que mostraba ubicación incorrecta -->
                <a href="${directionsUrl}" target="_blank"
                   style="display:flex;align-items:center;justify-content:space-between;
                          background:linear-gradient(135deg,#FF5A00,#FF8C00);
                          border-radius:12px;padding:14px 18px;margin-bottom:12px;
                          text-decoration:none;transition:opacity 0.2s;"
                   onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:24px;">🧭</span>
                        <div>
                            <div style="color:white;font-weight:700;font-size:14px;">Ver ruta completa en Google Maps</div>
                            <div style="color:rgba(255,255,255,0.85);font-size:11px;margin-top:2px;">
                                Desde Almacén Surquillo → ${order.district}
                            </div>
                        </div>
                    </div>
                    <span style="background:white;color:#FF5A00;font-size:12px;font-weight:700;
                                 padding:6px 14px;border-radius:8px;white-space:nowrap;">
                        Abrir →
                    </span>
                </a>

                <!-- Origen: Almacén Surquillo -->
                <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:10px;">
                    <span style="font-size:20px;">🏭</span>
                    <div style="flex:1;font-size:12px;">
                        <div style="font-weight:700;color:#0369a1;">${SURQUILLO_LABEL}</div>
                        <div style="color:#64748b;margin-top:2px;">Samiria 139, Surquillo, Lima</div>
                    </div>
                    <a href="${SURQUILLO_URL}" target="_blank"
                       style="font-size:11px;color:#0369a1;font-weight:600;text-decoration:none;white-space:nowrap;background:white;padding:5px 10px;border-radius:6px;border:1px solid #bae6fd;">
                        Ver en Maps →
                    </a>
                </div>
            `;

            _goToStep(2);
            btn.style.display = 'block';
        });
    }

    function _createShippingStep(orderId) {
        const btn = document.getElementById('py-btn-create');
        btn.textContent = '⏳ Creando envío...';
        btn.disabled = true;

        const order = appState.orders.find(o => o.id === orderId);

        createShipping(order, _validatedAddress).then(result => {
            // Guardar shipping_id en el pedido
            appState.orders = appState.orders.map(o => {
                if (o.id === orderId) {
                    return {
                        ...o,
                        shipping_id: result.shipping_id,
                        transportista: 'PedidosYa',
                        estado_pedidosya: result.status,
                        fecha_envio: new Date().toISOString(),
                        direccion_confirmada: _validatedAddress
                    };
                }
                return o;
            });

            // Inicializar estado en localStorage de PY
            const statuses = JSON.parse(localStorage.getItem('panuts_py_statuses') || '{}');
            statuses[result.shipping_id] = 'pending';
            localStorage.setItem('panuts_py_statuses', JSON.stringify(statuses));

            if (typeof saveState === 'function') saveState();

            // ── CRÍTICO: limpiar selección para evitar doble envío ─────────────
            // Sin esto, el Set selectedIncoming retiene el ID del pedido enviado y
            // al seleccionar otro pedido ese ID "fantasma" se suma al nuevo borrador.
            if (typeof appState !== 'undefined' && appState.selectedIncoming) {
                appState.selectedIncoming.delete(orderId);
                // Limpiar también cualquier otro ID que ya tenga shipping_id asignado
                appState.selectedIncoming.forEach(id => {
                    const o = appState.orders.find(ord => ord.id === id);
                    if (o && o.shipping_id) appState.selectedIncoming.delete(id);
                });
                if (typeof updateAssignButton === 'function') updateAssignButton();
            }

            // Mostrar éxito
            const successInfo = document.getElementById('py-success-info');
            successInfo.innerHTML = `
                <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; font-size: 13px;">
                    <span style="color: #64748b; font-weight: 600;">Shipping ID:</span>
                    <span style="font-weight: 700; color: #FF5A00; font-family: monospace;">${result.shipping_id}</span>
                    <span style="color: #64748b; font-weight: 600;">Estado inicial:</span>
                    <span>${renderBadge(result.status)}</span>
                    <span style="color: #64748b; font-weight: 600;">Dirección:</span>
                    <span>${_validatedAddress}</span>
                    <span style="color: #64748b; font-weight: 600;">Nota:</span>
                    <span style="font-size: 12px; color: #64748b;">El simulador actualizará el estado automáticamente cada 30s.</span>
                </div>
            `;

            _goToStep(3);

            // Notificación y actualización de vistas
            _showToast(`✅ Shipping PedidosYa creado: ${result.shipping_id}`, '#10b981');

            if (typeof renderCurrentView === 'function') {
                setTimeout(renderCurrentView, 500);
            }

            // Arrancar simulador si no estaba corriendo
            _startSimulatorIfNeeded();

        }).catch(err => {
            btn.textContent = '🚀 Crear Envío PedidosYa';
            btn.disabled = false;
            alert('Error: ' + err.message);
        });
    }

    // ─── Simulador ────────────────────────────────────────────────────────────

    let _simulatorRunning = false;

    function _startSimulatorIfNeeded() {
        if (!_simulatorRunning) {
            _simulatorRunning = true;
            setupWebhookSimulator();
        }
    }

    // ─── MEJORA 5: Mapa interactivo sincronizado con dirección ────────────────

    /**
     * Muestra u oculta el panel del mapa de referencia en el modal.
     * Al mostrar, sincroniza automáticamente con la dirección actual.
     */
    function _toggleAddrMap() {
        const panel = document.getElementById('py-addr-map-panel');
        if (!panel) return;
        const isVisible = panel.style.display !== 'none';
        panel.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            // Se le da tiempo al reflow para evitar errores en Google Maps iframes
            setTimeout(_syncMapFromAddress, 50); 
        }
    }

    /**
     * Sincroniza el iframe del mapa con la dirección ingresada en el textarea.
     * Usa Google Maps embed via texto de dirección (sin API key).
     */
    function _syncMapFromAddress() {
        const input  = document.getElementById('py-address-input');
        const iframe = document.getElementById('py-addr-iframe');
        const gmlink = document.getElementById('py-addr-gmaps-link');
        if (!input || !iframe) return;

        const addr = input.value.trim();
        if (!addr) {
            _showToast('⚠️ Ingresa una dirección primero.', '#f59e0b');
            return;
        }

        const encoded = encodeURIComponent(addr + ', Lima, Perú');
        iframe.src = `https://maps.google.com/maps?q=${encoded}&t=m&z=15&output=embed&hl=es`;
        if (gmlink) {
            gmlink.href = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
        }
    }

    // ─── Tracking de Pedidos para vista pública ────────────────────────────────

    function getPublicTrackingData(orderId) {
        const allOrders = JSON.parse(localStorage.getItem('panuts_orders') || '[]');
        const mockOrders = (typeof initialOrders !== 'undefined') ? initialOrders : [];

        let order = allOrders.find(o => o.id === orderId) || mockOrders.find(o => o.id === orderId);
        if (!order) return null;

        const timeline = [];

        // Siempre: pedido recibido
        timeline.push({
            status: 'received',
            label: 'Pedido Recibido',
            icon: '📦',
            date: order.date || 'N/A',
            completed: true,
            color: '#10b981'
        });

        // Asignado a ruta
        const hasRoute = order.routeId || (order.history && order.history.length > 0);
        const routeAttempt = order.history ? order.history[0] : null;
        timeline.push({
            status: 'assigned',
            label: 'Asignado a Ruta',
            icon: '🗺️',
            date: routeAttempt ? routeAttempt.routeDate : 'Pendiente',
            completed: !!hasRoute,
            color: '#3b82f6',
            detail: routeAttempt ? `Hoja: ${routeAttempt.routeId}` : ''
        });

        // PedidosYa: estados del rider
        if (order.shipping_id) {
            const statuses = JSON.parse(localStorage.getItem('panuts_py_statuses') || '{}');
            const pyStatus = statuses[order.shipping_id] || order.estado_pedidosya || 'pending';
            const pyFlow = ['pending', 'assigned', 'picked_up', 'in_transit'];

            pyFlow.forEach(s => {
                const stateInfo = PEDIDOSYA_STATES[s];
                const stateIdx = pyFlow.indexOf(pyStatus);
                const currentIdx = pyFlow.indexOf(s);
                timeline.push({
                    status: s,
                    label: `PY: ${stateInfo.label}`,
                    icon: stateInfo.icon,
                    date: '',
                    completed: currentIdx <= stateIdx,
                    color: stateInfo.color,
                    isPedidosYa: true
                });
            });
        } else if (order.status === 'En Ruta') {
            timeline.push({
                status: 'en_ruta',
                label: 'En Ruta (Despacho Interno)',
                icon: '🚚',
                date: '',
                completed: true,
                color: '#8b5cf6'
            });
        }

        // Entregado o Rechazado
        const lastAttempt = order.history && order.history.length > 0
            ? order.history[order.history.length - 1]
            : order;

        timeline.push({
            status: 'delivered',
            label: order.status === 'Rechazado' ? 'No Pudo Entregarse' : 'Entregado',
            icon: order.status === 'Rechazado' ? '❌' : '✅',
            date: lastAttempt.deliveryDate || 'Pendiente',
            completed: order.status === 'Entregado' || order.status === 'Rechazado',
            color: order.status === 'Rechazado' ? '#ef4444' : '#10b981',
            detail: lastAttempt.observation || ''
        });

        return { order, timeline };
    }

    // ─── API Pública ──────────────────────────────────────────────────────────
    return {
        SURQUILLO_WAREHOUSE_ID,
        PEDIDOSYA_STATES,
        PEDIDOSYA_ORANGE,
        isSurquilloOrder,
        validateAddress,
        createShipping,
        getShippingStatus,
        getProofOfDelivery,
        updateShippingWebhook,
        setupWebhookSimulator,
        openModal,
        renderBadge,
        getPublicTrackingData,
        // Exponer internos para llamadas desde HTML inline
        _validateAddressStep,
        _createShippingStep,
        _goToStep,
        _useSuggestedAddress,
        _startSimulatorIfNeeded,
        _showToast,
        // MEJORA 5: Mapa interactivo de dirección
        _toggleAddrMap,
        _syncMapFromAddress
    };

})();
