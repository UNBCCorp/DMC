const VALPARAISO_STATIONS = {
    'E000320019': 'San Felipe', 
    'E000V00035': 'Petorca', 
    'E000V00174': 'Alicahue',
    'E000V00033': 'Cabildo', 
    'E000V00034': 'Papudo', 
    'E000V00175': 'La Ligua',
    'E000V00041': 'Putaendo', 
    'E000V00176': 'Lagunillas', 
    'E000V00040': 'Panquehue',
    'E000V00031': 'Quintero', 
    'E000V00037': 'Calera', 
    'E000320028': 'La Cruz Inia',
    'E000V00032': 'Puchuncaví', 
    'E000V00036': 'Quillota', 
    'E000V00030': 'Concón',
    'E000V00042': 'Limache', 
    'E000330002': 'Valparaíso', 
    'E000330007': 'Rodelillo',
    'E000V00029': 'Casablanca', 
    'E000V00177': 'Pitama', 
    'E000V00038': 'Algarrobo',
    'E000V00039': 'Cartagena', 
    'E000330030': 'Santo Domingo'
};
const MONTH_SCALE_TO_COLUMN_INDEX = { '3': 4, '9': 6, '12': 7, '24': 8, '48': 10 };

// Función para buscar y cargar el archivo .txt más reciente (igual que en sequia.js)
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
                const contenido = await response.text();
                return { contenido, ano, mes };
            }
        } catch (e) { /* Silencio intencional */ }
    }
    throw new Error(`No se encontró ningún archivo de índices en los últimos ${mesesAtras} meses.`);
}

function calculateAverage(arr) {
    if (!arr || arr.length === 0) return null;
    const sum = arr.reduce((acc, val) => acc + val, 0);
    return sum / arr.length;
}

function getRegionalValuesFromFile(textContent, stationFilter) {
    const lines = textContent.split('\n').filter(line => line.trim() && !line.startsWith('Estacion'));
    if (lines.length === 0) return null;
    const regionalValues = { '3': [], '9': [], '12': [], '24': [], '48': [] };
    for (const line of lines) {
        const values = line.split(',');
        const stationCode = values[0].trim();
        if (stationFilter.hasOwnProperty(stationCode)) {
            for (const scale in MONTH_SCALE_TO_COLUMN_INDEX) {
                const colIndex = MONTH_SCALE_TO_COLUMN_INDEX[scale];
                if (values[colIndex] !== undefined) {
                    const value = parseFloat(values[colIndex]);
                    if (!isNaN(value)) regionalValues[scale].push(value);
                }
            }
        }
    }
    return regionalValues;
}

function renderTimeSeriesChart(containerId, title, fechas, series) {
    const placeholder = document.querySelector(`#${containerId} .loading-placeholder`);

    // Extraer solo las fechas que tienen datos, manteniendo la correspondencia
    const fechasConDatos = [];
    const seriesFiltradas = series.map(serie => {
        const datosValidos = [];
        serie.data.forEach((point, index) => {
            if (point !== null && point.y !== null && !isNaN(point.y)) {
                datosValidos.push(point);
                fechasConDatos.push(fechas[index]);
            }
        });
        return {
            ...serie,
            data: datosValidos
        };
    });

    // Usar un solo eje Y principal
    const yAxis = {
        title: { text: 'Valor del Índice', style: { color: '#333' } },
        min: -3,
        max: 3,
        tickInterval: 0.5,
        labels: { align: 'right', x: -5 },
        plotLines: [
            { color: '#888', width: 1.5, value: 0, zIndex: 3, dashStyle: 'dash' },
            { color: '#DEB887', width: 1, value: -1, zIndex: 2, dashStyle: 'dot' },
            { color: '#8B4513', width: 1, value: -2, zIndex: 2, dashStyle: 'dot' },
            { color: '#87CEEB', width: 1, value: 1, zIndex: 2, dashStyle: 'dot' },
            { color: '#4682B4', width: 1, value: 2, zIndex: 2, dashStyle: 'dot' }
        ],
        gridLineColor: '#e6e6e6',
        gridLineWidth: 1
    };

    // Configurar la serie con zonas de colores para el área
    seriesFiltradas.forEach((serie, index) => {
        serie.color = '#333333'; // Color de la línea
        serie.lineWidth = 1.5;
        
        // Configurar zonas de colores para el área rellena
        serie.zones = [
            {
                value: -2,
                color: '#8B4513', // Marrón para sequía extrema
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#8B4513'],
                        [1, 'rgba(139, 69, 19, 0.3)']
                    ]
                }
            },
            {
                value: -1,
                color: '#DEB887', // Beige para sequía moderada
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#DEB887'],
                        [1, 'rgba(222, 184, 135, 0.3)']
                    ]
                }
            },
            {
                value: 0,
                color: '#F5DEB3', // Beige claro para valores negativos cercanos a 0
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#F5DEB3'],
                        [1, 'rgba(245, 222, 179, 0.3)']
                    ]
                }
            },
            {
                value: 1,
                color: '#87CEEB', // Azul claro para húmedo
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#87CEEB'],
                        [1, 'rgba(135, 206, 235, 0.3)']
                    ]
                }
            },
            {
                color: '#4682B4', // Azul para muy húmedo
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#4682B4'],
                        [1, 'rgba(70, 130, 180, 0.3)']
                    ]
                }
            }
        ];
        
        // Configurar puntos individuales
        serie.data.forEach(point => {
            if (point && point.isIncomplete) {
                point.color = '#cccccc';
                point.borderColor = '#999999';
            }
        });
    });

    // Crear categorías del eje X con formato más legible
    const categoriasEjeX = fechasConDatos.map(fecha => {
        const [ano, mes] = fecha.split('-');
        const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                             'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const nombreMesCorto = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                               'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][parseInt(mes) - 1];
        const nombreMesCompleto = nombresMeses[parseInt(mes) - 1];
        
        // Para el tooltip usaremos el nombre completo, para el eje X el corto
        return {
            corto: `${nombreMesCorto} ${ano}`,
            completo: `${nombreMesCompleto} ${ano}`,
            fecha: fecha
        };
    });

    Highcharts.chart(containerId, {
        chart: { 
            type: 'area', 
            zoomType: 'x', 
            marginLeft: 80, 
            alignTicks: false,
            scrollablePlotArea: categoriasEjeX.length >= 48 ? {
                minWidth: categoriasEjeX.length * 30, // Más espacio para SPI-48
                scrollPositionX: 1 // Empezar al final (datos más recientes)
            } : categoriasEjeX.length >= 12 ? {
                minWidth: Math.max(800, categoriasEjeX.length * 25), // Espaciado normal para SPI-12, SPI-24
                scrollPositionX: 1
            } : undefined // Sin scroll para SPI-3, SPI-9
        },
        title: { text: title },
        xAxis: { 
            categories: categoriasEjeX.map(cat => cat.corto), 
            crosshair: true, 
            offset: 10,
            labels: {
                rotation: categoriasEjeX.length <= 9 ? 0 : -45, // Sin rotación para pocos puntos (SPI-3, SPI-9)
                step: categoriasEjeX.length <= 9 ? 1 : Math.max(1, Math.floor(categoriasEjeX.length / 20)), // Mostrar todas las etiquetas para pocos puntos
                style: {
                    fontSize: categoriasEjeX.length <= 3 ? '12px' : '11px' // Texto más grande para SPI-3
                }
            },
            tickInterval: 1,
            // Para gráficos con pocos puntos, centrar y comprimir el área de datos
            min: categoriasEjeX.length <= 3 ? -0.5 : undefined,
            max: categoriasEjeX.length <= 3 ? categoriasEjeX.length - 0.5 : undefined,
            tickPositions: categoriasEjeX.length <= 3 ? 
                [0, 1, 2] : // Posiciones fijas para SPI-3
                undefined
        },
        yAxis: yAxis,
        tooltip: {
            shared: true,
            split: false,
            formatter: function () {
                // Obtener la fecha desde el punto de datos
                let fechaCompleta = this.x;
                if (this.point && this.point.fecha) {
                    const [ano, mes] = this.point.fecha.split('-');
                    const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                    fechaCompleta = `${nombresMeses[parseInt(mes) - 1]} ${ano}`;
                } else if (categoriasEjeX[this.point.index]) {
                    fechaCompleta = categoriasEjeX[this.point.index].completo;
                }
                
                let s = `<b>${fechaCompleta}</b><br/>`;
                
                this.points.forEach(point => {
                    const incompleteLabel = point.point.isIncomplete ? ' (Datos Incompletos)' : '';
                    s += `<span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>${point.y.toFixed(2)}</b>${incompleteLabel}<br/>`;
                });
                return s;
            }
        },
        legend: { 
            enabled: false // Deshabilitamos la leyenda ya que solo hay una serie
        },
        plotOptions: {
            area: {
                marker: {
                    enabled: true,
                    symbol: 'circle',
                    radius: 3,
                    lineWidth: 1,
                    lineColor: '#333333',
                    states: {
                        hover: {
                            enabled: true,
                            radius: 5,
                            lineWidth: 2
                        }
                    }
                },
                lineWidth: 1.5,
                connectNulls: false,
                fillOpacity: 0.6,
                threshold: 0 // Línea base en 0 para el relleno
            }
        },

        series: seriesFiltradas,
        credits: { enabled: true, text: 'DMC' }
    });

    if (placeholder) placeholder.style.display = 'none';
}

async function processAndRender(indexType, containerId, title, escalaSeleccionada = '12') {
    const placeholder = document.querySelector(`#${containerId} .loading-placeholder`);
    try {
        // Primero, encontrar el archivo más reciente (igual que el mapa)
        const archivoMasReciente = await buscarYcargarTxtMasReciente();
        const { ano: anoReferencia, mes: mesReferencia } = archivoMasReciente;
        
        // Calcular cuántos meses hacia atrás mostrar según la escala
        let mesesHaciaAtras;
        switch(escalaSeleccionada) {
            case '3':
                mesesHaciaAtras = 3; // 3 meses para SPI-3
                break;
            case '9':
                mesesHaciaAtras = 9; // 9 meses para SPI-9
                break;
            case '12':
                mesesHaciaAtras = 12; // 12 meses para SPI-12
                break;
            case '24':
                mesesHaciaAtras = 24; // 24 meses para SPI-24
                break;
            case '48':
                mesesHaciaAtras = 48; // 48 meses para SPI-48
                break;
            default:
                mesesHaciaAtras = parseInt(escalaSeleccionada);
        }
        
        // Generar fechas desde el mes de referencia hacia atrás
        const fechasParaEjeX = [];
        const promesasFetch = [];
        
        const fechaReferencia = new Date(parseInt(anoReferencia), parseInt(mesReferencia) - 1, 1);
        
        for (let i = mesesHaciaAtras - 1; i >= 0; i--) {
            const fecha = new Date(fechaReferencia);
            fecha.setMonth(fecha.getMonth() - i);
            
            const ano = fecha.getFullYear();
            const mes = fecha.getMonth() + 1;
            const mesFormateado = mes.toString().padStart(2, '0');
            const fechaLabel = `${ano}-${mesFormateado}`;
            
            fechasParaEjeX.push(fechaLabel);
            
            const url = `maps/data/salida/${indexType}/txt/${ano}_${mesFormateado}_indices.txt`;
            promesasFetch.push(
                fetch(url)
                    .then(response => response.ok ? response.text() : null)
                    .then(text => ({ ano, mes, fechaLabel, text }))
                    .catch(() => ({ ano, mes, fechaLabel, text: null }))
            );
        }

        const resultadosMensuales = await Promise.all(promesasFetch);

        // Procesar datos mensualmente
        const datosMensuales = {};
        resultadosMensuales.forEach(resultado => {
            if (resultado.text) {
                const valoresRegionales = getRegionalValuesFromFile(resultado.text, VALPARAISO_STATIONS);
                if (valoresRegionales) {
                    datosMensuales[resultado.fechaLabel] = valoresRegionales;
                }
            }
        });
        
        const datosParaSerie = [];
        fechasParaEjeX.forEach(fechaLabel => {
            const datosMes = datosMensuales[fechaLabel];
            if (datosMes && datosMes[escalaSeleccionada]) {
                const promedioMes = calculateAverage(datosMes[escalaSeleccionada]);
                if (promedioMes !== null && !isNaN(promedioMes)) {
                    datosParaSerie.push({
                        y: promedioMes,
                        name: fechaLabel,
                        fecha: fechaLabel // Mantener la fecha original para referencia
                    });
                } else {
                    datosParaSerie.push(null);
                }
            } else {
                datosParaSerie.push(null);
            }
        });
        
        const seriesFinales = [{
            name: `${indexType.toUpperCase()}-${escalaSeleccionada}`,
            data: datosParaSerie
        }];

        const periodoMostrado = fechasParaEjeX.length > 0 ? 
            `(${fechasParaEjeX[0]} a ${anoReferencia}-${mesReferencia})` : 
            `(Datos no disponibles)`;
        
        const nuevoTitulo = `${title} ${periodoMostrado}`;
        renderTimeSeriesChart(containerId, nuevoTitulo, fechasParaEjeX, seriesFinales);

    } catch (error) {
        console.error(`Error procesando ${indexType}:`, error);
        if (placeholder) placeholder.innerHTML = `<p style="color:red;">Error al procesar datos para ${title}.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Generar gráficos SPI para diferentes escalas temporales
    processAndRender('spi', 'container-spi-3', 'SPI-3 Región de Valparaíso', '3');
    processAndRender('spi', 'container-spi-9', 'SPI-9 Región de Valparaíso', '9');
    processAndRender('spi', 'container-spi-12', 'SPI-12 Región de Valparaíso', '12');
    processAndRender('spi', 'container-spi-24', 'SPI-24 Región de Valparaíso', '24');
    processAndRender('spi', 'container-spi-48', 'SPI-48 Región de Valparaíso', '48');
    
    // Generar gráficos SPEI para diferentes escalas temporales
    processAndRender('spei', 'container-spei-3', 'SPEI-3 Región de Valparaíso', '3');
    processAndRender('spei', 'container-spei-9', 'SPEI-9 Región de Valparaíso', '9');
    processAndRender('spei', 'container-spei-12', 'SPEI-12 Región de Valparaíso', '12');
    processAndRender('spei', 'container-spei-24', 'SPEI-24 Región de Valparaíso', '24');
    processAndRender('spei', 'container-spei-48', 'SPEI-48 Región de Valparaíso', '48');
});