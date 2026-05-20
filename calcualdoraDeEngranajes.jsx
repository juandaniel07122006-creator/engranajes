import React, { useState, useEffect, useRef } from 'react';
import { Settings2, Calculator, Info, RotateCcw, FileDown, Loader2 } from 'lucide-react';

export default function App() {
  // Estados para los parámetros de entrada
  const [teeth, setTeeth] = useState(24);
  const [pitch, setPitch] = useState(8);
  const [pressureAngle, setPressureAngle] = useState(20);
  const [isExporting, setIsExporting] = useState(false);

  // Referencia al elemento canvas para dibujar
  const canvasRef = useRef(null);

  // Cálculos de las dimensiones del engranaje
  const calculateGearParams = () => {
    const N = Number(teeth);
    const P = Number(pitch);
    
    const pitchDiameter = N / P; // Diámetro de Paso (D)
    const outsideDiameter = (N + 2) / P; // Diámetro Exterior (Do)
    const addendum = 1 / P; // Adendo (a)
    const dedendum = 1.25 / P; // Dedendo (b) - Asumiendo holgura estándar de 0.25/P
    const rootDiameter = pitchDiameter - (2 * dedendum); // Diámetro de Raíz (Dr)
    const baseDiameter = pitchDiameter * Math.cos(pressureAngle * (Math.PI / 180)); // Diámetro Base (Db)

    return {
      pitchDiameter: pitchDiameter.toFixed(4),
      outsideDiameter: outsideDiameter.toFixed(4),
      addendum: addendum.toFixed(4),
      dedendum: dedendum.toFixed(4),
      rootDiameter: rootDiameter.toFixed(4),
      baseDiameter: baseDiameter.toFixed(4),
      N,
      P
    };
  };

  const params = calculateGearParams();

  // Función para dibujar el engranaje en el canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);

    const N = params.N;
    const D = Number(params.pitchDiameter);
    const Do = Number(params.outsideDiameter);
    const Dr = Number(params.rootDiameter);

    // Radios
    const Ro = Do / 2; // Radio exterior
    const Rp = D / 2;  // Radio de paso
    const Rr = Dr / 2; // Radio de raíz

    // Escalar el dibujo para que quepa en el canvas dejando un margen de 30px
    const margin = 30;
    const scale = (Math.min(cx, cy) - margin) / Ro;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // 1. Dibujar el Diámetro de Paso (Pitch Circle) - Línea Punteada
    ctx.beginPath();
    ctx.arc(0, 0, Rp, 0, 2 * Math.PI);
    ctx.strokeStyle = '#9CA3AF'; // gris-400
    ctx.setLineDash([8 / scale, 6 / scale]); // Ajustar patrón de línea punteada a la escala
    ctx.lineWidth = 1.5 / scale;
    ctx.stroke();
    ctx.setLineDash([]); // Resetear patrón

    // 2. Dibujar el perfil del engranaje (Aproximación visual)
    ctx.beginPath();
    const step = (2 * Math.PI) / N; // Ángulo total por cada diente
    const toothAngle = Math.PI / N; // Ángulo del grosor del diente (aprox. la mitad)

    for (let i = 0; i < N; i++) {
      const theta = i * step;
      
      // Puntos clave angulares para aproximar la curva del diente
      const startRoot = theta - step/2 + toothAngle/4;
      const endRoot = theta - toothAngle/2;
      const startOuter = theta - toothAngle/5;
      const endOuter = theta + toothAngle/5;
      const nextRoot = theta + toothAngle/2;

      if (i === 0) {
        ctx.moveTo(Rr * Math.cos(startRoot), Rr * Math.sin(startRoot));
      }
      
      // Valle (Root)
      ctx.lineTo(Rr * Math.cos(endRoot), Rr * Math.sin(endRoot));
      // Flanco de subida (Aproximación de involuta)
      ctx.quadraticCurveTo(
        Rp * Math.cos(theta - toothAngle/3), Rp * Math.sin(theta - toothAngle/3),
        Ro * Math.cos(startOuter), Ro * Math.sin(startOuter)
      );
      // Cresta del diente (Top Land)
      ctx.lineTo(Ro * Math.cos(endOuter), Ro * Math.sin(endOuter));
      // Flanco de bajada
      ctx.quadraticCurveTo(
        Rp * Math.cos(theta + toothAngle/3), Rp * Math.sin(theta + toothAngle/3),
        Rr * Math.cos(nextRoot), Rr * Math.sin(nextRoot)
      );
    }
    
    ctx.closePath();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'; // blue-500 con opacidad
    ctx.fill();
    ctx.strokeStyle = '#2563EB'; // blue-600
    ctx.lineWidth = 2 / scale;
    ctx.stroke();

    // 3. Dibujar el eje central (Agujero)
    const shaftRadius = Rr * 0.25; // Tamaño arbitrario proporcional para el centro
    ctx.beginPath();
    ctx.arc(0, 0, shaftRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#4B5563'; // gris-600
    ctx.lineWidth = 2 / scale;
    ctx.stroke();

    // Dibujar una cuña (keyway) pequeña en el eje para realismo
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-shaftRadius*0.2, -shaftRadius - (shaftRadius*0.2), shaftRadius*0.4, shaftRadius*0.4);
    ctx.strokeRect(-shaftRadius*0.2, -shaftRadius - (shaftRadius*0.2), shaftRadius*0.4, shaftRadius*0.4);

    ctx.restore();
  }, [teeth, pitch, pressureAngle, params]);

  // Manejadores de cambios
  const handleTeethChange = (e) => setTeeth(Math.max(6, Math.min(200, e.target.value)));
  const handlePitchChange = (e) => setPitch(Math.max(1, Math.min(100, e.target.value)));

  const exportToPDF = () => {
    setIsExporting(true);
    
    // Esperamos a que React renderice la vista estática antes de capturar
    setTimeout(() => {
      const loadScript = () => {
        return new Promise((resolve) => {
          if (window.html2pdf) {
            resolve();
          } else {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
          }
        });
      };

      loadScript().then(() => {
        const element = document.getElementById('pdf-content');
        const opt = {
          margin:       10,
          filename:     `Engranaje_${teeth}D_${pitch}P.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        window.html2pdf().set(opt).from(element).save().then(() => {
          setIsExporting(false);
        }).catch(err => {
          console.error("Error generando PDF", err);
          setIsExporting(false);
        });
      });
    }, 500);
  };

  return (
    <div className={`min-h-screen bg-slate-50 p-4 md:p-8 font-sans ${isExporting ? 'bg-white p-0' : ''}`}>
      <div id="pdf-content" className={`max-w-6xl mx-auto space-y-6 ${isExporting ? 'p-8 space-y-4' : ''}`}>
        
        {/* Encabezado */}
        <header className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 ${isExporting ? 'border-none shadow-none p-0 mb-8' : ''}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
            <div className="flex items-center gap-3">
              <Settings2 className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
                Calculadora y Visor de Engranajes Rectos
              </h1>
            </div>
            {!isExporting && (
              <button 
                onClick={exportToPDF}
                disabled={isExporting}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                {isExporting ? 'Generando...' : 'Exportar a PDF'}
              </button>
            )}
          </div>
          {!isExporting && (
            <p className="text-slate-600 max-w-3xl">
              Diseñador interactivo basado en las fórmulas del sistema estándar imperial de Paso Diametral (Machinery's Handbook).
              Modifica los valores para ver los cálculos y la geometría actualizada en tiempo real.
            </p>
          )}
        </header>

        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${isExporting ? 'block space-y-8' : ''}`}>
          
          {/* Columna Izquierda: Controles y Resultados */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Tarjeta de Controles de Entrada */}
            <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 ${isExporting ? 'border-none shadow-none p-0' : ''}`}>
              {!isExporting && (
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-500" />
                  Parámetros de Entrada
                </h2>
              )}
              
              {/* Vista para impresión (texto estático) */}
              {isExporting && (
                <div className="grid grid-cols-3 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-xs text-slate-500">Dientes (N)</div>
                    <div className="text-lg font-bold text-slate-800">{teeth}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Paso (P)</div>
                    <div className="text-lg font-bold text-slate-800">{pitch}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Ángulo</div>
                    <div className="text-lg font-bold text-slate-800">{pressureAngle}°</div>
                  </div>
                </div>
              )}

              {/* Vista interactiva (oculta en impresión) */}
              {!isExporting && (
                <div className="space-y-5">
                  <div>
                    <label className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                      <span>Número de Dientes (N)</span>
                      <span className="text-blue-600 font-bold">{teeth}</span>
                    </label>
                    <input 
                      type="range" 
                      min="6" max="100" 
                      value={teeth} 
                      onChange={handleTeethChange}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>6</span><span>100</span>
                    </div>
                  </div>

                  <div>
                    <label className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                      <span>Paso Diametral (P) - <span className="font-normal italic text-slate-500">Diametral Pitch</span></span>
                      <span className="text-blue-600 font-bold">{pitch}</span>
                    </label>
                    <input 
                      type="range" 
                      min="2" max="48" step="1"
                      value={pitch} 
                      onChange={handlePitchChange}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>Grueso (2)</span><span>Fino (48)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Ángulo de Presión (ϕ)
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="pressureAngle" 
                          value="14.5" 
                          checked={pressureAngle === 14.5}
                          onChange={() => setPressureAngle(14.5)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">14.5°</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="pressureAngle" 
                          value="20" 
                          checked={pressureAngle === 20}
                          onChange={() => setPressureAngle(20)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">20° (Estándar)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tarjeta de Resultados (Cálculos) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-green-500" />
                Dimensiones Calculadas (Pulgadas)
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <ResultCard 
                  title="Diámetro de Paso" subtitle="Pitch Diameter (D)" 
                  formula="N / P" value={params.pitchDiameter} 
                />
                <ResultCard 
                  title="Diámetro Exterior" subtitle="Outside Diameter (Do)" 
                  formula="(N + 2) / P" value={params.outsideDiameter} 
                />
                <ResultCard 
                  title="Adendo" subtitle="Addendum (a)" 
                  formula="1 / P" value={params.addendum} 
                />
                <ResultCard 
                  title="Dedendo" subtitle="Dedendum (b)" 
                  formula="1.25 / P" value={params.dedendum} 
                />
                <ResultCard 
                  title="Diámetro de Raíz" subtitle="Root Diameter (Dr)" 
                  formula="D - 2b" value={params.rootDiameter} 
                />
                <ResultCard 
                  title="Diámetro Base" subtitle="Base Diameter (Db)" 
                  formula="D × cos(ϕ)" value={params.baseDiameter} 
                />
              </div>
            </div>

          </div>

          {/* Columna Derecha: Visor Canvas */}
          <div className={`lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full min-h-[500px] ${isExporting ? 'border-none shadow-none p-0 min-h-0 mt-6 block' : ''}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                {!isExporting && <RotateCcw className="w-5 h-5 text-indigo-500" />}
                Previsualización 2D
              </h2>
              
              {/* Leyenda Visual */}
              <div className={`flex gap-4 text-xs font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 ${isExporting ? 'border-none bg-transparent' : ''}`}>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-blue-600"></div> Exterior
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 border-t-2 border-dashed border-gray-400"></div> Paso
                </div>
              </div>
            </div>

            {/* Contenedor del Canvas */}
            <div className={`flex-1 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden relative ${isExporting ? 'border-none bg-white overflow-visible block' : ''}`}>
              <canvas 
                ref={canvasRef} 
                width={600} 
                height={600}
                className={`max-w-full max-h-full w-auto h-auto object-contain ${isExporting ? 'max-h-[500px]' : ''}`}
                style={{ width: '100%', height: '100%', maxHeight: '600px' }}
              />
            </div>
            {!isExporting && (
              <p className="text-xs text-slate-400 text-center mt-3">
                * El perfil del diente es una aproximación geométrica orientada a la visualización, basada en la curva de involuta.
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// Componente auxiliar para mostrar cada resultado
function ResultCard({ title, subtitle, formula, value }) {
  return (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
      <div className="text-xs text-slate-500 font-medium leading-tight mb-1">
        {title} <br/><span className="text-[10px] italic">{subtitle}</span>
      </div>
      <div className="text-lg font-bold text-slate-800 font-mono tracking-tight">{value}</div>
      <div className="text-[10px] text-slate-400 mt-1 bg-slate-100 inline-block px-1.5 rounded">
        Fórmula: {formula}
      </div>
    </div>
  );
}