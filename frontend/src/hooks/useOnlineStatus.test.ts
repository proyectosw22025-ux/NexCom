import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOnlineStatus } from "./useOnlineStatus";

afterEach(() => vi.restoreAllMocks());

function setOnLine(value: boolean) {
  Object.defineProperty(navigator, "onLine", { value, configurable: true });
}

describe("useOnlineStatus", () => {
  it("refleja navigator.onLine inicial", () => {
    setOnLine(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it("reacciona a los eventos online/offline", () => {
    setOnLine(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => { setOnLine(false); window.dispatchEvent(new Event("offline")); });
    expect(result.current).toBe(false);

    act(() => { setOnLine(true); window.dispatchEvent(new Event("online")); });
    expect(result.current).toBe(true);
  });
});
