/**
 * auth.js — Módulo de Autenticación, Roles, Almacén y Notificaciones
 * Panuts Logística v2.0
 * Cargar ANTES que mocks.js y app.js en index.html
 */

const AuthManager = (() => {

    // ─── Claves de Storage ────────────────────────────────────────────
    const KEYS = {
        users:      'panuts_users',
        warehouses: 'panuts_warehouses',
        session:    'panuts_session'
    };

    // ─── Roles disponibles ────────────────────────────────────────────
    const ROLES = {
        admin:      { label: 'Administrador', color: '#7a1a2b', bg: '#fce7eb', perms: ['all'] },
        gerencia:   { label: 'Gerencia',      color: '#6d28d9', bg: '#ede9fe', perms: ['orders', 'routes', 'tracking', 'reports', 'pedidosya', 'dashboard'] },
        logistics:  { label: 'Logística',     color: '#1d4ed8', bg: '#dbeafe', perms: ['orders', 'routes', 'tracking', 'pedidosya'] },
        supervisor: { label: 'Supervisor',    color: '#047857', bg: '#d1fae5', perms: ['orders', 'routes', 'tracking', 'reports'] },
        driver:     { label: 'Chofer',        color: '#b45309', bg: '#fef3c7', perms: ['driver_app'] },
        readonly:   { label: 'Consulta',      color: '#64748b', bg: '#f1f5f9', perms: ['tracking', 'reports'] }
    };

    // ─── Datos por defecto ────────────────────────────────────────────
    const DEFAULT_WAREHOUSES = [
        { id: 'WH001', name: 'SURQUILLO', address: 'Surquillo, Lima',         active: true  },
        { id: 'WH002', name: 'VILLA',     address: 'Villa El Salvador, Lima', active: true  }
    ];

    const DEFAULT_USERS = [
        {
            id: 'USR001', username: 'admin', password: 'admin123',
            name: 'Administrador Panuts', role: 'admin', email: 'admin@panuts.pe',
            warehouseIds: [], active: true
        },
        {
            id: 'USR002', username: 'supervisor1', password: 'sup123',
            name: 'Supervisor Surquillo', role: 'supervisor', email: 'supervisor@panuts.pe',
            warehouseIds: ['WH001'], active: true
        },
        {
            id: 'USR003', username: 'logistica1', password: 'log123',
            name: 'Operador Logística', role: 'logistics', email: 'logistica@panuts.pe',
            warehouseIds: ['WH001'], active: true
        },
        {
            id: 'USR004', username: 'chofer1', password: 'cho123',
            name: 'Juan Pérez (Chofer)', role: 'driver', email: 'jperez@panuts.pe',
            warehouseIds: ['WH001'], active: true, routeId: ''
        },
        {
            id: 'USR005', username: 'consulta1', password: 'con123',
            name: 'Usuario Consulta', role: 'readonly', email: 'consulta@panuts.pe',
            warehouseIds: ['WH001', 'WH002'], active: true
        }
    ];

    // ─── Inicialización ───────────────────────────────────────────────
    function _init() {
        // Solo escribe defaults si la clave NO EXISTE en localStorage.
        // Si ya hay datos del usuario, nunca los toca.
        if (!localStorage.getItem(KEYS.warehouses)) {
            localStorage.setItem(KEYS.warehouses, JSON.stringify(DEFAULT_WAREHOUSES));
        }
        if (!localStorage.getItem(KEYS.users)) {
            localStorage.setItem(KEYS.users, JSON.stringify(DEFAULT_USERS));
        }
        // Migración: si admin ya existe pero no tiene contraseña guardada, no hacer nada.
        // No resetear usuarios bajo ninguna circunstancia.
    }

    // ─── Sesión ───────────────────────────────────────────────────────
    function getCurrentUser() {
        const s = sessionStorage.getItem(KEYS.session);
        return s ? JSON.parse(s) : null;
    }

    function _setSession(user) {
        const { password, ...safeUser } = user;
        sessionStorage.setItem(KEYS.session, JSON.stringify(safeUser));
    }

    function logout() {
        sessionStorage.removeItem(KEYS.session);
        _showLogin();
    }

    function hasRole(role) {
        const u = getCurrentUser();
        return u ? u.role === role : false;
    }

    /** Verifica si el usuario tiene permiso para una feature */
    function canAccess(feature) {
        const u = getCurrentUser();
        if (!u) return false;
        // Permisos personalizados asignados por admin tienen prioridad
        if (u.customPerms && Array.isArray(u.customPerms)) {
            return u.customPerms.includes(feature);
        }
        const roleInfo = ROLES[u.role];
        if (!roleInfo) return false;
        if (roleInfo.perms.includes('all')) return true;
        return roleInfo.perms.includes(feature);
    }

    // ─── Almacenes ────────────────────────────────────────────────────
    function getWarehouses() {
        const all = JSON.parse(localStorage.getItem(KEYS.warehouses) || '[]');
        return all.filter(w => w.active);
    }

    function getAllWarehouses() {
        return JSON.parse(localStorage.getItem(KEYS.warehouses) || '[]');
    }

    function saveWarehouse(data) {
        if (!hasRole('admin')) return false;
        const list = JSON.parse(localStorage.getItem(KEYS.warehouses) || '[]');
        const idx  = list.findIndex(w => w.id === data.id);
        if (idx >= 0) {
            list[idx] = { ...list[idx], ...data };
        } else {
            list.push({ id: 'WH' + Date.now(), active: true, ...data });
        }
        localStorage.setItem(KEYS.warehouses, JSON.stringify(list));
        return true;
    }

    // ─── Usuarios ─────────────────────────────────────────────────────
    function getUsers() {
        if (!hasRole('admin')) return [];
        return JSON.parse(localStorage.getItem(KEYS.users) || '[]');
    }

    function saveUser(data) {
        if (!hasRole('admin')) return false;
        const list = JSON.parse(localStorage.getItem(KEYS.users) || '[]');
        const idx  = list.findIndex(u => u.id === data.id);
        if (idx >= 0) {
            const existing = list[idx];
            list[idx] = { ...existing, ...data, password: data.password || existing.password };
        } else {
            list.push({ id: 'USR' + Date.now(), active: true, ...data });
        }
        localStorage.setItem(KEYS.users, JSON.stringify(list));
        return true;
    }

    // ─── Almacén activo ───────────────────────────────────────────────
    function getActiveWarehouse() {
        const u = getCurrentUser();
        if (!u) return null;
        if (u.role === 'admin') {
            return sessionStorage.getItem('panuts_active_wh') || 'all';
        }
        if (u.warehouseIds && u.warehouseIds.length === 1) {
            return u.warehouseIds[0];
        }
        const saved = sessionStorage.getItem('panuts_active_wh');
        if (saved && u.warehouseIds.includes(saved)) return saved;
        return u.warehouseIds[0] || 'all';
    }

    function setActiveWarehouse(whId) {
        sessionStorage.setItem('panuts_active_wh', whId);
    }

    // ─── Login UI ─────────────────────────────────────────────────────
    function _showLogin() {
        const appLayout = document.querySelector('.app-layout');
        if (appLayout) appLayout.style.display = 'none';

        let overlay = document.getElementById('auth-login-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'auth-login-overlay';
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
        <style>
            #auth-login-overlay {
                position: fixed; inset: 0; z-index: 99999;
                background: linear-gradient(135deg, #3a0a14 0%, #7a1a2b 50%, #a02438 100%);
                display: flex; align-items: center; justify-content: center;
                font-family: 'Inter', sans-serif;
            }
            .auth-card {
                background: #fff; border-radius: 24px;
                padding: 48px 40px 40px; width: 100%; max-width: 400px;
                box-shadow: 0 32px 80px rgba(0,0,0,0.4);
                text-align: center;
            }
            .auth-logo { margin: 0 auto 24px; }
            .auth-logo svg { width: 72px; height: 72px; }
            .auth-brand { font-size: 28px; font-weight: 800; color: #7a1a2b; letter-spacing: 1px; }
            .auth-subtitle { font-size: 13px; color: #64748b; margin: 4px 0 32px; }
            .auth-field { margin-bottom: 16px; text-align: left; }
            .auth-field label { display: block; font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 6px; }
            .auth-field input {
                width: 100%; padding: 13px 14px;
                border: 1.5px solid #e2e8f0; border-radius: 12px;
                font-size: 14px; font-family: inherit;
                transition: border-color 0.2s; box-sizing: border-box;
            }
            .auth-field input:focus { outline: none; border-color: #7a1a2b; box-shadow: 0 0 0 3px rgba(122,26,43,0.1); }
            .auth-btn {
                width: 100%; padding: 14px;
                background: linear-gradient(135deg, #7a1a2b, #a02438);
                color: white; border: none; border-radius: 12px;
                font-size: 15px; font-weight: 700; cursor: pointer;
                transition: all 0.2s; margin-top: 8px; font-family: inherit;
                box-shadow: 0 4px 16px rgba(122,26,43,0.3);
            }
            .auth-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(122,26,43,0.4); }
            .auth-error {
                background: #fee2e2; color: #b91c1c; border-radius: 10px;
                padding: 10px 14px; font-size: 13px; margin-bottom: 16px; display: none;
            }
            .auth-demo-hint {
                margin-top: 24px; padding: 12px; background: #f8fafc;
                border-radius: 10px; font-size: 11px; color: #64748b;
                border: 1px solid #e2e8f0; text-align: left; line-height: 1.6;
            }
            .auth-version { margin-top: 16px; font-size: 11px; color: #94a3b8; }
        </style>

        <div class="auth-card">
            <div class="auth-logo">
                <svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="36" cy="36" r="36" fill="#7a1a2b"/>
                    <rect x="16" y="30" width="40" height="26" rx="3" fill="white" opacity="0.15"/>
                    <rect x="16" y="30" width="40" height="26" rx="3" stroke="white" stroke-width="2"/>
                    <path d="M14 30 L36 20 L58 30" stroke="white" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M36 20 L36 30" stroke="white" stroke-width="2"/>
                    <path d="M24 43 L48 43" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                    <path d="M42 38 L48 43 L42 48" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="36" cy="36" r="2.5" fill="#f59e0b"/>
                </svg>
            </div>
            <div class="auth-brand">Panuts</div>
            <div class="auth-subtitle">Sistema de Logística v2.0</div>

            <div class="auth-error" id="auth-error-msg">Usuario o contraseña incorrectos.</div>

            <div class="auth-field">
                <label>Usuario</label>
                <input type="text" id="auth-username" placeholder="Ej: admin" autocomplete="username">
            </div>
            <div class="auth-field">
                <label>Contraseña</label>
                <input type="password" id="auth-password" placeholder="••••••••" autocomplete="current-password">
            </div>

            <button class="auth-btn" id="auth-submit-btn">Ingresar al Sistema</button>

            <!-- REGLA 11: Botón de tracking público sin login -->
            <div style="margin-top:12px;text-align:center;">
                <a href="tracking.html" target="_blank"
                    style="display:inline-flex;align-items:center;justify-content:center;gap:8px;
                           width:100%;padding:12px;border-radius:12px;
                           border:1.5px solid #e2e8f0;background:#f8fafc;
                           color:#475569;font-size:14px;font-weight:600;text-decoration:none;
                           transition:all 0.2s;font-family:inherit;"
                    onmouseover="this.style.borderColor='#7a1a2b';this.style.color='#7a1a2b';this.style.background='#fce7eb'"
                    onmouseout="this.style.borderColor='#e2e8f0';this.style.color='#475569';this.style.background='#f8fafc'">
                    📦 Consultar Pedido
                </a>
                <div style="font-size:11px;color:#94a3b8;margin-top:6px;">Sin necesidad de iniciar sesión</div>
            </div>

            <div class="auth-demo-hint">
                <strong>🔐 Cuentas demo:</strong><br>
                admin / admin123 → Administrador total<br>
                logistica1 / log123 → Logística + PedidosYa<br>
                supervisor1 / sup123 → Supervisor<br>
                consulta1 / con123 → Solo lectura
            </div>
            <div class="auth-version">Panuts Logística v2.0 · Módulo de Acceso</div>
        </div>
        `;

        const submitBtn = document.getElementById('auth-submit-btn');
        const pwdInput  = document.getElementById('auth-password');

        submitBtn.addEventListener('click', _handleLoginSubmit);
        pwdInput.addEventListener('keydown', e => { if (e.key === 'Enter') _handleLoginSubmit(); });
        document.getElementById('auth-username').addEventListener('keydown', e => {
            if (e.key === 'Enter') document.getElementById('auth-password').focus();
        });
        setTimeout(() => document.getElementById('auth-username').focus(), 100);
    }

    function _handleLoginSubmit() {
        const username = document.getElementById('auth-username').value;
        const password = document.getElementById('auth-password').value;
        const errorEl  = document.getElementById('auth-error-msg');
        errorEl.style.display = 'none';

        if (!username || !password) {
            errorEl.textContent = 'Por favor ingresa usuario y contraseña.';
            errorEl.style.display = 'block';
            return;
        }

        const ok = _doLogin(username, password);
        if (!ok) {
            errorEl.textContent = 'Usuario o contraseña incorrectos.';
            errorEl.style.display = 'block';
            document.getElementById('auth-password').value = '';
            return;
        }

        const user = getCurrentUser();

        if (user.role === 'driver') {
            const driverRouteId = user.routeId || '';
            if (driverRouteId) {
                window.location.href = `?route=${driverRouteId}`;
            } else {
                errorEl.textContent = 'Este usuario no tiene una ruta asignada actualmente.';
                errorEl.style.display = 'block';
            }
            return;
        }

        document.getElementById('auth-login-overlay').remove();
        const appLayout = document.querySelector('.app-layout');
        if (appLayout) appLayout.style.display = '';

        _renderTopbar();
        _renderWarehouseSelector();

        // Verificar acceso a secciones del sidebar según rol
        _applyRoleRestrictions(user);
    }

    function _doLogin(username, password) {
        const users = JSON.parse(localStorage.getItem(KEYS.users) || '[]');
        const user  = users.find(u => u.username === username.trim() && u.password === password && u.active);
        if (!user) return false;
        _setSession(user);
        return true;
    }

    /** Aplica restricciones de UI según el rol del usuario */
    function _applyRoleRestrictions(user) {
        // readonly: deshabilitar botones de acción
        if (user.role === 'readonly') {
            setTimeout(() => {
                document.querySelectorAll('.btn-primary, .btn-pedidosya').forEach(btn => {
                    btn.disabled = true;
                    btn.title = 'Sin permisos de escritura';
                    btn.style.opacity = '0.5';
                });
            }, 500);
        }
    }

    // ─── Topbar UI ────────────────────────────────────────────────────
    function _renderTopbar() {
        const user = getCurrentUser();
        if (!user) return;

        const profileEl = document.querySelector('.user-profile');
        if (!profileEl) return;

        const warehouses = getWarehouses();
        const userWH     = user.warehouseIds && user.warehouseIds.length > 0
            ? warehouses.find(w => w.id === user.warehouseIds[0])
            : null;

        const roleInfo = ROLES[user.role] || { label: user.role, color: '#64748b', bg: '#f1f5f9' };

        const warehouseLbl = user.role === 'admin'
            ? `<span style="font-size:11px;background:#fef3c7;color:#b45309;padding:2px 8px;border-radius:12px;font-weight:600;">ADMIN · TODOS</span>`
            : userWH
                ? `<span style="font-size:11px;background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:12px;font-weight:600;">${userWH.name}</span>`
                : '';

        const bellHTML = `
            <div class="notification-bell-wrap" id="notification-bell-wrap">
                <button class="notification-bell-btn" id="notification-bell-btn" title="Notificaciones" onclick="window.NotificationCenter && window.NotificationCenter.openDropdown()">
                    🔔
                    <span class="notification-count" id="notification-count" style="display:none;">0</span>
                </button>
            </div>`;

        profileEl.innerHTML = `
            ${bellHTML}
            <div style="text-align:right;line-height:1.3;">
                <div style="font-size:14px;font-weight:600;color:var(--color-text-main);">${user.name}</div>
                <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end;margin-top:3px;">
                    ${warehouseLbl}
                    <span style="font-size:11px;background:${roleInfo.bg};color:${roleInfo.color};padding:2px 8px;border-radius:12px;font-weight:600;">
                        ${roleInfo.label}
                    </span>
                </div>
            </div>
            <div class="avatar" title="Perfil">
                <i data-lucide="user"></i>
            </div>
            <button id="auth-logout-btn" title="Cerrar sesión"
                style="background:none;border:1px solid var(--color-border);border-radius:8px;
                       padding:7px 12px;cursor:pointer;color:var(--color-text-muted);
                       display:flex;align-items:center;gap:6px;font-size:13px;font-family:inherit;">
                <i data-lucide="log-out" style="width:14px;height:14px;"></i>
                Salir
            </button>
        `;

        document.getElementById('auth-logout-btn').addEventListener('click', logout);
        if (window.lucide) lucide.createIcons();
    }

    // ─── Selector de Almacén ──────────────────────────────────────────
    function _renderWarehouseSelector() {
        const user = getCurrentUser();
        if (!user) return;

        const isAdmin  = user.role === 'admin';
        const hasMulti = isAdmin || (user.warehouseIds && user.warehouseIds.length > 1);

        const topbarLeft = document.querySelector('.topbar > div');
        if (!topbarLeft) return;

        const prev = document.getElementById('wh-selector-wrap');
        if (prev) prev.remove();

        const warehouses = getWarehouses();
        const available  = isAdmin
            ? warehouses
            : warehouses.filter(w => user.warehouseIds.includes(w.id));

        if (!hasMulti && available.length <= 1) {
            if (available.length === 1) setActiveWarehouse(available[0].id);
            _injectWarehouseBadge(available[0]);
            return;
        }

        const activeWH = getActiveWarehouse();
        const wrap = document.createElement('div');
        wrap.id = 'wh-selector-wrap';
        wrap.style.cssText = 'display:flex;align-items:center;gap:8px;';
        wrap.innerHTML = `
            <label style="font-size:12px;color:var(--color-text-muted);font-weight:600;white-space:nowrap;">
                <i data-lucide="warehouse" style="width:13px;height:13px;vertical-align:middle;"></i>
                Almacén:
            </label>
            <select id="wh-selector" class="form-control" style="width:auto;min-width:140px;padding:6px 10px;font-size:13px;">
                ${isAdmin ? `<option value="all" ${activeWH === 'all' ? 'selected' : ''}>Todos</option>` : ''}
                ${available.map(w =>
                    `<option value="${w.id}" ${activeWH === w.id ? 'selected' : ''}>${w.name}</option>`
                ).join('')}
            </select>
        `;
        topbarLeft.appendChild(wrap);
        if (window.lucide) lucide.createIcons();

        document.getElementById('wh-selector').addEventListener('change', function() {
            setActiveWarehouse(this.value);
            if (typeof renderCurrentView === 'function') {
                if (typeof syncOrdersFromStorage === 'function') syncOrdersFromStorage();
                renderCurrentView();
            }
            // Refrescar notificaciones
            if (typeof NotificationCenter !== 'undefined') {
                NotificationCenter.refresh();
            }
        });
    }

    function _injectWarehouseBadge(wh) {
        const topbarLeft = document.querySelector('.topbar > div');
        if (!topbarLeft || !wh) return;
        const prev = document.getElementById('wh-selector-wrap');
        if (prev) prev.remove();
        const badge = document.createElement('span');
        badge.id = 'wh-selector-wrap';
        badge.style.cssText = 'font-size:12px;background:#dbeafe;color:#1d4ed8;padding:3px 10px;border-radius:12px;font-weight:600;';
        badge.textContent = wh.name;
        topbarLeft.appendChild(badge);
    }

    // ─── Boot ─────────────────────────────────────────────────────────
    function _boot() {
        _init();

        if (window.location.href.includes('route=')) return;

        const user = getCurrentUser();
        if (!user) {
            document.addEventListener('DOMContentLoaded', () => {
                const appLayout = document.querySelector('.app-layout');
                if (appLayout) appLayout.style.display = 'none';
                _showLogin();
            });
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                _renderTopbar();
                _renderWarehouseSelector();
                _applyRoleRestrictions(user);
            });
        }
    }

    _boot();

    // ─── API Pública ──────────────────────────────────────────────────
    return {
        ROLES,
        getCurrentUser,
        logout,
        hasRole,
        canAccess,
        getWarehouses,
        getAllWarehouses,
        getUsers,
        saveUser,
        saveWarehouse,
        getActiveWarehouse,
        setActiveWarehouse
    };

})();
