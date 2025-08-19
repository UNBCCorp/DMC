
function abrirPDF(url) {
    window.open(url, '_blank');
}

document.addEventListener('DOMContentLoaded', function() {

    const botonSPI = document.getElementById('descargar-spi-pdf');
    if (botonSPI) {
        botonSPI.addEventListener('click', function() {
            abrirPDF('/pdf/FICHAS_INDICES_SPI.pdf');
        });
    }

    const botonSPEI = document.getElementById('descargar-spei-pdf');
    if (botonSPEI) {
        botonSPEI.addEventListener('click', function() {
            abrirPDF('/pdf/FICHAS_INDICES_SPEI.pdf');
        });
    }

});