// js/config.js

// URLs y Rutas
export const GEOJSON_COMUNAS_VALPO_URL = 'maps/data/valp.geojson';
export const API_BASE_URL = 'https://prodatos.meteochile.gob.cl/intranet/caster/getdp3/';
export const INDICES_BASE_URL = 'maps/data/salida/spi/txt/';
export const FALLBACK_API_URL = 'maps/data/dummy_api_data.json';

// Propiedades GeoJSON
export const PROPIEDAD_NOMBRE_COMUNA = 'COMUNA';
export const PROPIEDAD_CODIGO_COMUNA = 'CUT_COM';
export const PROPIEDAD_COLOR_SEQUIA_ACTUAL = 'D0D4';

// Colores para categorías de sequía
export const COLORES_CATEGORIA_SEQUIA = {
    'SA': '#d9d9d9',
    'D0': '#ffff00',
    'D1': '#fcd37f',
    'D2': '#ffaa00',
    'D3': '#E60000',
    'D4': '#730000',
    'DEFAULT': '#B0B0B0'
};

// Colores para índice de persistencia (SPI)
export const COLORES_INDICE_PERSISTENCIA = {
    EXT_LLUVIOSO: '#005954',   // >= 2.5
    MUY_LLUVIOSO: '#338b85',   // >= 2.0
    LLUVIOSO: '#5dc1b9',       // >= 1.5
    LIG_LLUVIOSO: '#9ce0db',   // >= 1.0
    NORMAL_LLUVIOSO: '#d5ffff',// >= 0.5
    NORMAL: '#d9d9d9',         // (-0.5 a 0.5)
    NORMAL_SECO: '#ffff00',    // < -0.5
    LIG_SECO: '#fcd37f',       // < -1.0
    SECO: '#ffaa00',           // < -1.5
    MUY_SECO: '#EA2B00',       // < -2.0
    EXT_SECO: '#801300'        // < -2.5
};

// Mapeo de Comunas a Códigos de Estación
export const MAPA_COMUNA_A_ESTACIONES = {
    'SAN FELIPE': ['E000320019'],
    'PETORCA': ['E000V00035'],
    'CABILDO': ['E000V00174', 'E000V00033'],
    'PAPUDO': ['E000V00034'],
    'LA LIGUA': ['E000V00175'],
    'PUTAENDO': ['E000V00041'],
    'CASABLANCA': ['E000V00176', 'E000V00029', 'E000V00177'],
    'PANQUEHUE': ['E000V00040'],
    'QUINTERO': ['E000V00031'],
    'CALERA': ['E000V00037'],
    'LA CRUZ': ['E000320028'],
    'PUCHUNCAVI': ['E000V00032'],
    'QUILLOTA': ['E000V00036'],
    'CONCON': ['E000V00030'],
    'LIMACHE': ['E000V00042'],
    'VALPARAISO': ['E000330002'],
    'VINA DEL MAR': ['E000330007'],
    'ALGARROBO': ['E000V00038'],
    'CARTAGENA': ['E000V00039'],
    'SANTO DOMINGO': ['E000330030']
};

// Configuración de períodos de persistencia
export const PERIODOS_PERSISTENCIA = [
    { meses: 3, id: 'mapaPersistencia3m', clave: 'p_3m', titulo: '3 Meses' },
    { meses: 9, id: 'mapaPersistencia9m', clave: 'p_9m', titulo: '9 Meses' },
    { meses: 12, id: 'mapaPersistencia12m', clave: 'p_12m', titulo: '12 Meses' },
    { meses: 24, id: 'mapaPersistencia24m', clave: 'p_24m', titulo: '24 Meses' },
    { meses: 48, id: 'mapaPersistencia48m', clave: 'p_48m', titulo: '48 Meses' },
];