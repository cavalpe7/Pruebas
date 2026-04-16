// ═══════════════════════════════════════════════════════
// mocks.js — Datos simulados para Panuts Logística v2.0
// ═══════════════════════════════════════════════════════

// ─── Tabla de Distritos con Zonas ────────────────────────────────────────────
const districts = [
    // ESTE
    { id: 1,  name: "Ate",                     zone: "ESTE" },
    { id: 2,  name: "Chaclacayo",              zone: "ESTE" },
    { id: 3,  name: "Cieneguilla",             zone: "ESTE" },
    { id: 4,  name: "El Agustino",             zone: "ESTE" },
    { id: 5,  name: "Lurigancho - Chosica",    zone: "ESTE" },
    { id: 6,  name: "San Juan de Lurigancho",  zone: "ESTE" },
    { id: 7,  name: "Santa Anita",             zone: "ESTE" },

    // NORTE
    { id: 8,  name: "Ancón",                   zone: "NORTE" },
    { id: 9,  name: "Bellavista",              zone: "NORTE" },
    { id: 10, name: "Callao Cercado",          zone: "NORTE" },
    { id: 11, name: "Carabayllo",              zone: "NORTE" },
    { id: 12, name: "Carmen de la Legua",      zone: "NORTE" },
    { id: 13, name: "Comas",                   zone: "NORTE" },
    { id: 14, name: "Independencia",           zone: "NORTE" },
    { id: 15, name: "La Perla",                zone: "NORTE" },
    { id: 16, name: "La Punta",                zone: "NORTE" },
    { id: 17, name: "Los Olivos",              zone: "NORTE" },
    { id: 18, name: "Mi Perú",                 zone: "NORTE" },
    { id: 19, name: "Puente Piedra",           zone: "NORTE" },
    { id: 20, name: "San Martín de Porres",    zone: "NORTE" },
    { id: 21, name: "Santa Rosa",              zone: "NORTE" },
    { id: 22, name: "Ventanilla",              zone: "NORTE" },

    // OESTE
    { id: 23, name: "Barranco",                zone: "OESTE" },
    { id: 24, name: "Breña",                   zone: "OESTE" },
    { id: 25, name: "Cercado de Lima",         zone: "OESTE" },
    { id: 26, name: "Jesús María",             zone: "OESTE" },
    { id: 27, name: "La Victoria",             zone: "OESTE" },
    { id: 28, name: "Lince",                   zone: "OESTE" },
    { id: 29, name: "Magdalena del Mar",       zone: "OESTE" },
    { id: 30, name: "Miraflores",              zone: "OESTE" },
    { id: 31, name: "Pueblo Libre",            zone: "OESTE" },
    { id: 32, name: "Rimac",                   zone: "OESTE" },
    { id: 33, name: "San Borja",               zone: "OESTE" },
    { id: 34, name: "San Isidro",              zone: "OESTE" },
    { id: 35, name: "San Luis",                zone: "OESTE" },
    { id: 36, name: "San Miguel",              zone: "OESTE" },
    { id: 37, name: "Surquillo",               zone: "OESTE" },

    // SUR
    { id: 38, name: "Chorrillos",              zone: "SUR" },
    { id: 39, name: "Lurín",                   zone: "SUR" },
    { id: 40, name: "Pachacamac",              zone: "SUR" },
    { id: 41, name: "Pucusana",                zone: "SUR" },
    { id: 42, name: "Punta Hermosa",           zone: "SUR" },
    { id: 43, name: "Punta Negra",             zone: "SUR" },
    { id: 44, name: "San Bartolo",             zone: "SUR" },
    { id: 45, name: "San Juan de Miraflores",  zone: "SUR" },
    { id: 46, name: "Santa María del Mar",     zone: "SUR" },
    { id: 47, name: "Villa El Salvador",       zone: "SUR" },
    { id: 48, name: "Villa María del Triunfo", zone: "SUR" }
];

// ─── Choferes (con fecha de vencimiento de licencia) ─────────────────────────
const drivers = [
    {
        id: 101, name: "Juan Pérez",   unit: "Furgoneta F1", status: "available",
        licenseNumber: "Q14512301", license: "A-IIa",
        phone: "987654321", dni: "41234501",
        // Vence pronto — ALERTA ROJA
        licenseExpiry: "2026-04-28"
    },
    {
        id: 102, name: "Carlos López", unit: "Camión C3",    status: "available",
        licenseNumber: "Q14512302", license: "A-IIIb",
        phone: "987654322", dni: "41234502",
        // Vence en ~45 días — ALERTA AMARILLA
        licenseExpiry: "2026-05-25"
    },
    {
        id: 103, name: "Miguel Rojas", unit: "Panel P2",     status: "on-route",
        licenseNumber: "Q14512303", license: "B-I",
        phone: "987654323", dni: "41234503",
        // Vence en más de 60 días — OK
        licenseExpiry: "2026-09-15"
    }
];

// ─── Pedidos Iniciales ────────────────────────────────────────────────────────
// warehouseId WH001 = SURQUILLO (habilita PedidosYa)
// warehouseId WH002 = VILLA (solo despacho interno)
const initialOrders = [
    {
        id: "338734", client: "ARTESANO ARTISTA S.A.C.", district: "Barranco",
        address: "JIRON DOMEYER 268, BARRANCO", date: "2026-04-09",
        status: "Pendiente", driverId: null, warehouseId: "WH001",
        phone: "912345678", dni: "20123456789",
        receiver: "Recepción", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "F001-0001", total: "150.00", note: "",
        items: [{ qty: 10, code: "31020", desc: "ESTRELLA DAMM 500 ML. LATA" }],
        // Campos PedidosYa (inicialmente null)
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "338762", client: "SÁNCHEZ MEDINA MARÍA DEL CARMEN ALEJANDRINA", district: "La Perla",
        address: "AVENIDA LA MARINA 1134. LA PERLA. CALLAO", date: "2026-04-09",
        status: "Pendiente", driverId: null, warehouseId: "WH001",
        phone: "999888777", dni: "42123456",
        receiver: "María Sánchez", shippingMethod: "Envío gratis", addrRef: "Depto 201",
        reception: "NO", vouchers: "B002-1234", total: "85.50", note: "Llamar al llegar",
        items: [{ qty: 2, code: "V001", desc: "VINO TINTO RESERVA PANUTS" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "338766", client: "SÁNCHEZ CALLE DAVID ILICH", district: "Ate",
        address: "AVENIDA EUTERPE 118 URBANIZACION OLIMPO SALAMANCA", date: "2026-04-09",
        status: "Pendiente", driverId: null, warehouseId: "WH001",
        phone: "945612378", dni: "44445555",
        receiver: "David Sánchez", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "B003-9999", total: "40.00", note: "",
        items: [{ qty: 5, code: "L005", desc: "LICOR DE CAFÉ" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "338768", client: "JEAN-MAIRET MORALES-MACEDO FELIPE", district: "Miraflores",
        address: "SAN FERNANDO 246", date: "2026-04-09",
        status: "Pendiente", driverId: null, warehouseId: "WH001",
        phone: "968219264", dni: "41479879",
        receiver: "FELIPE JEAN MAIRET", shippingMethod: "Envío gratis", addrRef: "701",
        reception: "SI", vouchers: "B009-63685 B009-63686 B009-63687 (09/04/26 11:33)", total: "218.90", note: "",
        items: [
            { qty: 24, code: "31020", desc: "ESTRELLA DAMM 500 ML. LATA" },
            { qty: 24, code: "31009", desc: "DAURA DAMM 330 ML" },
            { qty: 1,  code: "T0461", desc: "AGUA CON GAS 473ML - PANUTS.COM" }
        ],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "338769", client: "OSPINA BONILLA JESUS HERNESTO", district: "Miraflores",
        address: "CA. NARCISO DE LA COLINA 320, MIRAFLORES", date: "2026-04-09",
        status: "Pendiente", driverId: null, warehouseId: "WH001",
        phone: "977666555", dni: "09876543",
        receiver: "Jesús Ospina", shippingMethod: "Regular", addrRef: "Tocar timbre 3",
        reception: "NO", vouchers: "B009-1111", total: "120.00", note: "Dejar en conserjería",
        items: [{ qty: 12, code: "31009", desc: "DAURA DAMM 330 ML" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "338771", client: "VARGAS PERUSINA JULIO CESAR NICOLAS", district: "Miraflores",
        address: "CA. NARCISO DE LA COLINA 320, MIRAFLORES", date: "2026-04-09",
        status: "Pendiente", driverId: null, warehouseId: "WH001",
        phone: "911222333", dni: "76543210",
        receiver: "Julio Vargas", shippingMethod: "Express", addrRef: "-",
        reception: "SI", vouchers: "F001-9090", total: "350.00", note: "",
        items: [{ qty: 6, code: "V002", desc: "VINO BLANCO CHARDONNAY" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "338378", client: "RESTAURANTES LIMA S.A.C.", district: "San Isidro",
        address: "AV. CONQUISTADORES 450", date: "2026-04-09",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "998877665", dni: "RUC 20999888777",
        receiver: "Carlos Vives (Recepción)", shippingMethod: "Regular",
        addrRef: "Entregar en puerta trasera", reception: "SI", vouchers: "F001-5678",
        total: "1500.00", note: "Llamar antes de llegar",
        items: [{ qty: 48, code: "V005", desc: "VINO BLANCO SAUVIGNON BLANC" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "338828", client: "CAVERO ABELARDO", district: "Miraflores",
        address: "CA. NARCISO DE LA COLINA 320, MIRAFLORES", date: "2026-04-09",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "12345678",
        receiver: "Recepcionista", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "F001-001", total: "150.00", note: "",
        items: [{ qty: 1, code: "TEST", desc: "Producto Prueba" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "338829", client: "VARELA VAN OORDT EDUARDO ARTURO", district: "San Isidro",
        address: "AV. JUAN PEZET 959, DPTO 1202, SAN ISIDRO", date: "2026-04-09",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "12345678",
        receiver: "Recepcionista", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "F001-002", total: "150.00", note: "",
        items: [{ qty: 1, code: "TEST", desc: "Producto Prueba" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "338834", client: "SEREBRIAKOVA MARIA", district: "Miraflores",
        address: "PARQUE MELITON PORRAS, 165, AP 402", date: "2026-04-09",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "12345678",
        receiver: "Recepcionista", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "F001-003", total: "150.00", note: "",
        items: [{ qty: 1, code: "TEST", desc: "Producto Prueba" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        // WH002 = VILLA → SIN PedidosYa
        id: "338838", client: "ALG MOTORES E.I.R.L.", district: "Chorrillos",
        address: "ALAMEDA SAN JUAN DE BUENA VISTA 348 CASA 21", date: "2026-04-09",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH002",
        phone: "999888777", dni: "12345678",
        receiver: "Recepcionista", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "F001-004", total: "150.00", note: "",
        items: [{ qty: 1, code: "TEST", desc: "Producto Prueba" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "338818", client: "RUIDIAS HOPKINS JUAN MANUEL", district: "San Isidro",
        address: "AV JORGE BASADRE 1235 DPTO 803", date: "2026-04-09",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "12345678",
        receiver: "Recepcionista", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "F001-005", total: "150.00", note: "",
        items: [{ qty: 1, code: "TEST", desc: "Producto Prueba" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "338821", client: "ROJAS CANALES, MIGUEL ANGEL", district: "San Borja",
        address: "JR. MARIANO PASTOR SEVILLA 217 DPTO. 202", date: "2026-04-09",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "12345678",
        receiver: "Recepcionista", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "F001-006", total: "150.00", note: "",
        items: [{ qty: 1, code: "TEST", desc: "Producto Prueba" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "338824", client: "RIVARA DAVILA PEDRO SEBASTIAN", district: "San Isidro",
        address: "AV DEL PARQUE SUR 450 DPT 101", date: "2026-04-09",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "12345678",
        receiver: "Recepcionista", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "F001-007", total: "150.00", note: "",
        items: [{ qty: 1, code: "TEST", desc: "Producto Prueba" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },

    // ── Cola de pedidos entrantes — Imagen 1 ────────────────────────────
    {
        id: "339544", client: "COMUNICAGRAF S.A.C.", district: "Miraflores",
        address: "CA. NARCISO DE LA COLINA 320, MIRAFLORES", date: "2026-04-15",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "20000001",
        receiver: "Recepción", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "", total: "0.00", note: "",
        items: [{ qty: 1, code: "NUEVO", desc: "Por definir" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "339545", client: "FERNANDEZ GAMARRA JOSE ANTONIO", district: "Barranco",
        address: "AV. EL SOL OESTE 161", date: "2026-04-15",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "20000002",
        receiver: "Recepción", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "", total: "0.00", note: "",
        items: [{ qty: 1, code: "NUEVO", desc: "Por definir" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "339547", client: "OJEDA BALBUENA ISABELLA", district: "Surco",
        address: "AVENIDA LOS VICUS 626 SURCO", date: "2026-04-15",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "20000003",
        receiver: "Recepción", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "", total: "0.00", note: "",
        items: [{ qty: 1, code: "NUEVO", desc: "Por definir" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "339548", client: "GRUPO GARDELIA SAC", district: "San Isidro",
        address: "PASAJE LOS CASTAÑOS 143", date: "2026-04-15",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "20000004",
        receiver: "Recepción", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "", total: "0.00", note: "",
        items: [{ qty: 1, code: "NUEVO", desc: "Por definir" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "339550", client: "SOLA GONZALEZ JUAN", district: "Surco",
        address: "CALLE PEDRO IRIGOYEN 158 - ENTRE LAS CDRAS 65 Y 66 REPUBLICA DE PANAMA", date: "2026-04-15",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "20000005",
        receiver: "Recepción", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "", total: "0.00", note: "",
        items: [{ qty: 1, code: "NUEVO", desc: "Por definir" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "339537", client: "RIVERO ZANATTA FRANCIS DARIO", district: "San Borja",
        address: "ANTHON VAN DYCK 288 SAN BORJA", date: "2026-04-15",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "20000006",
        receiver: "Recepción", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "", total: "0.00", note: "",
        items: [{ qty: 1, code: "NUEVO", desc: "Por definir" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "339541", client: "INVERSIONES Y NEGOCIOS SHAK S.A.C.", district: "Miraflores",
        address: "CALLE GENERAL VARELA 369 MIRAFLORES", date: "2026-04-15",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "20000007",
        receiver: "Recepción", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "", total: "0.00", note: "",
        items: [{ qty: 1, code: "NUEVO", desc: "Por definir" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "339532", client: "HURTADO TELLO, MARTHA PATRICIA PAULA", district: "Surco",
        address: "LAS CANTUTAS 245", date: "2026-04-15",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "20000008",
        receiver: "Recepción", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "", total: "0.00", note: "",
        items: [{ qty: 1, code: "NUEVO", desc: "Por definir" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },

    // ── Cola de pedidos entrantes — Imagen 2 ────────────────────────────
    {
        id: "339448", client: "QUESADA HETZEL CARLOS IVAN", district: "Surco",
        address: "CALLE BATALLON LIBRES DE TRUJILLO 117", date: "2026-04-15",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "20000009",
        receiver: "Recepción", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "", total: "0.00", note: "",
        items: [{ qty: 1, code: "NUEVO", desc: "Por definir" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "339454", client: "JG VEGAN CATERING E.I.R.L.", district: "Surco",
        address: "JR LAS TIPAS 222 URB LAS LOMAS DE MONTERRICO", date: "2026-04-15",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "20000010",
        receiver: "Recepción", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "", total: "0.00", note: "",
        items: [{ qty: 1, code: "NUEVO", desc: "Por definir" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "339459", client: "ARAMBURU ORTUZAR ELIANA MERCEDES", district: "Chorrillos",
        address: "260-101B MALEC. GRAU", date: "2026-04-15",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "20000011",
        receiver: "Recepción", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "", total: "0.00", note: "",
        items: [{ qty: 1, code: "NUEVO", desc: "Por definir" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "339469", client: "HORNA OVIEDO WILFREDO SILVESTRE", district: "La Molina",
        address: "CALLE SAN JOSE DE LOS OLLEROS 195 URB LAS LOMAS DE LA MOLINA", date: "2026-04-15",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "20000012",
        receiver: "Recepción", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "", total: "0.00", note: "",
        items: [{ qty: 1, code: "NUEVO", desc: "Por definir" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "339477", client: "ALEGRIA CHINCHAY ALBERTO IGNACIO", district: "Breña",
        address: "JR. HUARAZ 1630 DEPARTAMENTO 401 EN BREÑA", date: "2026-04-15",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "20000013",
        receiver: "Recepción", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "", total: "0.00", note: "",
        items: [{ qty: 1, code: "NUEVO", desc: "Por definir" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "339478", client: "BERNALES MEAVE RICARDO", district: "Miraflores",
        address: "CA. NARCISO DE LA COLINA 320, MIRAFLORES", date: "2026-04-15",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "20000014",
        receiver: "Recepción", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "", total: "0.00", note: "",
        items: [{ qty: 1, code: "NUEVO", desc: "Por definir" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "339480", client: "CASTRO GUTIERREZ BALLON URSULA", district: "Miraflores",
        address: "CA. NARCISO DE LA COLINA 320, MIRAFLORES", date: "2026-04-15",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "20000015",
        receiver: "Recepción", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "", total: "0.00", note: "",
        items: [{ qty: 1, code: "NUEVO", desc: "Por definir" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    },
    {
        id: "339482", client: "BARRON MENESES RENZO MAURICIO", district: "Santa Anita",
        address: "LOS ALAMOS 241", date: "2026-04-15",
        status: "Pendiente", driverId: null, bultos: null, warehouseId: "WH001",
        phone: "999888777", dni: "20000016",
        receiver: "Recepción", shippingMethod: "Regular", addrRef: "-",
        reception: "SI", vouchers: "", total: "0.00", note: "",
        items: [{ qty: 1, code: "NUEVO", desc: "Por definir" }],
        shipping_id: null, transportista: null, estado_pedidosya: null,
        fecha_envio: null, fecha_entrega_real: null,
        proof_of_delivery_url: null, direccion_confirmada: null
    }
];

// ─── SQL Reference (para migración futura a backend real) ────────────────────
/*
ALTER TABLE pedidos ADD COLUMN shipping_id        VARCHAR(50)  DEFAULT NULL;
ALTER TABLE pedidos ADD COLUMN transportista       VARCHAR(50)  DEFAULT NULL;
ALTER TABLE pedidos ADD COLUMN estado_pedidosya    VARCHAR(30)  DEFAULT NULL;
ALTER TABLE pedidos ADD COLUMN fecha_envio         DATETIME     DEFAULT NULL;
ALTER TABLE pedidos ADD COLUMN fecha_entrega_real  DATETIME     DEFAULT NULL;
ALTER TABLE pedidos ADD COLUMN proof_of_delivery_url TEXT       DEFAULT NULL;
ALTER TABLE pedidos ADD COLUMN direccion_confirmada TEXT        DEFAULT NULL;
ALTER TABLE pedidos ADD COLUMN zona                VARCHAR(30)  DEFAULT NULL;
ALTER TABLE pedidos ADD COLUMN almacen             VARCHAR(50)  DEFAULT NULL;

ALTER TABLE choferes ADD COLUMN fecha_vencimiento_licencia DATE DEFAULT NULL;
*/
