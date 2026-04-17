import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, RotateCcw, Settings2, Info, MoveLeft, MoveRight, Activity } from 'lucide-react';

interface WaveParams {
  amplitude: number; // in meters
  frequency: number; // in Hz
  wavelength: number; // in meters
  direction: 'left' | 'right';
}

export default function WaveSimulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const utCanvasRef = useRef<HTMLCanvasElement>(null);
  const [params, setParams] = useState<WaveParams>({
    amplitude: 0.5,
    frequency: 1,
    wavelength: 2,
    direction: 'left',
  });
  const [isPlaying, setIsPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(0);

  // Conversion factor: 1 meter = 100 pixels
  const M_TO_PX = 100;

  const animate = (t: number) => {
    if (lastTimeRef.current !== undefined && isPlaying) {
      const deltaTime = (t - lastTimeRef.current) / 1000;
      setTime((prev) => prev + deltaTime);
    }
    lastTimeRef.current = t;
    draw();
    drawUt();
    requestRef.current = requestAnimationFrame(animate);
  };

  // Reset time when parameters change to align formula with simulation
  useEffect(() => {
    setTime(0);
  }, [params]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const centerX = width / 2;

    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw x-axis with markings in METERS
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '10px font-mono';
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    for (let x = 0; x <= width; x += M_TO_PX) {
      ctx.beginPath();
      ctx.moveTo(x, centerY - 5);
      ctx.lineTo(x, centerY + 5);
      ctx.stroke();
      ctx.font = 'bold 14px font-mono';
      ctx.fillText(`${(x / M_TO_PX).toFixed(1)}m`, x + 2, centerY + 22);
    }

    // Draw rope (always present across the entire width)
    const { amplitude, frequency, wavelength, direction } = params;
    const sign = direction === 'left' ? 1 : -1;
    
    // Wave speed v = f * lambda
    const velocity = frequency * wavelength;
    const reachedDistance_m = velocity * time;

    const points: { x: number, y: number }[] = [];
    for (let x_px = 0; x_px <= width; x_px += 2) {
      const x_m = x_px / M_TO_PX;
      let isReached = false;
      if (direction === 'right') {
        isReached = x_m <= reachedDistance_m;
      } else {
        const canvasWidth_m = width / M_TO_PX;
        isReached = x_m >= (canvasWidth_m - reachedDistance_m);
      }

      let y_m = 0;
      if (isReached) {
        // EXACT alignment with displayed formula: u(x,t) = A * sin(2pi*f*t +/- 2pi*x/lambda)
        const phase = 2 * Math.PI * frequency * time + sign * (2 * Math.PI * x_m) / wavelength;
        y_m = amplitude * Math.sin(phase);
      }
      
      const y_px = centerY - y_m * M_TO_PX;
      points.push({ x: x_px, y: y_px });
    }

    // 1. Draw Rope Shadow/Body
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Deep shadow under the rope
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 18;
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y + 2);
      else ctx.lineTo(p.x, p.y + 2);
    });
    ctx.stroke();

    // Main rope beige body
    ctx.beginPath();
    ctx.strokeStyle = '#d2b48c'; // Tan/Beige
    ctx.lineWidth = 14;
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // 2. Add Twist Texture
    for (let i = 0; i < points.length; i += 6) {
      const p = points[i];
      if (i + 6 < points.length) {
        const p2 = points[i + 6];
        const angle = Math.atan2(p2.y - p.y, p2.x - p.x);
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);
        
        // Dark diagonal "thread" lines for the twisted look
        ctx.strokeStyle = 'rgba(60, 40, 20, 0.5)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-3, -7);
        ctx.lineTo(3, 7);
        ctx.stroke();

        // Subtle highlights on the twist 
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4, 2);
        ctx.stroke();
        
        ctx.restore();
      }
    }

    // Draw the red point in the middle (x = 4.0m)
    const midX_m = centerX / M_TO_PX;
    const canvasWidth_m = width / M_TO_PX;
    const isMidReached = direction === 'right' ? midX_m <= reachedDistance_m : midX_m >= (canvasWidth_m - reachedDistance_m);

    if (isMidReached) {
      const midPhase = 2 * Math.PI * frequency * time + sign * (2 * Math.PI * midX_m) / wavelength;
      const midY_m = amplitude * Math.sin(midPhase);
      const midY_px = centerY - midY_m * M_TO_PX;
      
      ctx.fillStyle = '#ff4444';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff4444';
      ctx.beginPath();
      ctx.arc(centerX, midY_px, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Displacement value readout when paused
      if (!isPlaying) {
        ctx.save();
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 16px font-mono';
        ctx.textAlign = 'center';
        ctx.fillText(`u = ${midY_m.toFixed(3)}m`, centerX, midY_px - 20);
        
        // Horizontal reference line to the y-axis (optional but helpful)
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(255, 68, 68, 0.3)';
        ctx.beginPath();
        ctx.moveTo(centerX, midY_px);
        ctx.lineTo(0, midY_px);
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  const drawUt = () => {
    const canvas = utCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const centerX = width / 2;

    ctx.clearRect(0, 0, width, height);

    const { amplitude, frequency, wavelength, direction } = params;
    const sign = direction === 'left' ? 1 : -1;
    const midX_m = (800 / 2) / M_TO_PX;

    // Time window: show current time in the middle, window of 4 seconds
    const timeWindow = 4;
    const startTime = time - timeWindow / 2;
    const endTime = time + timeWindow / 2;

    // Wave speed v = f * lambda
    const velocity = frequency * wavelength;
    const canvasWidth_m = 800 / M_TO_PX;
    const distToMid_m = direction === 'right' ? midX_m : (canvasWidth_m - midX_m);
    const timeToReachMid = distToMid_m / velocity;

    // Draw grid/axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Draw time markings
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let t_tick = Math.floor(startTime); t_tick <= Math.ceil(endTime); t_tick += 0.5) {
      const x = ((t_tick - startTime) / timeWindow) * width;
      if (x >= 0 && x <= width) {
        ctx.beginPath();
        ctx.moveTo(x, centerY - 3);
        ctx.lineTo(x, centerY + 3);
        ctx.stroke();
        ctx.font = 'bold 14px font-mono';
        ctx.fillText(`${t_tick.toFixed(1)}s`, x - 12, centerY + 20);
      }
    }

    // Draw u(t) curve (history only, starting from when wave reached mid point)
    ctx.beginPath();
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    
    let firstPoint = true;
    for (let x_px = 0; x_px <= width; x_px++) {
      const t_point = startTime + (x_px / width) * timeWindow;
      
      // Only draw if time is within history AND wave has reached the mid point
      if (t_point >= timeToReachMid && t_point <= time) {
        const phase = 2 * Math.PI * frequency * t_point + sign * (2 * Math.PI * midX_m) / wavelength;
        const u_m = amplitude * Math.sin(phase);
        const u_px = centerY - u_m * M_TO_PX;
        
        if (firstPoint) {
          ctx.moveTo(x_px, u_px);
          firstPoint = false;
        } else {
          ctx.lineTo(x_px, u_px);
        }
      }
    }
    ctx.stroke();

    // Draw the red point at the current time (at the center)
    if (time >= timeToReachMid) {
      const currentPhase = 2 * Math.PI * frequency * time + sign * (2 * Math.PI * midX_m) / wavelength;
      const currentU_m = amplitude * Math.sin(currentPhase);
      const currentU_px = centerY - currentU_m * M_TO_PX;

      ctx.fillStyle = '#ff4444';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff4444';
      ctx.beginPath();
      ctx.arc(centerX, currentU_px, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    
    // Center line indicator
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, params, time]);

  const handleReset = () => {
    setTime(0);
    setParams({
      amplitude: 0.5,
      frequency: 1,
      wavelength: 2,
      direction: 'left',
    });
  };

  const signStr = params.direction === 'left' ? '+' : '-';

  // Calculate current displacement for JSX readout
  const midX_m = 4.0;
  const velocity = params.frequency * params.wavelength;
  const reachedDistance_m = velocity * time;
  const canvasWidth_m = 8.0;
  const isMidReached = params.direction === 'right' 
    ? midX_m <= reachedDistance_m 
    : midX_m >= (canvasWidth_m - reachedDistance_m);

  let currentU = 0;
  if (isMidReached) {
    const sign = params.direction === 'left' ? 1 : -1;
    const phase = 2 * Math.PI * params.frequency * time + sign * (2 * Math.PI * midX_m) / params.wavelength;
    currentU = params.amplitude * Math.sin(phase);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl bg-[#151619] rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-[#00ffcc]" />
              Golf Simulatie Expert
            </h1>
            <p className="text-xs text-white/40 uppercase tracking-widest mt-1 font-mono">
              Lopende Golf (meters) & Historisch u(t) Diagram
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title={isPlaying ? "Pauze" : "Speel af"}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button 
              onClick={handleReset}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Main Simulation Area (Left/Top) */}
          <div className="flex-1 flex flex-col border-r border-white/5">
            {/* u(x) Wave Canvas */}
            <div className="relative aspect-video bg-black/40 overflow-hidden border-b border-white/5">
              <canvas 
                ref={canvasRef}
                width={800}
                height={400}
                className="w-full h-full"
              />
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 font-mono text-xs">
                <div className="text-[#00ffcc] mb-1 font-bold">Golfvergelijking u(x,t):</div>
                <div className="text-base sm:text-lg">
                  u(x, t) = {params.amplitude.toFixed(2)} sin(2π · {params.frequency.toFixed(1)}t {signStr} 2πx / {params.wavelength.toFixed(2)})
                </div>
                {isMidReached && (
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-white/40 uppercase tracking-widest text-[10px]">Uitwijking bij x=4.0m:</span>
                    <span className={`text-sm font-bold font-mono transition-colors ${!isPlaying ? 'text-[#ff4444] scale-110 lg:scale-125 origin-right' : 'text-white/80'}`}>
                      {currentU.toFixed(3)}m
                    </span>
                  </div>
                )}
              </div>
              <div className="absolute top-4 right-4 text-[10px] font-mono text-white/40 bg-black/40 px-2 py-1 rounded">
                t = {time.toFixed(2)}s
              </div>
            </div>

            {/* u(t) Diagram (Below Wave) */}
            <div className="p-6 bg-black/20 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#ff4444] font-bold text-sm uppercase tracking-wider">
                  <Activity className="w-4 h-4" />
                  u(t) Diagram (x = 4.0m)
                </div>
                <div className="text-[10px] text-white/40 italic">
                  Toont alleen de geschiedenis. Huidig tijdstip t={time.toFixed(2)}s staat in het midden.
                </div>
              </div>
              <div className="relative h-[200px] bg-black/40 rounded-lg border border-white/5 overflow-hidden">
                <canvas 
                  ref={utCanvasRef}
                  width={1000}
                  height={200}
                  className="w-full h-full"
                />
                <div className="absolute top-2 left-2 text-xs font-mono text-white/40">u (m)</div>
                <div className="absolute bottom-2 right-2 text-xs font-mono text-white/40">t (s)</div>
              </div>
            </div>
          </div>

          {/* Controls Sidebar (Right) */}
          <div className="w-full lg:w-80 p-8 bg-white/5 flex flex-col gap-8">
            <div className="text-xs font-bold uppercase tracking-widest text-white/40 border-b border-white/10 pb-2">
              Parameters
            </div>
            
            <ControlSlider 
              label="Amplitude" 
              value={params.amplitude} 
              min={0.1} 
              max={1.0} 
              step={0.05}
              onChange={(v) => setParams(p => ({ ...p, amplitude: v }))}
              unit="m"
            />
            <ControlSlider 
              label="Frequentie" 
              value={params.frequency} 
              min={0.1} 
              max={1.0} 
              step={0.05}
              onChange={(v) => setParams(p => ({ ...p, frequency: v }))}
              unit="Hz"
            />
            <ControlSlider 
              label="Golflengte" 
              value={params.wavelength} 
              min={0.5} 
              max={5} 
              step={0.1}
              onChange={(v) => setParams(p => ({ ...p, wavelength: v }))}
              unit="m"
            />
            
            <div className="space-y-3">
              <label className="text-xs font-mono uppercase tracking-wider text-white/60">Richting</label>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setParams(p => ({ ...p, direction: 'left' }))}
                  className={`w-full py-3 rounded-lg border transition-all flex items-center justify-center gap-2 ${params.direction === 'left' ? 'bg-[#00ffcc] text-black border-[#00ffcc]' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                >
                  <MoveLeft className="w-4 h-4" /> Links (+)
                </button>
                <button 
                  onClick={() => setParams(p => ({ ...p, direction: 'right' }))}
                  className={`w-full py-3 rounded-lg border transition-all flex items-center justify-center gap-2 ${params.direction === 'right' ? 'bg-[#00ffcc] text-black border-[#00ffcc]' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                >
                  Rechts (-) <MoveRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-auto pt-8 border-t border-white/10">
              <div className="flex items-start gap-2 text-[10px] text-white/30 leading-relaxed">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                <span>
                  Schaal: 1 meter = 100 pixels. De rode punt in de golf staat op x = 4.0m.
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ControlSlider({ label, value, min, max, step = 1, onChange, unit }: { 
  label: string, 
  value: number, 
  min: number, 
  max: number, 
  step?: number,
  onChange: (v: number) => void,
  unit: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-xs font-mono uppercase tracking-wider text-white/60">{label}</label>
        <span className="text-sm font-bold text-[#00ffcc]">{value.toFixed(2)}{unit}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step}
        value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#00ffcc]"
      />
    </div>
  );
}