
Highcharts.setOptions({
    colors: ['#20B2AA', '#8B4513', '#7798BF', '#55BF3B', '#DF5353', '#DDDF0D', '#aaeeee', '#ff0066'],

    chart: {
        backgroundColor: '#FFFFFF',
        style: {
            fontFamily: 'Arial, sans-serif'
        }
    },

    title: {
        style: {
            color: '#333333',
            fontSize: '16px',
            fontWeight: 'bold'
        }
    },

    subtitle: {
        style: {
            color: '#666666'
        }
    },

    xAxis: {
        gridLineColor: '#E0E0E0',
        lineColor: '#C0D0E0',
        tickColor: '#C0D0E0',
        labels: {
            style: {
                color: '#666'
            }
        },
        title: {
            style: {
                color: '#666',
                fontWeight: 'bold'
            }
        }
    },
    yAxis: {
        gridLineColor: '#E0E0E0',
        lineColor: '#C0D0E0',
        tickColor: '#C0D0E0',
        labels: {
            style: {
                color: '#666'
            }
        },
        title: {
            style: {
                color: '#666',
                fontWeight: 'bold'
            }
        }
    },

    tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderColor: '#C0C0C0',
        style: {
            color: '#333333'
        }
    },

    legend: {
        itemStyle: {
            color: '#333333'
        },
        itemHoverStyle: {
            color: '#000000'
        },
        itemHiddenStyle: {
            color: '#CCCCCC'
        }
    },

    credits: {
        style: {
            color: '#666'
        }
    },

    plotOptions: {
        series: {
            animation: true 
        },
        line: {
            lineWidth: 2,
            marker: {
                enabled: false,
                radius: 3
            },
            states: {
                hover: {
                    lineWidth: 3
                }
            }
        },
        areaspline: {
            lineWidth: 3,
            marker: {
                enabled: false
            },
            shadow: false,
            states: {
                hover: {
                    lineWidth: 4
                }
            }
        },
        area: {
            lineWidth: 2,
            marker: {
                enabled: false
            },
            states: {
                hover: {
                    lineWidth: 3
                }
            }
        },
        column: {
            borderColor: '#FFFFFF',
            borderWidth: 1
        }
    }
});