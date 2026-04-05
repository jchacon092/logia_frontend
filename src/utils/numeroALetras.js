/**
 * Convierte un número entero o decimal a palabras en español.
 * Ej: 1200    → "UN MIL DOSCIENTOS QUETZALES EXACTOS"
 *     1200.50 → "UN MIL DOSCIENTOS QUETZALES CON 50 CENTAVOS"
 */

const UNIDADES = [
  '', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO',
  'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ',
  'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE',
  'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
];

const DECENAS = [
  '', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA',
  'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA',
];

const CENTENAS = [
  '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS',
  'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS',
];

function menorDeMil(n) {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  let resultado = '';

  const c = Math.floor(n / 100);
  const resto = n % 100;

  if (c > 0) resultado += CENTENAS[c] + (resto > 0 ? ' ' : '');

  if (resto < 20) {
    resultado += UNIDADES[resto];
  } else {
    const d = Math.floor(resto / 10);
    const u = resto % 10;
    if (resto >= 21 && resto <= 29) {
      resultado += 'VEINTI' + UNIDADES[u].toLowerCase();
      resultado = resultado.replace('veintiun', 'VEINTIÚN');
    } else {
      resultado += DECENAS[d] + (u > 0 ? ' Y ' + UNIDADES[u] : '');
    }
  }

  return resultado.trim();
}

function miles(n) {
  if (n === 0) return '';

  const millones = Math.floor(n / 1_000_000);
  const miles_   = Math.floor((n % 1_000_000) / 1_000);
  const resto    = n % 1_000;

  let resultado = '';

  if (millones === 1) {
    resultado += 'UN MILLÓN ';
  } else if (millones > 1) {
    resultado += menorDeMil(millones) + ' MILLONES ';
  }

  if (miles_ === 1) {
    resultado += 'MIL ';
  } else if (miles_ > 1) {
    resultado += menorDeMil(miles_) + ' MIL ';
  }

  if (resto > 0) {
    resultado += menorDeMil(resto);
  }

  return resultado.trim();
}

/**
 * @param {number} monto  Número positivo con hasta 2 decimales
 * @returns {string}       Ej: "UN MIL DOSCIENTOS QUETZALES EXACTOS"
 */
export function montoALetras(monto) {
  if (!Number.isFinite(monto) || monto < 0) return '';

  const entero    = Math.floor(monto);
  const centavos  = Math.round((monto - entero) * 100);

  const letrasEntero = entero === 0 ? 'CERO' : miles(entero);
  const sufijo = centavos > 0
    ? ` QUETZALES CON ${centavos} CENTAVO${centavos !== 1 ? 'S' : ''}`
    : ' QUETZALES EXACTOS';

  return letrasEntero + sufijo;
}

/**
 * Formatea un rango de fechas como texto legible para el recibo.
 * Ej: "2026-01-01" .. "2026-06-01" → "ENERO A JUNIO DE 2026"
 *     "2026-03-01" .. "2026-03-01" → "MARZO DE 2026"
 */
const MESES_ES = [
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE',
];

export function rangoMesesATexto(fechaInicio, fechaFin) {
  const ini = new Date(fechaInicio + 'T00:00:00');
  const fin = new Date(fechaFin   + 'T00:00:00');

  const mesIni  = MESES_ES[ini.getMonth()];
  const anioIni = ini.getFullYear();
  const mesFin  = MESES_ES[fin.getMonth()];
  const anioFin = fin.getFullYear();

  if (mesIni === mesFin && anioIni === anioFin) {
    return `${mesIni} DE ${anioIni}`;
  }
  if (anioIni === anioFin) {
    return `${mesIni} A ${mesFin} DE ${anioFin}`;
  }
  return `${mesIni} DE ${anioIni} A ${mesFin} DE ${anioFin}`;
}

/**
 * Formatea una fecha ISO como texto legible para el encabezado del recibo.
 * Ej: "2026-01-30" → "QUETZALTENANGO 30 DE ENERO DE 2026"
 */
export function fechaLarga(fechaISO) {
  const d = new Date(fechaISO + 'T00:00:00');
  return `QUETZALTENANGO ${d.getDate()} DE ${MESES_ES[d.getMonth()]} DE ${d.getFullYear()}`;
}
