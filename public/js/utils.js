// js/utils.js

/**
 * Normaliza una cadena de texto: la convierte a mayúsculas,
 * le quita los espacios en los extremos y remueve los acentos.
 * @param {string} str - La cadena a normalizar.
 * @returns {string} La cadena normalizada.
 */
export function normalizeString(str) {
    if (typeof str !== 'string') return '';
    return str.trim().toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}