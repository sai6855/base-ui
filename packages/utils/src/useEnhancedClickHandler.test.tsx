import * as React from 'react';
import { expect, it, describe, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEnhancedClickHandler } from './useEnhancedClickHandler';

/**
 * Test for bug #2: useEnhancedClickHandler missing return after PointerEvent check
 * causes handler to be called twice per click
 */
describe('useEnhancedClickHandler', () => {
  it('should call handler only once per mouse click', async () => {
    const handler = vi.fn();
    const user = userEvent.setup();

    function TestComponent() {
      const { onClick, onPointerDown } = useEnhancedClickHandler(handler);
      return (
        <button onClick={onClick} onPointerDown={onPointerDown}>
          Click me
        </button>
      );
    }

    render(<TestComponent />);
    const button = screen.getByRole('button');

    // Click once
    await user.click(button);

    // BUG: handler is called twice instead of once
    // Expected: 1 call (from pointerdown)
    // Actual: 2+ calls (from pointerdown + fall-through in handleClick)
    console.log(`Handler called ${handler.mock.calls.length} times`);
    expect(handler.mock.calls.length).toBe(1);
  });

  it('should detect keyboard click correctly', async () => {
    const handler = vi.fn();
    const user = userEvent.setup();

    function TestComponent() {
      const { onClick, onPointerDown } = useEnhancedClickHandler(handler);
      return (
        <button onClick={onClick} onPointerDown={onPointerDown}>
          Click me
        </button>
      );
    }

    render(<TestComponent />);
    const button = screen.getByRole('button');

    // Keyboard click (Space or Enter)
    button.focus();
    await user.keyboard(' ');

    // Should be called with 'keyboard' as interactionType
    expect(handler).toHaveBeenCalledWith(
      expect.any(Object),
      'keyboard'
    );
  });

  it('should pass correct interactionType for pointer clicks', async () => {
    const handler = vi.fn();
    const user = userEvent.setup();

    function TestComponent() {
      const { onClick, onPointerDown } = useEnhancedClickHandler(handler);
      return (
        <button onClick={onClick} onPointerDown={onPointerDown}>
          Click me
        </button>
      );
    }

    render(<TestComponent />);
    const button = screen.getByRole('button');

    // Mouse click
    await user.click(button);

    // Should pass 'mouse' or cached pointer type
    const calls = handler.mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    // All calls should have a non-empty interactionType
    calls.forEach((call) => {
      expect(call[1]).toBeTruthy();
    });
  });

  it('should not call handler if pointerdown is prevented', async () => {
    const handler = vi.fn();
    const user = userEvent.setup();

    function TestComponent() {
      const { onClick, onPointerDown } = useEnhancedClickHandler(handler);

      const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        onPointerDown(e);
      };

      return (
        <button onClick={onClick} onPointerDown={handlePointerDown}>
          Click me
        </button>
      );
    }

    render(<TestComponent />);
    const button = screen.getByRole('button');

    await user.click(button);

    // When pointerdown is prevented, handler should not be called from pointerdown,
    // but may still be called from click event
    expect(handler.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it('should reset lastClickInteractionTypeRef after use', async () => {
    const handler = vi.fn();
    const user = userEvent.setup();

    function TestComponent() {
      const { onClick, onPointerDown } = useEnhancedClickHandler(handler);
      return (
        <button onClick={onClick} onPointerDown={onPointerDown}>
          Click me
        </button>
      );
    }

    render(<TestComponent />);
    const button = screen.getByRole('button');

    // First click
    handler.mockClear();
    await user.click(button);
    const firstClickCalls = handler.mock.calls.length;

    // Second click - should have similar behavior
    handler.mockClear();
    await user.click(button);
    const secondClickCalls = handler.mock.calls.length;

    expect(secondClickCalls).toBe(firstClickCalls);
  });
});
