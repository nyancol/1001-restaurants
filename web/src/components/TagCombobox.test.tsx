// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import TagCombobox from "./TagCombobox";
import { LanguageProvider } from "../i18n/LanguageContext";

function renderEn(ui: React.ReactElement) {
  try { localStorage.setItem("oyster-lang", "en"); } catch { /* ignore */ }
  document.documentElement.lang = "en";
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}
import * as api from "../lib/api";

vi.mock("../lib/api", async (orig) => {
  const actual: any = await orig();
  return { ...actual, getTags: vi.fn() };
});

const TAGS = [
  { tag: "japonais", count: 8 },
  { tag: "italien", count: 5 },
  { tag: "bistrot", count: 3 },
];

describe("TagCombobox filter-list variant", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => cleanup());

  it("renders ranked tags with total counts without typing", async () => {
    (api.getTags as any).mockResolvedValue(TAGS);
    renderEn(<TagCombobox value={[]} onChange={() => {}} allowCreate={false} showSelected={false} variant="filter-list" />);
    await waitFor(() => expect(screen.getByRole("option", { name: "add filter japonais (8 places)" })).toBeTruthy());
    expect((api.getTags as any)).toHaveBeenCalledWith("");
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    const options = screen.getAllByRole("option");
    expect(options[0].getAttribute("aria-label")).toBe("add filter japonais (8 places)");
  });

  it("toggles a tag on click", async () => {
    (api.getTags as any).mockResolvedValue(TAGS);
    const onChange = vi.fn();
    renderEn(<TagCombobox value={[]} onChange={onChange} allowCreate={false} showSelected={false} variant="filter-list" />);
    const option = await screen.findByRole("option", { name: "add filter italien (5 places)" });
    fireEvent.click(option);
    expect(onChange).toHaveBeenCalledWith(["italien"]);
  });

  it("narrows the list on search with no create affordance", async () => {
    (api.getTags as any).mockResolvedValue(TAGS);
    const onChange = vi.fn();
    renderEn(<TagCombobox value={[]} onChange={onChange} allowCreate={false} showSelected={false} variant="filter-list" />);
    await screen.findByRole("option", { name: "add filter japonais (8 places)" });
    fireEvent.change(screen.getByLabelText("search tags"), { target: { value: "ita" } });
    expect(screen.queryByRole("option", { name: "add filter japonais (8 places)" })).toBeNull();
    expect(screen.getByRole("option", { name: "add filter italien (5 places)" })).toBeTruthy();
    expect(screen.queryByText(/Create/)).toBeNull();
    fireEvent.keyDown(screen.getByLabelText("search tags"), { key: "Enter", code: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
  });
});
