import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FullHardwareState,
  RgbColor,
  JoystickDirection,
  JoystickAction,
  ProgramLanguage,
  TerminalOutput,
  TelemetryRecord,
  SenseHatSensors,
  EmulatedPeripheral,
  HardwareDiagnosticReport,
} from '../types/digitalTwin';

function mergeTerminalOutputSnapshot(snapshot: TerminalOutput[], current: TerminalOutput[]) {
  const snapshotIds = new Set<string>();
  const orderedSnapshot = snapshot.filter((output) => {
    if (snapshotIds.has(output.id)) return false;
    snapshotIds.add(output.id);
    return true;
  });
  const snapshotIndexes = new Map(orderedSnapshot.map((output, index) => [output.id, index]));
  const nextAnchors: Array<string | undefined> = new Array(current.length);
  let nextAnchor: string | undefined;
  for (let index = current.length - 1; index >= 0; index--) {
    if (snapshotIndexes.has(current[index].id)) nextAnchor = current[index].id;
    nextAnchors[index] = nextAnchor;
  }

  const before = new Map<string, TerminalOutput[]>();
  const after = new Map<string, TerminalOutput[]>();
  const unanchored: TerminalOutput[] = [];
  const includedIds = new Set(snapshotIds);
  let previousAnchor: string | undefined;

  current.forEach((output, index) => {
    if (snapshotIndexes.has(output.id)) {
      previousAnchor = output.id;
      return;
    }
    if (includedIds.has(output.id)) return;
    includedIds.add(output.id);

    if (nextAnchors[index]) {
      const anchorId = nextAnchors[index]!;
      before.set(anchorId, [...(before.get(anchorId) || []), output]);
    } else if (previousAnchor) {
      after.set(previousAnchor, [...(after.get(previousAnchor) || []), output]);
    } else {
      unanchored.push(output);
    }
  });

  return [
    ...orderedSnapshot.flatMap((output) => [
      ...(before.get(output.id) || []),
      output,
      ...(after.get(output.id) || []),
    ]),
    ...unanchored,
  ];
}

const TERMINAL_OUTPUT_ID_HISTORY_LIMIT = 400;

export function useDigitalTwin() {
  const [state, setState] = useState<FullHardwareState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [terminalOutputs, setTerminalOutputs] = useState<TerminalOutput[]>([
    {
      id: 'init-term-1',
      timestamp: new Date().toLocaleTimeString(),
      stream: 'system',
      text: 'Pi-Digit Digital Twin Terminal\nTarget: Raspberry Pi 4 Model B (Bookworm)\nHost: local/offline classroom network\n',
    },
  ]);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryRecord[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const terminalOutputIdsRef = useRef(new Set(['init-term-1']));
  const terminalOutputIdOrderRef = useRef(['init-term-1']);
  const terminalSnapshotIdsRef = useRef(new Set(['init-term-1']));
  const terminalSnapshotsInFlightRef = useRef(0);

  const pruneTerminalOutputIds = useCallback(() => {
    if (terminalSnapshotsInFlightRef.current > 0) return;
    let index = 0;
    while (
      terminalOutputIdOrderRef.current.length > TERMINAL_OUTPUT_ID_HISTORY_LIMIT &&
      index < terminalOutputIdOrderRef.current.length
    ) {
      const id = terminalOutputIdOrderRef.current[index];
      if (terminalSnapshotIdsRef.current.has(id)) {
        index++;
        continue;
      }
      terminalOutputIdOrderRef.current.splice(index, 1);
      terminalOutputIdsRef.current.delete(id);
    }
  }, []);

  const rememberTerminalOutputId = useCallback((id: string) => {
    if (terminalOutputIdsRef.current.has(id)) return false;
    terminalOutputIdsRef.current.add(id);
    terminalOutputIdOrderRef.current.push(id);
    return true;
  }, []);

  const appendTerminalOutput = useCallback((output: TerminalOutput) => {
    if (!rememberTerminalOutputId(output.id)) return;
    setTerminalOutputs((prev) => [...prev, output].slice(-200));
    pruneTerminalOutputIds();
  }, [pruneTerminalOutputIds, rememberTerminalOutputId]);

  const reconcileTerminalOutputs = useCallback((snapshot: TerminalOutput[]) => {
    terminalSnapshotIdsRef.current = new Set(snapshot.map((output) => output.id));
    snapshot.forEach((output) => rememberTerminalOutputId(output.id));
    setTerminalOutputs((prev) => mergeTerminalOutputSnapshot(snapshot, prev).slice(-200));
    pruneTerminalOutputIds();
  }, [pruneTerminalOutputIds, rememberTerminalOutputId]);

  const fetchTerminalOutputs = useCallback(async () => {
    terminalSnapshotsInFlightRef.current++;
    try {
      const response = await fetch('/api/program/output');
      if (!response.ok) return;
      const snapshot: TerminalOutput[] = await response.json();
      if (Array.isArray(snapshot)) reconcileTerminalOutputs(snapshot);
    } finally {
      terminalSnapshotsInFlightRef.current--;
      pruneTerminalOutputIds();
    }
  }, [pruneTerminalOutputIds, reconcileTerminalOutputs]);

  // Connect WebSocket
  const connectWs = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    let isSyncingTerminal = true;
    const pendingTerminalOutputs: TerminalOutput[] = [];

    const flushPendingTerminalOutputs = () => {
      isSyncingTerminal = false;
      pendingTerminalOutputs.forEach(appendTerminalOutput);
      pendingTerminalOutputs.length = 0;
    };

    ws.onopen = () => {
      setIsConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      fetchTerminalOutputs().finally(flushPendingTerminalOutputs);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'init.state':
            setState(msg.payload);
            if (msg.payload?.diagnostics) {
              setDiagnostics(msg.payload.diagnostics);
            }
            break;

          case 'state.update':
            setState((prev) =>
              prev
                ? {
                    ...prev,
                    isPhysicalPi: msg.payload.isPhysicalPi,
                    isSenseHatConnected: msg.payload.isSenseHatConnected,
                    hardwareLinkStatus: msg.payload.hardwareLinkStatus,
                    system: { ...prev.system, ...msg.payload.system },
                  }
                : prev
            );
            break;

          case 'hardware.diagnostics':
            setDiagnostics(msg.payload);
            break;

          case 'gpio.update':
            setState((prev) => {
              if (!prev) return prev;
              const nextGpio = prev.gpio.map((p) =>
                p.pin === msg.payload.pin
                  ? { ...p, value: msg.payload.value, mode: msg.payload.mode }
                  : p
              );
              // Also sync emulated peripherals
              const nextPeripherals = (prev.emulatedPeripherals || []).map((peri) => {
                if (peri.bcm === msg.payload.bcm || peri.pin === msg.payload.pin) {
                  return { ...peri, state: msg.payload.value };
                }
                return peri;
              });
              return { ...prev, gpio: nextGpio, emulatedPeripherals: nextPeripherals };
            });
            break;

          case 'peripherals.update':
            setState((prev) => (prev ? { ...prev, emulatedPeripherals: msg.payload } : prev));
            break;

          case 'matrix.update':
            setState((prev) => {
              if (!prev) return prev;
              const nextMatrix = [...prev.matrix];
              nextMatrix[msg.payload.index] = msg.payload.color;
              return { ...prev, matrix: nextMatrix };
            });
            break;

          case 'matrix.full':
            setState((prev) => (prev ? { ...prev, matrix: msg.payload.matrix } : prev));
            break;

          case 'sensor.update':
            setState((prev) => (prev ? { ...prev, sensors: msg.payload } : prev));
            setTelemetryHistory((prevHistory) => {
              const rec: TelemetryRecord = {
                id: 'hist-' + Date.now(),
                timestamp: new Date().toLocaleTimeString(),
                temp: msg.payload.temperature,
                humidity: msg.payload.humidity,
                pressure: msg.payload.pressure,
                accelX: msg.payload.accelerometer.x,
                accelY: msg.payload.accelerometer.y,
                accelZ: msg.payload.accelerometer.z,
                heading: msg.payload.compassHeading,
              };
              const updated = [...prevHistory, rec];
              return updated.length > 50 ? updated.slice(updated.length - 50) : updated;
            });
            break;

          case 'system.update':
            setState((prev) =>
              prev
                ? {
                    ...prev,
                    isPhysicalPi: msg.payload.isPhysicalPi,
                    isSenseHatConnected: msg.payload.isSenseHatConnected,
                    hardwareLinkStatus: msg.payload.hardwareLinkStatus,
                    system: { ...prev.system, uptimeSeconds: msg.payload.uptimeSeconds },
                  }
                : prev
            );
            break;

          case 'joystick.event':
            setState((prev) => (prev ? { ...prev, lastJoystickEvent: msg.payload } : prev));
            break;

          case 'program.status':
            setState((prev) => (prev ? { ...prev, program: msg.payload } : prev));
            break;

          case 'lcd.update':
            setState((prev) => (prev ? { ...prev, lcd: msg.payload } : prev));
            break;

          case 'program.output':
            if (isSyncingTerminal) {
              pendingTerminalOutputs.push(msg.payload);
            } else {
              appendTerminalOutput(msg.payload);
            }
            break;

          case 'timeline.trace':
            setState((prev) => {
              if (!prev) return prev;
              const nextTimeline = [msg.payload, ...(prev.timeline || [])].slice(0, 40);
              return { ...prev, timeline: nextTimeline };
            });
            break;

          case 'pwm.update':
            setState((prev) => (prev ? { ...prev, pwm: msg.payload } : prev));
            break;
        }
      } catch (e) {
        console.error('[Pi-Digit] Error handling WS message:', e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      reconnectTimeoutRef.current = setTimeout(connectWs, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [appendTerminalOutput, fetchTerminalOutputs]);

  useEffect(() => {
    fetch('/api/state')
      .then((res) => res.json())
      .then((data: FullHardwareState) => {
        setState(data);
      })
      .catch(() => {});

    fetch('/api/telemetry/history')
      .then((res) => res.json())
      .then((hist) => {
        if (Array.isArray(hist) && hist.length > 0) setTelemetryHistory(hist);
      })
      .catch(() => {});

    connectWs();

    // Active polling fallback ensures live simulation updates even if WebSocket drops in cloud iframe
    let isPolling = false;
    const pollInterval = setInterval(async () => {
      if (wsRef.current?.readyState === WebSocket.OPEN || isPolling) return;
      isPolling = true;
      try {
        const stateRes = await fetch('/api/state');
        if (stateRes.ok) {
          const freshState: FullHardwareState = await stateRes.json();
          setState(freshState);
        }

        await fetchTerminalOutputs();
      } catch {
        // Ignore polling errors
      } finally {
        isPolling = false;
      }
    }, 2000);

    return () => {
      clearInterval(pollInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWs, fetchTerminalOutputs]);

  // Actions
  const toggleGpioPin = useCallback((pin: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'gpio.toggle', payload: { pin } }));
    } else {
      fetch('/api/gpio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
    }
  }, []);

  const triggerEmulatedButton = useCallback((bcm: number, pressed: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'peripheral.button', payload: { bcm, pressed } }));
    }
  }, []);

  const setPixel = useCallback((x: number, y: number, color: RgbColor) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'sensehat.pixel',
          payload: { x, y, r: color[0], g: color[1], b: color[2] },
        })
      );
    } else {
      fetch('/api/sensehat/pixel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y, r: color[0], g: color[1], b: color[2] }),
      });
    }
  }, []);

  const clearMatrix = useCallback((color: RgbColor = [0, 0, 0]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'sensehat.clear',
          payload: { r: color[0], g: color[1], b: color[2] },
        })
      );
    } else {
      fetch('/api/sensehat/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ r: color[0], g: color[1], b: color[2] }),
      });
    }
  }, []);

  const setMatrixPattern = useCallback((matrix: RgbColor[]) => {
    fetch('/api/sensehat/matrix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matrix }),
    });
  }, []);

  const triggerJoystick = useCallback(
    (direction: JoystickDirection, action: JoystickAction = 'press') => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'sensehat.joystick',
            payload: { direction, action },
          })
        );
      } else {
        fetch('/api/sensehat/joystick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ direction, action }),
        });
      }
    },
    []
  );

  const toggleSenseHatConnection = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'sensehat.toggleConnection', payload: {} }));
    }
  }, []);

  const runProgram = useCallback(
    async (code: string, language: ProgramLanguage, filename: string, timeoutMs = 10000) => {
      appendTerminalOutput({
        id: 'run-' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        stream: 'system',
        text: `>>> Launching ${filename} (${language.toUpperCase()}) on Raspberry Pi 4 [Watchdog: ${timeoutMs / 1000}s]...`,
      });

      await fetch('/api/program/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, filename, timeoutMs }),
      });

      // Quick polling sequence immediately after launch to catch initial simulation steps
      for (const delay of [150, 350, 700, 1200, 2000]) {
        setTimeout(async () => {
          try {
            const [sRes] = await Promise.all([
              fetch('/api/state'),
              fetchTerminalOutputs(),
            ]);
            if (sRes.ok) {
              const freshState = await sRes.json();
              setState(freshState);
            }
          } catch {}
        }, delay);
      }
    },
    [appendTerminalOutput, fetchTerminalOutputs]
  );

  const stopProgram = useCallback(async () => {
    await fetch('/api/program/stop', { method: 'POST' });
  }, []);

  const resetHardware = useCallback(async () => {
    await fetch('/api/reset', { method: 'POST' });
  }, []);

  const injectSensors = useCallback(async (values: Partial<SenseHatSensors>) => {
    await fetch('/api/simulation/sensors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
  }, []);

  const clearTerminal = useCallback(() => {
    setTerminalOutputs([
      {
        id: 'term-cleared-' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        stream: 'system',
        text: 'Terminal output cleared.\n',
      },
    ]);
  }, []);

  const execBashCommand = useCallback(async (command: string) => {
    try {
      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      return data.output || '';
    } catch {
      return 'bash: command execution failed';
    }
  }, []);

  const [isProbingHardware, setIsProbingHardware] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [lastPingResult, setLastPingResult] = useState<{
    latencyMs?: number;
    timestamp?: number;
    message?: string;
    i2cStatus?: string;
    gpioStatus?: string;
    lcdStatus?: string;
  } | null>(null);

  // Hardware Diagnostics and Error Alert States
  const [diagnostics, setDiagnostics] = useState<HardwareDiagnosticReport | null>(null);
  const [isRunningDiag, setIsRunningDiag] = useState(false);
  const [isDiagModalOpen, setIsDiagModalOpen] = useState(false);
  const [hardwareWarning, setHardwareWarning] = useState<string | null>(null);

  const runHardwareDiagnostics = useCallback(async () => {
    setIsRunningDiag(true);
    try {
      const res = await fetch('/api/hardware/diagnose', { method: 'POST' });
      const data = await res.json();
      if (data.diagnostics) {
        setDiagnostics(data.diagnostics);
        if (data.diagnostics.overallStatus === 'partial') {
          setHardwareWarning(
            'Partial hardware link: The 8×8 RGB LED Matrix (/dev/fb1) is active and synced! Environmental sensors are in standby mode.'
          );
        } else if (data.diagnostics.overallStatus === 'error') {
          setHardwareWarning(
            'Hardware connection issue detected: Check diagnostics for troubleshooting commands.'
          );
        } else {
          setHardwareWarning(null);
        }
        return data.diagnostics;
      }
    } catch (e) {
      console.error('Failed to run diagnostics', e);
    } finally {
      setIsRunningDiag(false);
    }
    return null;
  }, []);

  const pingHardware = useCallback(async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/hardware/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientTime: Date.now() }),
      });
      const elapsed = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json();
        setLastPingResult({
          latencyMs: data.latencyMs || elapsed,
          timestamp: Date.now(),
          message: data.message,
          i2cStatus: data.i2cStatus,
          gpioStatus: data.gpioStatus,
          lcdStatus: data.lcdStatus,
        });
        return data;
      }
    } catch {
      setLastPingResult({
        latencyMs: undefined,
        timestamp: Date.now(),
        message: 'Ping failed: hardware daemon unreachable',
      });
    } finally {
      setTimeout(() => setIsPinging(false), 250);
    }
  }, []);

  const clearLcd = useCallback(async () => {
    await fetch('/api/lcd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: ['', ''] }),
    });
  }, []);

  const connectHardware = useCallback(async (force?: boolean) => {
    setIsProbingHardware(true);
    try {
      const res = await fetch('/api/hardware/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force, mode: 'emulation' }),
      });
      const data = await res.json();
      if (data.state) {
        setState(data.state);
      }
      if (data.diagnostics) {
        setDiagnostics(data.diagnostics);
      }
      if (data.warning) {
        setHardwareWarning(data.warning);
      } else if (data.statusLevel === 'partial') {
        const errDetail = data.errorDetails ? ` (${data.errorDetails})` : '';
        setHardwareWarning(
          `Notice: 8×8 RGB LED Matrix (/dev/fb1) is CONNECTED & ACTIVE on your Raspberry Pi! Environmental sensors (HTS221/LPS25H) are unlinked${errDetail}. Click Diagnostics for fix commands.`
        );
      } else if (data.connected === false && force !== false) {
        setHardwareWarning(
          data.error || 'Hardware not detected on /dev/fb1 or /dev/i2c-1. Click Diagnostics for troubleshooting commands.'
        );
      } else {
        setHardwareWarning(null);
      }
      return data;
    } catch {
      setHardwareWarning('Failed to connect to Raspberry Pi hardware daemon on port 3000.');
      return { connected: false };
    } finally {
      setTimeout(() => setIsProbingHardware(false), 300);
    }
  }, []);

  const setSystemMode = useCallback(async (mode: 'simulation' | 'emulation') => {
    try {
      const res = await fetch('/api/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (data.state) {
        setState(data.state);
      }
      if (data.statusLevel === 'partial' && mode === 'emulation') {
        setHardwareWarning(
          'Notice: 8×8 RGB LED Matrix is active on Raspberry Pi (/dev/fb1). Environmental sensors are in standby mode.'
        );
      } else if (mode === 'simulation') {
        setHardwareWarning(null);
      }
      return data;
    } catch (err) {
      console.error('[Pi-Digit] Failed to set system mode:', err);
    }
  }, []);

  const probeHardware = useCallback(async () => {
    setIsProbingHardware(true);
    try {
      const res = await fetch('/api/hardware/probe', { method: 'POST' });
      const data = await res.json();
      if (data.diagnostics) {
        setDiagnostics(data.diagnostics);
      }
      const stateRes = await fetch('/api/state');
      if (stateRes.ok) {
        const freshState = await stateRes.json();
        setState(freshState);
      }
      return data;
    } catch {
      return { connected: false, detected: false, message: 'Failed to contact hardware daemon.' };
    } finally {
      setTimeout(() => setIsProbingHardware(false), 400);
    }
  }, []);

  const setSensorSource = useCallback(async (source: 'hardware' | 'simulated') => {
    setState((prev) => (prev ? { ...prev, sensorSource: source, sensors: { ...prev.sensors, isSimulated: source === 'simulated' } } : prev));
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'sensors.setSource', payload: { source } }));
    }
    await fetch('/api/sensors/source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source }),
    });
  }, []);

  const setOperatingMode = useCallback(async (mode: 'execution' | 'emulation') => {
    setState((prev) => (prev ? { ...prev, operatingMode: mode } : prev));
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'operatingMode.set', payload: { mode } }));
    }
    await fetch('/api/operating-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
  }, []);

  return {
    state,
    isConnected,
    isProbingHardware,
    isPinging,
    lastPingResult,
    diagnostics,
    isRunningDiag,
    isDiagModalOpen,
    setIsDiagModalOpen,
    hardwareWarning,
    setHardwareWarning,
    runHardwareDiagnostics,
    terminalOutputs,
    telemetryHistory,
    toggleGpioPin,
    triggerEmulatedButton,
    setPixel,
    clearMatrix,
    setMatrixPattern,
    triggerJoystick,
    toggleSenseHatConnection,
    connectHardware,
    probeHardware,
    pingHardware,
    setSystemMode,
    setSensorSource,
    setOperatingMode,
    clearLcd,
    runProgram,
    stopProgram,
    resetHardware,
    injectSensors,
    clearTerminal,
    execBashCommand,
  };
}
