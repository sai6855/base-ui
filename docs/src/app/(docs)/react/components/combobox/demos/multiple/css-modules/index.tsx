'use client';
import * as React from 'react';
import { useEnhancedClickHandler } from '@base-ui/utils/useEnhancedClickHandler';

/**
 * Test component to demonstrate bug #2: useEnhancedClickHandler calls handler multiple times
 * on Chrome/Edge due to missing return/else after line 39
 */
export default function TestEnhancedClickHandler() {
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
      `[${callCountRef.current}] event.type="${event.type}", interactionType="${interactionType}"`
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

    <html>
    <head>
      <title>Test Click Event Type</title>
    </head>
    <body>
      <h2>Click Event Properties Test</h2>
      <button id="testBtn">Click me</button>
      <p id="output"></p>

      <script>
        const btn = document.getElementById('testBtn');
        const output = document.getElementById('output');

        btn.addEventListener('pointerdown', (e) => {
          console.log('pointerdown:', {
            type: e.type,
            pointerType: e.pointerType,
            'pointerType' in e: 'pointerType' in e,
          });
        });

        btn.addEventListener('click', (e) => {
          const hasPointerType = 'pointerType' in e;
          console.log('click event:', {
            type: e.type,
            constructor: e.constructor.name,
            pointerType: e.pointerType,
            'pointerType' in e: hasPointerType,
            detail: e.detail,
          });

          const msg = `
            Click event properties:
            - constructor: ${e.constructor.name}
            - 'pointerType' in event: ${hasPointerType}
            - event.pointerType: ${e.pointerType}
            - event.detail: ${e.detail}
          `;
          output.innerHTML = msg;
        });
      </script>
    </body>
    </html>

  );
}
