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
        validateGeoJson(geoJsonConDatos, "GeoJSON para el mapa no está cargado o es inválido.");

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
                                 `Percentil: {#if (eq point.valor_real -999,0)}Sin datos{else}{point.value:.1f}%{/if}<br/>` +
                                 `Valor: {#if (eq point.valor_real -999,0)}Sin datos{else}{point.valor_real:.1f} ${tooltipValueSuffix}{/if}`
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
        if (placeholder) placeholder.innerHTML = `<p style="color:red; text-align:center;">Error al crear mapa: ${error.message}</p>`;
        return null;
    }
}

const precipColorClasses = [
    { to: 10, color: '#8c510a', name: '< 10 (Ext. Seco)' },
    { from: 10, to: 30, color: '#d8b365', name: '10-30 (Seco)' },
    { from: 30, to: 40, color: '#f6e8c3', name: '30-40 (Bajo Normal)' },
    { from: 40, to: 60, color: '#f7f7f7', name: '40-60 (Normal)' },
    { from: 60, to: 70, color: '#bcf2ed', name: '60-70 (Ligeramente Lluvioso)' },
    { from: 70, to: 90, color: '#00a79a', name: '70-90 (Lluvioso)' },
    { from: 90, to: 100, color: '#007c80', name: '> 90 (Ext. Lluvioso)' },
    { from: -999, to: -1, color: '#cccccc', name: 'Sin datos' }
];
const colorRecordCalido = '#EB2B00';
const colorMuchoMasCalido = '#EE685C';
const colorMasCalido = '#F4B5B2';
const colorCercanoPromedio = '#f7f7f7';
const colorMasFrio = '#B5B2FF';
const colorMuchoMasFrio = '#635BFF';
const colorRecordFrio = '#2000FF';
const tempColorClasses = [
    { from: 98, to: 100, color: colorRecordCalido, name: 'Extremadamente cálido' },
    { from: 90, to: 98, color: colorMuchoMasCalido, name: 'Mucho más cálido que el promedio' },
    { from: 75, to: 90, color: colorMasCalido, name: 'Más cálido que el promedio' },
    { from: 25, to: 75, color: colorCercanoPromedio, name: 'Cercano al promedio' },
    { from: 10, to: 25, color: colorMasFrio, name: 'Más frío que el promedio' },
    { from: 2, to: 10, color: colorMuchoMasFrio, name: 'Mucho más frío que el promedio' },
    { from: 0, to: 2, color: colorRecordFrio, name: 'Extremadamente frío' },
    { from: -999, to: -1, color: '#cccccc', name: 'Sin datos' }
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
            const nombreComuna = feature.properties[COMUNA_NAME_PROPERTY];
            
            // Procesar datos de precipitación
            procesarDatosPercentiles(feature, nombreComuna, datosPercentiles, 'precipitacion');
            
            // Procesar datos de temperatura
            procesarDatosPercentiles(feature, nombreComuna, datosPercentiles, 'temperatura');
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
    }
}

// Función unificarGeometriasPorComuna movida a utils-geo.js para evitar duplicación

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
