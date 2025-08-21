const JOIN_BY_PROPERTY = 'CUT_COM';
const COMUNA_NAME_PROPERTY = 'COMUNA';

async function crearMapaPercentilesHighcharts(
    containerId, 
    geoJsonConDatos, 
    dataPropertyForColor, 
    dataPropertyForValue, 
    colorAxisDataClasses, 
    chartTitle, 
    tooltipValueSuffix
) {
    const placeholder = document.querySelector(`#${containerId} .map-loading-placeholder`);
    try {
        if (!geoJsonConDatos || !geoJsonConDatos.features) {
            throw new Error("GeoJSON para el mapa no está cargado o es inválido.");
        }

        const chart = Highcharts.mapChart(containerId, {
            chart: {
                map: geoJsonConDatos,
                height: '100%'
            },
            title: {
                text: null
            },
            mapNavigation: {
                enabled: true,
                enableDoubleClickZoomTo: true,
                buttonOptions: {
                    verticalAlign: 'bottom'
                }
            },
            colorAxis: {
                dataClasses: colorAxisDataClasses,
            },
            legend: {
                enabled: true,
                title: {
                    text: chartTitle 
                },
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'middle',
                floating: false,
            },
            series: [{
                data: geoJsonConDatos.features.map(f => {
                    let item = {};
                    item[JOIN_BY_PROPERTY] = f.properties[JOIN_BY_PROPERTY];
                    item.value = f.properties[dataPropertyForColor];      // Para el color del mapa
                    item.valor_real = f.properties[dataPropertyForValue]; // Para el tooltip
                    item.name = f.properties[COMUNA_NAME_PROPERTY] || 'N/D';
                    return item;
                }),
                joinBy: JOIN_BY_PROPERTY,
                name: chartTitle,
                states: {
                    hover: {
                        color: '#a4edba',
                        borderColor: '#333333',
                        borderWidth: 1
                    }
                },
                dataLabels: {
                    enabled: false,
                },
                tooltip: {
                    pointFormat: `<b>{point.name}</b><br/>` +
                                 `Percentil: {point.value:.1f}%<br/>` +
                                 `Valor: {point.valor_real:.1f} ${tooltipValueSuffix}`
                }
            }],
            credits: {
                enabled: true,
                text: '',
                href: '#'
            },
            exporting: {
                enabled: true,
                fallbackToExportServer: false,
                buttons: {
                    contextButton: {
                        menuItems: ['downloadJPEG']
                    }
                },
                filename: `mapa_percentiles_${chartTitle.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`,
                sourceWidth: 1200,
                sourceHeight: 800,
                scale: 2
            }
        });

        if (placeholder) placeholder.style.display = 'none';
        return chart;

    } catch (error) {
        console.error(`Error creando mapa en ${containerId}:`, error);
        if (placeholder) placeholder.innerHTML = `<p style="color:red; text-align:center;">Error al crear mapa: ${error.message}</p>`;
        return null;
    }
}

const precipColorClasses = [
    { to: 10, color: '#8c510a', name: '< 10 (Ext. Seco)' },
    { from: 10, to: 30, color: '#d8b365', name: '10-30 (Seco)' },
    { from: 30, to: 40, color: '#f6e8c3', name: '30-40 (Bajo Normal)' },
    { from: 40, to: 60, color: '#c7eae5', name: '40-60 (Normal)' },
    { from: 60, to: 70, color: '#5ab4ac', name: '60-70 (Sobre Normal)' },
    { from: 70, color: '#01665e', name: '> 70 (Húmedo)' }
];
const colorRecordCalido = '#EB2B00';
const colorMuchoMasCalido = '#EE685C';
const colorMasCalido = '#F4B5B2';
const colorCercanoPromedio = '#9d9d9dff';
const colorMasFrio = '#B5B2FF';
const colorMuchoMasFrio = '#635BFF';
const colorRecordFrio = '#2000FF';
const tempColorClasses = [
    { from: 98, color: colorRecordCalido, name: 'Extremadamente cálido' },
    { from: 90, to: 98, color: colorMuchoMasCalido, name: 'Mucho más cálido que el promedio' },
    { from: 75, to: 90, color: colorMasCalido, name: 'Más cálido que el promedio' },
    { from: 25, to: 75, color: colorCercanoPromedio, name: 'Cercano al promedio' },
    { from: 10, to: 25, color: colorMasFrio, name: 'Más frío que el promedio' },
    { from: 2, to: 10, color: colorMuchoMasFrio, name: 'Mucho más frío que el promedio' },
    { to: 2, color: colorRecordFrio, name: 'Extremadamente frío' }
];

async function inicializarMapasDePercentiles() {
    try {
        const responseComunas = await fetch('maps/data/valp.geojson');
        if (!responseComunas.ok) throw new Error(`valp.geojson: ${responseComunas.statusText}`);
        let geoJsonComunas = await responseComunas.json();
        let geoJsonComunasCorregido = unificarGeometriasPorComuna(geoJsonComunas);

        const responsePercentiles = await fetch('/api/datos_percentiles');
        if (!responsePercentiles.ok) throw new Error(`API de percentiles: ${responsePercentiles.statusText}`);
        const datosPercentiles = await responsePercentiles.json();

        if (datosPercentiles.error) throw new Error(datosPercentiles.error);

        geoJsonComunasCorregido.features.forEach(feature => {
            if (!feature.properties) feature.properties = {};
            
            const nombreComuna = feature.properties[COMUNA_NAME_PROPERTY];
            
            const datosPrecip = datosPercentiles.precipitacion[nombreComuna];
            if (datosPrecip && datosPrecip.percentil !== undefined) {
                feature.properties.percentil_precip = datosPrecip.percentil;
                feature.properties.valor_precip = datosPrecip.valor_actual; 
            } else {
                feature.properties.percentil_precip = null; // Sin dato
            }

            const datosTemp = datosPercentiles.temperatura[nombreComuna];
            if (datosTemp && datosTemp.percentil !== undefined) {
                feature.properties.percentil_temp = datosTemp.percentil;
                feature.properties.valor_temp = datosTemp.valor_actual;
            } else {
                feature.properties.percentil_temp = null; // Sin dato
            }
        });

        crearMapaPercentilesHighcharts(
            'map-percentil-precip',
            geoJsonComunasCorregido,
            'percentil_precip',          
            'valor_precip',               
            precipColorClasses,
            'Percentil de Precipitación',
            'mm'                         
        );

    crearMapaPercentilesHighcharts(
        'map-percentil-temp',
        geoJsonComunasCorregido,
        'percentil_temp',             
        'valor_temp',                 
        tempColorClasses,
        'Percentil de Temperatura',
        '°C'                          
    );

    } catch (error) {
        console.error("Error fatal al inicializar mapas:", error);
    }
}

function unificarGeometriasPorComuna(geojson) {
    if (typeof turf === 'undefined') {
        console.error("Turf.js no está disponible. No se pueden unificar las geometrías.");
        return geojson;
    }
    const comunasAgrupadas = new Map();
    geojson.features.forEach(feature => {
        const nombreComuna = feature.properties.COMUNA;
        if (!nombreComuna) return;
        if (!comunasAgrupadas.has(nombreComuna)) {
            comunasAgrupadas.set(nombreComuna, []);
        }
        comunasAgrupadas.get(nombreComuna).push(feature);
    });
    const featuresUnificados = [];
    for (const [nombre, features] of comunasAgrupadas.entries()) {
        if (features.length === 1) {
            featuresUnificados.push(features[0]);
        } else {
            try {
                if(nombre === "Zapallar");
                let geometriaUnificada = features[0];
                for (let i = 1; i < features.length; i++) {
                    geometriaUnificada = turf.union(geometriaUnificada, features[i]);
                }
                const featureMasGrande = features.sort((a, b) => b.properties.Shape_Area - a.properties.Shape_Area)[0];
                geometriaUnificada.properties = featureMasGrande.properties;
                featuresUnificados.push(geometriaUnificada);
            } catch (e) {
                const featureMasGrande = features.sort((a, b) => b.properties.Shape_Area - a.properties.Shape_Area)[0];
                featuresUnificados.push(featureMasGrande);
            }
        }
    }
    return { type: 'FeatureCollection', name: geojson.name, features: featuresUnificados };
}

document.addEventListener('DOMContentLoaded', function() {
    inicializarMapasDePercentiles();

    const navLinks = document.querySelectorAll('#sidebarNav a');
    const currentPath = window.location.pathname.split("/").pop() || "percentiles.php";
    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href').split("/").pop();
        if (linkPath === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
});
