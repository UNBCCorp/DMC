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

    // Mantener TODAS las fechas para preservar continuidad temporal
    const fechasConDatos = fechas;
    const seriesFiltradas = series.map(serie => {
        // Mantener todos los puntos, incluso los null, para preservar continuidad
        const datosCompletos = serie.data.map((point, index) => {
            if (point !== null && point.y !== null && !isNaN(point.y)) {
                return point;
            } else {
                // Retornar null para meses sin datos - Highcharts manejará la discontinuidad
                return null;
            }
        });
        return {
            ...serie,
            data: datosCompletos
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
        
        // Configurar zonas de colores para el área rellena - Coinciden con la barra indicadora
        serie.zones = [
            {
                value: -2.5,
                color: '#8B0000', // -3.0 a -2.5 - Rojo oscuro
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#8B0000'],
                        [1, 'rgba(139, 0, 0, 0.3)']
                    ]
                }
            },
            {
                value: -2,
                color: '#FF0000', // -2.5 a -2.0 - Rojo
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#FF0000'],
                        [1, 'rgba(255, 0, 0, 0.3)']
                    ]
                }
            },
            {
                value: -1.5,
                color: '#FF4500', // -2.0 a -1.5 - Rojo-naranja
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#FF4500'],
                        [1, 'rgba(255, 69, 0, 0.3)']
                    ]
                }
            },
            {
                value: -1,
                color: '#FF8C00', // -1.5 a -1.0 - Naranja oscuro
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#FF8C00'],
                        [1, 'rgba(255, 140, 0, 0.3)']
                    ]
                }
            },
            {
                value: -0.5,
                color: '#FFA500', // -1.0 a -0.5 - Naranja
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#FFA500'],
                        [1, 'rgba(255, 165, 0, 0.3)']
                    ]
                }
            },
            {
                value: 0,
                color: '#FFD700', // -0.5 a 0.0 - Dorado
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#FFD700'],
                        [1, 'rgba(255, 215, 0, 0.3)']
                    ]
                }
            },
            {
                value: 0.5,
                color: '#F5F5F5', // 0.0 a 0.5 - Gris muy claro (casi blanco)
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#F5F5F5'],
                        [1, 'rgba(245, 245, 245, 0.3)']
                    ]
                }
            },
            {
                value: 1,
                color: '#00FF00', // 0.5 a 1.0 - Verde
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#00FF00'],
                        [1, 'rgba(0, 255, 0, 0.3)']
                    ]
                }
            },
            {
                value: 1.5,
                color: '#00FF00', // 1.0 a 1.5 - Verde
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#00FF00'],
                        [1, 'rgba(0, 255, 0, 0.3)']
                    ]
                }
            },
            {
                value: 2,
                color: '#00CED1', // 1.5 a 2.0 - Turquesa
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#00CED1'],
                        [1, 'rgba(0, 206, 209, 0.3)']
                    ]
                }
            },
            {
                value: 2.5,
                color: '#0000FF', // 2.0 a 2.5 - Azul
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#0000FF'],
                        [1, 'rgba(0, 0, 255, 0.3)']
                    ]
                }
            },
            {
                value: 3,
                color: '#4169E1', // 2.5 a 3.0 - Azul real
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#4169E1'],
                        [1, 'rgba(65, 105, 225, 0.3)']
                    ]
                }
            },
            {
                color: '#8A2BE2', // > 3.0 - Violeta
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#8A2BE2'],
                        [1, 'rgba(138, 43, 226, 0.3)']
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

    // Crear categorías del eje X con nombres completos de meses
    const categoriasEjeX = fechasConDatos.map(fecha => {
        const [ano, mes] = fecha.split('-');
        const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                             'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const nombreMesCompleto = nombresMeses[parseInt(mes) - 1];
        
        // Usar nombres completos tanto para el eje X como para el tooltip
        return {
            corto: `${nombreMesCompleto} ${ano}`,
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
            // Para historial completo, siempre usar scroll horizontal
            scrollablePlotArea: {
                minWidth: Math.max(1200, categoriasEjeX.length * 25), // Puntos más cercanos entre sí
                scrollPositionX: 1 // Empezar al final (datos más recientes)
            }
        },
        title: { text: title },
        xAxis: { 
            categories: categoriasEjeX.map(cat => cat.corto), 
            crosshair: true, 
            offset: 10,
            labels: {
                rotation: -45, // Rotar para mejor legibilidad
                step: 1, // Mostrar TODAS las etiquetas mensuales consecutivas
                style: {
                    fontSize: '8px' // Texto más pequeño para que quepan todas
                }
            },
            tickInterval: 1
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
                connectNulls: false, // No conectar valores null - mostrar discontinuidad
                fillOpacity: 0.6,
                threshold: 0, // Línea base en 0 para el relleno
                allowPointSelect: false,
                gapSize: 0 // No crear gaps automáticos
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
        // Buscar todos los archivos disponibles en el historial completo
        // Empezamos desde enero 2019 hasta la fecha más reciente disponible
        const fechaInicio = new Date(2019, 0, 1); // Enero 2019
        const fechaFin = new Date(); // Fecha actual
        
        const fechasParaEjeX = [];
        const promesasFetch = [];
        
        // Generar todas las fechas desde el inicio hasta el final
        const fechaActual = new Date(fechaInicio);
        while (fechaActual <= fechaFin) {
            const ano = fechaActual.getFullYear();
            const mes = fechaActual.getMonth() + 1;
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
            
            // Avanzar al siguiente mes
            fechaActual.setMonth(fechaActual.getMonth() + 1);
        }

        console.log(`Buscando historial completo para ${indexType.toUpperCase()}-${escalaSeleccionada}: ${fechasParaEjeX.length} archivos`);
        
        const resultadosMensuales = await Promise.all(promesasFetch);

        // Procesar datos mensualmente - usar solo la columna específica de la escala
        const datosMensuales = {};
        let archivosEncontrados = 0;
        
        resultadosMensuales.forEach(resultado => {
            if (resultado.text) {
                archivosEncontrados++;
                const valoresRegionales = getRegionalValuesFromFile(resultado.text, VALPARAISO_STATIONS);
                if (valoresRegionales && valoresRegionales[escalaSeleccionada]) {
                    datosMensuales[resultado.fechaLabel] = valoresRegionales[escalaSeleccionada];
                }
            }
        });
        
        console.log(`Archivos encontrados: ${archivosEncontrados} de ${fechasParaEjeX.length}`);
        
        // Crear serie de datos con todo el historial disponible
        const datosParaSerie = [];
        const fechasConDatos = [];
        
        fechasParaEjeX.forEach(fechaLabel => {
            const valoresEscala = datosMensuales[fechaLabel];
            if (valoresEscala && valoresEscala.length > 0) {
                const promedioMes = calculateAverage(valoresEscala);
                if (promedioMes !== null && !isNaN(promedioMes)) {
                    datosParaSerie.push({
                        y: promedioMes,
                        name: fechaLabel,
                        fecha: fechaLabel
                    });
                    fechasConDatos.push(fechaLabel);
                } else {
                    datosParaSerie.push(null);
                    fechasConDatos.push(fechaLabel);
                }
            } else {
                datosParaSerie.push(null);
                fechasConDatos.push(fechaLabel);
            }
        });
        
        // NO filtrar datos nulos - mantener TODA la serie temporal para continuidad
        // Verificar que al menos tengamos algunos datos
        const datosValidos = datosParaSerie.filter(dato => dato !== null);
        if (datosValidos.length === 0) {
            throw new Error(`No se encontraron datos para ${indexType.toUpperCase()}-${escalaSeleccionada}`);
        }
        
        // Usar TODOS los datos y fechas sin filtrar
        const datosLimpios = datosParaSerie;
        const fechasLimpias = fechasConDatos;
        
        const seriesFinales = [{
            name: `${indexType.toUpperCase()}-${escalaSeleccionada} (Promedio Regional)`,
            data: datosLimpios
        }];

        const periodoMostrado = fechasLimpias.length > 0 ? 
            `${fechasLimpias[0]} a ${fechasLimpias[fechasLimpias.length - 1]}` : 
            `Datos no disponibles`;
        
        const nuevoTitulo = `${title} - Período: ${periodoMostrado}`;
        
        console.log(`Renderizando ${indexType.toUpperCase()}-${escalaSeleccionada}: ${datosLimpios.filter(d => d !== null).length} puntos de datos`);
        
        renderTimeSeriesChart(containerId, nuevoTitulo, fechasLimpias, seriesFinales);

    } catch (error) {
        console.error(`Error procesando ${indexType}:`, error);
        if (placeholder) placeholder.innerHTML = `<p style="color:red;">Error al procesar datos para ${title}: ${error.message}</p>`;
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