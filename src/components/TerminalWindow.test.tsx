import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Terminal from "./Terminal";

// ── Surgical animation mocks ─────────────────────────────────────
// These tests exercise the real Terminal component: its state, command
// parsing, history and window-mode logic are untouched. Only the
// timing/visual children are replaced so effects can settle synchronously
// and mount identity can be observed. Typewriter completion is deferred on
// demand so the "output is still typing" lock can be exercised too.
const animation = vi.hoisted(() => ({
  deferTypewriter: false,
  pendingTypewriter: [] as Array<() => void>,
  mounts: { banner: 0, walkers: 0, particles: 0, agent: 0 },
}));

vi.mock("./AnimatedBanner", async () => {
  const React = await import("react");
  function MockAnimatedBanner({ onComplete }: { onComplete?: () => void }) {
    React.useEffect(() => {
      animation.mounts.banner += 1;
      onComplete?.();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once completion stands in for the real reveal effect.
    }, []);
    return React.createElement(
      "div",
      { "data-testid": "banner-chrome" },
      "NEEL banner chrome",
    );
  }
  return { default: MockAnimatedBanner };
});

vi.mock("./TypewriterText", async () => {
  const React = await import("react");
  function MockTypewriterText({
    content,
    onComplete,
  }: {
    content: import("react").ReactNode;
    onComplete?: () => void;
  }) {
    const completedRef = React.useRef(false);
    React.useEffect(() => {
      if (completedRef.current || !onComplete) return;
      const complete = () => {
        completedRef.current = true;
        onComplete();
      };
      if (animation.deferTypewriter) {
        animation.pendingTypewriter.push(complete);
        return () => {
          animation.pendingTypewriter = animation.pendingTypewriter.filter(
            (pending) => pending !== complete,
          );
        };
      }
      complete();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- completion is mount-scoped, like a finished typewriter run.
    }, []);
    return React.createElement(React.Fragment, null, content);
  }
  return { default: MockTypewriterText };
});

vi.mock("./PixelWalkers", async () => {
  const React = await import("react");
  function MockPixelWalkers() {
    React.useEffect(() => {
      animation.mounts.walkers += 1;
    }, []);
    return React.createElement("div", { "data-testid": "walker-sprites" });
  }
  return { default: MockPixelWalkers };
});

vi.mock("./ParticleBackground", async () => {
  const React = await import("react");
  function MockParticleBackground() {
    React.useEffect(() => {
      animation.mounts.particles += 1;
    }, []);
    return React.createElement("div", { "data-testid": "particle-backdrop" });
  }
  return { default: MockParticleBackground };
});

vi.mock("./AgentAtWork", async () => {
  const React = await import("react");
  function MockAgentAtWork() {
    React.useEffect(() => {
      animation.mounts.agent += 1;
    }, []);
    return React.createElement("span", {
      "data-testid": "agent-indicator",
      "aria-hidden": "true",
    });
  }
  return { default: MockAgentAtWork };
});

// ── Helpers ─────────────────────────────────────────────────────
const scrollIntoView = vi.fn();

const getWindowEl = (container: HTMLElement) => {
  const windowEl = container.querySelector<HTMLElement>(".terminal-window");
  if (!windowEl) throw new Error("terminal window not rendered");
  return windowEl;
};

const getInput = () =>
  screen.getByLabelText("Terminal command") as HTMLInputElement;

const submitCommand = (command: string) => {
  const input = getInput();
  fireEvent.change(input, { target: { value: command } });
  const form = input.closest("form");
  if (!form) throw new Error("terminal prompt form not rendered");
  fireEvent.submit(form);
};

/**
 * Dispatch a real cancelable KeyboardEvent. jsdom does not implement Tab
 * focus traversal, so the contract under test is whether Terminal cancels
 * the event (which is what stops a real browser from moving focus) and what
 * it does to the controlled prompt value. Callers assert focus explicitly.
 */
const pressKey = (key: string, options: KeyboardEventInit = {}) => {
  const input = getInput();
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  act(() => {
    input.dispatchEvent(event);
  });
  return event;
};

const resolvePendingTypewriter = () => {
  const complete = animation.pendingTypewriter.shift();
  act(() => {
    complete?.();
  });
};

describe("Terminal window integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    animation.deferTypewriter = false;
    animation.pendingTypewriter = [];
    animation.mounts = { banner: 0, walkers: 0, particles: 0, agent: 0 };

    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: scrollIntoView,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    delete (Element.prototype as unknown as Record<string, unknown>)
      .scrollIntoView;
  });

  it("exposes native window controls, a labeled prompt and a discoverable launcher", () => {
    render(<Terminal />);

    const controls = screen.getByRole("group", {
      name: "Terminal window controls",
    });
    const buttons = within(controls).getAllByRole("button");
    expect(buttons).toHaveLength(3);

    const close = within(controls).getByRole("button", {
      name: "Close terminal",
    });
    const minimize = within(controls).getByRole("button", {
      name: "Minimize terminal",
    });
    const maximize = within(controls).getByRole("button", {
      name: "Maximize terminal",
    });

    for (const button of [close, minimize, maximize]) {
      expect(button).toHaveAttribute("type", "button");
    }
    expect(maximize).toHaveAttribute("aria-pressed", "false");
    expect(maximize).toHaveAttribute("title", "Maximize terminal");

    const prompt = screen.getByRole("textbox", { name: "Terminal command" });
    expect(prompt).toBe(getInput());
    expect(prompt).toHaveAttribute("id", "terminal-command-input");

    // No launcher while the window is open.
    expect(
      screen.queryByRole("button", { name: "Open terminal" }),
    ).toBeNull();

    fireEvent.click(close);

    const launcher = screen.getByRole("button", {
      name: "Open terminal",
    });
    expect(launcher.tagName).toBe("BUTTON");
    expect(launcher).toHaveAttribute("type", "button");
    expect(launcher).toHaveAttribute("title", "Open terminal");
    // Visible text, not just the accessible name.
    expect(within(launcher).getByText("Terminal")).toBeVisible();
  });

  it("toggles maximize/restore with aria-pressed and keeps that state across close/reopen", async () => {
    const { container } = render(<Terminal />);
    const windowEl = getWindowEl(container);

    expect(windowEl).not.toHaveClass("terminal-window--maximized");
    fireEvent.click(
      screen.getByRole("button", { name: "Maximize terminal" }),
    );

    expect(windowEl).toHaveClass("terminal-window--maximized");
    // Maximize is a toggle button: pressing it again restores.
    const restore = screen.getByRole("button", {
      name: "Restore terminal",
    });
    expect(restore).toHaveAttribute("aria-pressed", "true");
    expect(restore).toHaveAttribute("title", "Restore terminal");

    fireEvent.click(
      screen.getByRole("button", { name: "Close terminal" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Open terminal" }),
      ).toHaveFocus(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Open terminal" }),
    );
    await waitFor(() => expect(getInput()).toHaveFocus());

    // Reopening restores the same window, still maximized.
    expect(getWindowEl(container)).toBe(windowEl);
    expect(windowEl).toHaveClass("terminal-window--maximized");
    expect(
      screen.getByRole("button", { name: "Restore terminal" }),
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(
      screen.getByRole("button", { name: "Restore terminal" }),
    );
    expect(windowEl).not.toHaveClass("terminal-window--maximized");
    expect(
      screen.getByRole("button", { name: "Maximize terminal" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps one mounted terminal and its session through repeated close/minimize cycles", async () => {
    const { container } = render(<Terminal />);
    const windowEl = getWindowEl(container);
    const input = getInput();
    const bannerChrome = screen.getByTestId("banner-chrome");
    const walkerSprites = screen.getByTestId("walker-sprites");

    submitCommand("projects");
    const projectsLink = await screen.findByRole("link", {
      name: "liftstats.app",
    });
    expect(projectsLink).toHaveAttribute("href", "https://www.liftstats.app/");

    fireEvent.change(input, { target: { value: "learn" } });

    for (const hideControl of ["Close terminal", "Minimize terminal"]) {
      fireEvent.click(
        screen.getByRole("button", { name: hideControl }),
      );

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Open terminal" }),
        ).toHaveFocus(),
      );

      // `hidden` is the contract terminal.css turns into display:none; jsdom
      // does not load that stylesheet, so the attribute/property is what is
      // asserted here. The node itself is never unmounted.
      expect(windowEl.hidden).toBe(true);
      expect(windowEl).toHaveAttribute("hidden");
      expect(getWindowEl(container)).toBe(windowEl);
      expect(getInput()).toBe(input);
      expect(input).toHaveValue("learn");
      expect(container).toContainElement(projectsLink);
      expect(container).toHaveTextContent("▸ Projects");

      fireEvent.click(
        screen.getByRole("button", { name: "Open terminal" }),
      );
      await waitFor(() => expect(getInput()).toHaveFocus());

      expect(windowEl.hidden).toBe(false);
      expect(windowEl).not.toHaveAttribute("hidden");
      expect(getInput()).toBe(input);
      expect(input).toHaveValue("learn");
      expect(container).toContainElement(projectsLink);

      // Chrome and sprite layers were never remounted by hiding the window.
      expect(screen.getByTestId("banner-chrome")).toBe(bannerChrome);
      expect(screen.getByTestId("walker-sprites")).toBe(walkerSprites);
      expect(container).toContainElement(bannerChrome);
      expect(container).toContainElement(walkerSprites);
    }

    expect(animation.mounts).toEqual({
      banner: 1,
      walkers: 1,
      particles: 1,
      agent: 1,
    });

    // History survived both cycles: ArrowUp recalls the submitted command.
    expect(input).toHaveValue("learn");
    const recall = pressKey("ArrowUp");
    expect(recall.defaultPrevented).toBe(true);
    expect(input).toHaveValue("projects");
  });

  it("renders only LiftStats from a typed projects command in the whole terminal", async () => {
    const { container } = render(<Terminal />);

    submitCommand("projects");
    const link = await screen.findByRole("link", { name: "liftstats.app" });

    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "https://www.liftstats.app/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    // Exactly one project anchor in the output — the contact icons live in
    // the header nav and are not part of `.terminal-output`.
    const projectAnchors = [
      ...container.querySelectorAll<HTMLAnchorElement>(".terminal-output a"),
    ];
    expect(projectAnchors).toHaveLength(1);
    expect(projectAnchors[0]).toBe(link);

    expect(container).toHaveTextContent("▸ Projects");
    expect(container).toHaveTextContent(
      "Offline-first workout tracker with analytics.",
    );
    for (const removed of ["wordbridge", "swipe-brawl", "chess visualizer"]) {
      expect(container).not.toHaveTextContent(removed);
    }
    expect(
      screen.queryByRole("link", { name: "App Store" }),
    ).toBeNull();
    expect(
      container.querySelector(
        'a[href="https://apps.apple.com/app/id6758020980"]',
      ),
    ).toBeNull();
    expect(container.querySelector('a[href*="apps.apple.com"]')).toBeNull();
  });

  it("opens projects from the bottom command chip", async () => {
    render(<Terminal />);

    fireEvent.click(screen.getByRole("button", { name: "projects" }));

    const link = await screen.findByRole("link", { name: "liftstats.app" });
    expect(link).toHaveAttribute("href", "https://www.liftstats.app/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("locks prompt submits and command chips while output is still typing", () => {
    render(<Terminal />);
    animation.deferTypewriter = true;

    submitCommand("skills");
    expect(screen.getByText("▸ Skills")).toBeInTheDocument();
    expect(animation.pendingTypewriter).toHaveLength(1);

    // A submit during the typewriter run is ignored: no new output, and the
    // typed prompt text is not cleared.
    fireEvent.change(getInput(), { target: { value: "about" } });
    const form = getInput().closest("form");
    if (!form) throw new Error("terminal prompt form not rendered");
    fireEvent.submit(form);
    expect(screen.queryByText("▸ About Me")).toBeNull();
    expect(getInput()).toHaveValue("about");

    // Bottom chips share the same lock.
    fireEvent.click(screen.getByRole("button", { name: "projects" }));
    expect(screen.queryByRole("link", { name: "liftstats.app" })).toBeNull();

    resolvePendingTypewriter();
    expect(animation.pendingTypewriter).toHaveLength(0);

    fireEvent.submit(form);
    expect(screen.getByText("▸ About Me")).toBeInTheDocument();
    expect(getInput()).toHaveValue("");
  });

  it("completes Tab once, then releases uncancelled Tab/Shift+Tab and navigates history after reopening", async () => {
    render(<Terminal />);

    submitCommand("projects");
    await screen.findByRole("link", { name: "liftstats.app" });

    fireEvent.click(
      screen.getByRole("button", { name: "Close terminal" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Open terminal" }),
      ).toHaveFocus(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Open terminal" }),
    );
    await waitFor(() => expect(getInput()).toHaveFocus());

    const input = getInput();

    // Partial command: Tab completes and cancels the event so focus stays.
    fireEvent.change(input, { target: { value: "pro" } });
    const completion = pressKey("Tab");
    expect(completion.defaultPrevented).toBe(true);
    expect(input).toHaveValue("projects");

    // Already-complete command: Tab adds no information, so the event is
    // left uncancelled for the browser to move focus on.
    const exhaustedTab = pressKey("Tab");
    expect(exhaustedTab.defaultPrevented).toBe(false);
    expect(input).toHaveValue("projects");

    // Shift+Tab always navigates backwards.
    fireEvent.change(input, { target: { value: "abo" } });
    const shiftTab = pressKey("Tab", { shiftKey: true });
    expect(shiftTab.defaultPrevented).toBe(false);
    expect(input).toHaveValue("abo");

    // Empty prompt: nothing to complete.
    fireEvent.change(input, { target: { value: "" } });
    const emptyTab = pressKey("Tab");
    expect(emptyTab.defaultPrevented).toBe(false);
    expect(input).toHaveValue("");

    // History survived the close/reopen cycle.
    const older = pressKey("ArrowUp");
    expect(older.defaultPrevented).toBe(true);
    expect(input).toHaveValue("projects");

    expect(pressKey("ArrowUp").defaultPrevented).toBe(true);
    expect(input).toHaveValue("projects");

    const newer = pressKey("ArrowDown");
    expect(newer.defaultPrevented).toBe(true);
    expect(input).toHaveValue("");

    // Already past the newest entry: ArrowDown is still consumed (the
    // handler always cancels it) but no longer changes the prompt.
    expect(pressKey("ArrowDown").defaultPrevented).toBe(true);
    expect(input).toHaveValue("");
  });

  it("scrolls the prompt into view smoothly and instantly under reduced motion", async () => {
    const first = render(<Terminal />);
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    expect(scrollIntoView.mock.calls.at(-1)?.[0]).toEqual({
      behavior: "smooth",
    });
    first.unmount();
    scrollIntoView.mockClear();

    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("(prefers-reduced-motion: reduce)"),
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList,
    );

    render(<Terminal />);
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    expect(scrollIntoView.mock.calls.at(-1)?.[0]).toEqual({ behavior: "auto" });
  });

  it("focuses the prompt on chrome clicks but never steals focus from a control", () => {
    render(<Terminal />);
    const input = getInput();
    const maximize = screen.getByRole("button", {
      name: "Maximize terminal",
    });

    act(() => maximize.focus());
    expect(maximize).toHaveFocus();
    // Bubbles to .terminal-window; the guard must ignore button targets.
    fireEvent.click(maximize);
    expect(maximize).toHaveFocus();
    expect(input).not.toHaveFocus();

    // Plain chrome clicks still focus the prompt.
    fireEvent.click(screen.getByText("neel@portfolio ~ % zsh"));
    expect(input).toHaveFocus();
  });
});

// What jsdom cannot establish here: real Tab focus traversal, native
// <button> Enter/Space activation, layout/overflow clipping of the hidden
// window, and the actual maximized viewport sizing and its clipped layout.
// Those are covered by the parent's real-Chromium verification. These tests
// pin the DOM/a11y contract and the injectable behavior (event cancellation,
// focus calls, mount identity) instead.
