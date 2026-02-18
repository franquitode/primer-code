const os = require('os');
const fs = require('fs');

// Obtener información del sistema
const sistemaOperativo = os.type();
const arquitectura = os.arch();
const memoriaLibreBytes = os.freemem();
const memoriaLibreGB = (memoriaLibreBytes / 1024 / 1024 / 1024).toFixed(2);

// Obtener fecha y hora actual
const fechaHora = new Date().toLocaleString();

// Construir el mensaje de log
const logMensaje = `[${fechaHora}] SO: ${sistemaOperativo} | CPU: ${arquitectura} | RAM Libre: ${memoriaLibreGB} GB\n`;

// Mostrar en consola (opcional, para feedback inmediato)
console.log('Guardando la siguiente información:');
console.log(logMensaje.trim());

// Agregar al archivo log_sistema.txt (crea el archivo si no existe)
fs.appendFile('log_sistema.txt', logMensaje, (err) => {
    if (err) {
        console.error('Error al escribir en el archivo:', err);
    } else {
        console.log('Información guardada exitosamente en log_sistema.txt');
    }
});
