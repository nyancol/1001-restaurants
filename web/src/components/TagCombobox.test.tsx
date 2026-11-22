// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import TagCombobox, { invalidateTagCache } from "./TagCombobox";
import { LanguageProvider } from "../i18n/LanguageContext";

function renderEn(ui: React.ReactElement) {
  try {
    localStorage.setItem("oyster-lang", "en");
  } catch {
    /* ignore */
  }
  document.documentElement.lang = "en";
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}
import * as api from "../lib/api";

vi.mock("../lib/api", async (orig) => {
  const actual: any = await orig();
  return { ...actual, getTags: vi.fn(), patchTag: vi.fn(), deleteTag: vi.fn(), createTag: vi.fn() };
});

const TAGS = [
  { tag: "japonais", color: "#D64545", count: 8 },
  { tag: "italien", color: "#0090FF", count: 5 },
  { tag: "bistrot", color: "#2FA84F", count: 3 },
];

describe("TagCombobox filter-list variant", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    invalidateTagCache();
  });
  afterEach(() => cleanup());

  it("renders ranked tags with total counts without typing", async () => {
    (api.getTags as any).mockResolvedValue(TAGS);
    renderEn(
      <TagCombobox
        value={[]}
        onChange={() => {}}
        allowCreate={false}
        showSelected={false}
        variant="filter-list"
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "add filter japonais (8 places)" })).toBeTruthy(),
    );
    expect(api.getTags as any).toHaveBeenCalledWith("");
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    const options = screen.getAllByRole("option");
    expect(options[0].getAttribute("aria-label")).toBe("add filter japonais (8 places)");
  });

  it("toggles a tag on click", async () => {
    (api.getTags as any).mockResolvedValue(TAGS);
    const onChange = vi.fn();
    renderEn(
      <TagCombobox
        value={[]}
        onChange={onChange}
        allowCreate={false}
        showSelected={false}
        variant="filter-list"
      />,
    );
    const option = await screen.findByRole("option", { name: "add filter italien (5 places)" });
    fireEvent.click(option);
    expect(onChange).toHaveBeenCalledWith(["italien"]);
  });

  it("narrows the list on search with no create affordance", async () => {
    (api.getTags as any).mockResolvedValue(TAGS);
    const onChange = vi.fn();
    renderEn(
      <TagCombobox
        value={[]}
        onChange={onChange}
        allowCreate={false}
        showSelected={false}
        variant="filter-list"
      />,
    );
    await screen.findByRole("option", { name: "add filter japonais (8 places)" });
    fireEvent.change(screen.getByLabelText("search tags"), { target: { value: "ita" } });
    expect(screen.queryByRole("option", { name: "add filter japonais (8 places)" })).toBeNull();
    expect(screen.getByRole("option", { name: "add filter italien (5 places)" })).toBeTruthy();
    expect(screen.queryByText(/Create/)).toBeNull();
    fireEvent.keyDown(screen.getByLabelText("search tags"), { key: "Enter", code: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("TagCombobox edit variant", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    invalidateTagCache();
  });
  afterEach(() => cleanup());

  it("renders selected tags with working remove buttons (regression: no black screen)", async () => {
    (api.getTags as any).mockResolvedValue([]);
    const onChange = vi.fn();
    renderEn(<TagCombobox value={["japonais", "bistrot"]} onChange={onChange} />);
    // Both selected tags render with localized remove labels.
    const removeBistrot = await screen.findByRole("button", { name: "remove bistrot" });
    expect(screen.getByText("japonais")).toBeTruthy();
    fireEvent.click(removeBistrot);
    expect(onChange).toHaveBeenCalledWith(["japonais"]);
  });

  it("shows color dots on pills with fallback and offers manage menu", async () => {
    (api.getTags as any).mockResolvedValue(TAGS);
    const onChange = vi.fn();
    renderEn(<TagCombobox value={["japonais"]} onChange={onChange} />);
    await screen.findByRole("button", { name: "remove japonais" });
    // manage affordance present in edit mode
    expect(screen.getByRole("button", { name: "manage tag japonais" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "manage tag japonais" }));
    expect(await screen.findByRole("menu", { name: "manage tag japonais" })).toBeTruthy();
  });

  it("supports legacy payloads without color via fallback", async () => {
    (api.getTags as any).mockResolvedValue([{ tag: "legacy", count: 1 }]);
    renderEn(
      <TagCombobox
        value={[]}
        onChange={() => {}}
        allowCreate={false}
        showSelected={false}
        variant="filter-list"
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "add filter legacy (1 place)" })).toBeTruthy(),
    );
  });

  it("keeps zero-count tags selectable", async () => {
    (api.getTags as any).mockResolvedValue([
      { tag: "solo", color: "#D64545", count: 0 },
      { tag: "cozy", color: "#0090FF", count: 2 },
    ]);
    renderEn(
      <TagCombobox
        value={[]}
        onChange={() => {}}
        allowCreate={false}
        showSelected={false}
        variant="filter-list"
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "add filter solo (0 places)" })).toBeTruthy(),
    );
  });

  it("has no management affordance in filter list", async () => {
    (api.getTags as any).mockResolvedValue(TAGS);
    renderEn(
      <TagCombobox
        value={[]}
        onChange={() => {}}
        allowCreate={false}
        showSelected={false}
        variant="filter-list"
      />,
    );
    await screen.findByRole("option", { name: "add filter japonais (8 places)" });
    expect(screen.queryByRole("button", { name: /manage tag/ })).toBeNull();
  });

  it("notifies onTagDefinitionsChanged on rename so pages can refetch without reload", async () => {
    (api.getTags as any).mockResolvedValue(TAGS);
    (api.patchTag as any).mockResolvedValue({ tag: "cosy", color: "#D64545" });
    const onChange = vi.fn();
    const onMutated = vi.fn();
    renderEn(
      <TagCombobox value={["japonais"]} onChange={onChange} onTagDefinitionsChanged={onMutated} />,
    );
    fireEvent.click(await screen.findByRole("button", { name: "manage tag japonais" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
    fireEvent.change(screen.getByLabelText("rename tag japonais"), { target: { value: "cosy" } });
    fireEvent.click(screen.getByText("Rename", { selector: "button" }));
    await waitFor(() => expect(api.patchTag).toHaveBeenCalledWith("japonais", { newName: "cosy" }));
    await waitFor(() =>
      expect(onMutated).toHaveBeenCalledWith({
        type: "rename",
        oldName: "japonais",
        newName: "cosy",
      }),
    );
    expect(onChange).toHaveBeenCalledWith(["cosy"]);
  });

  it("notifies onTagDefinitionsChanged on delete so pages can refetch without reload", async () => {
    (api.getTags as any).mockResolvedValue(TAGS);
    (api.deleteTag as any).mockResolvedValue({ ok: true });
    const origConfirm = window.confirm;
    (window as any).confirm = vi.fn(() => true);
    try {
      const onChange = vi.fn();
      const onMutated = vi.fn();
      renderEn(
        <TagCombobox
          value={["japonais"]}
          onChange={onChange}
          onTagDefinitionsChanged={onMutated}
        />,
      );
      fireEvent.click(await screen.findByRole("button", { name: "manage tag japonais" }));
      fireEvent.click(screen.getByRole("menuitem", { name: "delete tag japonais" }));
      fireEvent.click(screen.getByRole("button", { name: "delete tag japonais" }));
      await waitFor(() => expect(api.deleteTag).toHaveBeenCalledWith("japonais"));
      await waitFor(() =>
        expect(onMutated).toHaveBeenCalledWith({ type: "delete", name: "japonais" }),
      );
    } finally {
      (window as any).confirm = origConfirm;
    }
  });

  it("filter list counts update live after a rename elsewhere (no reload)", async () => {
    (api.getTags as any).mockResolvedValue([{ tag: "cozy", color: "#111111", count: 2 }]);
    (api.patchTag as any).mockImplementation(async () => {
      (api.getTags as any).mockResolvedValue([{ tag: "cosy", color: "#111111", count: 2 }]);
      return { tag: "cosy", color: "#111111" };
    });
    renderEn(
      <>
        <TagCombobox value={["cozy"]} onChange={() => {}} onTagDefinitionsChanged={() => {}} />
        <TagCombobox
          value={[]}
          onChange={() => {}}
          allowCreate={false}
          showSelected={false}
          variant="filter-list"
        />
      </>,
    );
    await screen.findByRole("option", { name: "add filter cozy (2 places)" });
    fireEvent.click(await screen.findByRole("button", { name: "manage tag cozy" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
    fireEvent.change(screen.getByLabelText("rename tag cozy"), { target: { value: "cosy" } });
    fireEvent.click(screen.getByText("Rename", { selector: "button" }));
    await waitFor(
      () =>
        expect(screen.queryByRole("option", { name: "add filter cosy (2 places)" })).toBeTruthy(),
      { timeout: 2000 },
    );
    expect(screen.queryByRole("option", { name: "add filter cozy (2 places)" })).toBeNull();
  });

  it("filter list counts update live after a delete elsewhere (no reload)", async () => {
    (api.getTags as any).mockResolvedValue([
      { tag: "cozy", color: "#111111", count: 2 },
      { tag: "solo", color: "#222222", count: 1 },
    ]);
    (api.deleteTag as any).mockImplementation(async () => {
      (api.getTags as any).mockResolvedValue([{ tag: "solo", color: "#222222", count: 1 }]);
      return { ok: true };
    });
    const origConfirm = window.confirm;
    (window as any).confirm = vi.fn(() => true);
    try {
      renderEn(
        <>
          <TagCombobox value={["cozy"]} onChange={() => {}} onTagDefinitionsChanged={() => {}} />
          <TagCombobox
            value={[]}
            onChange={() => {}}
            allowCreate={false}
            showSelected={false}
            variant="filter-list"
          />
        </>,
      );
      await screen.findByRole("option", { name: "add filter cozy (2 places)" });
      fireEvent.click(await screen.findByRole("button", { name: "manage tag cozy" }));
      fireEvent.click(screen.getByRole("menuitem", { name: "delete tag cozy" }));
      fireEvent.click(screen.getByRole("button", { name: "delete tag cozy" }));
      await waitFor(
        () =>
          expect(screen.queryByRole("option", { name: "add filter cozy (2 places)" })).toBeNull(),
        { timeout: 2000 },
      );
      expect(screen.getByRole("option", { name: "add filter solo (1 place)" })).toBeTruthy();
    } finally {
      (window as any).confirm = origConfirm;
    }
  });
});
