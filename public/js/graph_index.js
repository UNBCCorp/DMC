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

function renderTimeSeriesChart(containerId, title, years, series) {
    const placeholder = document.querySelector(`#${containerId} .loading-placeholder`);

    const yAxes = series.map((serie, index) => ({
        title: { text: serie.name, style: { color: '#333' } },
        top: `${index * 20}%`,
        height: '16%',
        offset: 0,
        min: -3,
        max: 3,
        tickInterval: 1,
        labels: { align: 'right', x: -5 },
        plotLines: [{ color: '#888', width: 1.5, value: 0, zIndex: 3 }]
    }));

 const colorZones = [
        { value: -3.0, color: '#8B4513' },
        { value: 0, color: '#E6C9A8' },
        { value: 3.0, color: '#B0E0E6' },
        { color: '#20B2AA' }
    ];
    series.forEach((serie, index) => {
        serie.yAxis = index;
        serie.zones = colorZones;
        serie.zoneAxis = 'y';
        
        serie.data.forEach(point => {
            if (point && point.isIncomplete) {
                point.color = '#cccccc';
                point.borderColor = '#999999';
            }
        });
    });

    Highcharts.chart(containerId, {
        chart: { type: 'column', zoomType: 'x', marginLeft: 80, alignTicks: false },
        title: { text: title },
        xAxis: { categories: years, crosshair: true, offset: 10 },
        yAxis: yAxes,
        tooltip: {
            shared: true,
            split: false,
            formatter: function () {
                let s = `<b>${this.x}</b><br/>`;
                this.points.forEach(point => {
                    const incompleteLabel = point.point.isIncomplete ? ' (Año Incompleto)' : '';
                    s += `<span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>${point.y.toFixed(2)}</b>${incompleteLabel}<br/>`;
                });
                return s;
            }
        },
        legend: { enabled: false },
                plotOptions: {
        area: {
            pointStart: 1940,
            marker: {
                enabled: false,
                symbol: 'circle',
                radius: 2,
                states: {
                hover: {
                    enabled: true
                }
                }
            }
            }
        },

        series: series,
        credits: { enabled: true, text: 'DMC' }
    });

    if (placeholder) placeholder.style.display = 'none';
}

async function processAndRender(indexType, containerId, title) {
    const placeholder = document.querySelector(`#${containerId} .loading-placeholder`);
    try {
        const anoInicio = 2019;
        const anoActual = new Date().getFullYear();
        const anosParaEjeX = [];
        
        const promesasFetch = [];

        for (let ano = anoInicio; ano <= anoActual; ano++) {
            anosParaEjeX.push(ano.toString());
            for (let mes = 1; mes <= 12; mes++) {
                if (ano === anoActual && mes > (new Date().getMonth() + 1)) {
                    continue;
                }
                const mesFormateado = mes.toString().padStart(2, '0');
                const url = `maps/data/salida/${indexType}/txt/${ano}_${mesFormateado}_indices.txt`;
                promesasFetch.push(
                    fetch(url)
                        .then(response => response.ok ? response.text() : null)
                        .then(text => ({ ano, mes, text }))
                        .catch(() => ({ ano, mes, text: null }))
                );
            }
        }

        const resultadosMensuales = await Promise.all(promesasFetch);

        const datosPorAno = {};
        resultadosMensuales.forEach(resultado => {
            if (resultado.text) {
                if (!datosPorAno[resultado.ano]) {
                    datosPorAno[resultado.ano] = { mesesEncontrados: 0, valores: {} };
                }
                const valoresRegionales = getRegionalValuesFromFile(resultado.text, VALPARAISO_STATIONS);
                if (valoresRegionales) {
                    datosPorAno[resultado.ano].mesesEncontrados++;
                    for (const escala in valoresRegionales) {
                        if (!datosPorAno[resultado.ano].valores[escala]) {
                            datosPorAno[resultado.ano].valores[escala] = [];
                        }
                        const promedioMes = calculateAverage(valoresRegionales[escala]);
                        if (promedioMes !== null) {
                            datosPorAno[resultado.ano].valores[escala].push(promedioMes);
                        }
                    }
                }
            }
        });

        const escalas = ['3', '9', '12', '24', '48'];
        const seriesFinales = escalas.map(escala => ({
            name: `${indexType.toUpperCase()}-${escala}`,
            data: anosParaEjeX.map(anoStr => {
                const ano = parseInt(anoStr, 10);
                const datosAnuales = datosPorAno[ano];

                if (datosAnuales && datosAnuales.valores[escala]) {
                    const promedioFinal = calculateAverage(datosAnuales.valores[escala]);
                    return {
                        y: promedioFinal,
                        isIncomplete: (datosAnuales.mesesEncontrados < 12) && (ano !== anoActual)
                    };
                }
                return null;
            })
        }));

        const nuevoTitulo = `${title.split('-')[0].trim()} - (${anoInicio} - ${anoActual})`;
        renderTimeSeriesChart(containerId, nuevoTitulo, anosParaEjeX, seriesFinales);

    } catch (error) {
        console.error(`Error procesando ${indexType}:`, error);
        if (placeholder) placeholder.innerHTML = `<p style="color:red;">Error al procesar datos para ${title}.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    processAndRender('spi', 'container-spi', 'SPI Promedio - Región de Valparaíso');
    processAndRender('spei', 'container-spei', 'SPEI Promedio - Región de Valparaíso');
});