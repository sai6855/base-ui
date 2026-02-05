import React from 'react';
import { useEnhancedClickHandler } from '@base-ui/utils/useEnhancedClickHandler';

/**
 * Test component to demonstrate bug #2: useEnhancedClickHandler calls handler multiple times
 * on Chrome/Edge due to missing return/else after line 39
 */
export function TestEnhancedClickHandler() {
  const [callLog, setCallLog] = React.useState<
    Array<{ type: string; interactionType: string; timestamp: string }>
  >([]);
  const callCountRef = React.useRef(0);

  const handler = React.useCallback((event: React.MouseEvent | React.PointerEvent, interactionType: string) => {
    callCountRef.current += 1;
    const logEntry = {
      type: event.type,
      interactionType,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }),
    };
    setCallLog((prev) => [...prev, logEntry]);
    console.log(
      `[${callCountRef.current}] event.type="${event.type}", interactionType="${interactionType}", 'pointerType' in event: ${
        'pointerType' in event
      }, event.pointerType: ${(event as any).pointerType}`
    );
  }, []);

  const { onClick, onPointerDown } = useEnhancedClickHandler(handler);

  const handleReset = () => {
    callCountRef.current = 0;
    setCallLog([]);
    console.log('=== RESET ===');
  };

  const browserName = React.useMemo(() => {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edge')) return 'Chrome';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    return 'Unknown';
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>useEnhancedClickHandler Bug Test</h2>
      <p>
        <strong>Browser:</strong> {browserName}
      </p>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={onClick}
          onPointerDown={onPointerDown}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Click me with mouse
        </button>
        <button
          onClick={handleReset}
          style={{
            marginLeft: '10px',
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
      </div>

      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px' }}>
        <h3>Call Log (total: {callCountRef.current})</h3>
        {callLog.length === 0 ? (
          <p style={{ color: '#6c757d' }}>Click the button above to see calls logged here</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                <th style={{ textAlign: 'left', padding: '5px' }}>#</th>
                <th style={{ textAlign: 'left', padding: '5px' }}>Time</th>
                <th style={{ textAlign: 'left', padding: '5px' }}>event.type</th>
                <th style={{ textAlign: 'left', padding: '5px' }}>interactionType</th>
              </tr>
            </thead>
            <tbody>
              {callLog.map((entry, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #dee2e6', backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                  <td style={{ padding: '5px' }}>{i + 1}</td>
                  <td style={{ padding: '5px' }}>{entry.timestamp}</td>
                  <td style={{ padding: '5px' }}>{entry.type}</td>
                  <td style={{ padding: '5px' }}>{entry.interactionType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ padding: '10px', backgroundColor: '#e7f3ff', border: '1px solid #b3d9ff', borderRadius: '4px', fontSize: '12px' }}>
        <h3 style={{ marginTop: 0 }}>Expected vs Actual:</h3>
        <p>
          <strong>Chrome/Edge:</strong>
          <br />
          Expected: 1 handler call per click (from pointerdown)
          <br />
          Actual: 2+ handler calls per click (from pointerdown + click)
        </p>
        <p>
          <strong>Safari/Firefox:</strong>
          <br />
          Expected: 2 handler calls per click (from pointerdown + click)
          <br />
          Actual: 2 handler calls per click (works correctly)
        </p>
        <p style={{ color: '#d9534f', marginBottom: 0 }}>
          <strong>Bug:</strong> Missing `return`/`else` after line 39 in useEnhancedClickHandler.ts causes the handler to be called twice on Chrome/Edge's click event (once at line 39, once at line 42).
        </p>
      </div>

      <p style={{ marginTop: '20px', fontSize: '11px', color: '#6c757d' }}>
        Check browser console for detailed logs (DevTools → Console)
      </p>
    </div>
  );
}
