// ═══════════════════════════════════════════════════════════════════════════
// app.js — Panuts Logística v2.0
// Módulos: Zonificación, PedidosYa UI, Rutas Mejoradas, Notificaciones,
//          Licencias, Tracking, Configuración avanzada
// ═══════════════════════════════════════════════════════════════════════════

// ─── URL DE PRODUCCIÓN ───────────────────────────────────────────────────────
// ⚠️  IMPORTANTE: Cuando despliegues a Netlify o tu dominio, actualiza esta
//     constante con la URL real. El QR del chofer siempre apuntará aquí,
//     incluso al imprimir desde PC local (donde el link sería file:// y no
//     funcionaría en el celular).
//
//  Ejemplos:
//    'https://panuts-logistica.netlify.app'
//    'https://logistica.panuts.com'
// ─────────────────────────────────────────────────────────────────────────────
const PANUTS_APP_URL = 'https://PENDIENTE.netlify.app'; // ← CAMBIAR ESTO

// ─── Sincronización de Pedidos ───────────────────────────────────────────────


function syncOrdersFromStorage() {
    const savedOrders = localStorage.getItem('panuts_orders');
    let rawOrders = savedOrders ? JSON.parse(savedOrders) : [...initialOrders];

    let allOrders = initialOrders.map(mockOrder => {
        let savedOrder = rawOrders.find(o => o.id === mockOrder.id);
        if (savedOrder && savedOrder.status !== 'Pendiente') {
            return {
                ...mockOrder,
                status:              savedOrder.status,
                driverId:            savedOrder.driverId,
                routeId:             savedOrder.routeId,
                observation:         savedOrder.observation,
                evidencePhoto:       savedOrder.evidencePhoto,
                zoneAssign:          savedOrder.zoneAssign,
                deliveryDate:        savedOrder.deliveryDate,
                routeDate:           savedOrder.routeDate,
                routeDateIso:        savedOrder.routeDateIso,
                rejectCount:         savedOrder.rejectCount,
                history:             savedOrder.history || [],
                bultos:              savedOrder.bultos || mockOrder.bultos,
                // Campos PedidosYa
                shipping_id:           savedOrder.shipping_id           || null,
                transportista:         savedOrder.transportista          || null,
                estado_pedidosya:      savedOrder.estado_pedidosya       || null,
                fecha_envio:           savedOrder.fecha_envio            || null,
                fecha_entrega_real:    savedOrder.fecha_entrega_real     || null,
                proof_of_delivery_url: savedOrder.proof_of_delivery_url  || null,
                direccion_confirmada:  savedOrder.direccion_confirmada   || null,
                rider_name:            savedOrder.rider_name             || null,
                rider_phone:           savedOrder.rider_phone            || null
            };
        }
        // Si fue guardado como Pendiente — preservar TODOS los campos PY
        if (savedOrder) {
            return {
                ...mockOrder,
                bultos:                savedOrder.bultos                 || mockOrder.bultos,
                rejectCount:           savedOrder.rejectCount            || 0,
                // Campos PedidosYa — CRÍTICO: shipping_id asignado mientras status=Pendiente
                shipping_id:           savedOrder.shipping_id           || null,
                transportista:         savedOrder.transportista          || null,
                estado_pedidosya:      savedOrder.estado_pedidosya       || null,
                fecha_envio:           savedOrder.fecha_envio            || null,
                fecha_entrega_real:    savedOrder.fecha_entrega_real     || null,
                proof_of_delivery_url: savedOrder.proof_of_delivery_url  || null,
                direccion_confirmada:  savedOrder.direccion_confirmada   || null,
                rider_name:            savedOrder.rider_name             || null,
                rider_phone:           savedOrder.rider_phone            || null
            };
        }
        return { ...mockOrder, bultos: mockOrder.bultos || null };
    });


    // Filtro por almacén activo
    if (typeof AuthManager !== 'undefined') {
        const user = AuthManager.getCurrentUser();
        const activeWH = AuthManager.getActiveWarehouse();
        if (user && user.role !== 'admin' && activeWH && activeWH !== 'all') {
            allOrders = allOrders.filter(o => o.warehouseId === activeWH);
        } else if (activeWH && activeWH !== 'all') {
            allOrders = allOrders.filter(o => o.warehouseId === activeWH);
        }
    }
    // ── Auto-corrección de estados inconsistentes PedidosYa ──────────────
    // Pedidos con shipping_id activo + status=Rechazado son un estado legacy
    // inconsistente (antes del fix). Los ponemos como 'En Ruta' para que PY
    // los gestione correctamente y no aparezcan en Bandeja Entrante.
    allOrders = allOrders.map(o => {
        if (o.shipping_id && o.status === 'Rechazado') {
            return { ...o, status: 'En Ruta' };
        }
        return o;
    });

    appState.orders = allOrders;
}

// ─── Estado Global ───────────────────────────────────────────────────────────

let appState = {
    currentView: 'dashboard',
    orders: [],
    drivers: localStorage.getItem('panuts_drivers')
        ? JSON.parse(localStorage.getItem('panuts_drivers'))
        : (typeof drivers !== 'undefined' ? drivers : []),
    selectedIncoming: new Set()
};

let dashboardChartInstance = null;

function saveState() {
    try {
        localStorage.setItem('panuts_orders', JSON.stringify(appState.orders));
        localStorage.setItem('panuts_drivers', JSON.stringify(appState.drivers));
    } catch (e) {
        console.error('Error de base de datos:', e);
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            alert('❌ ERROR CRÍTICO: La memoria del sistema (LocalStorage) está llena. No se pudo guardar la fotografía ni los cambios recientes. Libere memoria o limpie datos antiguos.');
        } else {
            alert('❌ Error al guardar datos: ' + e.message);
        }
    }
}

syncOrdersFromStorage();

// ─── Utilidades de Fecha ─────────────────────────────────────────────────────

function getLocalISODate(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getFormattedDate(d = new Date()) {
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
function getFormattedDateTime(d = new Date()) {
    return `${getFormattedDate(d)} ${d.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}`;
}

// ─── Utilidad: Zona por Distrito ─────────────────────────────────────────────

function getZoneFromDistrict(districtName) {
    if (!districtName || typeof districts === 'undefined') return 'N/A';
    const found = districts.find(d =>
        d.name.toLowerCase() === districtName.toLowerCase()
    );
    return found ? found.zone : 'N/A';
}

function getZoneBadge(zone) {
    const map = {
        'NORTE': '<span class="badge-zona badge-zona-norte">NORTE</span>',
        'SUR':   '<span class="badge-zona badge-zona-sur">SUR</span>',
        'ESTE':  '<span class="badge-zona badge-zona-este">ESTE</span>',
        'OESTE': '<span class="badge-zona badge-zona-oeste">OESTE</span>'
    };
    return map[zone] || `<span class="badge-zona" style="background:#f1f5f9;color:#64748b;">${zone}</span>`;
}

function getWarehouseName(warehouseId) {
    if (!warehouseId) return 'N/A';
    const warehouses = JSON.parse(localStorage.getItem('panuts_warehouses') || '[]');
    const wh = warehouses.find(w => w.id === warehouseId);
    return wh ? wh.name : warehouseId;
}

// ─── Icons ───────────────────────────────────────────────────────────────────

lucide.createIcons();

// ─── Compresión de Imagen ────────────────────────────────────────────────────

function compressImage(file, maxSizeKB = 100) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                const maxDim = 400; // Limitado a 400px para evitar saturar el localStorage (5MB max)
                if (width > height && width > maxDim) { height *= maxDim/width; width = maxDim; }
                else if (height > maxDim) { width *= maxDim/height; height = maxDim; }
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                // Usamos webp o jpeg al 40% de calidad para ahorrar ~80% de tamaño
                resolve(canvas.toDataURL('image/jpeg', 0.4));
            };
        };
    });
}

// ─── Navegación ──────────────────────────────────────────────────────────────

const sidebarButtons = document.querySelectorAll('.nav-item');
const views          = document.querySelectorAll('.view');
const pageTitle      = document.getElementById('page-title');

const viewTitles = {
    'dashboard': 'Resumen General',
    'incoming':  'Pedidos Entrantes (Facturas/Guías)',
    'routing':   'Gestión de Hojas de Ruta',
    'tracking':  'Estado y Seguimiento de Envíos',
    'config':    'Configuración del Sistema'
};

const sidebarToggle = document.getElementById('sidebar-toggle');
if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });
}

sidebarButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Botones que abren nueva pestaña no navegan internamente
        if (e.currentTarget.getAttribute('onclick')) return;
        const targetView = e.currentTarget.getAttribute('data-target');
        if (!targetView) return;

        sidebarButtons.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        pageTitle.textContent = viewTitles[targetView] || '';

        views.forEach(v => {
            v.classList.remove('active');
            if (v.id === `view-${targetView}`) v.classList.add('active');
        });

        // Sincronizar desde localStorage en vistas clave para reflejar
        // estados PY, riders asignados y checkboxes bloqueados actualizados
        if (['tracking', 'dashboard', 'incoming'].includes(targetView)) {
            syncOrdersFromStorage();
        }

        appState.currentView = targetView;
        renderCurrentView();
    });
});

// ─── Utilidades de Badges ────────────────────────────────────────────────────

function getStatusBadge(status) {
    const map = {
        'Pendiente': 'badge-pendiente',
        'En Ruta':   'badge-en-ruta',
        'Entregado': 'badge-entregado',
        'Rechazado': 'badge-rechazado'
    };
    return `<span class="badge ${map[status] || 'badge-pendiente'}">${status}</span>`;
}

function getDriverName(driverId) {
    if (!driverId) return 'No Asignado';
    const driver = appState.drivers.find(d => d.id === driverId);
    return driver ? driver.name : 'Desconocido';
}

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 6: CENTRO DE NOTIFICACIONES
// ═══════════════════════════════════════════════════════════════════════════

const NotificationCenter = (() => {

    const DISMISSED_KEY = 'panuts_notif_dismissed';

    function _getDismissed() {
        return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
    }

    function _saveDismissed(ids) {
        localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
    }

    function _makeId(n) {
        // ID estable por contenido — si la alerta desaparece de verdad, no importa que el ID persista
        return btoa(unescape(encodeURIComponent(n.title + '|' + n.detail))).slice(0, 32);
    }

    function _checkLicenseExpiry() {
        const alerts = [];
        const today = new Date();
        today.setHours(0,0,0,0);

        appState.drivers.forEach(d => {
            if (!d.licenseExpiry) return;
            const expiry = new Date(d.licenseExpiry);
            expiry.setHours(0,0,0,0);
            const daysLeft = Math.round((expiry - today) / 86400000);

            if (daysLeft < 0) {
                alerts.push({ type: 'danger', icon: '🚨', title: `Licencia VENCIDA: ${d.name}`, detail: `Venció hace ${Math.abs(daysLeft)} días` });
            } else if (daysLeft <= 30) {
                alerts.push({ type: 'warning', icon: '⚠️', title: `Licencia por vencer: ${d.name}`, detail: `Vence en ${daysLeft} días (${d.licenseExpiry})` });
            }
        });
        return alerts;
    }

    function _checkStaleOrders() {
        const alerts = [];
        const today = new Date();
        today.setHours(0,0,0,0);
        const twoDaysAgo = new Date(today.getTime() - 2 * 86400000);

        appState.orders.filter(o => o.status === 'En Ruta').forEach(o => {
            const routeDate = o.routeDateIso ? new Date(o.routeDateIso) : null;
            if (routeDate && routeDate <= twoDaysAgo) {
                alerts.push({
                    type: 'warning', icon: '📦',
                    title: `Pedido sin entregar: ${o.id}`,
                    detail: `Más de 2 días en ruta (${o.routeDateIso})`
                });
            }
        });
        return alerts;
    }

    function _checkIncompleteRoutes() {
        const alerts = [];
        const routesMap = {};
        const today = getLocalISODate();

        appState.orders.forEach(o => {
            const attempts = (o.history && o.history.length > 0) ? o.history : (o.routeId ? [{...o}] : []);
            attempts.forEach(a => {
                if (!a.routeId) return;
                if (!routesMap[a.routeId]) routesMap[a.routeId] = { total: 0, completed: 0, date: a.routeDateIso };
                routesMap[a.routeId].total++;
                if (a.status === 'Entregado' || a.status === 'Rechazado') routesMap[a.routeId].completed++;
            });
        });

        Object.entries(routesMap).forEach(([routeId, r]) => {
            const pct = r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
            if (pct < 100 && r.date && r.date < today) {
                alerts.push({
                    type: 'info', icon: '🗺️',
                    title: `Ruta incompleta: ${routeId}`,
                    detail: `${pct}% completada (fecha: ${r.date})`
                });
            }
        });
        return alerts;
    }

    function _checkPedidosYaIssues() {
        const alerts = [];
        appState.orders.filter(o => o.estado_pedidosya === 'canceled').forEach(o => {
            alerts.push({
                type: 'danger', icon: '🛵',
                title: `PedidosYa CANCELADO: ${o.id}`,
                detail: `Shipping: ${o.shipping_id}`
            });
        });
        return alerts;
    }

    function getAll() {
        const all = [
            ..._checkLicenseExpiry(),
            ..._checkStaleOrders(),
            ..._checkIncompleteRoutes(),
            ..._checkPedidosYaIssues()
        ];
        // Adjuntar ID estable a cada alerta
        return all.map(n => ({ ...n, id: _makeId(n) }));
    }

    function getUnread() {
        const dismissed = _getDismissed();
        return getAll().filter(n => !dismissed.includes(n.id));
    }

    function dismiss(id) {
        const dismissed = _getDismissed();
        if (!dismissed.includes(id)) {
            dismissed.push(id);
            _saveDismissed(dismissed);
        }
        refresh();
        // Actualizar el dropdown si está abierto
        const dropdown = document.getElementById('notification-dropdown');
        if (dropdown) openDropdown._renderInto(dropdown);
    }

    function dismissAll() {
        const all = getAll();
        const ids = all.map(n => n.id);
        _saveDismissed(ids);
        refresh();
        const dropdown = document.getElementById('notification-dropdown');
        if (dropdown) openDropdown._renderInto(dropdown);
    }

    function refresh() {
        const unread = getUnread();
        const countEl = document.getElementById('notification-count');
        const bellBtn = document.getElementById('notification-bell-btn');

        if (!countEl || !bellBtn) return;

        if (unread.length > 0) {
            countEl.style.display = 'block';
            countEl.textContent = unread.length > 9 ? '9+' : unread.length;
            bellBtn.classList.add('has-alerts');
        } else {
            countEl.style.display = 'none';
            bellBtn.classList.remove('has-alerts');
        }
    }

    function openDropdown() {
        // Toggle
        const existing = document.getElementById('notification-dropdown');
        if (existing) { existing.remove(); return; }

        const wrap = document.getElementById('notification-bell-wrap');
        if (!wrap) return;

        const dropdown = document.createElement('div');
        dropdown.id = 'notification-dropdown';
        dropdown.className = 'notification-dropdown';

        openDropdown._renderInto(dropdown);
        wrap.appendChild(dropdown);

        // Cerrar al hacer click fuera
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!wrap.contains(e.target)) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 100);
    }

    openDropdown._renderInto = function(dropdown) {
        const unread   = getUnread();
        const all      = getAll();
        const colorMap = { danger: '#fee2e2', warning: '#fef3c7', info: '#dbeafe' };
        const textMap  = { danger: '#b91c1c', warning: '#b45309', info: '#1d4ed8' };

        dropdown.innerHTML = `
            <div class="notification-dropdown-header">
                <h4>🔔 Alertas <span style="font-size:12px;font-weight:400;opacity:.7;">(${unread.length} sin leer)</span></h4>
                <div style="display:flex;gap:6px;align-items:center;">
                    ${unread.length > 0 ? `
                    <button onclick="NotificationCenter.dismissAll()"
                        style="font-size:11px;background:none;border:1px solid var(--color-border);border-radius:6px;
                               padding:3px 9px;cursor:pointer;color:var(--color-text-muted);font-family:inherit;">
                        ✓ Leer todas
                    </button>` : ''}
                    <button onclick="document.getElementById('notification-dropdown').remove()"
                        style="background:none;border:none;cursor:pointer;color:var(--color-text-muted);font-size:16px;">✕</button>
                </div>
            </div>
            <div style="max-height: 380px; overflow-y: auto;">
                ${unread.length === 0 ? `
                    <div style="padding: 32px; text-align: center; color: var(--color-text-muted);">
                        <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
                        <div style="font-size: 14px; font-weight: 500;">Sin alertas pendientes</div>
                        ${all.length > unread.length ? `<div style="font-size:12px;margin-top:6px;opacity:.6;">${all.length - unread.length} alertas leídas</div>` : ''}
                    </div>
                ` : unread.map(n => `
                    <div class="notification-item" style="position:relative;">
                        <div class="notification-icon" style="background: ${colorMap[n.type] || '#f1f5f9'};">
                            ${n.icon}
                        </div>
                        <div class="notification-text" style="flex:1;">
                            <strong style="color: ${textMap[n.type] || '#1e293b'};">${n.title}</strong>
                            <span>${n.detail}</span>
                        </div>
                        <button onclick="NotificationCenter.dismiss('${n.id}')"
                            title="Marcar como leída"
                            style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:16px;
                                   padding:4px 6px;border-radius:6px;flex-shrink:0;line-height:1;"
                            onmouseover="this.style.background='rgba(0,0,0,.06)'"
                            onmouseout="this.style.background='none'">✓</button>
                    </div>
                `).join('')}
            </div>
            <div style="padding: 10px 16px; border-top: 1px solid var(--color-border); text-align: center;">
                <span style="font-size: 12px; color: var(--color-text-muted);">
                    Actualizado: ${new Date().toLocaleTimeString('es-PE', {hour:'2-digit',minute:'2-digit'})}
                </span>
            </div>
        `;
    };

    // Inicializar campana
    function init() {
        const wrap = document.getElementById('notification-bell-wrap');
        if (!wrap) return;
        refresh();
        setInterval(refresh, 60000);
    }

    return { getAll, getUnread, dismiss, dismissAll, refresh, init, openDropdown };
})();

window.NotificationCenter = NotificationCenter;

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

function renderDashboard() {
    const pending   = appState.orders.filter(o => o.status === 'Pendiente').length;
    const enroute   = appState.orders.filter(o => o.status === 'En Ruta').length;
    const delivered = appState.orders.filter(o => o.status === 'Entregado').length;
    const pyActive  = appState.orders.filter(o => o.shipping_id && o.estado_pedidosya && !['delivered','canceled'].includes(o.estado_pedidosya)).length;

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('stat-pending',   pending);
    setEl('stat-enroute',   enroute);
    setEl('stat-delivered', delivered);
    setEl('stat-pedidosya', pyActive);

    // Analytics
    const currentMonthPrefix = getLocalISODate().slice(0, 7);
    const monthlyStats = {};
    const driverDeliveries = {};

    appState.orders.forEach(order => {
        const attempts = (order.history && order.history.length > 0) ? order.history : [order];
        attempts.forEach(attempt => {
            const status = attempt.status || order.status || 'Pendiente';
            let dateTarget = getLocalISODate();

            if (status === 'Entregado' || status === 'Rechazado') {
                if (attempt.deliveryDate) {
                    const parts = attempt.deliveryDate.split(',')[0].trim().split('/');
                    if (parts.length === 3) dateTarget = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
                } else if (attempt.routeDateIso || order.routeDateIso) {
                    dateTarget = attempt.routeDateIso || order.routeDateIso;
                }
            } else if (attempt.routeDateIso || order.routeDateIso) {
                dateTarget = attempt.routeDateIso || order.routeDateIso;
            }

            const monthPrefix = dateTarget.slice(0, 7);
            if (!monthlyStats[monthPrefix]) monthlyStats[monthPrefix] = { 'Entregado': 0, 'Rechazado': 0, 'Pendiente': 0, 'En Ruta': 0 };

            if (monthlyStats[monthPrefix][status] !== undefined) monthlyStats[monthPrefix][status]++;
            else monthlyStats[monthPrefix]['Pendiente']++;

            if (status === 'Entregado' && monthPrefix === currentMonthPrefix) {
                const dId = attempt.driverId || order.driverId;
                if (dId) driverDeliveries[dId] = (driverDeliveries[dId] || 0) + 1;
            }
        });
    });

    // Chofer del Mes
    let topDriverId = null, maxDeliveries = -1;
    for (let dId in driverDeliveries) {
        if (driverDeliveries[dId] > maxDeliveries) { maxDeliveries = driverDeliveries[dId]; topDriverId = parseInt(dId); }
    }
    const uiName  = document.getElementById('top-driver-name');
    const uiStats = document.getElementById('top-driver-stats');
    if (uiName && uiStats) {
        if (topDriverId !== null && maxDeliveries > 0) {
            uiName.textContent  = getDriverName(topDriverId);
            uiStats.textContent = `Total entregas: ${maxDeliveries}`;
        } else {
            uiName.textContent  = 'Aún sin definir';
            uiStats.textContent = 'No hay entregas completadas aún';
        }
    }

    // ── Distrito más frecuente ────────────────────────────────────────────────
    const districtCount = {};
    appState.orders.forEach(o => {
        if (o.status === 'Entregado' && o.district) {
            districtCount[o.district] = (districtCount[o.district] || 0) + 1;
        }
    });
    // Fallback: si no hay entregados, contar todos los pedidos
    if (Object.keys(districtCount).length === 0) {
        appState.orders.forEach(o => {
            if (o.district) districtCount[o.district] = (districtCount[o.district] || 0) + 1;
        });
    }
    let topDistrict = null, topDistrictCount = 0;
    for (const d in districtCount) {
        if (districtCount[d] > topDistrictCount) { topDistrict = d; topDistrictCount = districtCount[d]; }
    }
    const distEl = document.getElementById('top-district-name');
    const distStats = document.getElementById('top-district-stats');
    if (distEl) distEl.textContent = topDistrict || '—';
    if (distStats) distStats.textContent = topDistrictCount > 0 ? `${topDistrictCount} envíos` : '0 envíos';

    // ── Flota Activa: CAVAL vs PedidosYa ─────────────────────────────────────
    const activeOrders = appState.orders.filter(o => o.status === 'En Ruta' || o.status === 'Borrador');
    const pyCount   = activeOrders.filter(o => o.shipping_id).length;
    const cavalCount = activeOrders.filter(o => !o.shipping_id).length;
    const totalFleet = cavalCount + pyCount;
    const cavalPct = totalFleet > 0 ? Math.round((cavalCount / totalFleet) * 100) : 50;

    const barEl = document.getElementById('fleet-split-bar');
    const cavalEl = document.getElementById('fleet-caval-count');
    const pyEl = document.getElementById('fleet-py-count');
    if (barEl) barEl.style.width = `${cavalPct}%`;
    if (cavalEl) cavalEl.textContent = `${cavalCount} CAVAL`;
    if (pyEl) pyEl.textContent = `${pyCount} PY`;

    // ── Gráfico ───────────────────────────────────────────────────────────────
    const canvas = document.getElementById('dashboard-chart');
    if (canvas && window.Chart) {
        if (dashboardChartInstance) dashboardChartInstance.destroy();
        const labels = Object.keys(monthlyStats).sort();
        dashboardChartInstance = new window.Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels.map(l => {
                    const [y, m] = l.split('-');
                    return new Date(y, m-1).toLocaleDateString('es-ES',{month:'long',year:'numeric'}).toUpperCase();
                }),
                datasets: [
                    { label: 'Entregados',        data: labels.map(l => monthlyStats[l]['Entregado']), backgroundColor: '#22c55e', borderRadius: 4 },
                    { label: 'Rechazados',         data: labels.map(l => monthlyStats[l]['Rechazado']), backgroundColor: '#ef4444', borderRadius: 4 },
                    { label: 'En Ruta/Pendientes', data: labels.map(l => monthlyStats[l]['Pendiente'] + monthlyStats[l]['En Ruta']), backgroundColor: '#94a3b8', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } } },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw}` } }
                }
            }
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 2: PEDIDOS ENTRANTES — ZONIFICACIÓN AUTOMÁTICA + PEDIDOSYA
// ═══════════════════════════════════════════════════════════════════════════

function initIncomingFilters() {
    const districtSelect = document.getElementById('filter-incoming-district');
    if (districtSelect) {
        const districtSet = new Set(appState.orders.map(o => o.district).filter(Boolean));
        const dstArr = Array.from(districtSet).sort();
        districtSelect.innerHTML = `<option value="all">Todos los distritos</option>` +
            dstArr.map(d => `<option value="${d}">${d}</option>`).join('');
    }
}

function initTrackingFilters() {
    const filterDate = document.getElementById('filter-date');
    if (filterDate && !filterDate.value) filterDate.value = getLocalISODate();
}

window.resetIncomingFilters = () => {
    ['filter-incoming-order','filter-incoming-date'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    ['filter-incoming-district','filter-incoming-zone'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = 'all';
    });
    renderIncomingTable();
};

function renderIncomingTable() {
    const tbody = document.getElementById('tbody-incoming');
    if (!tbody) return;

    const filterOrder    = (document.getElementById('filter-incoming-order')?.value || '').toLowerCase().trim();
    const filterDate     = document.getElementById('filter-incoming-date')?.value || '';
    const filterDistrict = document.getElementById('filter-incoming-district')?.value || 'all';
    const filterZone     = document.getElementById('filter-incoming-zone')?.value || 'all';

    // REGLA 1+2: Solo incluir pedidos Pendientes/Rechazados SIN shipping_id activo.
    // Si tiene shipping_id → PedidosYa lo controla, no aparece en Entrantes.
    // Solo vuelve a Entrantes cuando PY cancela Y limpia el shipping_id (status=Pendiente, shipping_id=null).
    const pendingOrders = appState.orders.filter(o => {
        // Excluir pedidos ya en ruta interna o entregados
        if (o.status === 'En Ruta' || o.status === 'Borrador' || o.status === 'Entregado') return false;
        // Excluir si tiene shipping_id activo (PY lo gestiona, sea cual sea el status)
        if (o.shipping_id) return false;
        // Incluir Pendiente y Rechazado (para reenvíos internos y re-intentos PY ya cancelados)
        if (o.status !== 'Pendiente' && o.status !== 'Rechazado') return false;
        if (filterOrder && !o.id.toLowerCase().includes(filterOrder)) return false;
        if (filterDistrict !== 'all' && o.district !== filterDistrict) return false;
        const zone = getZoneFromDistrict(o.district);
        if (filterZone !== 'all' && zone !== filterZone) return false;
        if (filterDate) {
            const fdParts = filterDate.split('-');
            if (fdParts.length === 3) {
                const day = parseInt(fdParts[2], 10), month = parseInt(fdParts[1], 10), year = fdParts[0];
                const f1 = `${day}/${month}/${year}`;
                const f2 = `${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}`;
                if (o.date !== f1 && o.date !== f2) return false;
            }
        }
        return true;
    });

    tbody.innerHTML = pendingOrders.map(order => {
        const zone     = getZoneFromDistrict(order.district);
        const isSurq   = typeof PedidosYa !== 'undefined' && PedidosYa.isSurquilloOrder(order);
        const wmName   = getWarehouseName(order.warehouseId);

        // REGLA 1: Pedido con shipping_id asignado a PY → BLOQUEADO (checkbox deshabilitado)
        const isPyAssigned = !!order.shipping_id;
        // Pedido ya movido a borrador de ruta interna → bloqueado también
        const isLocked = isPyAssigned || appState.selectedIncoming.has(order.id + '__locked');

        let pyBadge = '';
        if (isPyAssigned) {
            // REGLA 2: No mostrar en Entrantes como disponible, mostrar como enviado a PY
            pyBadge = `
                <div style="display:flex;flex-direction:column;gap:4px;">
                    ${typeof PedidosYa !== 'undefined' ? PedidosYa.renderBadge(order.estado_pedidosya || 'pending') : ''}
                    <span style="font-size:10px;font-family:monospace;color:#94a3b8;word-break:break-all;">${order.shipping_id}</span>
                </div>`;
        } else if (isSurq) {
            pyBadge = `<span style="font-size:11px;color:#FF5A00;font-weight:600;">🛵 Disponible</span>`;
        } else {
            pyBadge = `<span style="font-size:11px;color:#94a3b8;">—</span>`;
        }

        const whBadgeStyle = order.warehouseId === 'WH001'
            ? 'background:#fef3c7;color:#b45309;'
            : 'background:#dbeafe;color:#1d4ed8;';

        // Row visual: gris/opaco si está bloqueado
        const rowStyle = isPyAssigned
            ? 'background:#f8fafc;opacity:0.75;'
            : '';

        return `
        <tr style="${rowStyle}">
            <td>
                <input type="checkbox" class="order-cb" data-id="${order.id}" data-warehouse="${order.warehouseId}"
                    ${isPyAssigned ? 'disabled title="Pedido ya enviado a PedidosYa — no puede asignarse también a ruta interna"' : ''}>
            </td>
            <td>
                <strong>${order.id}</strong>
                ${isPyAssigned ? `<div style="font-size:11px;color:#FF5A00;font-weight:700;margin-top:3px;">🛵 En PedidosYa</div>` : ''}
                ${!isPyAssigned && order.rejectCount ? `<div style="font-size:11px;color:#ef4444;font-weight:bold;margin-top:3px;">⚠ Rechazado (${order.rejectCount})</div>` : ''}
            </td>
            <td>
                <input type="number" class="form-control bultos-input" data-id="${order.id}"
                    value="${order.bultos || ''}" placeholder="0" min="1"
                    style="width:60px;padding:4px 6px;" ${isPyAssigned ? 'disabled' : ''}>
            </td>
            <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${order.client}">${order.client}</td>
            <td style="font-size:12px;max-width:200px;" title="${order.address}">${order.address || '—'}</td>
            <td>${order.district}</td>
            <td>${getZoneBadge(zone)}</td>
            <td>
                <span class="badge" style="${whBadgeStyle}padding:3px 8px;font-size:11px;">${wmName}</span>
            </td>
            <td style="white-space:nowrap;">${order.date}</td>
            <td>${getStatusBadge(order.status)}</td>
            <td>${pyBadge}</td>
        </tr>`;
    }).join('');

    // Handlers de bultos
    document.querySelectorAll('.bultos-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const val = parseInt(e.target.value);
            const id  = e.target.dataset.id;
            appState.orders = appState.orders.map(o => o.id === id ? { ...o, bultos: isNaN(val) ? null : val } : o);
            saveState();
        });
    });

    // Handlers de checkboxes (solo los habilitados)
    const cbs = document.querySelectorAll('.order-cb:not([disabled])');
    cbs.forEach(cb => {
        if (appState.selectedIncoming.has(cb.dataset.id)) cb.checked = true;
        cb.addEventListener('change', (e) => {
            if (e.target.checked) appState.selectedIncoming.add(e.target.dataset.id);
            else                  appState.selectedIncoming.delete(e.target.dataset.id);
            updateAssignButton();
            renderRoutingPreview();
        });
    });

    // Select All: solo marca los checkboxes disponibles
    const selectAll = document.getElementById('select-all-incoming');
    if (selectAll) {
        selectAll.checked = false;
        selectAll.onchange = (e) => {
            cbs.forEach(cb => {
                cb.checked = e.target.checked;
                if (e.target.checked) appState.selectedIncoming.add(cb.dataset.id);
                else                  appState.selectedIncoming.delete(cb.dataset.id);
            });
            updateAssignButton();
        };
    }

    // REGLA 9: Mostrar contador de pedidos bloqueados
    const lockedCount = pendingOrders.filter(o => !!o.shipping_id).length;
    const existingInfo = document.getElementById('incoming-locked-info');
    if (lockedCount > 0) {
        if (!existingInfo) {
            const info = document.createElement('div');
            info.id = 'incoming-locked-info';
            info.style.cssText = 'font-size:12px;color:#FF5A00;font-weight:600;margin-top:8px;padding:8px 12px;background:#fff7ed;border-radius:8px;border:1px solid #fed7aa;';
            info.innerHTML = `🛵 ${lockedCount} pedido(s) asignado(s) a PedidosYa — no disponibles para ruta interna. Ver seguimiento en <strong>Estado de Envíos</strong>.`;
            tbody.parentElement.parentElement.insertBefore(info, tbody.parentElement);
        }
    } else if (existingInfo) {
        existingInfo.remove();
    }
}

function updateAssignButton() {
    const btnNav = document.getElementById('btn-assign-selected');
    if (btnNav) {
        btnNav.textContent = `Mover al Armado de Ruta (${appState.selectedIncoming.size})`;
        btnNav.disabled = appState.selectedIncoming.size === 0;
    }

    const btnDraft = document.getElementById('btn-add-draft');
    if (btnDraft) btnDraft.disabled = appState.selectedIncoming.size === 0;

    const info = document.getElementById('routing-selection-info');
    if (info) {
        if (appState.selectedIncoming.size > 0) {
            info.style.display = 'block';
            info.textContent = `Pedidos listos para mover al borrador: ${appState.selectedIncoming.size}`;
        } else {
            info.style.display = 'none';
        }
    }

    // Botón PedidosYa: visible solo si todos los seleccionados son de SURQUILLO
    const btnPY = document.getElementById('btn-assign-pedidosya');
    if (btnPY && typeof PedidosYa !== 'undefined') {
        if (appState.selectedIncoming.size > 0) {
            const selectedOrders = Array.from(appState.selectedIncoming)
                .map(id => appState.orders.find(o => o.id === id))
                .filter(Boolean);
            const allSurquillo = selectedOrders.every(o => PedidosYa.isSurquilloOrder(o));
            btnPY.style.display = allSurquillo ? 'inline-flex' : 'none';
        } else {
            btnPY.style.display = 'none';
        }
    }
}

// Botón asignar a ruta
const btnAssign = document.getElementById('btn-assign-selected');
if (btnAssign) {
    btnAssign.addEventListener('click', () => {
        if (appState.selectedIncoming.size > 0) {
            document.querySelector('[data-target="routing"]').click();
            updateAssignButton();
        }
    });
}

// Botón asignar a PedidosYa
const btnPY = document.getElementById('btn-assign-pedidosya');
if (btnPY) {
    btnPY.addEventListener('click', () => {
        if (typeof PedidosYa !== 'undefined') {
            PedidosYa.openModal(Array.from(appState.selectedIncoming));
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTING
// ═══════════════════════════════════════════════════════════════════════════

function initRoutingForm() {
    const driverSelect = document.getElementById('driver-select');
    if (driverSelect) {
        driverSelect.innerHTML = appState.drivers
            .filter(d => d.status !== 'inactive')
            .map(d => `<option value="${d.id}">${d.name} (${d.unit})</option>`)
            .join('');
    }

    const zoneSelect = document.getElementById('zone-select');
    if (zoneSelect) {
        const macroZonas = ['NORTE','SUR','ESTE','OESTE'];
        zoneSelect.innerHTML = `<option value="all">Todas las Zonas</option>` +
            macroZonas.map(z => `<option value="${z}">ZONA ${z}</option>`).join('');
    }

    // Chofer filter de tracking
    const filterDriver = document.getElementById('filter-driver');
    if (filterDriver) {
        filterDriver.innerHTML = `<option value="all">Todos los choferes</option>` +
            appState.drivers.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    }

    // Chofer filter de rutas activas
    const filterRouteDriver = document.getElementById('filter-route-driver');
    if (filterRouteDriver) {
        filterRouteDriver.innerHTML = `<option value="all">Todos los choferes</option>` +
            appState.drivers.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    }

    // Default fecha de hoy en filtro rutas
    const filterRouteDate = document.getElementById('filter-route-date');
    if (filterRouteDate && !filterRouteDate.value) filterRouteDate.value = getLocalISODate();
}

function renderRoutingPreview() {
    const list = document.getElementById('route-preview-list');
    if (!list) return;
    if (appState.selectedIncoming.size === 0) {
        list.innerHTML = `<li class="empty-state">No hay pedidos seleccionados. Regresa a Entrantes.</li>`;
        return;
    }
    const selectedOrders = Array.from(appState.selectedIncoming)
        .map(id => appState.orders.find(o => o.id === id)).filter(Boolean);
    const zone = appState.selectedIncoming.size > 0
        ? getZoneFromDistrict(selectedOrders[0]?.district)
        : '';

    list.innerHTML = selectedOrders.map(order => `
        <li style="padding:10px;border-bottom:1px solid var(--color-border);font-size:13px;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <strong>${order.id}</strong>
                <div style="color:var(--color-text-muted);font-size:11px;margin-top:2px;">${order.client.substring(0,25)}</div>
            </div>
            <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                <span style="font-size:11px;color:var(--color-primary);">📍 ${order.district}</span>
                ${getZoneBadge(getZoneFromDistrict(order.district))}
            </div>
        </li>
    `).join('');
}

function renderDraftRoutes() {
    const container = document.getElementById('draft-routes-grid');
    if (!container) return;

    const draftOrders = appState.orders.filter(o => o.status === 'Borrador');
    if (draftOrders.length === 0) {
        container.innerHTML = `<div class="empty-state">No hay carga pre-asignada. Ve a Pedidos Entrantes y selecciona carga.</div>`;
        return;
    }

    const draftMap = {};
    draftOrders.forEach(o => {
        if (!draftMap[o.driverId]) draftMap[o.driverId] = [];
        draftMap[o.driverId].push(o);
    });

    let html = '';
    for (const dId in draftMap) {
        const orders = draftMap[dId];
        const dName  = getDriverName(parseInt(dId));
        const zones  = [...new Set(orders.map(o => getZoneFromDistrict(o.district)))].join(', ');

        html += `
        <div style="border:1px solid var(--color-border);border-radius:10px;overflow:hidden;display:flex;flex-direction:column;">
            <div style="background:var(--color-bg);padding:12px 16px;border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <h4 style="margin:0;font-size:14px;">Chofer: ${dName}</h4>
                    <span style="font-size:11px;color:var(--color-text-muted);">Zonas: ${zones} · Pedidos: ${orders.length}</span>
                </div>
                <button class="btn btn-primary" style="padding:6px 12px;font-size:12px;background:#10b981;border-color:#10b981;"
                    onclick="window.closeDraftRoute('${dId}')">CERRAR Y CREAR RUTA</button>
            </div>
            <ul style="list-style:none;padding:0;margin:0;max-height:240px;overflow-y:auto;">
                ${orders.map(o => `
                <li style="padding:10px 16px;border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center;">
                    <div style="flex:1;">
                        <div style="font-size:13px;font-weight:500;">${o.id} <span style="font-size:10px;color:#888;">(${o.bultos || 'S/B'} Bt.)</span></div>
                        <div style="font-size:11px;color:var(--color-text-muted);">${o.district} — ${o.client.substring(0,22)}...</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        ${getZoneBadge(getZoneFromDistrict(o.district))}
                        <button class="btn-icon" style="color:#ef4444;width:24px;height:24px;"
                            onclick="removeFromDraft('${o.id}')" title="Regresar a Pendientes">
                            <i data-lucide="x" style="width:14px;"></i>
                        </button>
                    </div>
                </li>`).join('')}
            </ul>
        </div>`;
    }
    container.innerHTML = html;
    lucide.createIcons();
}

window.removeFromDraft = (orderId) => {
    appState.orders = appState.orders.map(o =>
        o.id === orderId ? { ...o, status: 'Pendiente', driverId: null, zoneAssign: null } : o
    );
    appState.selectedIncoming.add(orderId);
    saveState();
    updateAssignButton();
    renderRoutingPreview();
    renderDraftRoutes();
};

window.closeDraftRoute = (driverId) => {
    console.log('[DEBUG] closeDraftRoute called for driverId:', driverId, typeof driverId);
    
    // Comparación ultra-robusta de IDs
    const ordersToClose = appState.orders.filter(o => {
        const match = o.status === 'Borrador' && String(o.driverId) === String(driverId);
        if (o.status === 'Borrador') {
            console.log(`[DEBUG] Checking order ${o.id}: status=${o.status}, orderDriverId=${o.driverId} (${typeof o.driverId}), targetDriverId=${driverId} (${typeof driverId}) -> Match: ${match}`);
        }
        return match;
    });

    console.log('[DEBUG] ordersToClose length:', ordersToClose.length);
    if (ordersToClose.length === 0) {
        console.warn('[DEBUG] No orders found to close for driverId:', driverId);
        return;
    }
    if (!confirm('¿Seguro que deseas CERRAR la ruta para este Chofer? Se generará la Hoja PDF.')) return;

    const routeDate    = getFormattedDateTime();
    const routeDateIso = getLocalISODate();

    function getNextRouteId() {
        let seq = parseInt(localStorage.getItem('panuts_route_seq') || '1');
        const formatted = String(seq).padStart(6, '0');
        localStorage.setItem('panuts_route_seq', seq + 1);
        return `RTA-${formatted}`;
    }
    const routeId   = getNextRouteId();
    const firstZone = getZoneFromDistrict(ordersToClose[0].district) || ordersToClose[0].zoneAssign;

    appState.orders = appState.orders.map(o => {
        if (o.status === 'Borrador' && String(o.driverId) === String(driverId)) {
            const historyObj = {
                driverId: o.driverId, routeId, zoneAssign: o.zoneAssign || getZoneFromDistrict(o.district),
                routeDate, routeDateIso, status: 'En Ruta',
                deliveryDate: null, observation: null, evidencePhoto: null
            };
            const history = o.history ? [...o.history] : [];
            history.push(historyObj);
            return { ...o, status: 'En Ruta', routeId, routeDate, routeDateIso, history };
        }
        return o;
    });

    saveState();
    generatePDFRouteSheet(routeId, driverId, firstZone, ordersToClose);
    renderDraftRoutes();
    renderActiveRoutes();
    document.querySelector('[data-target="tracking"]').click();
};

// Botón Mover a Borrador
document.getElementById('btn-add-draft').addEventListener('click', () => {
    if (appState.selectedIncoming.size === 0) {
        alert('Por favor selecciona al menos un pedido.');
        return;
    }
    const driverId = parseInt(document.getElementById('driver-select').value);
    if (isNaN(driverId)) { alert('Selecciona un chofer válido.'); return; }

    const zoneSelect  = document.getElementById('zone-select');
    const zoneName    = zoneSelect.options[zoneSelect.selectedIndex].text;

    const selectedOrders = Array.from(appState.selectedIncoming)
        .map(id => appState.orders.find(o => o.id === id)).filter(Boolean);
    const rejectedOrders = selectedOrders.filter(o => o.rejectCount > 0);
    if (rejectedOrders.length > 0) {
        const msg = rejectedOrders.map(o => `- ${o.id} (Rechazado ${o.rejectCount} vez)`).join('\n');
        if (!confirm(`ATENCIÓN: Pedidos RECHAZADOS:\n${msg}\n\n¿Confirmas re-enviarlos?`)) return;
    }

    appState.orders = appState.orders.map(order =>
        appState.selectedIncoming.has(order.id)
            ? { ...order, status: 'Borrador', driverId, zoneAssign: zoneName }
            : order
    );

    saveState();
    appState.selectedIncoming.clear();
    updateAssignButton();
    renderRoutingPreview();
    renderDraftRoutes();
    alert('Pedidos agregados al borrador de ruta del chofer.');
});

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 3: HOJAS DE RUTA ACTIVAS — MEJORAS
// ═══════════════════════════════════════════════════════════════════════════

window.resetRouteFilters = () => {
    const routeDate = document.getElementById('filter-route-date');
    if (routeDate) routeDate.value = getLocalISODate();
    const routeDriver = document.getElementById('filter-route-driver');
    if (routeDriver) routeDriver.value = 'all';
    const routeZone = document.getElementById('filter-route-zone');
    if (routeZone) routeZone.value = 'all';
    renderActiveRoutes();
};

function renderActiveRoutes() {
    const tbody = document.getElementById('tbody-active-routes');
    if (!tbody) return;

    const filterDate   = document.getElementById('filter-route-date')?.value || '';
    const filterDriver = document.getElementById('filter-route-driver')?.value || 'all';
    const filterZone   = document.getElementById('filter-route-zone')?.value || 'all';

    const routesMap = {};
    appState.orders.forEach(o => {
        const attempts = (o.history && o.history.length > 0) ? o.history : (o.routeId ? [{...o}] : []);
        attempts.forEach(attempt => {
            if (!attempt.routeId) return;
            if (!routesMap[attempt.routeId]) {
                routesMap[attempt.routeId] = {
                    id:        attempt.routeId,
                    driverId:  attempt.driverId,
                    zone:      attempt.zoneAssign || getZoneFromDistrict(o.district) || 'Mixta',
                    routeDateIso: attempt.routeDateIso || '',
                    routeDate: attempt.routeDate || '',
                    orders:    [],
                    completed: 0
                };
            }
            routesMap[attempt.routeId].orders.push(o);
            if (attempt.status === 'Entregado' || attempt.status === 'Rechazado') {
                routesMap[attempt.routeId].completed++;
            }
        });
    });

    let routesList = Object.values(routesMap);

    // Filtros
    if (filterDate)           routesList = routesList.filter(r => r.routeDateIso === filterDate);
    if (filterDriver !== 'all') routesList = routesList.filter(r => r.driverId === parseInt(filterDriver));
    if (filterZone !== 'all')  routesList = routesList.filter(r => r.zone.includes(filterZone));

    tbody.innerHTML = routesList.length === 0
        ? `<tr><td colspan="7" style="text-align:center;color:var(--color-text-muted);padding:24px;">No hay rutas para los filtros seleccionados</td></tr>`
        : routesList.map(r => {
            const progress = r.orders.length > 0 ? Math.round((r.completed / r.orders.length) * 100) : 0;
            const barColor = progress === 100 ? '#10b981' : 'var(--color-primary)';

            // Módulo 3: ocultar botón si progreso = 100%
            const actionBtn = progress === 100
                ? `<span class="badge" style="background:#d1fae5;color:#047857;">✅ Completada</span>`
                : `<button class="btn" style="background:var(--color-secondary);border:1px solid var(--color-border);padding:6px 12px;font-size:12px;"
                       onclick="reprintRoute('${r.id}')">🖨️ Ver / Imprimir</button>`;

            return `
            <tr>
                <td><strong>${r.id}</strong></td>
                <td>${getDriverName(r.driverId)}</td>
                <td>${r.orders.length} pedidos</td>
                <td style="font-size:12px;white-space:nowrap;">${r.routeDate || r.routeDateIso || '—'}</td>
                <td>${getZoneBadge(r.zone)}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="background:var(--color-border);height:8px;border-radius:4px;overflow:hidden;width:90px;">
                            <div style="width:${progress}%;height:100%;background:${barColor};transition:width 0.3s;"></div>
                        </div>
                        <span style="font-size:11px;font-weight:600;">${progress}%</span>
                    </div>
                </td>
                <td>${actionBtn}</td>
            </tr>`;
        }).join('');
}

window.reprintRoute = (routeId) => {
    const routeOrders = [];
    appState.orders.forEach(o => {
        const attempts = (o.history && o.history.length > 0) ? o.history : (o.routeId ? [o] : []);
        const target = attempts.find(a => a.routeId === routeId);
        if (target) routeOrders.push({...o, ...target});
    });
    if (routeOrders.length === 0) return;
    const first = routeOrders[0];
    generatePDFRouteSheet(routeId, first.driverId, first.zoneAssign || 'Zonas Mixtas', routeOrders);
};

// ═══════════════════════════════════════════════════════════════════════════
// PDF / HOJA DE RUTA
// ═══════════════════════════════════════════════════════════════════════════

function generatePDFRouteSheet(routeId, driverId, zone, orders) {
    const driverName = getDriverName(driverId);
    const dateStr    = getFormattedDateTime();

    // Determina la URL base:
    // - En producción (https/http): usa la URL real del servidor
    // - En local (file://): usa PANUTS_APP_URL configurada arriba
    let baseUrl;
    const proto = window.location.protocol;
    if (proto === 'https:' || proto === 'http:') {
        baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
        baseUrl = baseUrl.replace(/\/+$/, '');
    } else {
        baseUrl = PANUTS_APP_URL.replace(/\/+$/, '');
    }

    const simUrl = `${baseUrl}/index.html?route=${routeId}`;
    const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(simUrl)}`;

    const html = `<html><head><title>Hoja de Ruta - ${routeId}</title>
    <style>
        body { font-family: 'Helvetica Neue', sans-serif; color:#333; margin:40px; }
        .header { border-bottom:3px solid #7a1a2b; padding-bottom:20px; display:flex; justify-content:space-between; align-items:start; margin-bottom:30px; }
        .header h1 { margin:0 0 10px; color:#7a1a2b; font-size:28px; }
        .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .info-grid div { font-size:14px; }
        .qr-box { text-align:center; }
        .qr-box img { width:100px; height:100px; }
        table { width:100%; border-collapse:collapse; margin-top:20px; }
        th,td { border:1px solid #ddd; padding:10px; text-align:left; font-size:13px; }
        th { background:#f8f9fa; font-weight:bold; color:#7a1a2b; }
        .sig { width:100px; height:40px; border-bottom:1px dotted #999; margin:auto; }
        .footer { border-top:1px solid #ddd; padding-top:20px; margin-top:40px; font-size:12px; color:#777; text-align:center; }
        @media print { body { margin:0; padding:20px; } .no-print { display:none; } }
    </style></head><body>
    <div class="header">
        <div>
            <h1>PANUTS VINOS MEMORABLES SAC</h1>
            <p style="margin:4px 0 0;font-size:12px;color:#555;">Hoja de Ruta — Sistema Logístico Propio</p>
            <div class="info-grid">
                <div><strong>Hoja de Ruta:</strong> ${routeId}</div>
                <div><strong>Fecha:</strong> ${dateStr}</div>
                <div><strong>Chofer:</strong> ${driverName}</div>
                <div><strong>Zona Asignada:</strong> ${zone}</div>
                <div><strong>Total Pedidos:</strong> ${orders.length}</div>
            </div>
        </div>
        <div class="qr-box">
            <img src="${qrUrl}" alt="QR">
            <p style="font-size:11px;margin-top:5px;color:#666;">Escanear para App</p>
            <a href="${simUrl}" target="_blank" class="no-print" style="display:block;margin-top:8px;color:#3b82f6;font-size:12px;">🔹 App Móvil</a>
        </div>
    </div>
    <table>
        <thead><tr><th width="30">#</th><th width="100">Pedido</th><th width="50">Bultos</th><th>Cliente / Recibe</th><th>Dirección / Referencia</th><th width="100">Firma</th></tr></thead>
        <tbody>
            ${orders.map((o, i) => `
            <tr>
                <td>${i+1}</td>
                <td><strong>${o.id}</strong></td>
                <td style="text-align:center"><strong>${o.bultos || '-'}</strong></td>
                <td>${o.client}${o.receiver && o.receiver !== o.client ? `<div style="font-size:11px;margin-top:4px;color:#555;"><strong>Recibe:</strong> ${o.receiver}</div>` : ''}</td>
                <td>${o.district} — ${o.address || 'Datos en guía física'}</td>
                <td><div class="sig"></div></td>
            </tr>`).join('')}
        </tbody>
    </table>
    <div style="margin-top:60px;display:flex;justify-content:center;text-align:center;">
        <div style="width:350px;">
            <div style="border-bottom:1px solid #333;margin-bottom:12px;height:40px;"></div>
            <p style="margin:0;font-weight:bold;font-size:14px;">Firma del Chofer: ${driverName}</p>
            <p style="margin:4px 0 0;font-size:12px;">DNI: _______________________</p>
            <p style="margin:12px 0 0;font-size:11px;color:#555;line-height:1.4;">Declaro que he recibido conforme los pedidos detallados en esta Hoja de Ruta, asumiendo total responsabilidad durante el despacho.</p>
        </div>
    </div>
    <div class="footer"><p>Documento de uso interno · PANUTS VINOS MEMORABLES SAC · Sistema Logístico v2.0 · <em>Elaborado por CAVAL · Derechos Reservados</em></p></div>
    <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };<\/script>
    </body></html>`;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
        alert('⚠️ El navegador bloqueó la apertura de la Hoja de Ruta. Por favor, habilita los pop-ups para este sitio para poder imprimir.');
        return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// TRACKING (ESTADO DE ENVÍOS)
// ═══════════════════════════════════════════════════════════════════════════

window.resetFilters = () => {
    ['filter-order','filter-date','filter-status','filter-zone','filter-driver'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = el.tagName === 'SELECT' ? 'all' : '';
    });
    renderTrackingTable();
};

// Helper: formatea datetime ISO a texto legible
function _formatPYDateTime(isoStr) {
    if (!isoStr) return null;
    try {
        const d = new Date(isoStr);
        const date = d.toLocaleDateString('es-PE', {day:'2-digit',month:'2-digit',year:'numeric'});
        const time = d.toLocaleTimeString('es-PE', {hour:'2-digit',minute:'2-digit'});
        return `${date} ${time}`;
    } catch(e) { return isoStr; }
}

function renderTrackingTable() {
    const tbody = document.getElementById('tbody-tracking');
    if (!tbody) return;

    const filterOrder  = (document.getElementById('filter-order')?.value || '').toLowerCase().trim();
    const filterDate   = document.getElementById('filter-date')?.value || '';
    const filterZone   = document.getElementById('filter-zone')?.value || 'all';
    const filterDriver = document.getElementById('filter-driver')?.value || 'all';
    const filterStatus = document.getElementById('filter-status')?.value || 'all';

    // Construir lista aplanada: pedidos PY van DIRECTO sin historia de rutas internas
    let flattenedAttempts = [];
    appState.orders.forEach(order => {
        const isPY = !!order.shipping_id;

        if (isPY) {
            // REGLA 2: PedidosYa es su propio flujo, no se mezcla con rutas internas
            const savedStatuses = JSON.parse(localStorage.getItem('panuts_py_statuses') || '{}');
            const pyCurrentStatus = savedStatuses[order.shipping_id] || order.estado_pedidosya || 'pending';
            const pyStateMap = {
                pending:    'Pendiente',
                assigned:   'En Ruta',
                picked_up:  'En Ruta',
                in_transit: 'En Ruta',
                delivered:  'Entregado',
                canceled:   'Rechazado'
            };
            const pyDisplayStatus = pyStateMap[pyCurrentStatus] || 'En Ruta';

            flattenedAttempts.push({
                order,
                attemptIndex: 0,
                isMultiple:   false,
                isPY:         true,
                pyStatus:     pyCurrentStatus,
                // REGLA 6: Hoja de Ruta = shipping_id de PedidosYa
                routeId:      order.shipping_id,
                // REGLA 5: Chofer = null (mostrará "PEDIDOS YA")
                driverId:     null,
                isPYDriver:   true,
                status:       pyDisplayStatus,
                zoneAssign:   getZoneFromDistrict(order.district) || 'N/A',
                // REGLA 7: Fecha H. Ruta = fecha en que se creó el shipping en PY
                routeDate:    _formatPYDateTime(order.fecha_envio) || 'S/F',
                routeDateIso: order.fecha_envio ? order.fecha_envio.slice(0,10) : '',
                // REGLA 8: Fecha Gestión = fecha_entrega_real (delivered_at)
                deliveryDate: _formatPYDateTime(order.fecha_entrega_real),
                observation:  null,
                evidencePhoto:order.proof_of_delivery_url || null,
                riderName:    order.rider_name || null,
                riderPhone:   order.rider_phone || null
            });
        } else {
            // Flujo interno normal
            const attempts = (order.history && order.history.length > 0) ? order.history : [order];
            attempts.forEach((attempt, index) => {
                flattenedAttempts.push({
                    order,
                    attemptIndex: index,
                    isMultiple:   attempts.length > 1,
                    isPY:         false,
                    isPYDriver:   false,
                    routeId:      attempt.routeId || order.routeId || 'No asig.',
                    driverId:     attempt.driverId || order.driverId,
                    status:       attempt.status || order.status || 'Pendiente',
                    zoneAssign:   attempt.zoneAssign || order.zoneAssign || getZoneFromDistrict(order.district) || 'N/A',
                    routeDate:    attempt.routeDate || order.routeDate || 'S/F',
                    routeDateIso: attempt.routeDateIso || order.routeDateIso,
                    deliveryDate: attempt.deliveryDate || order.deliveryDate,
                    observation:  attempt.observation || order.observation,
                    evidencePhoto:attempt.evidencePhoto || order.evidencePhoto
                });
            });
        }
    });

    let filtered = flattenedAttempts.filter(f => {
        if (filterOrder && !f.order.id.toLowerCase().includes(filterOrder)) return false;
        if (filterZone !== 'all') {
            const z = f.zoneAssign || '';
            if (!z.includes(filterZone) && !filterZone.includes(z)) return false;
        }
        // REGLA 5: Para filtro de chofer, los pedidos PY no se filtran por chofer interno
        if (filterDriver !== 'all' && !f.isPYDriver && f.driverId !== parseInt(filterDriver)) return false;
        if (filterStatus !== 'all' && f.status !== filterStatus) return false;
        if (filterDate && f.routeDateIso && !f.routeDateIso.startsWith(filterDate)) return false;
        return true;
    }).sort((a,b) => {
        // PY primero, luego por routeId
        if (a.isPY && !b.isPY) return -1;
        if (!a.isPY && b.isPY) return 1;
        return a.routeId < b.routeId ? -1 : a.routeId > b.routeId ? 1 : 0;
    });

    tbody.innerHTML = filtered.map(f => {
        const order       = f.order;
        const attemptLabel = f.isMultiple ? `<br><span style="font-size:10px;font-weight:bold;color:var(--color-primary);">INTENTO ${f.attemptIndex+1}</span>` : '';
        const zoneActual  = f.zoneAssign !== 'N/A' ? f.zoneAssign : getZoneFromDistrict(order.district);

        // ─── Columna Hoja de Ruta / Shipping ID ───────────────
        // REGLA 6: Si es PY → mostrar shipping_id en naranja con badge PY
        let routeIdDisplay;
        if (f.isPY) {
            routeIdDisplay = `
                <div style="display:flex;flex-direction:column;gap:3px;">
                    <span style="font-size:10px;font-weight:800;color:#FF5A00;letter-spacing:0.3px;">🛵 PEDIDOS YA</span>
                    <code style="font-size:11px;color:#374151;background:#fff7ed;padding:2px 6px;border-radius:4px;border:1px solid #fed7aa;">${f.routeId}</code>
                </div>`;
        } else {
            routeIdDisplay = `<strong style="color:#666;">${f.routeId}</strong>`;
        }

        // ─── Columna Chofer ────────────────────────────────────
        // REGLA 5: PY → mostrar "PEDIDOS YA" con info del rider
        let choferDisplay;
        if (f.isPYDriver) {
            const savedStatuses = JSON.parse(localStorage.getItem('panuts_py_statuses') || '{}');
            const pyStatus = savedStatuses[order.shipping_id] || order.estado_pedidosya || 'pending';
            const hasRider = ['assigned','picked_up','in_transit','delivered'].includes(pyStatus);
            choferDisplay = `
                <div style="display:flex;flex-direction:column;gap:3px;">
                    <span style="display:inline-flex;align-items:center;gap:4px;font-weight:700;font-size:12px;color:#FF5A00;">
                        🛵 PEDIDOS YA
                    </span>
                    ${hasRider && f.riderName ? `<span style="font-size:11px;color:#64748b;">Rider: ${f.riderName}</span>` : ''}
                    ${hasRider && !f.riderName ? `<span style="font-size:11px;color:#64748b;">Rider asignado</span>` : ''}
                </div>`;
        } else {
            choferDisplay = `
                <div style="display:flex;align-items:center;gap:6px;">
                    <i data-lucide="${f.driverId ? 'truck' : 'clock'}" style="width:15px;height:15px;color:var(--color-text-muted)"></i>
                    ${getDriverName(f.driverId)}
                </div>
                ${f.observation ? `<div style="font-size:11px;color:#ef4444;margin-top:3px;">Razón: ${f.observation}</div>` : ''}`;
        }

        // ─── Columna Fecha H. Ruta ─────────────────────────────
        // REGLA 7: Si PY → fecha_envio (cuando se creó el shipping)
        const fechaHRuta = f.routeDate;

        // ─── Columna Fecha/Hora Gestión ────────────────────────
        // REGLA 8: Si PY → fecha_entrega_real (delivered_at de PY)
        let fechaGestion;
        if (f.isPY) {
            if (f.deliveryDate) {
                fechaGestion = `<strong style="color:#10b981;">${f.deliveryDate}</strong><br><span style="font-size:10px;color:#94a3b8;">Entrega PY confirmada</span>`;
            } else {
                const savedStatuses = JSON.parse(localStorage.getItem('panuts_py_statuses') || '{}');
                const pyStatus = savedStatuses[order.shipping_id] || order.estado_pedidosya || 'pending';
                const pyLabel = { pending:'En espera', assigned:'Rider f asignado', picked_up:'Recogido', in_transit:'En tránsito', delivered:'Entregado', canceled:'Cancelado' };
                fechaGestion = `<span style="color:#64748b;font-size:12px;">${pyLabel[pyStatus] || 'En proceso'}</span>`;
            }
        } else {
            fechaGestion = (f.status === 'Entregado' || f.status === 'Rechazado')
                ? (f.deliveryDate || 'Fecha no registrada')
                : 'Pendiente';
            if (f.evidencePhoto) {
                fechaGestion += `<br><a href="#" onclick="viewEvidence('${order.id}', ${f.attemptIndex}); return false;" style="color:#3b82f6;font-size:11px;">📸 Ver Evidencia</a>`;
            }
        }

        // ─── Columna Estado ────────────────────────────────────
        let statusDisplay = getStatusBadge(f.status);

        // ─── Columna PedidosYa ─────────────────────────────────
        let pyInfo = '—';
        if (order.shipping_id) {
            const savedStatuses = JSON.parse(localStorage.getItem('panuts_py_statuses') || '{}');
            const pyCurrentStatus = savedStatuses[order.shipping_id] || order.estado_pedidosya || 'pending';
            pyInfo = typeof PedidosYa !== 'undefined'
                ? PedidosYa.renderBadge(pyCurrentStatus)
                : `<span class="badge-pedidosya">${pyCurrentStatus}</span>`;

            // REGLA 4: Si entregado → mostrar botón para ver proof of delivery
            if (pyCurrentStatus === 'delivered' || order.status === 'Entregado') {
                pyInfo += `<br><button onclick="showProofOfDelivery('${order.id}')" 
                    style="margin-top:4px;padding:3px 8px;font-size:11px;background:#f0fdf4;color:#047857;
                    border:1px solid #bbf7d0;border-radius:6px;cursor:pointer;font-family:inherit;">
                    📷 Ver Evidencia PY
                </button>`;
            }
        }

        return `
        <tr style="${f.isPY ? 'border-left:3px solid #FF5A00;' : ''}">
            <td><strong>${order.id}</strong>${attemptLabel}</td>
            <td>${routeIdDisplay}</td>
            <td>${getZoneBadge(zoneActual)}</td>
            <td style="font-size:12px;white-space:nowrap;">${fechaHRuta}</td>
            <td>${choferDisplay}</td>
            <td style="font-size:12px;">
                ${order.district}
                <div style="font-size:11px;color:var(--color-text-muted);">${order.address || ''}</div>
            </td>
            <td style="font-size:12px;">${fechaGestion}</td>
            <td>${statusDisplay}</td>
            <td>${pyInfo}</td>
        </tr>`;
    }).join('');

    lucide.createIcons();
}

// REGLA 4: Modal de Proof of Delivery PedidosYa
window.showProofOfDelivery = (orderId) => {
    const order = appState.orders.find(o => o.id === orderId);
    if (!order || !order.shipping_id) return;

    // Llamar a API simulada de PedidosYa
    if (typeof PedidosYa !== 'undefined') {
        PedidosYa.getProofOfDelivery(order.shipping_id).then(pod => {
            _renderProofOfDeliveryModal(order, pod);
        });
    }
};

function _renderProofOfDeliveryModal(order, pod) {
    const prev = document.getElementById('py-pod-modal');
    if (prev) prev.remove();

    const overlay = document.createElement('div');
    overlay.id = 'py-pod-modal';
    overlay.style.cssText = `
        position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.7);
        backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;
        padding:20px;animation:fadeInOverlay 0.2s ease;
    `;
    overlay.innerHTML = `
    <div style="background:white;border-radius:20px;width:100%;max-width:520px;
                box-shadow:0 24px 80px rgba(0,0,0,0.4);overflow:hidden;animation:slideUpModal 0.3s ease;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#10b981,#059669);padding:18px 24px;
                    display:flex;justify-content:space-between;align-items:center;">
            <div style="color:white;">
                <div style="font-weight:700;font-size:15px;">📷 Prueba de Entrega — PedidosYa</div>
                <div style="font-size:12px;opacity:0.85;">Pedido: ${order.id} · Shipping: <code>${pod.shipping_id}</code></div>
            </div>
            <button onclick="document.getElementById('py-pod-modal').remove()"
                style="background:rgba(255,255,255,0.2);border:none;color:white;width:32px;height:32px;
                       border-radius:8px;cursor:pointer;font-size:18px;">✕</button>
        </div>
        <!-- Body -->
        <div style="padding:24px;">
            <div style="display:grid;grid-template-columns:120px 1fr;gap:10px;font-size:13px;margin-bottom:20px;">
                <span style="color:#64748b;font-weight:600;">Entregado a:</span>
                <span style="font-weight:500;">${pod.recipient_name}</span>
                <span style="color:#64748b;font-weight:600;">Fecha/Hora:</span>
                <span style="font-weight:500;color:#10b981;">${_formatPYDateTime(pod.delivered_at) || 'N/A'}</span>
                <span style="color:#64748b;font-weight:600;">Shipping ID:</span>
                <code style="font-size:12px;color:#FF5A00;">${pod.shipping_id}</code>
            </div>
            <!-- Imagen simulada -->
            <div style="background:#f0fdf4;border:2px dashed #bbf7d0;border-radius:12px;padding:32px;
                        text-align:center;">
                <div style="font-size:48px;margin-bottom:12px;">📸</div>
                <div style="font-size:13px;color:#047857;font-weight:600;margin-bottom:4px;">Foto de Evidencia</div>
                <div style="font-size:12px;color:#64748b;margin-bottom:16px;">En producción real, se cargará desde:<br>
                    <code style="font-size:11px;">${pod.proof_url}</code>
                </div>
                <a href="${pod.proof_url}" target="_blank"
                    style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;
                           background:#10b981;color:white;border-radius:8px;text-decoration:none;
                           font-size:13px;font-weight:600;">
                    🔗 Ver URL Evidencia (demo)
                </a>
            </div>
        </div>
    </div>`;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

window.viewEvidence = (orderId, attemptIndex = -1) => {
    const order = appState.orders.find(o => o.id === orderId);
    if (!order) return;
    let photo = order.evidencePhoto;
    if (attemptIndex > -1 && order.history && order.history[attemptIndex]) {
        photo = order.history[attemptIndex].evidencePhoto;
    }
    if (!photo) return;
    const win = window.open('', '_blank');
    if (win) {
        win.document.write(`<html><head><title>Evidencia - ${order.id}</title></head>
        <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#333;">
            <img src="${photo}" style="max-width:100%;max-height:100vh;object-fit:contain;"/>
        </body></html>`);
        win.document.close();
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// RENDER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

function renderCurrentView() {
    if (appState.currentView === 'dashboard') renderDashboard();
    if (appState.currentView === 'incoming')  { initIncomingFilters(); renderIncomingTable(); }
    if (appState.currentView === 'routing')   { renderRoutingPreview(); renderDraftRoutes(); renderActiveRoutes(); }
    if (appState.currentView === 'tracking')  renderTrackingTable();
    if (appState.currentView === 'config')    renderConfigView();

    // Siempre refrescar notificaciones
    if (typeof NotificationCenter !== 'undefined') NotificationCenter.refresh();
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN — Sub-pestañas
// ═══════════════════════════════════════════════════════════════════════════

let configActiveTab = 'drivers';

function renderConfigView() {
    const container = document.getElementById('view-config');
    if (!container) return;

    const isAdmin = typeof AuthManager !== 'undefined' ? AuthManager.hasRole('admin') : true;

    container.innerHTML = `
    <div class="card" style="padding: 0; overflow: hidden;">
        <div style="display:flex; border-bottom:1px solid var(--color-border); background:var(--color-secondary);">
            ${_configTabBtn('drivers', isAdmin || true, '🚚 Choferes y Flota')}
            ${isAdmin ? _configTabBtn('warehouses', true, '🏭 Almacenes') : ''}
            ${isAdmin ? _configTabBtn('users', true, '👥 Usuarios y Accesos') : ''}
        </div>
        <div id="config-tab-content" style="padding:24px;"></div>
    </div>`;

    container.querySelectorAll('.config-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            configActiveTab = btn.dataset.tab;
            renderConfigView();
        });
    });

    lucide.createIcons();

    if (configActiveTab === 'drivers')    renderDriversTab();
    else if (configActiveTab === 'warehouses') renderWarehousesTab();
    else if (configActiveTab === 'users')      renderUsersTab();
}

function _configTabBtn(tab, show, label) {
    if (!show) return '';
    const active = configActiveTab === tab;
    return `
    <button class="config-tab-btn ${active ? 'active' : ''}" data-tab="${tab}"
        style="padding:14px 22px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;
               color:${active ? 'var(--color-primary)' : 'var(--color-text-muted)'};
               border-bottom:3px solid ${active ? 'var(--color-primary)' : 'transparent'};
               transition:all 0.2s;">
        ${label}
    </button>`;
}

// ─── SUB-PESTAÑA 1: CHOFERES (con Licencia + Alerta) ─────────────────────────

let driverEditingId = null;

function _getLicenseBadge(licenseExpiry) {
    if (!licenseExpiry) return `<span class="badge" style="background:#f1f5f9;color:#94a3b8;">Sin fecha</span>`;

    const today  = new Date(); today.setHours(0,0,0,0);
    const expiry = new Date(licenseExpiry); expiry.setHours(0,0,0,0);
    const daysLeft = Math.round((expiry - today) / 86400000);

    if (daysLeft < 0)   return `<span class="badge license-danger">🚨 Vencida hace ${Math.abs(daysLeft)}d</span>`;
    if (daysLeft <= 30) return `<span class="badge license-warning">⚠ Vence en ${daysLeft}d</span>`;
    if (daysLeft <= 60) return `<span class="badge" style="background:#fef3c7;color:#b45309;">🟡 ${daysLeft}d</span>`;
    return `<span class="badge license-ok">✔ ${daysLeft}d</span>`;
}

function renderDriversTab() {
    const content = document.getElementById('config-tab-content');
    if (!content) return;
    const drivers = appState.drivers;
    const editing = driverEditingId ? drivers.find(d => d.id === driverEditingId) : null;

    content.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 380px;gap:24px;align-items:start;">
        <!-- Tabla -->
        <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="margin:0;font-size:16px;">Directorio de Choferes</h3>
                <button class="btn btn-primary" id="btn-new-driver" style="display:flex;align-items:center;gap:6px;padding:8px 14px;">
                    <i data-lucide="plus" style="width:14px;height:14px;"></i> Nuevo Chofer
                </button>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Código</th><th>Nombre</th><th>Unidad / Placa</th>
                            <th>Licencia</th><th>Vencimiento</th><th>Estado</th><th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${drivers.length === 0
                            ? `<tr><td colspan="7" style="text-align:center;color:var(--color-text-muted);padding:32px;">No hay choferes registrados.</td></tr>`
                            : drivers.map(d => `
                        <tr style="${driverEditingId === d.id ? 'background:#fef3c7;' : ''}">
                            <td><strong>CHO-${d.id}</strong></td>
                            <td>${d.name}</td>
                            <td>${d.unit}</td>
                            <td>
                                <div style="font-size:13px;">${d.licenseNumber || 'S/N'}</div>
                                <div style="font-size:11px;color:var(--color-text-muted);">Cat: ${d.license || 'N/A'}</div>
                            </td>
                            <td>${_getLicenseBadge(d.licenseExpiry)}</td>
                            <td>
                                <span class="badge" style="cursor:pointer;background:${d.status==='inactive'?'#fcd34d':'#86efac'};color:${d.status==='inactive'?'#92400e':'#065f46'};"
                                    onclick="toggleDriverStatus(${d.id})">
                                    ${d.status === 'inactive' ? '⏸ Inactivo' : '✔ Activo'}
                                </span>
                            </td>
                            <td style="display:flex;gap:6px;">
                                <button class="btn" style="padding:5px 10px;font-size:12px;background:var(--color-secondary);border:1px solid var(--color-border);"
                                    onclick="editDriver(${d.id})"><i data-lucide="pencil" style="width:13px;height:13px;"></i></button>
                                <button class="btn" style="padding:5px 10px;font-size:12px;color:#ef4444;border:1px solid #fca5a5;"
                                    onclick="deleteDriver(${d.id})"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Formulario -->
        <div id="driver-form-panel" style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:12px;padding:24px;position:sticky;top:0;">
            <h3 style="margin:0 0 20px;font-size:15px;color:var(--color-primary);display:flex;align-items:center;gap:8px;">
                <i data-lucide="${driverEditingId ? 'user-check' : 'user-plus'}" style="width:16px;height:16px;"></i>
                ${driverEditingId ? 'Editar Chofer' : 'Registrar Nuevo Chofer'}
            </h3>

            <div class="form-group">
                <label>Nombre y Apellidos <span style="color:#ef4444;">*</span></label>
                <input type="text" id="df-name" class="form-control" placeholder="Ej: Juan Pérez Quispe"
                    value="${editing ? editing.name : ''}">
            </div>
            <div class="form-group">
                <label>Unidad / Placa <span style="color:#ef4444;">*</span></label>
                <input type="text" id="df-unit" class="form-control" placeholder="Ej: Furgoneta ABC-123"
                    value="${editing ? editing.unit : ''}">
            </div>
            <div class="form-group">
                <label>Número de Licencia</label>
                <input type="text" id="df-license-num" class="form-control" placeholder="Ej: Q14512345"
                    value="${editing ? (editing.licenseNumber || '') : ''}">
            </div>
            <div class="form-group">
                <label>Categoría de Licencia</label>
                <select id="df-license-cat" class="form-control">
                    ${['','A-I','A-IIa','A-IIb','A-IIIa','A-IIIb','A-IIIc','B-I','B-IIa','B-IIb','B-IIc'].map(cat =>
                        `<option value="${cat}" ${editing && editing.license === cat ? 'selected':''}>${cat || '-- Seleccionar --'}</option>`
                    ).join('')}
                </select>
            </div>
            <!-- MÓDULO 5: Fecha vencimiento licencia -->
            <div class="form-group">
                <label>📅 Vencimiento de Licencia <span style="color:#ef4444;">*</span></label>
                <input type="date" id="df-license-expiry" class="form-control"
                    value="${editing ? (editing.licenseExpiry || '') : ''}">
                <div style="font-size:11px;color:var(--color-text-muted);margin-top:4px;">Se alertará 30 días antes del vencimiento.</div>
            </div>
            <div class="form-group">
                <label>Teléfono / Celular</label>
                <input type="tel" id="df-phone" class="form-control" placeholder="Ej: 987654321"
                    value="${editing ? (editing.phone || '') : ''}">
            </div>
            <div class="form-group">
                <label>DNI</label>
                <input type="text" id="df-dni" class="form-control" placeholder="Ej: 41234567"
                    value="${editing ? (editing.dni || '') : ''}">
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;">
                <button class="btn btn-primary" style="flex:1;" onclick="saveDriverForm()">
                    ${driverEditingId ? '💾 Guardar Cambios' : '➕ Agregar Chofer'}
                </button>
                ${driverEditingId ? `<button class="btn" style="background:var(--color-border);color:var(--color-text-main);" onclick="cancelDriverEdit()">Cancelar</button>` : ''}
            </div>
        </div>
    </div>`;

    lucide.createIcons();
    document.getElementById('btn-new-driver').addEventListener('click', () => {
        driverEditingId = null; renderDriversTab();
    });
}

window.editDriver   = (id) => { driverEditingId = id; renderDriversTab(); document.getElementById('driver-form-panel')?.scrollIntoView({behavior:'smooth'}); };
window.cancelDriverEdit = () => { driverEditingId = null; renderDriversTab(); };

window.saveDriverForm = () => {
    const name   = document.getElementById('df-name').value.trim();
    const unit   = document.getElementById('df-unit').value.trim();
    if (!name || !unit) { alert('Nombre y Unidad son obligatorios.'); return; }

    const licenseNumber = document.getElementById('df-license-num').value.trim();
    const license       = document.getElementById('df-license-cat').value;
    const licenseExpiry = document.getElementById('df-license-expiry').value;
    const phone         = document.getElementById('df-phone').value.trim();
    const dni           = document.getElementById('df-dni').value.trim();

    if (driverEditingId) {
        appState.drivers = appState.drivers.map(d =>
            d.id === driverEditingId ? { ...d, name, unit, licenseNumber, license, licenseExpiry, phone, dni } : d
        );
    } else {
        const maxId = appState.drivers.reduce((max, d) => Math.max(max, d.id), 100);
        appState.drivers.push({ id: maxId+1, name, unit, licenseNumber, license, licenseExpiry, phone, dni, status: 'available' });
    }

    saveState();
    driverEditingId = null;
    renderDriversTab();
    NotificationCenter.refresh();
};

window.toggleDriverStatus = (id) => {
    const driver = appState.drivers.find(d => d.id === id);
    if (driver) {
        driver.status = driver.status === 'inactive' ? 'available' : 'inactive';
        saveState(); renderDriversTab();
    }
};

window.deleteDriver = (id) => {
    if (confirm('¿Seguro que deseas eliminar este chofer?')) {
        appState.drivers = appState.drivers.filter(d => d.id !== id);
        saveState(); renderDriversTab();
    }
};

window.renderDriverModal = () => {
    document.querySelector('[data-target="config"]').click();
    setTimeout(() => { configActiveTab = 'drivers'; renderConfigView(); }, 100);
};

// ─── SUB-PESTAÑA 2: ALMACENES ─────────────────────────────────────────────────

let warehouseEditingId = null;

function renderWarehousesTab() {
    const content = document.getElementById('config-tab-content');
    if (!content || typeof AuthManager === 'undefined') return;

    const warehouses = JSON.parse(localStorage.getItem('panuts_warehouses') || '[]');
    const editing    = warehouseEditingId ? warehouses.find(w => w.id === warehouseEditingId) : null;

    content.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 360px;gap:24px;align-items:start;">
        <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="margin:0;font-size:16px;">Almacenes Registrados</h3>
                <button class="btn btn-primary" id="btn-new-wh" style="padding:8px 14px;display:flex;align-items:center;gap:6px;">
                    <i data-lucide="plus" style="width:14px;height:14px;"></i> Nuevo Almacén
                </button>
            </div>
            <table class="data-table">
                <thead><tr><th>ID</th><th>Nombre</th><th>Dirección</th><th>Coordenadas</th><th>PedidosYa</th><th>Estado</th><th>Acción</th></tr></thead>
                <tbody>
                    ${warehouses.map(w => `
                    <tr style="${warehouseEditingId === w.id ? 'background:#fef3c7;' : ''}">
                        <td><strong>${w.id}</strong></td>
                        <td>${w.name}</td>
                        <td style="font-size:13px;">${w.address}</td>
                        <td>
                            ${w.lat && w.lng
                                ? `<a href="https://www.google.com/maps?q=${w.lat},${w.lng}" target="_blank" class="wh-coord-tag">
                                    📍 ${parseFloat(w.lat).toFixed(4)}, ${parseFloat(w.lng).toFixed(4)}
                                   </a>`
                                : `<span style="font-size:11px;color:#94a3b8;">Sin coords</span>`}
                        </td>
                        <td>
                            ${w.id === 'WH001'
                                ? `<span style="color:#FF5A00;font-weight:700;font-size:12px;">🛵 Habilitado</span>`
                                : `<span style="color:#94a3b8;font-size:12px;">— N/A</span>`}
                        </td>
                        <td>
                            <span class="badge" style="cursor:pointer;background:${w.active?'#d1fae5':'#fee2e2'};color:${w.active?'#047857':'#ef4444'};"
                                onclick="toggleWarehouse('${w.id}')">
                                ${w.active ? '✔ Activo' : '✘ Inactivo'}
                            </span>
                        </td>
                        <td>
                            <button class="btn" style="padding:5px 10px;font-size:12px;background:var(--color-secondary);border:1px solid var(--color-border);"
                                onclick="editWarehouse('${w.id}')"><i data-lucide="pencil" style="width:13px;height:13px;"></i></button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
            <div style="margin-top:12px;padding:12px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;font-size:13px;">
                🛵 <strong>PedidosYa Courier</strong> está habilitado únicamente para el almacén <strong>SURQUILLO (WH001)</strong>.
            </div>
        </div>
        <div style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:12px;padding:24px;position:sticky;top:0;">
            <h3 style="margin:0 0 20px;font-size:15px;color:var(--color-primary);">${warehouseEditingId ? '✏️ Editar Almacén' : '🏭 Nuevo Almacén'}</h3>
            <div class="form-group">
                <label>Nombre del Almacén <span style="color:#ef4444;">*</span></label>
                <input type="text" id="wf-name" class="form-control" placeholder="Ej: MIRAFLORES"
                    value="${editing ? editing.name : ''}">
            </div>
            <div class="form-group">
                <label>Dirección</label>
                <input type="text" id="wf-address" class="form-control" placeholder="Ej: Av. Principal 123, Lima"
                    value="${editing ? editing.address : ''}">
            </div>
            <!-- MEJORA: Coordenadas geográficas para cálculo de rutas -->
            <div class="form-group">
                <label>🌐 Coordenadas Geográficas <span style="font-size:11px;color:var(--color-text-muted);font-weight:400;">(para cálculo de rutas)</span></label>
                <div class="coords-group">
                    <div>
                        <label style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;display:block;">Latitud</label>
                        <input type="number" id="wf-lat" class="form-control" placeholder="-12.0464"
                            step="0.000001" value="${editing && editing.lat ? editing.lat : ''}"
                            oninput="updateCoordsPreview()">
                    </div>
                    <div>
                        <label style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;display:block;">Longitud</label>
                        <input type="number" id="wf-lng" class="form-control" placeholder="-77.0428"
                            step="0.000001" value="${editing && editing.lng ? editing.lng : ''}"
                            oninput="updateCoordsPreview()">
                    </div>
                </div>
                <div id="wf-coords-preview" style="display:${editing && editing.lat ? 'flex' : 'none'};" class="coords-preview">
                    <span>📍</span>
                    <span id="wf-coords-text">${editing && editing.lat ? `${editing.lat}, ${editing.lng}` : ''}</span>
                    <a id="wf-coords-link" class="coords-map-link" target="_blank"
                       href="${editing && editing.lat ? `https://www.google.com/maps?q=${editing.lat},${editing.lng}` : '#'}">
                        Ver en Maps →
                    </a>
                </div>
                <div style="font-size:11px;color:var(--color-text-muted);margin-top:6px;">
                    💡 Obtén las coordenadas desde <a href="https://maps.google.com" target="_blank" style="color:var(--color-primary);">Google Maps</a> — clic derecho sobre el punto → copiar coordenadas.
                </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;">
                <button class="btn btn-primary" style="flex:1;" onclick="saveWarehouseForm()">
                    ${warehouseEditingId ? '💾 Guardar' : '➕ Agregar'}
                </button>
                ${warehouseEditingId ? `<button class="btn" style="background:var(--color-border);color:var(--color-text-main);" onclick="cancelWarehouseEdit()">Cancelar</button>` : ''}
            </div>
        </div>
    </div>`;

    lucide.createIcons();
    document.getElementById('btn-new-wh').addEventListener('click', () => { warehouseEditingId = null; renderWarehousesTab(); });
}

window.editWarehouse    = (id) => { warehouseEditingId = id; renderWarehousesTab(); };
window.cancelWarehouseEdit = () => { warehouseEditingId = null; renderWarehousesTab(); };
window.toggleWarehouse  = (id) => {
    if (typeof AuthManager === 'undefined') return;
    const list = JSON.parse(localStorage.getItem('panuts_warehouses') || '[]');
    const idx  = list.findIndex(w => w.id === id);
    if (idx >= 0) { list[idx].active = !list[idx].active; localStorage.setItem('panuts_warehouses', JSON.stringify(list)); }
    renderWarehousesTab();
};
window.saveWarehouseForm = () => {
    if (typeof AuthManager === 'undefined') return;
    const name = document.getElementById('wf-name').value.trim();
    if (!name) { alert('El nombre es obligatorio.'); return; }

    // Leer y validar coordenadas (opcionales)
    const latRaw = document.getElementById('wf-lat').value.trim();
    const lngRaw = document.getElementById('wf-lng').value.trim();
    let lat = null, lng = null;
    if (latRaw || lngRaw) {
        lat = parseFloat(latRaw);
        lng = parseFloat(lngRaw);
        if (isNaN(lat) || isNaN(lng)) { alert('Las coordenadas ingresadas no son válidas.'); return; }
        if (lat < -90 || lat > 90)   { alert('La latitud debe estar entre -90 y 90.'); return; }
        if (lng < -180 || lng > 180) { alert('La longitud debe estar entre -180 y 180.'); return; }
    }

    AuthManager.saveWarehouse({
        id:      warehouseEditingId,
        name:    name.toUpperCase(),
        address: document.getElementById('wf-address').value.trim(),
        lat,
        lng,
        active:  true
    });
    warehouseEditingId = null;
    renderWarehousesTab();
};

/**
 * Actualiza el preview de coordenadas en tiempo real mientras el usuario tipea.
 */
window.updateCoordsPreview = () => {
    const lat     = document.getElementById('wf-lat')?.value;
    const lng     = document.getElementById('wf-lng')?.value;
    const preview = document.getElementById('wf-coords-preview');
    const text    = document.getElementById('wf-coords-text');
    const link    = document.getElementById('wf-coords-link');
    if (!preview) return;
    if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
        preview.style.display = 'flex';
        text.textContent = `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;
        link.href = `https://www.google.com/maps?q=${lat},${lng}`;
    } else {
        preview.style.display = 'none';
    }
};

// ─── SUB-PESTAÑA 3: USUARIOS — MÓDULO 7+8 ────────────────────────────────────

let userEditingId = null;

function renderUsersTab() {
    const content = document.getElementById('config-tab-content');
    if (!content || typeof AuthManager === 'undefined') return;

    const users      = AuthManager.getUsers();
    const warehouses = AuthManager.getWarehouses();
    const editUser   = userEditingId ? users.find(u => u.id === userEditingId) : null;

    // ── Descripciones de roles editables — se guardan en localStorage ──────
    const ROLE_DESC_DEFAULTS = {
        admin:      'Acceso total al sistema',
        gerencia:   'Visibilidad total: reportes, pedidos, rutas y tracking',
        logistics:  'Pedidos, rutas, tracking, PedidosYa',
        supervisor: 'Monitoreo y aprobación de rutas',
        driver:     'Solo sus rutas y entregas asignadas',
        readonly:   'Solo lectura, sin acciones de escritura'
    };
    const savedRoleDescs = JSON.parse(localStorage.getItem('panuts_role_descs') || '{}');
    const roleDescs = { ...ROLE_DESC_DEFAULTS, ...savedRoleDescs };

    // ── Permisos por módulo guardados ────────────────────────────────────────
    const MODULE_LIST = [
        { key: 'orders',    label: 'Pedidos Entrantes',  icon: '📥' },
        { key: 'routes',    label: 'Armado de Rutas',    icon: '🗺️' },
        { key: 'tracking',  label: 'Estado de Envíos',   icon: '📦' },
        { key: 'pedidosya', label: 'PedidosYa',          icon: '🛵' },
        { key: 'reports',   label: 'Reportes',           icon: '📊' },
        { key: 'dashboard', label: 'Dashboard',          icon: '📈' },
        { key: 'config',    label: 'Configuración',      icon: '⚙️'  }
    ];
    // Defaults de acceso por rol: { roleKey: { moduleKey: 'none'|'visual'|'operativo' } }
    const ROLE_MODULE_PERM_DEFAULTS = {
        admin:      { orders:'operativo', routes:'operativo', tracking:'operativo', pedidosya:'operativo', reports:'operativo', dashboard:'operativo', config:'operativo' },
        gerencia:   { orders:'visual',    routes:'visual',    tracking:'visual',    pedidosya:'visual',    reports:'operativo', dashboard:'operativo', config:'none'       },
        logistics:  { orders:'operativo', routes:'operativo', tracking:'operativo', pedidosya:'operativo', reports:'visual',    dashboard:'visual',    config:'none'       },
        supervisor: { orders:'visual',    routes:'operativo', tracking:'operativo', pedidosya:'none',      reports:'operativo', dashboard:'visual',    config:'none'       },
        driver:     { orders:'none',      routes:'none',      tracking:'visual',    pedidosya:'none',      reports:'none',      dashboard:'none',      config:'none'       },
        readonly:   { orders:'none',      routes:'none',      tracking:'visual',    pedidosya:'none',      reports:'visual',    dashboard:'none',      config:'none'       }
    };
    const savedModulePerms = JSON.parse(localStorage.getItem('panuts_role_module_perms') || '{}');
    // Merge: savedModulePerms tiene prioridad sobre defaults
    const roleModulePerms = {};
    Object.keys(ROLE_MODULE_PERM_DEFAULTS).forEach(rk => {
        roleModulePerms[rk] = { ...ROLE_MODULE_PERM_DEFAULTS[rk], ...(savedModulePerms[rk] || {}) };
    });

    const ROLE_LABELS = {
        admin:     { label: 'Administrador', desc: roleDescs.admin,     color: '#7a1a2b', bg: '#fce7eb' },
        gerencia:  { label: 'Gerencia',      desc: roleDescs.gerencia,  color: '#6d28d9', bg: '#ede9fe' },
        logistics: { label: 'Logística',     desc: roleDescs.logistics, color: '#1d4ed8', bg: '#dbeafe' },
        supervisor:{ label: 'Supervisor',    desc: roleDescs.supervisor,color: '#047857', bg: '#d1fae5' },
        driver:    { label: 'Chofer',        desc: roleDescs.driver,    color: '#b45309', bg: '#fef3c7' },
        readonly:  { label: 'Consulta',      desc: roleDescs.readonly,  color: '#64748b', bg: '#f1f5f9' }
    };

    // ── getUsers devuelve contraseñas solo para admin ──────────────────────
    // Para mostrarlas en tabla, leer directo del storage (incluye password)
    const allUsersRaw = JSON.parse(localStorage.getItem('panuts_users') || '[]');

    content.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 400px;gap:24px;align-items:start;">
        <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="margin:0;font-size:16px;">Usuarios del Sistema</h3>
                <button class="btn btn-primary" id="btn-new-user" style="padding:8px 14px;display:flex;align-items:center;gap:6px;">
                    <i data-lucide="user-plus" style="width:14px;height:14px;"></i> Nuevo Usuario
                </button>
            </div>
            <table class="data-table">
                <thead><tr><th>Usuario</th><th>Nombre</th><th>Contraseña</th><th>Rol</th><th>Almacén(es)</th><th>Estado</th><th>Acción</th></tr></thead>
                <tbody>
                    ${allUsersRaw.map(u => {
                        const whNames = (u.warehouseIds||[]).map(wid => {
                            const wh = warehouses.find(w => w.id === wid);
                            return wh ? wh.name : wid;
                        }).join(', ') || '— Todos';
                        const ri = ROLE_LABELS[u.role] || { label: u.role, color: '#64748b', bg: '#f1f5f9' };
                        return `
                        <tr style="${userEditingId === u.id ? 'background:#fef3c7;' : ''}">
                            <td><code style="font-size:12px;">${u.username}</code></td>
                            <td>${u.name}</td>
                            <td>
                                <!-- Contraseña visible solo para admin, con toggle show/hide -->
                                <div style="display:flex;align-items:center;gap:6px;">
                                    <code id="pwd-${u.id}" style="font-size:12px;background:#f1f5f9;padding:2px 7px;border-radius:5px;
                                        letter-spacing:2px;color:#64748b;">••••••</code>
                                    <button onclick="togglePwdVisibility('${u.id}','${u.password}')"
                                        title="Mostrar/ocultar contraseña"
                                        style="background:none;border:none;cursor:pointer;padding:2px;color:#94a3b8;font-size:14px;"
                                        id="pwd-eye-${u.id}">👁</button>
                                </div>
                            </td>
                            <td>
                                <span class="badge" style="background:${ri.bg};color:${ri.color};">
                                    ${ri.label}
                                </span>
                            </td>
                            <td style="font-size:12px;">${whNames}</td>
                            <td>
                                <span class="badge" style="cursor:pointer;background:${u.active?'#d1fae5':'#fee2e2'};color:${u.active?'#047857':'#ef4444'};"
                                    onclick="toggleUserActive('${u.id}')">
                                    ${u.active ? '✔ Activo' : '✘ Inactivo'}
                                </span>
                            </td>
                            <td>
                                <button class="btn" style="padding:5px 10px;font-size:12px;background:var(--color-secondary);border:1px solid var(--color-border);"
                                    onclick="editUser('${u.id}')"><i data-lucide="pencil" style="width:13px;height:13px;"></i></button>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>

            <!-- ═══ Matriz de Permisos por Rol ═══ -->
            <div style="margin-top:28px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                    <div>
                        <h4 style="margin:0 0 4px;font-size:14px;">🔐 Permisos por Módulo y Rol</h4>
                        <p style="margin:0;font-size:12px;color:var(--color-text-muted);">
                            Define qué puede ver o hacer cada rol en cada módulo.
                            <strong>Visual</strong> = solo lectura · <strong>Operativo</strong> = puede ejecutar acciones
                        </p>
                    </div>
                    <button class="btn btn-primary" style="font-size:12px;padding:7px 16px;white-space:nowrap;"
                        onclick="saveRolePermMatrix()">
                        💾 Guardar permisos
                    </button>
                </div>

                <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:12px;">
                    <thead>
                        <tr>
                            <th style="text-align:left;padding:8px 10px;border-bottom:2px solid var(--color-border);
                                       font-size:11px;color:var(--color-text-muted);font-weight:700;white-space:nowrap;">
                                📋 Módulo
                            </th>
                            ${Object.entries(ROLE_LABELS).map(([rk, rv]) => `
                            <th style="text-align:center;padding:8px 6px;border-bottom:2px solid var(--color-border);white-space:nowrap;">
                                <span style="background:${rv.bg};color:${rv.color};padding:3px 8px;border-radius:10px;
                                             font-size:11px;font-weight:700;">${rv.label}</span>
                            </th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${MODULE_LIST.map((mod, mIdx) => `
                        <tr style="background:${mIdx % 2 === 0 ? 'var(--color-secondary)' : 'transparent'};">
                            <td style="padding:8px 10px;font-weight:600;white-space:nowrap;">
                                ${mod.icon} ${mod.label}
                            </td>
                            ${Object.keys(ROLE_LABELS).map(rk => {
                                const current = roleModulePerms[rk]?.[mod.key] || 'none';
                                const isAdmin  = rk === 'admin';
                                return `
                                <td style="text-align:center;padding:6px 4px;">
                                    <select data-role="${rk}" data-module="${mod.key}"
                                        class="role-perm-select"
                                        ${isAdmin ? 'disabled title="El admin siempre tiene acceso total"' : ''}
                                        style="font-size:11px;padding:3px 6px;border-radius:6px;border:1px solid var(--color-border);
                                               background:${isAdmin ? '#fce7eb' : 'var(--color-bg)'};
                                               color:${isAdmin ? '#7a1a2b' : 'var(--color-text-main)'};
                                               cursor:${isAdmin ? 'not-allowed' : 'pointer'};
                                               font-family:inherit;min-width:90px;">
                                        <option value="none"      ${current === 'none'      ? 'selected' : ''}>🚫 Sin acceso</option>
                                        <option value="visual"    ${current === 'visual'    ? 'selected' : ''}>👁 Visual</option>
                                        <option value="operativo" ${current === 'operativo' ? 'selected' : ''}>✏️ Operativo</option>
                                    </select>
                                </td>`;
                            }).join('')}
                        </tr>`).join('')}
                    </tbody>
                </table>
                </div>

                <!-- Descripción editable de cada rol debajo de la matriz -->
                <div style="margin-top:20px;">
                    <h5 style="font-size:13px;color:var(--color-text-muted);margin:0 0 10px;">📝 Descripción de cada rol</h5>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;" id="role-descriptions-grid">
                        ${Object.entries(ROLE_LABELS).map(([k, v]) => `
                        <div class="role-edit-card" style="border-left:3px solid ${v.color};background:${v.bg};">
                            <div class="role-header">
                                <span style="font-size:12px;font-weight:700;color:${v.color};">${v.label}</span>
                                <span class="role-save-indicator" id="role-saved-${k}">✔ Guardado</span>
                            </div>
                            <textarea class="role-desc-input" id="role-desc-${k}" rows="2"
                                placeholder="Descripción del rol..."
                                onchange="saveRoleDesc('${k}', this.value)"
                            >${v.desc}</textarea>
                        </div>`).join('')}
                    </div>
                    <div style="margin-top:10px;display:flex;justify-content:flex-end;">
                        <button class="btn btn-primary" style="font-size:12px;padding:7px 16px;" onclick="saveAllRoleDescs()">
                            💾 Guardar descripciones
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Formulario -->
        <div style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:12px;padding:24px;position:sticky;top:0;">
            <h3 style="margin:0 0 20px;font-size:15px;color:var(--color-primary);">
                ${editUser ? '✏️ Editar Usuario' : '👤 Nuevo Usuario'}
            </h3>
            <div class="form-group">
                <label>Nombre Completo <span style="color:#ef4444;">*</span></label>
                <input type="text" id="uf-name" class="form-control" placeholder="Ej: Carlos Gómez"
                    value="${editUser ? editUser.name : ''}">
            </div>
            <div class="form-group">
                <label>Usuario (login) <span style="color:#ef4444;">*</span></label>
                <input type="text" id="uf-username" class="form-control" placeholder="Ej: cgomez"
                    value="${editUser ? editUser.username : ''}"
                    ${editUser ? 'readonly style="background:#f1f5f9;"' : ''}>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="uf-email" class="form-control" placeholder="Ej: carlos@panuts.pe"
                    value="${editUser ? (editUser.email || '') : ''}">
            </div>
            <div class="form-group">
                <label>${editUser ? 'Nueva Contraseña (vacío = sin cambio)' : 'Contraseña *'}</label>
                <div style="position:relative;">
                    <input type="password" id="uf-password" class="form-control"
                        style="padding-right:40px;"
                        placeholder="${editUser ? 'Dejar vacío = sin cambio' : 'Mínimo 6 caracteres'}">
                    <button type="button" onclick="toggleFormPwd()"
                        style="position:absolute;right:10px;top:50%;transform:translateY(-50%);
                               background:none;border:none;cursor:pointer;font-size:15px;color:#94a3b8;"
                        title="Mostrar/ocultar">👁</button>
                </div>
                ${editUser ? `
                <div style="margin-top:6px;padding:8px 12px;background:#fef3c7;border:1px solid #fde68a;
                             border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    <span style="font-size:12px;color:#92400e;font-weight:600;">🔑 Contraseña actual:</span>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <code id="form-pwd-display" style="font-size:13px;background:white;padding:3px 10px;
                              border-radius:6px;letter-spacing:2px;border:1px solid #fde68a;color:#1e293b;">
                            ••••••
                        </code>
                        <button onclick="toggleFormCurrentPwd('${editUser.password}')"
                            style="background:none;border:none;cursor:pointer;font-size:14px;color:#b45309;"
                            title="Ver contraseña actual">👁</button>
                        <button onclick="copyToClipboard('${editUser.password}', this)"
                            style="background:none;border:1px solid #fde68a;cursor:pointer;font-size:11px;
                                   color:#b45309;padding:3px 8px;border-radius:5px;font-family:inherit;"
                            title="Copiar contraseña">📋 Copiar</button>
                    </div>
                </div>` : ''}
            </div>
            <div class="form-group">
                <label>Rol <span style="color:#ef4444;">*</span></label>
                <select id="uf-role" class="form-control" onchange="onUserRoleChange()">
                    ${Object.entries(ROLE_LABELS).map(([k, v]) =>
                        `<option value="${k}" ${editUser && editUser.role === k ? 'selected' : ''}>${v.label}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="form-group" id="uf-wh-group" style="${editUser && editUser.role === 'admin' ? 'display:none;' : ''}">
                <label>Almacenes asignados</label>
                <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">
                    ${warehouses.map(w => `
                    <label style="display:flex;align-items:center;gap:8px;font-weight:400;cursor:pointer;">
                        <input type="checkbox" class="uf-wh-cb" value="${w.id}"
                            ${editUser && (editUser.warehouseIds||[]).includes(w.id) ? 'checked' : ''}>
                        <span>${w.name}</span>
                        ${w.id === 'WH001' ? '<span style="font-size:11px;color:#FF5A00;font-weight:600;">🛵 PY</span>' : ''}
                        <span style="font-size:11px;color:var(--color-text-muted);">${w.address}</span>
                    </label>`).join('')}
                </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:16px;">
                <button class="btn btn-primary" style="flex:1;" onclick="saveUserForm()">
                    ${editUser ? '💾 Guardar' : '➕ Crear Usuario'}
                </button>
                ${editUser ? `<button class="btn" style="background:var(--color-border);color:var(--color-text-main);" onclick="cancelUserEdit()">Cancelar</button>` : ''}
            </div>
        </div>
    </div>`;

    lucide.createIcons();
    document.getElementById('btn-new-user').addEventListener('click', () => { userEditingId = null; renderUsersTab(); });
}

window.onUserRoleChange = () => {
    const role    = document.getElementById('uf-role')?.value;
    const whGroup = document.getElementById('uf-wh-group');
    if (whGroup) whGroup.style.display = role === 'admin' ? 'none' : '';
};
window.editUser        = (id) => { userEditingId = id; renderUsersTab(); };
window.cancelUserEdit  = () => { userEditingId = null; renderUsersTab(); };

// ─── Gestión de Roles: Guardar descripción individual ──────────────────────
/**
 * Guarda la descripción de un rol en localStorage al cambiar el textarea.
 * @param {string} roleKey - clave del rol (admin, logistics, etc.)
 * @param {string} newDesc - nueva descripción ingresada
 */
/**
 * Guarda la matriz de permisos (visual/operativo/none) por módulo y rol.
 */
window.saveRolePermMatrix = () => {
    const selects = document.querySelectorAll('.role-perm-select');
    const saved = JSON.parse(localStorage.getItem('panuts_role_module_perms') || '{}');
    selects.forEach(sel => {
        const role = sel.dataset.role;
        const mod  = sel.dataset.module;
        if (!saved[role]) saved[role] = {};
        saved[role][mod] = sel.value;
    });
    localStorage.setItem('panuts_role_module_perms', JSON.stringify(saved));
    const btn = document.querySelector('[onclick="saveRolePermMatrix()"]');
    if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = '✔ Guardado';
        btn.style.background = '#047857';
        setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; }, 2000);
    }
};

window.saveRoleDesc = (roleKey, newDesc) => {
    if (!newDesc || !newDesc.trim()) { alert('La descripción no puede estar vacía.'); return; }
    const saved = JSON.parse(localStorage.getItem('panuts_role_descs') || '{}');
    saved[roleKey] = newDesc.trim();
    localStorage.setItem('panuts_role_descs', JSON.stringify(saved));

    const indicator = document.getElementById(`role-saved-${roleKey}`);
    if (indicator) {
        indicator.classList.add('visible');
        setTimeout(() => indicator.classList.remove('visible'), 2000);
    }
};

/**
 * Guarda TODAS las descripciones de roles editadas en un solo click.
 */
window.saveAllRoleDescs = () => {
    const roleKeys = ['admin','gerencia','logistics','supervisor','driver','readonly'];
    const saved = JSON.parse(localStorage.getItem('panuts_role_descs') || '{}');
    let valid = true;

    roleKeys.forEach(k => {
        const el = document.getElementById(`role-desc-${k}`);
        if (el) {
            const val = el.value.trim();
            if (!val) { valid = false; el.style.borderColor = '#ef4444'; return; }
            el.style.borderColor = '';
            saved[k] = val;
        }
    });

    if (!valid) { alert('Ninguna descripción puede quedar vacía.'); return; }
    localStorage.setItem('panuts_role_descs', JSON.stringify(saved));

    roleKeys.forEach(k => {
        const ind = document.getElementById(`role-saved-${k}`);
        if (ind) { ind.classList.add('visible'); setTimeout(() => ind.classList.remove('visible'), 2500); }
    });
};

// ─── Helpers de visibilidad de contraseña (solo admin) ─────────────────────

/**
 * Alterna la visibilidad de la contraseña en la tabla de usuarios.
 * @param {string} userId  - ID del usuario
 * @param {string} pwd     - contraseña real
 */
window.togglePwdVisibility = (userId, pwd) => {
    const el  = document.getElementById(`pwd-${userId}`);
    const eye = document.getElementById(`pwd-eye-${userId}`);
    if (!el) return;
    const isHidden = el.textContent.includes('•');
    el.textContent     = isHidden ? pwd : '••••••';
    el.style.color     = isHidden ? '#1e293b' : '#64748b';
    el.style.letterSpacing = isHidden ? 'normal' : '2px';
    if (eye) eye.textContent = isHidden ? '🙈' : '👁';
};

/**
 * Alterna la visibilidad de la contraseña actual en el formulario de edición.
 * @param {string} pwd - contraseña actual del usuario editado
 */
window.toggleFormCurrentPwd = (pwd) => {
    const el = document.getElementById('form-pwd-display');
    if (!el) return;
    const isHidden = el.textContent.includes('•');
    el.textContent     = isHidden ? pwd : '••••••';
    el.style.letterSpacing = isHidden ? 'normal' : '2px';
};

/**
 * Alterna type="password" / type="text" en el campo nueva contraseña del form.
 */
window.toggleFormPwd = () => {
    const el = document.getElementById('uf-password');
    if (!el) return;
    el.type = el.type === 'password' ? 'text' : 'password';
};

/**
 * Copia texto al portapapeles y da feedback visual en el botón.
 */
window.copyToClipboard = (text, btn) => {
    navigator.clipboard.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = '✔ Copiado';
        btn.style.color = '#047857';
        setTimeout(() => { btn.textContent = orig; btn.style.color = '#b45309'; }, 1800);
    }).catch(() => {
        // Fallback para navegadores sin clipboard API
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        const orig = btn.textContent;
        btn.textContent = '✔ Copiado';
        setTimeout(() => { btn.textContent = orig; }, 1800);
    });
};

window.toggleUserActive = (id) => {
    if (typeof AuthManager === 'undefined') return;
    const users = JSON.parse(localStorage.getItem('panuts_users') || '[]');
    const idx   = users.findIndex(u => u.id === id);
    if (idx >= 0) { users[idx].active = !users[idx].active; localStorage.setItem('panuts_users', JSON.stringify(users)); }
    renderUsersTab();
};
window.saveUserForm = () => {
    if (typeof AuthManager === 'undefined') return;
    const name        = document.getElementById('uf-name').value.trim();
    const username    = document.getElementById('uf-username').value.trim();
    const email       = document.getElementById('uf-email').value.trim();
    const password    = document.getElementById('uf-password').value;
    const role        = document.getElementById('uf-role').value;
    const warehouseIds= Array.from(document.querySelectorAll('.uf-wh-cb:checked')).map(cb => cb.value);

    if (!name || !username) { alert('Nombre y usuario son obligatorios.'); return; }
    if (!userEditingId && !password) { alert('La contraseña es obligatoria para nuevos usuarios.'); return; }
    if (password && password.length < 6) { alert('La contraseña debe tener al menos 6 caracteres.'); return; }

    const userData = { id: userEditingId, name, username, email, role, warehouseIds, active: true };
    if (password) userData.password = password;

    AuthManager.saveUser(userData);
    userEditingId = null;
    renderUsersTab();
};

// ═══════════════════════════════════════════════════════════════════════════
// DRIVER APP MOBILE
// ═══════════════════════════════════════════════════════════════════════════

window.getDriverRouteOrders = (routeId) => {
    const orders = [];
    appState.orders.forEach(o => {
        const attempts = (o.history && o.history.length > 0) ? o.history : (o.routeId ? [{...o}] : []);
        const target   = attempts.find(a => a.routeId === routeId);
        if (target) orders.push({...o, ...target});
    });
    return orders;
};

function initDriverApp(routeId) {
    document.querySelector('.app-layout').style.display = 'none';
    const driverApp = document.getElementById('driver-app-layout');
    driverApp.style.display = 'block';

    const routeOrders = window.getDriverRouteOrders(routeId);
    let driverInfo = 'No asignado', dateInfo = 'N/A', zoneInfo = 'N/A';
    if (routeOrders.length > 0) {
        driverInfo = getDriverName(routeOrders[0].driverId);
        dateInfo   = routeOrders[0].routeDate || 'Fecha previa';
        zoneInfo   = routeOrders[0].zoneAssign || getZoneFromDistrict(routeOrders[0].district) || 'S/Z';
    }

    document.getElementById('driver-route-title').textContent = `Ruta: ${routeId}`;
    const sub = document.getElementById('driver-route-subtitle');
    if (sub) {
        sub.innerHTML = `Chofer: <strong>${driverInfo}</strong> <br> Zona: <strong>${zoneInfo}</strong> <br> Asignado: <strong style="color:#ffffff">${dateInfo}</strong>`;
    }

    window.handleDelivery = (orderId, type) => {
        _showDeliveryModal(orderId, type, routeId);
    };

    function _showDeliveryModal(orderId, type, routeId) {
        const prev = document.getElementById('delivery-modal-overlay');
        if (prev) prev.remove();

        const overlay = document.createElement('div');
        overlay.id = 'delivery-modal-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 100000;
            background: rgba(0,0,0,0.7); backdrop-filter: blur(5px);
            display: flex; align-items: center; justify-content: center;
            padding: 20px; animation: fadeInOverlay 0.2s ease;
            font-family: 'Inter', sans-serif;
        `;

        const isSuccess = type === 'Entregado';
        const color = isSuccess ? '#10b981' : '#ef4444';
        const icon = isSuccess ? '📸' : '❌';
        const title = isSuccess ? 'Confirmar Entrega' : 'Rechazar Pedido';

        let contentObj = `
            <div style="text-align:center; padding: 10px 0;">
                <p style="font-size: 14px; margin-bottom: 12px; color: #475569;">
                    ${isSuccess ? 'Por favor, toma una foto de la fachada o de la persona recibiendo el pedido.' : 'Es obligatorio tomar una foto como evidencia del motivo de rechazo (local cerrado, dirección incorrecta, etc).'}
                </p>
                
                ${!isSuccess ? `
                <div style="margin-bottom: 20px;">
                    <p style="font-size: 14px; margin-bottom: 6px; color: #475569; text-align: left; font-weight: bold;">
                        Motivo de rechazo:
                    </p>
                    <textarea id="reject-reason" placeholder="Escribe el motivo aquí..." style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px; font-family: 'Inter', sans-serif; font-size: 14px; resize: vertical; min-height: 70px;"></textarea>
                </div>
                ` : ''}

                <div id="step-photo">
                    <button id="btn-take-photo" style="background: ${color}; color: white; width: 100%; padding: 14px; border: none; border-radius: 12px; font-weight: bold; font-size: 16px; cursor: pointer; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span>📸</span> ${isSuccess ? 'Tomar Foto de Entrega' : 'Tomar Foto de Evidencia'}
                    </button>
                </div>

                <div id="photo-loading" style="display: none; padding: 16px; color: ${color}; font-weight: bold; font-size: 14px;">
                    ⏳ Procesando evidencia...
                </div>
                
                <div id="photo-upload-success" style="display: none; padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; color: #15803d; font-weight: bold; font-size: 14px; margin-bottom: 16px;">
                    ✅ Evidencia fotográfica cargada
                </div>
                
                <button id="btn-confirm-action" style="display: none; background: ${color}; color: white; width: 100%; padding: 14px; border: none; border-radius: 12px; font-weight: bold; font-size: 16px; cursor: pointer;">
                    ${title}
                </button>
                
                <button onclick="document.getElementById('delivery-modal-overlay').remove()" style="background: transparent; color: #64748b; width: 100%; padding: 14px; border: none; font-weight: bold; font-size: 14px; cursor: pointer; margin-top: 8px;">
                    Cancelar
                </button>
            </div>
        `;

        overlay.innerHTML = `
        <div style="background: white; border-radius: 20px; width: 100%; max-width: 400px; box-shadow: 0 24px 80px rgba(0,0,0,0.4); overflow: hidden; animation: slideUpModal 0.3s ease;">
            <div style="background: ${color}; padding: 20px; text-align: center; color: white;">
                <div style="font-size: 32px; margin-bottom: 8px;">${icon}</div>
                <h3 style="margin: 0; font-size: 18px;">${title}</h3>
                <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Pedido ${orderId}</div>
            </div>
            <div style="padding: 24px;">
                ${contentObj}
            </div>
        </div>`;

        document.body.appendChild(overlay);

        let base64PhotoResult = null;

        const fileInput = document.createElement('input');
        fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.capture = 'environment';
        
        document.getElementById('btn-take-photo').onclick = () => fileInput.click();

        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            document.getElementById('step-photo').style.display = 'none';
            document.getElementById('photo-loading').style.display = 'block';

            base64PhotoResult = await compressImage(file);

            document.getElementById('photo-loading').style.display = 'none';
            document.getElementById('photo-upload-success').style.display = 'block';
            document.getElementById('btn-confirm-action').style.display = 'block';
        };

        document.getElementById('btn-confirm-action').onclick = () => {
            let reason = null;
            if (!isSuccess) {
                reason = document.getElementById('reject-reason').value.trim();
                if (!reason) {
                    alert('Debes ingresar un motivo de rechazo.');
                    return;
                }
            }
            _processDeliveryUpdate(orderId, type, routeId, base64PhotoResult, reason);
            document.getElementById('delivery-modal-overlay').remove();
        };
    }

    function _processDeliveryUpdate(orderId, type, routeId, base64Photo, obs) {
        appState.orders = appState.orders.map(o => {
            if (o.id === orderId) {
                const deliveryDate = new Date().toLocaleString('es-PE');
                const rejectCount  = type === 'Rechazado' ? ((o.rejectCount || 0) + 1) : (o.rejectCount || 0);
                const history = o.history ? [...o.history] : (o.routeId ? [{
                    driverId: o.driverId, routeId: o.routeId, zoneAssign: o.zoneAssign,
                    routeDate: o.routeDate, routeDateIso: o.routeDateIso, status: o.status,
                    deliveryDate: null, observation: null, evidencePhoto: null
                }] : []);

                const targetAttempt = history.find(a => a.routeId === routeId);
                if (targetAttempt) {
                    targetAttempt.status = type;
                    targetAttempt.observation  = obs;
                    targetAttempt.evidencePhoto = base64Photo;
                    targetAttempt.deliveryDate  = deliveryDate;
                }

                // FIX RTA-000001 y ARRASTRE DE RECHAZO: Asignamos valores absolutos para evitar heredar datos obsoletos
                let newStatus = type;
                let newObs = obs;             // Si es 'Entregado', obs es null, borrando observaciones anteriores
                let newPhoto = base64Photo;   // Exigimos SIEMPRE la foto más reciente
                let newDate = deliveryDate;

                return { ...o, status: newStatus, observation: newObs, evidencePhoto: newPhoto, deliveryDate: newDate, rejectCount, history };
            }
            return o;
        });
        saveState();
        renderDriverList(routeId);
    }

    renderDriverList(routeId);
}

function renderDriverList(routeId) {
    const listDiv     = document.getElementById('driver-list');
    const routeOrders = window.getDriverRouteOrders(routeId);

    if (routeOrders.length === 0) {
        listDiv.innerHTML = `<p class="empty-state">No se encontraron pedidos en esta ruta.</p>`;
        return;
    }

    listDiv.innerHTML = routeOrders.map(o => {
        const isDone = o.status === 'Entregado' || o.status === 'Rechazado';
        return `
        <div class="driver-card">
            <div class="driver-card-header">
                <strong style="font-size:16px;">${o.id}</strong>
                ${getStatusBadge(o.status)}
            </div>
            <p style="font-size:14px;margin-bottom:4px;"><strong>Cliente:</strong> ${o.client}</p>
            <p style="font-size:14px;margin-bottom:4px;color:var(--color-primary);"><strong>Recibe:</strong> ${o.receiver || o.client}</p>
            <p style="font-size:13px;color:var(--color-text-muted);margin-bottom:12px;">📍 ${o.district} — ${o.address || ''}</p>
            ${isDone ? `
            <div style="padding:12px;background:var(--color-bg);border-radius:6px;font-size:13px;text-align:center;">
                <strong style="color:${o.status==='Entregado'?'#10b981':'#ef4444'}">${o.status.toUpperCase()}</strong><br>
                <div style="margin-top:4px;color:var(--color-text-muted);">🗓️ ${o.deliveryDate || 'No registrada'}</div>
                ${o.observation ? `<div style="margin-top:8px;font-style:italic;color:#ef4444;">Obs: ${o.observation}</div>` : ''}
            </div>` : `
            <button class="driver-btn" style="width:100%;background:var(--color-primary);color:white;"
                onclick="openDriverDetail('${o.id}','${routeId}')">📂 Abrir Detalle del Pedido</button>`}
        </div>`;
    }).join('');
}

window.openDriverDetail = (orderId, routeId) => {
    const routeOrders = window.getDriverRouteOrders(routeId);
    const order       = routeOrders.find(o => o.id === orderId);
    const listDiv     = document.getElementById('driver-list');
    const isDone      = order.status === 'Entregado' || order.status === 'Rechazado';

    listDiv.innerHTML = `
    <button class="driver-btn" style="background:none;color:var(--color-text-main);text-align:left;padding:0 0 16px 0;"
        onclick="renderDriverList('${routeId}')">⬅️ Volver al listado</button>

    <div class="driver-card" style="border-top:4px solid var(--color-primary);">
        <h2 style="font-size:20px;text-align:center;margin-bottom:2px;">PEDIDO ${order.id}</h2>
        <p style="text-align:center;font-size:11px;color:var(--color-text-muted);margin-bottom:16px;">${order.date}</p>

        <div style="display:grid;grid-template-columns:110px 1fr;gap:8px;font-size:13px;margin-bottom:20px;">
            <span style="color:var(--color-text-muted)">CLIENTE:</span>   <strong>${order.client}</strong>
            <span style="color:var(--color-text-muted)">DNI:</span>       <strong>${order.dni || 'N/A'}</strong>
            <span style="color:var(--color-text-muted)">RECIBE:</span>    <strong>${order.receiver || 'N/A'}</strong>
            <span style="color:var(--color-text-muted)">TELÉFONO:</span>  <strong>${order.phone || 'N/A'}</strong>
            <span style="color:var(--color-text-muted)">Método Env.:</span> <strong>${order.shippingMethod || 'N/A'}</strong>
            <span style="color:var(--color-text-muted)">DIRECCIÓN:</span>
            <div>${order.district}<br><strong>${order.address}</strong><br>${order.addrRef || ''}</div>
            <span style="color:var(--color-text-muted)">En recepción:</span> <strong>${order.reception || 'NO'}</strong>
            <span style="color:var(--color-text-muted)">Comprobante(s):</span> <span>${order.vouchers || 'N/A'}</span>
            <span style="color:var(--color-text-muted)">TOTAL:</span>     <strong>${order.total || '0.00'}</strong>
            <span style="color:var(--color-text-muted)">NOTA:</span>      <span>${order.note || ''}</span>
        </div>

        ${order.status === 'Entregado' ? `
        <div style="text-align:center;padding:16px;background:var(--color-bg);border-radius:8px;margin-bottom:24px;">
            <p style="font-weight:bold;color:var(--color-text-muted);">Detalle oculto por privacidad (ya entregado).</p>
        </div>` : `
        <h3 style="font-size:13px;margin-bottom:8px;">CONSOLIDADO</h3>
        <div style="border:1px solid var(--color-border);margin-bottom:24px;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:center;">
                <thead>
                    <tr style="background:var(--color-primary);color:white;">
                        <th style="padding:6px;border-right:1px solid white;">CANT.</th>
                        <th style="padding:6px;border-right:1px solid white;">CÓDIGO</th>
                        <th style="padding:6px;text-align:left;">DESCRIPCIÓN</th>
                    </tr>
                </thead>
                <tbody>
                    ${(order.items || []).map(item => `
                    <tr style="border-bottom:1px solid #ddd;">
                        <td style="padding:6px;border-right:1px solid #ddd;">${item.qty}</td>
                        <td style="padding:6px;border-right:1px solid #ddd;">${item.code}</td>
                        <td style="padding:6px;text-align:left;">${item.desc}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`}

        ${!isDone ? `
        <p style="font-size:13px;text-align:center;margin-bottom:8px;color:var(--color-text-muted);">Gestión de Entrega (requiere foto)</p>
        <div class="driver-actions">
            <button class="driver-btn btn-success" onclick="handleDelivery('${order.id}','Entregado')"
                style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                <span style="font-size:18px;">📸</span><span>Tomar Foto y Entregar</span>
            </button>
            <button class="driver-btn btn-danger" onclick="handleDelivery('${order.id}','Rechazado')">❌ Rechazar</button>
        </div>` : `
        <div style="text-align:center;padding:16px;background:var(--color-bg);border-radius:8px;">
            <p style="font-weight:bold;margin-bottom:4px;">Estado: ${getStatusBadge(order.status)}</p>
            ${order.observation ? `<p style="font-size:13px;color:var(--color-text-muted);">Nota: ${order.observation}</p>` : ''}
        </div>`}
    </div>`;
};

// ═══════════════════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════════════════

const urlParams   = new URLSearchParams(window.location.search);
let driverRoute   = urlParams.get('route');

if (!driverRoute && window.location.href.includes('route=')) {
    const match = window.location.href.match(/route=([^&#]+)/);
    if (match) driverRoute = match[1];
}

if (driverRoute) {
    initDriverApp(driverRoute);
} else {
    // Desktop Dashboard mode
    updateAssignButton();
    initRoutingForm();
    initIncomingFilters();
    initTrackingFilters();
    renderCurrentView();

    // Inicializar Centro de Notificaciones
    NotificationCenter.init();

    // Arrancar simulador PedidosYa si hay shippings activos
    if (typeof PedidosYa !== 'undefined') {
        const hasActivePY = appState.orders.some(o =>
            o.shipping_id && o.estado_pedidosya && !['delivered','canceled'].includes(o.estado_pedidosya)
        );
        if (hasActivePY) PedidosYa._startSimulatorIfNeeded();
    }
}
