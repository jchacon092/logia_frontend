import { useState, useEffect, useMemo } from 'react';
import { getMiembros } from '../api/miembros_admin';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  WidthType,
  VerticalAlign,
  ImageRun,
  HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom,
  TextWrappingType,
} from 'docx';

// Ajusta estas rutas según dónde guardes las imágenes en tu proyecto
import logoLogia from '../assets/logo-logia.jpeg';
import columnaLogia from '../assets/columna.png';
import selloTesoreria from '../assets/sello-tesoreria-limpio.png';

const MESES_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

const MESES_LARGO = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const GRADO_MAP = {
  AP: 'A.´. M.´.',
  AM: 'A.´. M.´.',
  CF: 'C.´. F.´.',
  CM: 'C.´. M.´.',
  MM: 'M.´. M.´.',
};

const fmtGrado = (g) => GRADO_MAP[g] || g || '';
const pxToEmu = (px) => Math.round(px * 9525);

const imageToUint8 = async (src) => {
  const response = await fetch(src);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
};

const borderBlack = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
const borderThin = { style: BorderStyle.SINGLE, size: 3, color: '000000' };
const borderNone = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

const noBorders = {
  top: borderNone,
  bottom: borderNone,
  left: borderNone,
  right: borderNone,
};

const allBorders = {
  top: borderBlack,
  bottom: borderBlack,
  left: borderBlack,
  right: borderBlack,
};

const tableBorders = {
  top: borderThin,
  bottom: borderThin,
  left: borderThin,
  right: borderThin,
};

const p = (text = '', opts = {}) => new Paragraph({
  alignment: opts.center ? AlignmentType.CENTER : (opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT),
  spacing: {
    before: opts.before ?? 0,
    after: opts.after ?? 80,
    line: opts.line ?? 240,
  },
  children: [
    new TextRun({
      text,
      bold: !!opts.bold,
      size: opts.size ?? 22,
      font: opts.font ?? 'Arial',
      color: opts.color ?? '000000',
    }),
  ],
});

const emptyCellParagraph = new Paragraph({ spacing: { before: 0, after: 0, line: 220 } });

const mkCell = (text, width, opts = {}) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  margins: { top: 40, bottom: 40, left: 90, right: 90 },
  borders: opts.noBorder ? noBorders : tableBorders,
  verticalAlign: VerticalAlign.CENTER,
  children: text === '' && !opts.forceParagraph
    ? [emptyCellParagraph]
    : [new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { before: 0, after: 0, line: 220 },
        children: [
          new TextRun({
            text,
            bold: !!opts.bold,
            size: opts.size ?? 22,
            font: 'Arial',
          }),
        ],
      })],
});

const buildRows = (items, isHonorarios = false) => items.map((m, index) => new TableRow({
  children: [
    mkCell(String(index + 1).padStart(isHonorarios ? 1 : 2, '0'), 650, { center: true }),
    mkCell(m.nombre_completo || m.nombreCompleto || '', isHonorarios ? 5250 : 5100),
    mkCell(fmtGrado(m.grado), 1400, { center: true }),
    mkCell(isHonorarios ? '' : (m.observacion || ''), isHonorarios ? 1900 : 2050),
  ],
}));

const buildBlankRows = (count, isHonorarios = false) => Array.from({ length: count }, () => new TableRow({
  children: [
    mkCell('', 650, { center: true }),
    mkCell('', isHonorarios ? 5250 : 5100),
    mkCell('', 1400, { center: true }),
    mkCell('', isHonorarios ? 1900 : 2050),
  ],
}));

const buildHeaderTable = (logoBuffer) => new Table({
  width: { size: 9300, type: WidthType.DXA },
  alignment: AlignmentType.CENTER,
  rows: [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 1750, type: WidthType.DXA },
          borders: noBorders,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0 },
              children: [
                new ImageRun({
                  data: logoBuffer,
                  type: 'jpg',
                  transformation: { width: 95, height: 108 },
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 7550, type: WidthType.DXA },
          borders: allBorders,
          margins: { top: 110, bottom: 110, left: 120, right: 120 },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            p('A.´. L.´. G.´. D.´. G.´. A.´. D.´. U.´.', { center: true, bold: true, size: 28, after: 40 }),
            p('Resp.´. Log.´. Simb.´. “Silencio No. 29”', { center: true, bold: true, size: 32, after: 20 }),
            p('R.´. E.´. A.´. y A.´.', { center: true, bold: true, size: 28, after: 0 }),
          ],
        }),
      ],
    }),
  ],
});

const buildMainTable = (activos) => new Table({
  width: { size: 9200, type: WidthType.DXA },
  alignment: AlignmentType.CENTER,
  columnWidths: [650, 5100, 1400, 2050],
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        mkCell('NO.', 650, { center: true, bold: true, size: 24 }),
        mkCell('NOMBRE', 5100, { center: true, bold: true, size: 24 }),
        mkCell('GRADO', 1400, { center: true, bold: true, size: 24 }),
        mkCell('OBSERVACIONES', 2050, { center: true, bold: true, size: 24 }),
      ],
    }),
    ...buildRows(activos, false),
    ...buildBlankRows(Math.max(4, 22 - activos.length), false),
  ],
});

const buildHonorariosTable = (honorarios) => new Table({
  width: { size: 9200, type: WidthType.DXA },
  alignment: AlignmentType.CENTER,
  columnWidths: [650, 5250, 1400, 1900],
  rows: [
    ...buildRows(honorarios, true),
    ...buildBlankRows(Math.max(2, 5 - honorarios.length), true),
  ],
});

const buildRedLine = () => new Table({
  width: { size: 9200, type: WidthType.DXA },
  alignment: AlignmentType.CENTER,
  rows: [
    new TableRow({
      children: [
        new TableCell({
          borders: {
            top: { style: BorderStyle.SINGLE, size: 14, color: '7B1E1E' },
            bottom: borderNone,
            left: borderNone,
            right: borderNone,
          },
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          children: [new Paragraph({ spacing: { before: 0, after: 0 } })],
        }),
      ],
    }),
  ],
});

async function generarDocx({
  activos = [],
  honorarios = [],
  mes,
  anio,
  nombreTesorero = 'M.´. M.´. Julio Cesar Echeverria',
}) {
  const mesLabel = MESES_ES[(mes || 1) - 1] || 'ENERO';
  const mesLargo = MESES_LARGO[(mes || 1) - 1] || 'enero';

  const [logoBuffer, columnaBuffer, selloBuffer] = await Promise.all([
    imageToUint8(logoLogia),
    imageToUint8(columnaLogia),
    imageToUint8(selloTesoreria),
  ]);

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            width: 11906,
            height: 16838,
          },
          margin: {
            top: 700,
            right: 850,
            bottom: 700,
            left: 850,
          },
        },
      },
      children: [
        new Paragraph({
          spacing: { before: 0, after: 0 },
          children: [
            new ImageRun({
              data: columnaBuffer,
              type: 'png',
              transformation: { width: 85, height: 470 },
              floating: {
                behindDocument: true,
                allowOverlap: true,
                zIndex: 0,
                horizontalPosition: {
                  relative: HorizontalPositionRelativeFrom.PAGE,
                  offset: pxToEmu(18),
                },
                verticalPosition: {
                  relative: VerticalPositionRelativeFrom.PAGE,
                  offset: pxToEmu(180),
                },
                wrap: {
                  type: TextWrappingType.NONE,
                },
              },
            }),
          ],
        }),

        buildHeaderTable(logoBuffer),
        p('', { after: 70 }),
        p('S.´. F.´. U.´.', { center: true, bold: true, size: 26, after: 70 }),
        p(`CUADRO DE QQ.´. HH.´. ACTIVOS A ${mesLabel} ${anio}`, { center: true, bold: true, size: 34, after: 170 }),
        buildMainTable(activos),
        p('', { after: 120 }),
        p('QQ.´. HH.´. HONORARIOS', { center: true, bold: true, size: 24, after: 80 }),
        buildHonorariosTable(honorarios),
        p(`Or.´. de Quetzaltenango, 18 de ${mesLargo} de ${anio} e.´. v.´.`, { center: true, size: 22, after: 80 }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 40 },
          children: [
            new ImageRun({
              data: selloBuffer,
              type: 'png',
              transformation: { width: 150, height: 110 },
            }),
          ],
        }),
        p(nombreTesorero || 'M.´. M.´. [Nombre del Tesorero]', { center: true, size: 24, after: 10 }),
        p('Of.´. Tes.´.', { center: true, size: 24, after: 80 }),
        buildRedLine(),
        p('Diagonal 3, 25-90 zona 3', { center: true, size: 22, after: 0 }),
        p('Quetzaltenango', { center: true, size: 22, after: 20 }),
        p('Página 1', { right: true, size: 22, after: 0 }),
      ],
    }],
  });

  return Packer.toBlob(doc);
}

export default function CuadroActivos() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [nombreTesorero, setNombreTesorero] = useState('');
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selActivos, setSelActivos] = useState(new Set());
  const [selHonorarios, setSelHonorarios] = useState(new Set());
  const [observaciones, setObservaciones] = useState({});
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    getMiembros({ all: true, estado: 'activo' })
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
        setMiembros(data);
        setSelActivos(new Set(data.filter((m) => m.estado === 'activo').map((m) => m.id)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activos = useMemo(() => miembros.filter((m) => selActivos.has(m.id)), [miembros, selActivos]);
  const honorarios = useMemo(() => miembros.filter((m) => selHonorarios.has(m.id)), [miembros, selHonorarios]);

  const toggleActivo = (id) => {
    setSelActivos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    setSelHonorarios((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleHonorario = (id) => {
    setSelHonorarios((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    setSelActivos((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleDescargar = async () => {
    setGenerando(true);
    try {
      const activosData = activos.map((m) => ({
        ...m,
        observacion: observaciones[m.id] || '',
      }));

      const blob = await generarDocx({
        activos: activosData,
        honorarios,
        mes,
        anio,
        nombreTesorero,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cuadro_activos_${MESES_ES[mes - 1].toLowerCase()}_${anio}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(`Error al generar el documento: ${e.message}`);
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        <h2 className="fw-semibold mb-0 me-auto">📋 Cuadro de Activos — Gran Logia</h2>
        <button className="btn btn-dark" onClick={handleDescargar} disabled={generando || activos.length === 0}>
          {generando ? '⏳ Generando…' : '⬇️ Descargar Word'}
        </button>
      </div>

      <div className="card mb-3">
        <div className="card-header fw-semibold">Configuración</div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-6 col-md-3">
              <label className="form-label small">Mes</label>
              <select className="form-select" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
                {MESES_ES.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div className="col-6 col-md-2">
              <label className="form-label small">Año</label>
              <input
                className="form-control"
                type="number"
                min="2000"
                max="2999"
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
              />
            </div>

            <div className="col-12 col-md-5">
              <label className="form-label small">Nombre del Oficial Tesorero (para la firma)</label>
              <input
                className="form-control"
                placeholder="M.´. M.´. Nombre Apellido"
                value={nombreTesorero}
                onChange={(e) => setNombreTesorero(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span className="fw-semibold">Hermanos</span>
              <div className="d-flex gap-3 small text-muted">
                <span>✅ Activos: <b>{activos.length}</b></span>
                <span>🎖️ Honorarios: <b>{honorarios.length}</b></span>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 40 }} title="Activo">Act.</th>
                    <th style={{ width: 40 }} title="Honorario">Hon.</th>
                    <th>Nombre</th>
                    <th style={{ width: 70 }}>Grado</th>
                    <th>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-3">Cargando…</td>
                    </tr>
                  )}

                  {!loading && miembros.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-3">Sin miembros</td>
                    </tr>
                  )}

                  {miembros.map((m) => (
                    <tr key={m.id} className={!selActivos.has(m.id) && !selHonorarios.has(m.id) ? 'text-muted' : ''}>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selActivos.has(m.id)}
                          onChange={() => toggleActivo(m.id)}
                        />
                      </td>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selHonorarios.has(m.id)}
                          onChange={() => toggleHonorario(m.id)}
                        />
                      </td>
                      <td>{m.nombre_completo}</td>
                      <td><span className="badge bg-dark">{m.grado || '—'}</span></td>
                      <td>
                        {selActivos.has(m.id) && (
                          <input
                            className="form-control form-control-sm"
                            placeholder="Observación…"
                            value={observaciones[m.id] || ''}
                            onChange={(e) => setObservaciones((prev) => ({ ...prev, [m.id]: e.target.value }))}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="card mb-3">
            <div className="card-header fw-semibold small">Vista previa — Activos ({activos.length})</div>
            <ul className="list-group list-group-flush">
              {activos.length === 0 && <li className="list-group-item text-muted small">Ninguno</li>}
              {activos.map((m, i) => (
                <li key={m.id} className="list-group-item py-1 d-flex gap-2 align-items-center">
                  <span className="text-muted small" style={{ width: 22 }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="small flex-grow-1">{m.nombre_completo}</span>
                  <span className="badge bg-dark" style={{ fontSize: 10 }}>{fmtGrado(m.grado)}</span>
                </li>
              ))}
            </ul>
          </div>

          {honorarios.length > 0 && (
            <div className="card">
              <div className="card-header fw-semibold small">Honorarios ({honorarios.length})</div>
              <ul className="list-group list-group-flush">
                {honorarios.map((m, i) => (
                  <li key={m.id} className="list-group-item py-1 d-flex gap-2 align-items-center">
                    <span className="text-muted small" style={{ width: 22 }}>{i + 1}</span>
                    <span className="small flex-grow-1">{m.nombre_completo}</span>
                    <span className="badge bg-dark" style={{ fontSize: 10 }}>{fmtGrado(m.grado)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
