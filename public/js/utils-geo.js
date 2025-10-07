// utils-geo.js - Funciones utilitarias para manejo de GeoJSON
// Evita duplicación de código entre mapasPercintil.js y mapClima.js

/**
 * Valida que un GeoJSON tenga la estructura correcta
 * @param {Object} geoJson - El objeto GeoJSON a validar
 * @param {string} errorMessage - Mensaje de error personalizado
 * @throws {Error} Si el GeoJSON no es válido
 */
function validateGeoJson(geoJson, errorMessage = "GeoJSON no está cargado o es inválido.") {
    if (!geoJson?.features) {
        throw new Error(errorMessage);
    }
}

/**
 * Procesa datos de percentiles para una comuna específica
 * @param {Object} feature - Feature del GeoJSON
 * @param {string} comunaName - Nombre de la comuna
 * @param {Object} datosPercentiles - Datos de percentiles
 * @param {string} tipo - Tipo de datos ('precipitacion' o 'temperatura')
 */
function procesarDatosPercentiles(feature, comunaName, datosPercentiles, tipo) {
    if (!feature.properties) feature.properties = {};
    
    const datos = datosPercentiles[tipo][comunaName];
    if (datos?.percentil !== undefined) {
        feature.properties[`percentil_${tipo === 'precipitacion' ? 'precip' : 'temp'}`] = datos.percentil;
        feature.properties[`valor_${tipo === 'precipitacion' ? 'precip' : 'temp'}`] = datos.valor_actual;
    } else {
        feature.properties[`percentil_${tipo === 'precipitacion' ? 'precip' : 'temp'}`] = -999; // Valor especial para sin datos
        feature.properties[`valor_${tipo === 'precipitacion' ? 'precip' : 'temp'}`] = null;
    }
}

/**
 * Obtiene el feature más grande basado en Shape_Area
 * @param {Array} features - Array de features
 * @returns {Object} El feature con mayor Shape_Area
 */
function obtenerFeatureMasGrande(features) {
    const sortedFeatures = [...features].sort((a, b) => b.properties.Shape_Area - a.properties.Shape_Area);
    return sortedFeatures[0];
}

/**
 * Unifica geometrías por comuna para evitar duplicados
 * @param {Object} geojson - GeoJSON original
 * @param {string} comunaProperty - Propiedad que contiene el nombre de la comuna
 * @returns {Object} GeoJSON con geometrías unificadas
 */
function unificarGeometriasPorComuna(geojson, comunaProperty = 'COMUNA') {
    if (typeof turf === 'undefined') {
        return geojson;
    }
    
    const comunasAgrupadas = new Map();
    geojson.features.forEach(feature => {
        const nombreComuna = feature.properties[comunaProperty];
        if (!nombreComuna) return;
        if (!comunasAgrupadas.has(nombreComuna)) {
            comunasAgrupadas.set(nombreComuna, []);
        }
        comunasAgrupadas.get(nombreComuna).push(feature);
    });
    
    const featuresUnificados = [];
    for (const [, features] of comunasAgrupadas.entries()) {
        if (features.length === 1) {
            featuresUnificados.push(features[0]);
        } else {
            try {
                // Código específico para comunas con múltiples geometrías si es necesario
                let geometriaUnificada = features[0];
                for (let i = 1; i < features.length; i++) {
                    geometriaUnificada = turf.union(geometriaUnificada, features[i]);
                }
                const featureMasGrande = obtenerFeatureMasGrande(features);
                geometriaUnificada.properties = featureMasGrande.properties;
                featuresUnificados.push(geometriaUnificada);
            } catch (e) {
                const featureMasGrande = obtenerFeatureMasGrande(features);
                featuresUnificados.push(featureMasGrande);
            }
        }
    }
    
    return { 
        type: 'FeatureCollection', 
        name: geojson.name, 
        features: featuresUnificados 
    };
}
