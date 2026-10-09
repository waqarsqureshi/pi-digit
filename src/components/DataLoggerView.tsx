import { useState } from 'react';
import {
  Download,
  Thermometer,
  Wind,
  Gauge,
  Activity,
  LineChart,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { TelemetryRecord, SenseHatSensors } from '../types/digitalTwin';

interface DataLoggerViewProps {
  history: TelemetryRecord[];
  currentSensors: SenseHatSensors;
  selectedMode?: 'simulation' | 'emulation';
  isPhysicalConnected?: boolean;
  onRunLoggerScript?: () => void;
}

export function DataLoggerView({
  history,
  currentSensors,
  selectedMode = 'simulation',
  isPhysicalConnected = false,
  onRunLoggerScript,
}: DataLoggerViewProps) {
  const [filterChannel, setFilterChannel] = useState<'all' | 'temp' | 'humidity' | 'pressure'>('all');

  const isEmulationDisconnected = selectedMode === 'emulation' && !isPhysicalConnected;

  // Compute statistics
  const temps = isEmulationDisconnected ? [] : history.map((h) => h.temp);
  const hums = isEmulationDisconnected ? [] : history.map((h) => h.humidity);
  const presses = isEmulationDisconnected ? [] : history.map((h) => h.pressure);

  const minTemp = temps.length ? Math.min(...temps).toFixed(1) : '--';
  const maxTemp = temps.length ? Math.max(...temps).toFixed(1) : '--';
  const avgTemp = temps.length
    ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)
    : '--';

  const minHum = hums.length ? Math.min(...hums).toFixed(1) : '--';
  const maxHum = hums.length ? Math.max(...hums).toFixed(1) : '--';

  const minPress = presses.length ? Math.min(...presses).toFixed(1) : '--';
  const maxPress = presses.length ? Math.max(...presses).toFixed(1) : '--';

  const exportCsv = () => {
    if (history.length === 0) return;
    const header = 'Timestamp,Temperature_C,Humidity_Percent,Pressure_hPa,Accel_X,Accel_Y,Accel_Z,Compass_Heading\n';
    const rows = history
      .map(
        (r) =>
          `"${r.timestamp}",${r.temp},${r.humidity},${r.pressure},${r.accelX},${r.accelY},${r.accelZ},${r.heading}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pi_digit_telemetry_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderSparkline = (
    values: number[],
    minVal: number,
    maxVal: number,
    strokeColor: string,
    fillColor: string
  ) => {
    if (values.length < 2) return null;
    const width = 600;
    const height = 140;
    const range = maxVal - minVal || 1;

    const points = values.map((val, idx) => {
      const x = (idx / (values.length - 1)) * width;
      const y = height - ((val - minVal) / range) * (height - 24) - 12;
      return `${x},${y}`;
    });

    const pathData = `M ${points.join(' L ')}`;
    const areaData = `M ${points[0]} L ${points.join(' L ')} L ${width},${height} L 0,${height} Z`;

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-32 overflow-visible"
        preserveAspectRatio="none"
      >
        <path d={areaData} fill={fillColor} />
        <path d={pathData} fill="none" stroke={strokeColor} strokeWidth="2.5" />
      </svg>
    );
  };

  return (
    <div className="flex flex-col gap-4 text-slate-800">
      {/* Prominent Warning in Emulation Mode when board is not connected */}
      {isEmulationDisconnected && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs font-mono text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-sm font-sans block text-rose-950 font-bold">
                Board Not Connected (Emulation Mode)
              </strong>
              <p className="mt-0.5 text-xs text-rose-800 leading-relaxed font-sans">
                Cannot fetch live sensor telemetry from physical I2C-1 bus. In Emulation Mode, an actual Raspberry Pi with attached Sense HAT is required to stream real physical readings.
              </p>
            </div>
          </div>
          {onRunLoggerScript && (
            <button
              onClick={onRunLoggerScript}
              className="px-3 py-1.5 rounded-lg bg-[#840038] hover:bg-[#6c002e] text-white text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 text-amber-300" />
              <span>Run Telemetry Script</span>
            </button>
          )}
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Temperature Stats */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="flex items-center gap-1.5 font-mono font-bold">
              <Thermometer className="w-4 h-4 text-rose-600" />
              <span>TEMPERATURE</span>
            </span>
            <span className={`font-mono font-bold ${isEmulationDisconnected ? 'text-rose-600' : 'text-emerald-700'}`}>
              {isEmulationDisconnected ? 'NO BOARD' : 'LIVE'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {isEmulationDisconnected ? '--' : currentSensors.temperature.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-500">°C</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 pt-2 border-t border-slate-100">
            <span>Min: {minTemp}°C</span>
            <span>Avg: {avgTemp}°C</span>
            <span>Max: {maxTemp}°C</span>
          </div>
        </div>

        {/* Humidity Stats */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="flex items-center gap-1.5 font-mono font-bold">
              <Wind className="w-4 h-4 text-cyan-600" />
              <span>HUMIDITY</span>
            </span>
            <span className={`font-mono font-bold ${isEmulationDisconnected ? 'text-rose-600' : 'text-emerald-700'}`}>
              {isEmulationDisconnected ? 'NO BOARD' : 'LIVE'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {isEmulationDisconnected ? '--' : currentSensors.humidity.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-500">% rH</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 pt-2 border-t border-slate-100">
            <span>Min: {minHum}%</span>
            <span>Max: {maxHum}%</span>
          </div>
        </div>

        {/* Pressure Stats */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="flex items-center gap-1.5 font-mono font-bold">
              <Gauge className="w-4 h-4 text-amber-600" />
              <span>BAROMETER</span>
            </span>
            <span className={`font-mono font-bold ${isEmulationDisconnected ? 'text-rose-600' : 'text-emerald-700'}`}>
              {isEmulationDisconnected ? 'NO BOARD' : 'LIVE'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {isEmulationDisconnected ? '--' : currentSensors.pressure.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-500">hPa</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 pt-2 border-t border-slate-100">
            <span>Min: {minPress}</span>
            <span>Max: {maxPress}</span>
          </div>
        </div>

        {/* Export Data Action */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
              <span className="flex items-center gap-1.5 font-mono font-bold">
                <LineChart className="w-4 h-4 text-[#840038]" />
                <span>EXPORT BUFFER</span>
              </span>
              <span className="text-slate-700 font-mono font-bold">{history.length} PTS</span>
            </div>
            <div className="text-sm font-bold font-mono text-slate-900">
              Sense HAT Telemetry Stream
            </div>
            <span className="text-xs text-slate-500 block mt-1">
              Download recorded sensor waveform data
            </span>
          </div>
          <button
            onClick={exportCsv}
            className="mt-3 w-full py-1.5 bg-[#840038] hover:bg-[#6c002e] text-white rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span>Download CSV Log</span>
          </button>
        </div>
      </div>

      {/* Multi-Channel Waveforms Over Time */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#840038]" />
              <span>Real-Time Sensor Graphs Over Time</span>
            </h3>
            <span className="text-xs text-slate-500">
              Continuous live waveform telemetry synchronized with Raspberry Pi Sense HAT
            </span>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-300 text-xs font-mono">
            <button
              onClick={() => setFilterChannel('all')}
              className={`px-3 py-1 rounded font-bold transition-colors ${
                filterChannel === 'all'
                  ? 'bg-[#840038] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Sensors
            </button>
            <button
              onClick={() => setFilterChannel('temp')}
              className={`px-3 py-1 rounded font-bold transition-colors ${
                filterChannel === 'temp'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Temperature
            </button>
            <button
              onClick={() => setFilterChannel('humidity')}
              className={`px-3 py-1 rounded font-bold transition-colors ${
                filterChannel === 'humidity'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Humidity
            </button>
            <button
              onClick={() => setFilterChannel('pressure')}
              className={`px-3 py-1 rounded font-bold transition-colors ${
                filterChannel === 'pressure'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pressure
            </button>
          </div>
        </div>

        {/* Waveform Displays on clean dark canvas for high contrast */}
        <div className="p-4 bg-slate-900 rounded-xl mt-4 flex flex-col gap-4 border border-slate-800 shadow-inner">
          {(filterChannel === 'all' || filterChannel === 'temp') && (
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1">
                <span className="text-rose-400 font-bold">● Temperature (°C)</span>
                <span>Current: {currentSensors.temperature.toFixed(2)} °C</span>
              </div>
              {renderSparkline(
                temps.length > 1 ? temps : [22, 23, 24],
                15,
                45,
                '#f43f5e',
                'rgba(244,63,94,0.15)'
              )}
            </div>
          )}

          {(filterChannel === 'all' || filterChannel === 'humidity') && (
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1">
                <span className="text-cyan-400 font-bold">● Relative Humidity (% rH)</span>
                <span>Current: {currentSensors.humidity.toFixed(1)} %</span>
              </div>
              {renderSparkline(
                hums.length > 1 ? hums : [45, 48, 50],
                20,
                85,
                '#06b6d4',
                'rgba(6,182,212,0.15)'
              )}
            </div>
          )}

          {(filterChannel === 'all' || filterChannel === 'pressure') && (
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1">
                <span className="text-amber-400 font-bold">● Barometric Pressure (hPa)</span>
                <span>Current: {currentSensors.pressure.toFixed(1)} hPa</span>
              </div>
              {renderSparkline(
                presses.length > 1 ? presses : [1011, 1012, 1013],
                980,
                1030,
                '#f59e0b',
                'rgba(245,158,11,0.15)'
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
