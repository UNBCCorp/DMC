let mapaLeafletValparaiso;
let geoJsonLayerComunas;
let infoControl;
let regionalTimeSeriesChartInstance;
let datosGeoJsonGlobales = null;
let datosHistoricosGlobales = null; 
let mapModal = null;
let modalMapContainer = null;
let modalMapTitle = null;
let closeModalButton = null;
let currentModalMapInstance = null;
let lockedLayer = null;

let panelDetalle;
let botonCerrarPanel;
let detalleChartInstance;


const GEOJSON_COMUNAS_VALPO_URL = 'maps/data/valp.geojson';
const PROPIEDAD_COLOR = 'D0D4';
const PROPIEDAD_NOMBRE_COMUNA = 'COMUNA';

function normalizeString(str) {
    if (typeof str !== 'string') return '';
    return str.trim().toUpperCase()
           .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
const COLORES_CATEGORIA_SEQUIA = {
    'SA': '#d9d9d9',         // Gris para "Sin Afectación"
    'D0': '#ffff00',         // Amarillo para "Anormalmente Seco"
    'D1': '#fcd37f',         // Naranjo claro para "Sequía Moderada"
    'D2': '#ffaa00',         // Naranjo para "Sequía Severa"
    'D3': '#E60000',         // Rojo para "Sequía Extrema"
    'D4': '#730000'          // Rojo oscuro para "Sequía Excepcional"
};
const MAPA_COMUNA_A_ESTACIONES = {
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

function determinarColorPorCategoriaDominante(feature) {
    const props = feature.properties;
    if (!props) return '#B0B0B0'; 

    const todasLasCategorias = ['D4', 'D3', 'D2', 'D1', 'D0', 'SA'];
    
    let categoriaDominante = 'SA'; 
    let maxValor = -1;            

    for (const cat of todasLasCategorias) {
        const valor = parseFloat(props[cat]);

        if (!isNaN(valor) && valor > maxValor) {
            maxValor = valor;
            categoriaDominante = cat;
        }
    }
    

    return COLORES_CATEGORIA_SEQUIA[categoriaDominante] || '#B0B0B0';
}
function aplicarMascara(geojsonDataComunas, mapaParaMascara) {
    if (!mapaParaMascara || typeof turf === 'undefined' || !geojsonDataComunas) {
        return;
    }
    const mundo = turf.polygon([[[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]]);
    let unionValpo;
    if (geojsonDataComunas && geojsonDataComunas.features && geojsonDataComunas.features.length > 0) {
        unionValpo = geojsonDataComunas.features.reduce((acc, feature) => {
            if (feature && feature.geometry && (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")) {
                try {
                    return acc ? turf.union(acc, feature) : feature;
                } catch (e) {
                    return acc;
                }
            }
            return acc;
        }, null);
    }
    if (!unionValpo) {
        return;
    }
    try {
        const mascara = turf.difference(mundo, unionValpo);
        L.geoJSON(mascara, {
            style: {
                fillColor: '#000',
                fillOpacity: 0.3,
                stroke: false
            }
        }).addTo(mapaParaMascara);
    } catch (e) {}
}

function getColorForIndex(indexValue) {
    if (indexValue === null || typeof indexValue === 'undefined' || isNaN(parseFloat(indexValue))) {
        return '#CCCCCC'; // Gris para sin datos
    }
    const val = parseFloat(indexValue);

    if (val >= 2.5) return '#005954';
    if (val >= 2.0) return '#338b85';
    if (val >= 1.5) return '#5dc1b9';
    if (val >= 1.0) return '#9ce0db';
    if (val >= 0.5) return '#d5ffff';
    if (val < -2.5) return '#801300';
    if (val < -2.0) return '#EA2B00';
    if (val < -1.5) return '#ffaa00';
    if (val < -1.0) return '#fcd370';
    if (val < -0.5) return '#ffff00';
    return '#FFFFFF'; // Blanco para rango Normal (-0.5 a 0.5)
}

function getColorSequia(valor) {
    if (valor === null || typeof valor === 'undefined' || isNaN(parseFloat(valor))) {
        return '#B0B0B0';
    }
    const val = parseFloat(valor);
    if (val <= 0) return '#d9d9d9';
    if (val <= 20) return '#ffff00';
    if (val <= 40) return '#fcd37f';
    if (val <= 60) return '#ffaa00';
    if (val <= 80) return '#EA2B00';
    return '#801300';
}

function styleFeatureSequia(feature) {
    return {
        fillColor: determinarColorPorCategoriaDominante(feature), 
        weight: 1,
        opacity: 1,
        color: '#666',
        fillOpacity: 0.7
    };
}

function styleFeaturePersistencia(feature, propiedadPersistencia) {
    return {
        fillColor: getColorForIndex(feature.properties[propiedadPersistencia]),
        weight: 0.5,
        opacity: 1,
        color: '#888',
        fillOpacity: 0.8
    };
}

function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({
        weight: 3,
        color: '#333',
        dashArray: '',
        fillOpacity: 0.85
    });
    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) layer.bringToFront();
    if (infoControl) infoControl.update(layer.feature.properties);
}

function resetHighlight(e) {
    if (lockedLayer && lockedLayer === e.target) {
        return;
    }
    if (geoJsonLayerComunas && typeof geoJsonLayerComunas.resetStyle === 'function') {
         geoJsonLayerComunas.resetStyle(e.target);
    }
    if (infoControl) infoControl.update();
}

function onEachFeatureSequia(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: function(e) {
            if (lockedLayer) {
                geoJsonLayerComunas.resetStyle(lockedLayer);
            }
            lockedLayer = e.target;
            
            layer.setStyle({
                weight: 4,
                color: '#000',
                dashArray: '',
                fillOpacity: 0.9
            });
            if (!L.Browser.ie) {
                layer.bringToFront();
            }
            
            actualizarPanelDetalle(feature.properties);
            L.DomEvent.stopPropagation(e);
        }
    });
}

function openMapModal(title, geojsonData, stylePropertyKey, mapIdShort) {
    if (!mapModal || !modalMapContainer || !modalMapTitle) return;
    modalMapTitle.textContent = title;

    if (currentModalMapInstance) {
        currentModalMapInstance.remove();
        currentModalMapInstance = null;
    }
    modalMapContainer.innerHTML = '';
    mapModal.style.display = 'block';

    setTimeout(() => {
        currentModalMapInstance = L.map(modalMapContainer, {
            center: [-33.0, -71.2],
            zoom: 8,
            zoomControl: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            dragging: true,
            boxZoom: true,
            touchZoom: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors',
            opacity: 0.8
        }).addTo(currentModalMapInstance);

        if (geojsonData && geojsonData.features && geojsonData.features.length > 0) {
            const modalGeoJsonLayer = L.geoJson(geojsonData, {
                style: feature => styleFeaturePersistencia(feature, stylePropertyKey)
            }).addTo(currentModalMapInstance);
            
            currentModalMapInstance.invalidateSize();
            
            if (modalGeoJsonLayer.getBounds().isValid()) {
                currentModalMapInstance.fitBounds(modalGeoJsonLayer.getBounds().pad(0.1));
            } else {
                currentModalMapInstance.setView([-33.0, -71.2], 8);
            }
            
            if (typeof turf !== 'undefined') {
                aplicarMascara(geojsonData, currentModalMapInstance);
            }
        } else {
        }
        if (L.easyPrint && currentModalMapInstance) {
        L.easyPrint({
            title: 'Descargar Mapa',
            position: 'topleft',
            sizeModes: ['A4Portrait', 'A4Landscape', 'Current'],
            filename: `mapa_modal_${mapIdShort || 'detalle'}`,
            exportOnly: true,
            hideControlContainer: false
        }).addTo(currentModalMapInstance);
    } else {
    }
    }, 10);
}

function closeMapModal() {
    if (mapModal) {
        mapModal.style.display = 'none';
    }
    if (currentModalMapInstance) {
        currentModalMapInstance.remove();
        currentModalMapInstance = null;
    }
    if (modalMapContainer) {
        modalMapContainer.innerHTML = '';
    }
}


function crearControlInfo() {
    infoControl = L.control({ position: 'topright' });
    infoControl.onAdd = function () {
        this._div = L.DomUtil.create('div', 'info p-2 bg-light border rounded shadow-sm info-panel-comuna');
        this.update();
        return this._div;
    };
    infoControl.update = function (props) {
        if (props) {
            this._div.innerHTML = `<b>${props[PROPIEDAD_NOMBRE_COMUNA] || 'Comuna'}</b>`;
        } else {
            this._div.innerHTML = 'Pase el mouse sobre una comuna';
        }
    };
    return infoControl;
}

function updateSidebarTable(props) {
    const el = id => document.getElementById(id);
    const format = val => (props && val !== undefined && val !== null) ? `${val}%` : '-';
    if (el('comuna-nombre')) el('comuna-nombre').textContent = props ? (props[PROPIEDAD_NOMBRE_COMUNA] || 'N/D') : 'Pase el mouse sobre una comuna';
    ['SA', 'D0', 'D1', 'D2', 'D3', 'D4'].forEach(key => {
        if (el(`comuna-${key.toLowerCase()}`)) el(`comuna-${key.toLowerCase()}`).textContent = format(props ? props[key] : undefined);
    });
}

async function cargarDatosHistoricos() {
    if (datosHistoricosGlobales) return;

    const hoy = new Date();
    const diaDeHoy = hoy.getDate();
    const fechaBase = new Date(hoy.getFullYear(), hoy.getMonth(), 1); 

    if (diaDeHoy < 17) {
        fechaBase.setMonth(fechaBase.getMonth() - 2);
    } else {
        fechaBase.setMonth(fechaBase.getMonth() - 1);
    }

    const numMeses = 12;
    const promesas = [];

    const fetchMes = async (ano, mes) => {
        const url = `https://prodatos.meteochile.gob.cl/intranet/caster/getdp3/${ano}/${mes}`;
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const data = await response.json();
            if (data && Array.isArray(data.datos)) {
                const fechaRegistro = new Date(ano, mes - 1, 15); 
                data.datos.forEach(d => d.fecha = fechaRegistro.toISOString());
                return data.datos;
            }
            return null;
        } catch (e) {
            return null;
        }
    };

    for (let i = 0; i < numMeses; i++) {
        const fechaParaFetch = new Date(fechaBase.getTime());
        fechaParaFetch.setMonth(fechaBase.getMonth() - i);
        
        const ano = fechaParaFetch.getFullYear();
        const mes = fechaParaFetch.getMonth() + 1; // getMonth() es 0-11
        
        promesas.push(fetchMes(ano, mes));
    }

    const historicos = {};
    const resultadosMensuales = await Promise.all(promesas);

    resultadosMensuales.forEach((datosMes) => {
        if (!datosMes) return;
        
        datosMes.forEach(comuna => {
            const codigo = String(comuna.Code);
            if (!historicos[codigo]) {
                historicos[codigo] = [];
            }
            historicos[codigo].push(comuna);
        });
    });

    for (const code in historicos) {
        historicos[code].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    }

    datosHistoricosGlobales = historicos;
}
function actualizarPanelDetalle(props) {
    if (!panelDetalle) return;

    const nombreComunaEl = document.getElementById('detalle-comuna-nombre');
    const contenidoEl = document.getElementById('detalle-comuna-contenido');

    if (!nombreComunaEl || !contenidoEl) return;

    const nombreComuna = props[PROPIEDAD_NOMBRE_COMUNA] || 'Detalle';
    const mesParaMostrar = mesActualDatos || obtenerMesActualDatos();
    nombreComunaEl.textContent = `${nombreComuna} - ${mesParaMostrar}`;
    panelDetalle.style.display = 'block';

    const dataItems = ['SA', 'D0', 'D1', 'D2', 'D3', 'D4'];
    let tablaHtml = `
        <p><strong>Índice (${PROPIEDAD_COLOR}):</strong> ${props[PROPIEDAD_COLOR] !== undefined ? parseFloat(props[PROPIEDAD_COLOR]).toFixed(1) + '%' : 'N/A'}</p>
        <table class="table table-sm table-bordered">
            <tbody>
    `;
    for (let i = 0; i < dataItems.length; i += 2) {
        tablaHtml += '<tr>';
        tablaHtml += `<td><strong>${dataItems[i]}:</strong></td><td>${props[dataItems[i]] !== undefined ? props[dataItems[i]] + '%' : 'N/A'}</td>`;
        if (dataItems[i+1]) {
            tablaHtml += `<td><strong>${dataItems[i+1]}:</strong></td><td>${props[dataItems[i+1]] !== undefined ? props[dataItems[i+1]] + '%' : 'N/A'}</td>`;
        }
        tablaHtml += '</tr>';
    }
    tablaHtml += `
            </tbody>
        </table>
        <hr>
        <h6>Serie de Tiempo (Últimos 12 meses)</h6>
        <div class="time-series-container" style="width:100%; height:400px; margin-top:10px;" id="detalle-comuna-grafico">
        </div>
    `;

    contenidoEl.innerHTML = tablaHtml;

    crearGraficoComunalConDatosReales(props, 'detalle-comuna-grafico');
}

function ocultarPanelDetalle() {
    if (panelDetalle) {
        panelDetalle.style.display = 'none';
    }
    if (lockedLayer) {
        geoJsonLayerComunas.resetStyle(lockedLayer);
        lockedLayer = null;
    }
    if (detalleChartInstance) {
        detalleChartInstance.destroy();
        detalleChartInstance = null;
    }
}

function getHighchartsConfig(labels, datasetsData, title) {
    const seriesData = [
        { name: 'SA (Sin Afectación)', color: 'rgb(206,206,206)', data: datasetsData['SA'] },
        { name: 'D0 (Anormalmente Seco)', color: 'rgb(255,255,0)', data: datasetsData['D0'] },
        { name: 'D1 (Sequía Moderada)', color: 'rgb(252,211,127)', data: datasetsData['D1'] },
        { name: 'D2 (Sequía Severa)', color: 'rgb(255,170,0)', data: datasetsData['D2'] },
        { name: 'D3 (Sequía Extrema)', color: 'rgb(230, 0, 0)', data: datasetsData['D3'] },
        { name: 'D4 (Sequía Excepcional)', color: 'rgb(115, 0, 0)', data: datasetsData['D4'] }
    ];

    return {
        accessibility: {
            enabled: false // Deshabilitar accesibilidad para evitar warnings
        },
        chart: { type: 'area' },
        title: { text: title },
        xAxis: { categories: labels, labels: { style: { fontSize: '8px' } } },
        yAxis: {
            min: 0,
            max: 100,
            title: { text: 'Porcentaje' }
        },
        tooltip: {
            pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y:.1f}%</b> ({point.percentage:.1f}%)<br/>',
            split: true
        },
        plotOptions: {
            area: {
                stacking: 'percent',
                lineColor: '#ffffff',
                lineWidth: 1,
                marker: {
                    lineWidth: 1,
                    lineColor: '#ffffff'
                }
            }
        },
        series: seriesData,
        credits: { enabled: false },
        legend: {
            itemStyle: {
               fontSize: '10px'
            }
        }
    };
}

function crearGraficoComunalConDatosReales(comunaProps, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !comunaProps || !comunaProps.CUT_COM || !datosHistoricosGlobales) {
        return;
    }

    if (detalleChartInstance) {
        detalleChartInstance.destroy();
        detalleChartInstance = null;
    }

    let codigoComuna = String(comunaProps.CUT_COM);
    if (codigoComuna.length === 5 && codigoComuna.startsWith('0')) {
        codigoComuna = codigoComuna.substring(1);
    }

    const historialComuna = datosHistoricosGlobales[codigoComuna];

    if (!historialComuna || historialComuna.length === 0) {
        container.innerHTML = '<p class="text-center small p-3">No hay datos históricos disponibles para esta comuna.</p>';
        return;
    }

    const categorias = ['SA', 'D0', 'D1', 'D2', 'D3', 'D4'];
    const labels = [];
    const datasetsData = { SA: [], D0: [], D1: [], D2: [], D3: [], D4: [] };

    historialComuna.forEach(registro => {
        labels.push(new Date(registro.fecha).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).replace('.', ''));
        categorias.forEach(cat => {
            datasetsData[cat].push(parseFloat(registro[cat]) || 0);
        });
    });

    const config = getHighchartsConfig(labels, datasetsData, `Serie de Tiempo - ${comunaProps.COMUNA}`);
    detalleChartInstance = Highcharts.chart(containerId, config);
}

function crearGraficoRegionalConDatosReales(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }
    if (!datosHistoricosGlobales) {
        container.innerHTML = '<p class="text-center small p-3">No se pudieron cargar los datos históricos.</p>';
        return;
    }

    if (regionalTimeSeriesChartInstance) {
        regionalTimeSeriesChartInstance.destroy();
        regionalTimeSeriesChartInstance = null;
    }

    const categorias = ['SA', 'D0', 'D1', 'D2', 'D3', 'D4'];
    const numMeses = 12;
    const promediosMensuales = {};

    for (const code in datosHistoricosGlobales) {
        const historial = datosHistoricosGlobales[code];
        historial.forEach(registro => {
            if (registro.Lvl1 === "Valparaiso") {
                const monthKey = new Date(registro.fecha).toISOString().slice(0, 7);
                if (!promediosMensuales[monthKey]) {
                    promediosMensuales[monthKey] = { sumas: { SA: 0, D0: 0, D1: 0, D2: 0, D3: 0, D4: 0 }, count: 0, fecha: new Date(registro.fecha) };
                }
                const mes = promediosMensuales[monthKey];
                categorias.forEach(cat => {
                    mes.sumas[cat] += parseFloat(registro[cat]) || 0;
                });
                mes.count++;
            }
        });
    }

    const sortedMonths = Object.values(promediosMensuales).sort((a, b) => a.fecha - b.fecha);

    if (sortedMonths.length === 0) {
        container.innerHTML = '<p class="text-center small p-3">No se encontraron datos para la Región de Valparaíso.</p>';
        return;
    }

    const labels = [];
    const datasetsData = { SA: [], D0: [], D1: [], D2: [], D3: [], D4: [] };

    sortedMonths.slice(-numMeses).forEach(monthData => {
        labels.push(monthData.fecha.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).replace('.', ''));
        categorias.forEach(cat => {
            datasetsData[cat].push(monthData.sumas[cat] / monthData.count);
        });
    });

    const config = getHighchartsConfig(labels, datasetsData, 'Serie de Tiempo Regional');
    regionalTimeSeriesChartInstance = Highcharts.chart(containerId, config);
}


function zoomToFeature(e) {
    const layer = e.target;
    if (mapaLeafletValparaiso && layer && typeof layer.getBounds === 'function') {
        mapaLeafletValparaiso.fitBounds(layer.getBounds());
    }
}


function inicializarMinimapa(containerId, geojsonData, propiedadColorKey, mapTitle) {
    const mapContainer = document.getElementById(containerId);
    if (!mapContainer) return;
    if (mapContainer._leaflet_id) return;

    const map = L.map(containerId, {zoom:8,
        zoomControl: false, attributionControl: false, scrollWheelZoom: false,
        doubleClickZoom: false, dragging: false, boxZoom: false, touchZoom: false,
        keyboard: false, layers: []
    });

    const layer = L.geoJson(geojsonData, {
        style: f => styleFeaturePersistencia(f, propiedadColorKey)
    }).addTo(map);

    if (layer.getBounds().isValid()) {
        map.fitBounds(layer.getBounds().pad(0.05));
    } else {
        map.setView([-33.0, -71.2], 6);
    }
    
    mapContainer.addEventListener('click', function() {
        openMapModal(`Persistencia ${mapTitle} Con SPI`, geojsonData, propiedadColorKey, containerId.replace('mapaPersistencia', ''));
    });
}

// Variable global para almacenar el mes actual de los datos
let mesActualDatos = '';

function obtenerMesActualDatos() {
    const hoy = new Date();
    const diaDeHoy = hoy.getDate();
    const fechaObjetivo = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    if (diaDeHoy < 17) {
        fechaObjetivo.setMonth(fechaObjetivo.getMonth() - 2);
    } else {
        fechaObjetivo.setMonth(fechaObjetivo.getMonth() - 1);
    }
    
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    return meses[fechaObjetivo.getMonth()];
}

function actualizarTituloConMes(ano, mes) {
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const nombreMes = meses[parseInt(mes) - 1];
    mesActualDatos = nombreMes; // Guardar el mes para uso en otros lugares
    
    // Buscar el elemento h6 que contiene "Categorías por Comuna"
    const h6Elements = document.querySelectorAll('h6');
    for (let h6 of h6Elements) {
        if (h6.textContent.includes('Categorías por Comuna')) {
            h6.textContent = `Categorías por Comuna (% Área D0-D4) ${nombreMes}`;
            break;
        }
    }
}

async function fetchAndMergeApiData(geojsonData) {
const hoy = new Date();
const diaDeHoy = hoy.getDate();

const fechaObjetivo = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

if (diaDeHoy < 17) {
    fechaObjetivo.setMonth(fechaObjetivo.getMonth() - 2);
} else {
    fechaObjetivo.setMonth(fechaObjetivo.getMonth() - 1);
}

const ano = fechaObjetivo.getFullYear();
const mes = String(fechaObjetivo.getMonth() + 1).padStart(2, '0');

    const apiUrl = `https://prodatos.meteochile.gob.cl/intranet/caster/getdp3/${ano}/${mes}`;
    const fallbackUrl = 'maps/data/dummy_api_data.json';
    
    let apiData;
    let dataSource = '';

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`API respondió con estado: ${response.status}`);
        const parsedJson = await response.json();
        
        if (parsedJson && Array.isArray(parsedJson.datos) && parsedJson.datos.length > 0) {
            apiData = parsedJson.datos;
            dataSource = 'API en Vivo';
        } else {
            throw new Error("La respuesta de la API está vacía o no es un arreglo.");
        }

    } catch (error) {
        try {
            const fallbackResponse = await fetch(fallbackUrl);
            if (!fallbackResponse.ok) throw new Error(`El archivo de respaldo no pudo cargarse.`);
            const fallbackJson = await fallbackResponse.json();
            
            if (fallbackJson && Array.isArray(fallbackJson.datos) && fallbackJson.datos.length > 0) {
                apiData = fallbackJson.datos;
                dataSource = 'Respaldo Local';
            } else {
                throw new Error("El archivo de respaldo está vacío o tiene un formato incorrecto.");
            }
        } catch (fallbackError) {
            return false;
        }
    }
    
    const apiDataMap = new Map();
    let keyFound = false;
    for (const item of apiData) {
        const key = item.Code || item.code;
        if (key) {
            apiDataMap.set(String(key), item);
            keyFound = true;
        }
    }

    if (!keyFound) {
        return false;
    }
    
    geojsonData.features.forEach(feature => {
        if (feature.properties && feature.properties.CUT_COM) {
            let lookupCode = feature.properties.CUT_COM;
            if (typeof lookupCode === 'string' && lookupCode.length === 5 && lookupCode.startsWith('0')) {
                lookupCode = lookupCode.substring(1);
            }
            const data = apiDataMap.get(String(lookupCode));
            if (data) {
                Object.assign(feature.properties, data);
            }
        }
    });
    actualizarPromediosRegionales(apiData);
    actualizarTituloConMes(ano, mes);
    return true;
}


function actualizarPromediosRegionales(datosComunales) {
    if (!datosComunales || datosComunales.length === 0) {
        return;
    }

    const categorias = ['SA', 'D0', 'D1', 'D2', 'D3', 'D4'];
    const sumas = { SA: 0, D0: 0, D1: 0, D2: 0, D3: 0, D4: 0 };
    const totalComunas = datosComunales.length;

    datosComunales.forEach(comuna => {
        categorias.forEach(cat => {
            const valor = parseFloat(comuna[cat]);
            if (!isNaN(valor)) {
                sumas[cat] += valor;
            }
        });
    });

    categorias.forEach(cat => {
        const promedio = sumas[cat] / totalComunas;
        const idElemento = `avg-${cat.toLowerCase()}`;
        const elemento = document.getElementById(idElemento);
        if (elemento) {
            elemento.textContent = promedio.toFixed(1) + '%';
        }
    });
}

function crearLeyendaPersistencia() {
    const container = document.getElementById('persistencia-container');
    if (!container) {
        return;
    }

 const legendData = [
        // Lluvioso
        { code: 'Ext. Lluvioso', range: '>= 2.5', color: '#005954' },
        { code: 'Muy Lluvioso', range: '[2.0 a 2.5)', color: '#338b85' },
        { code: 'Lluvioso', range: '[1.5 a 2.0)', color: '#5dc1b9' },
        { code: 'Lig. Lluvioso', range: '[1.0 a 1.5)', color: '#9ce0db' },
        { code: 'Normal Lluvioso', range: '[0.5 a 1.0)', color: '#d5ffff' },
        // Normal
        { code: 'Normal', range: '(-0.5 a 0.5)', color: '#FFFFFF' },
        // Sequía
        { code: 'Normal Seco', range: '[-0.5 a -1.0)', color: '#ffff00' },
        { code: 'Lig. Seco', range: '[-1.0 a -1.5)', color: '#fcd370' },
        { code: 'Seco', range: '[-1.5 a -2.0)', color: '#ffaa00' },
        { code: 'Muy Seco', range: '[-2.0 a -2.5)', color: '#EA2B00' },
        { code: 'Ext. Seco', range: '<= -2.5', color: '#801300' },
        // Sin datos
        { code: 'Sin Datos', range: 'N/A', color: '#CCCCCC' }
    ];

    let legendHtml = '<div class="persistencia-legend mb-3">';
    legendHtml += '<div class="row justify-content-center">';

    legendData.forEach(item => {
        legendHtml += `
            <div class="col-auto text-center px-2 mb-2">
                <i style="background:${item.color}; width: 18px; height: 18px; display: inline-block; border: 1px solid #555;"></i>
                <div><strong>${item.code}</strong></div>
                <div style="font-size: 0.7rem;">${item.range}</div>
            </div>
        `;
    });

    legendHtml += '</div></div>';

    const grid = container.querySelector('.persistencia-map-grid');
    if (grid) {
        const existingLegend = container.querySelector('.persistencia-legend');
        if (existingLegend) {
            existingLegend.remove();
        }
        grid.insertAdjacentHTML('beforebegin', legendHtml);
    } else {
        container.innerHTML = legendHtml + container.innerHTML;
    }
}

async function inicializarMapaSequiaValparaisoLeaflet() {
    const mapContainerId = 'mapaValparaisoLeaflet';
    const mapEl = document.getElementById(mapContainerId);
    if (mapEl._leaflet_id) {
        return;
    }
    mapEl.innerHTML = '';
 
    try {
        mapaLeafletValparaiso = L.map(mapEl, {
            zoomControl: true, 
            minZoom: 7.70,
            maxZoom: 12,
        }).setView([-33.0, -71.2], 9);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors', opacity: 0.7
        }).addTo(mapaLeafletValparaiso);
        
        mapaLeafletValparaiso.on('click', function() {
            ocultarPanelDetalle();
        });

        await cargarDatosHistoricos();
        
        const response = await fetch(GEOJSON_COMUNAS_VALPO_URL);
        if (!response.ok) throw new Error(`Error al cargar GeoJSON: ${response.statusText}`);
        datosGeoJsonGlobales = await response.json();

        const fusionExitosa = await fetchAndMergeApiData(datosGeoJsonGlobales);
        if (!fusionExitosa) {
            throw new Error("No se pudieron fusionar los datos de la API; se detiene la carga del mapa.");
        }

        const dataPrincipal = JSON.parse(JSON.stringify(datosGeoJsonGlobales));

        geoJsonLayerComunas = L.geoJson(dataPrincipal, {
            style: styleFeatureSequia,
            onEachFeature: onEachFeatureSequia
        }).addTo(mapaLeafletValparaiso);

        if (geoJsonLayerComunas.getBounds().isValid()) {
            mapaLeafletValparaiso.fitBounds(geoJsonLayerComunas.getBounds());
        }

        infoControl = crearControlInfo();
        if (infoControl) infoControl.addTo(mapaLeafletValparaiso);

        if (typeof turf !== 'undefined') {
            aplicarMascara(dataPrincipal, mapaLeafletValparaiso);
        }

        if (L.easyPrint) {
            L.easyPrint({
                title: 'Exportar Mapa Principal',
                position: 'topleft',
                sizeModes: ['A4Portrait', 'A4Landscape', 'Current'],
                filename: 'mapa_sequia_valparaiso_principal',
                exportOnly: true,
                hideControlContainer: false
            }).addTo(mapaLeafletValparaiso);
        }
        
        if (document.getElementById('timeSeriesChartRegionalSidebar')) {
            crearGraficoRegionalConDatosReales('timeSeriesChartRegionalSidebar');
        }
        
        crearLeyendaPersistencia();
        
         if (datosGeoJsonGlobales) {
            cargarDatosDesdeTxtYMostrarPersistencia(datosGeoJsonGlobales);
        }
 
    } catch (error) {
        if (mapEl) mapEl.innerHTML = `<p style="color:red;text-align:center;padding-top:20px;">Error al cargar mapa: ${error.message}</p>`;
    }
}

async function buscarYcargarTxtMasReciente(mesesAtras = 12) {
    const hoy = new Date();
    for (let i = 1; i <= mesesAtras; i++) {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        fecha.setMonth(fecha.getMonth() - i);
        const [ano, mes] = [fecha.getFullYear(), String(fecha.getMonth() + 1).padStart(2, '0')];
        const url = `maps/data/salida/spi/txt/${ano}_${mes}_indices.txt`;
        try {
            const response = await fetch(url);
            if (response.ok) {
                return await response.text();
            }
        } catch (e) { /* Silencio intencional */ }
    }
    throw new Error(`No se encontró ningún archivo de índices en los últimos ${mesesAtras} meses.`);
}

function parsearTxtIndices(contenidoTxt) {
    if (!contenidoTxt) throw new Error("El contenido del archivo TXT está vacío.");
    const lineas = contenidoTxt.trim().split('\n');
    const cabecera = lineas.shift().trim().split(',');
    const cabeceraMapeada = cabecera.map(h => {
        const hLimpia = h.trim();
        if (!isNaN(parseFloat(hLimpia)) && isFinite(hLimpia)) return `p_${hLimpia}m`;
        if (hLimpia.startsWith('meses:')) return `p_${hLimpia.split(':')[1]}m`;
        return hLimpia;
    });
    return lineas.map(linea => {
        const valores = linea.trim().split(',').map(v => v.trim());
        const estacionObj = {};
        cabeceraMapeada.forEach((clave, i) => {
            const valorNum = parseFloat(valores[i]);
            estacionObj[clave] = isNaN(valorNum) ? valores[i] : valorNum;
        });
        return estacionObj;
    });
}

async function prepararDatosParaMapas() {
    try {
        const [geojsonResponse, contenidoTxt] = await Promise.all([
            fetch(GEOJSON_COMUNAS_VALPO_URL),
            buscarYcargarTxtMasReciente()
        ]);

        if (!geojsonResponse.ok) throw new Error("No se pudo cargar el GeoJSON de comunas.");

        const geojsonData = await geojsonResponse.json();
        const datosIndicesParseados = parsearTxtIndices(contenidoTxt);
        const datosEstacionesMap = new Map(datosIndicesParseados.map(item => [item.Estacion, item]));

        const periodos = [
            { clave: 'p_3m', titulo: '3 Meses' }, { clave: 'p_9m', titulo: '9 Meses' },
            { clave: 'p_12m', titulo: '12 Meses' }, { clave: 'p_24m', titulo: '24 Meses' },
            { clave: 'p_48m', titulo: '48 Meses' },
        ];

        geojsonData.features.forEach(feature => {
            const nombreComunaNorm = normalizeString(feature.properties.COMUNA);
            const codigosEstacion = MAPA_COMUNA_A_ESTACIONES[nombreComunaNorm];

            periodos.forEach(periodo => {
                if (codigosEstacion) {
                    const valores = codigosEstacion
                        .map(codigo => datosEstacionesMap.get(codigo)?.[periodo.clave])
                        .filter(valor => typeof valor === 'number');

                    if (valores.length > 0) {
                        const suma = valores.reduce((a, b) => a + b, 0);
                        feature.properties[periodo.clave] = suma / valores.length;
                    } else {
                        feature.properties[periodo.clave] = null;
                    }
                } else {
                    feature.properties[periodo.clave] = null;
                }
            });
        });

        datosGeoJsonGlobales = geojsonData;

    } catch (error) {
        const mapEl = document.getElementById('mapaValparaisoLeaflet');
        if (mapEl) mapEl.innerHTML = `<p style="color:red; text-align:center;">${error.message}</p>`;
        throw error;
    }
}

async function cargarDatosDesdeTxtYMostrarPersistencia(geojsonData) {
    try {
        const contenidoTxt = await buscarYcargarTxtMasReciente();
        if (!contenidoTxt) throw new Error("No se pudo cargar el archivo .txt de índices.");

        const datosParseados = parsearTxtIndices(contenidoTxt);
        const datosEstacionesTxt = new Map(datosParseados.map(item => [item.Estacion, item]));

        const periodos = [
            { meses: 3, id: 'mapaPersistencia3m', clave: 'p_3m', titulo: '3 Meses' },
            { meses: 9, id: 'mapaPersistencia9m', clave: 'p_9m', titulo: '9 Meses' },
            { meses: 12, id: 'mapaPersistencia12m', clave: 'p_12m', titulo: '12 Meses' },
            { meses: 24, id: 'mapaPersistencia24m', clave: 'p_24m', titulo: '24 Meses' },
            { meses: 48, id: 'mapaPersistencia48m', clave: 'p_48m', titulo: '48 Meses' },
        ];

        for (const periodo of periodos) {
            const geojsonDataConPersistencia = JSON.parse(JSON.stringify(geojsonData));
            
            geojsonDataConPersistencia.features.forEach(feature => {
                const nombreComunaNormalizado = normalizeString(feature.properties.COMUNA);
                const codigosEstacion = MAPA_COMUNA_A_ESTACIONES[nombreComunaNormalizado];

                if (codigosEstacion && codigosEstacion.length > 0) {
                    let suma = 0, contador = 0;
                    codigosEstacion.forEach(codigo => {
                        const datosDeEstacion = datosEstacionesTxt.get(codigo);
                        if (datosDeEstacion && typeof datosDeEstacion[periodo.clave] === 'number') {
                            suma += datosDeEstacion[periodo.clave];
                            contador++;
                        }
                    });

                    if (contador > 0) {
                        feature.properties[periodo.clave] = suma / contador;
                    } else { feature.properties[periodo.clave] = null; }
                } else { feature.properties[periodo.clave] = null; }
            });
            
            inicializarMinimapa(periodo.id, geojsonDataConPersistencia, periodo.clave, periodo.titulo);
        }

    } catch (error) {
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Verificar si el nuevo sistema MVC está activo
    if (window.Model && window.View && window.Controller) {
        return;
    }
    
    if (document.getElementById('mapaValparaisoLeaflet')) {
        inicializarMapaSequiaValparaisoLeaflet();
    } else {
    }
    
    panelDetalle = document.getElementById('panel-detalle-comuna');
    botonCerrarPanel = document.getElementById('cerrar-panel-detalle');
    if (botonCerrarPanel) {
        botonCerrarPanel.addEventListener('click', ocultarPanelDetalle);
    }

    const navLinks = document.querySelectorAll('#sidebarNav a');
    const currentPath = window.location.pathname.split("/").pop() || "Monitor.php";
    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href').split("/").pop();
        if (linkPath === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    mapModal = document.getElementById('mapModal');
    modalMapContainer = document.getElementById('modalMapContainer');
    modalMapTitle = document.getElementById('modalMapTitle');
    closeModalButton = document.querySelector('.map-modal-close-button');
    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeMapModal);
    }
    if (mapModal) {
        mapModal.addEventListener('click', function(event) {
            if (event.target === mapModal) {
                closeMapModal();
            }
        });
    }
});
