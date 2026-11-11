// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";
import { usePlaces } from "./usePlaces";
import * as api from "./api";

vi.mock("./api", async (orig) => {
  const actual: any = await orig();
  return { ...actual, listPlaces: vi.fn(), patchPlace: vi.fn() };
});

const P = (over: any = {}) => ({
  id: "p1", ownerId: "u1", googlePlaceId: null, name: "A", address: null,
  lat: 1, lng: 2, status: "WANT_TO_GO", placeType: "restaurant",
  tags: [], rating: null, note: null, createdAt: 1, updatedAt: 1, ...over,
});

describe("usePlaces", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => cleanup());
  const noop = () => {};
  const stableParams = (over: any = {}) => ({ ...over });

  it("fetches once per filter set and exposes places", async () => {
    (api.listPlaces as any).mockResolvedValue([P()]);
    const { result } = renderHook(({ p }: any) => usePlaces(p, noop), { initialProps: { p: stableParams({ status: "WANT_TO_GO" }) } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.listPlaces).toHaveBeenCalledWith(expect.objectContaining({ owner: "me", status: "WANT_TO_GO" }));
    expect(result.current.places).toHaveLength(1);
  });

  it("optimistically flips status then confirms", async () => {
    (api.listPlaces as any).mockResolvedValue([P()]);
    (api.patchPlace as any).mockImplementation(async (_id: string, patch: any) => P(patch));
    const { result } = renderHook(({ p }: any) => usePlaces(p, noop), { initialProps: { p: stableParams() } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.flipStatus(P()); });
    expect(result.current.places[0].status).toBe("BEEN_TO");
    expect(api.patchPlace).toHaveBeenCalledWith("p1", { status: "BEEN_TO" });
  });

  it("rolls back via refetch on flip failure", async () => {
    (api.listPlaces as any).mockResolvedValue([P()]);
    (api.patchPlace as any).mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(({ p }: any) => usePlaces(p, noop), { initialProps: { p: stableParams() } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsBefore = (api.listPlaces as any).mock.calls.length;
    await act(async () => { await result.current.flipStatus(P()); });
    expect((api.listPlaces as any).mock.calls.length).toBeGreaterThan(callsBefore);
    expect(result.current.error).toMatch(/boom/);
  });

  it("rolls back saveEdit and rethrows on patch failure", async () => {
    (api.listPlaces as any).mockResolvedValue([P({ note: "old" })]);
    (api.patchPlace as any).mockRejectedValueOnce(new Error("nope"));
    const { result } = renderHook(({ p }: any) => usePlaces(p, noop), { initialProps: { p: stableParams() } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(
      act(async () => { await result.current.saveEdit(P({ note: "old" }), { tags: [], rating: null, note: "new", placeType: "restaurant" }); }),
    ).rejects.toThrow("nope");
    expect(result.current.places[0].note).toBe("old");
  });
});
