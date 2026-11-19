import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AVAILABLE_COMMANDS, PROJECTS } from "@/data/resumeData";
import { parseColour, runCommand } from "./Terminal";

const ESC = "\x1b";

describe("parseColour URL markup", () => {
  it("renders a real external anchor with the URL label", () => {
    const { container } = render(
      <p>
        {parseColour(
          `See ${ESC}[url:https://example.com/docs]docs${ESC}[/url] end`,
        )}
      </p>,
    );

    const anchor = screen.getByRole("link", { name: "docs" });
    expect(anchor.tagName).toBe("A");
    expect(anchor).toHaveAttribute("href", "https://example.com/docs");
    expect(anchor).toHaveAttribute("target", "_blank");
    expect(anchor).toHaveAttribute("rel", "noopener noreferrer");
    expect(container).toHaveTextContent("See docs end");
  });

  it("stops link clicks from bubbling or invoking onCommand", () => {
    const onCommand = vi.fn();
    const onParentClick = vi.fn();

    render(
      <div onClick={onParentClick}>
        {parseColour(
          `${ESC}[url:https://example.com/docs]docs${ESC}[/url]`,
          onCommand,
        )}
      </div>,
    );

    const anchor = screen.getByRole("link", { name: "docs" });
    // jsdom cannot perform a real external navigation; cancel the default
    // action without touching the propagation behavior under test.
    anchor.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(anchor);

    expect(onParentClick).not.toHaveBeenCalled();
    expect(onCommand).not.toHaveBeenCalled();
  });
});

describe("parseColour mixed markup", () => {
  it("keeps styles, plain text, links and command chips working together", () => {
    const onCommand = vi.fn();
    const onParentClick = vi.fn();

    const { container } = render(
      <div onClick={onParentClick}>
        {parseColour(
          [
            "plain",
            `${ESC}[cyan]cyan text${ESC}[/cyan]`,
            `${ESC}[green]green text${ESC}[/green]`,
            `${ESC}[amber]amber text${ESC}[/amber]`,
            `${ESC}[bold]bold text${ESC}[/bold]`,
            `${ESC}[url:https://example.com]link label${ESC}[/url]`,
            `${ESC}[cmd:about]about cmd${ESC}[/cmd]`,
            "tail",
          ].join(" "),
          onCommand,
        )}
      </div>,
    );

    expect(container).toHaveTextContent(
      "plain cyan text green text amber text bold text link label about cmd tail",
    );
    expect(container.textContent).not.toContain(ESC);

    const cyan = screen.getByText("cyan text");
    const green = screen.getByText("green text");
    const amber = screen.getByText("amber text");
    const bold = screen.getByText("bold text");
    expect(cyan).toHaveStyle({ color: "#00fff5" });
    expect(green).toHaveStyle({ color: "#39ff14" });
    expect(amber).toHaveStyle({ color: "#ffbf00" });
    expect(bold).toHaveStyle({ fontWeight: "700" });

    const anchor = screen.getByRole("link", { name: "link label" });
    expect(anchor).toHaveAttribute("href", "https://example.com");
    expect(anchor).toHaveAttribute("target", "_blank");
    expect(anchor).toHaveAttribute("rel", "noopener noreferrer");

    const chip = screen.getByRole("button", { name: "about cmd" });
    fireEvent.click(chip);
    expect(onCommand).toHaveBeenCalledTimes(1);
    expect(onCommand).toHaveBeenLastCalledWith("about");

    fireEvent.keyDown(chip, { key: "Enter" });
    expect(onCommand).toHaveBeenCalledTimes(2);
    expect(onCommand).toHaveBeenLastCalledWith("about");

    expect(onParentClick).not.toHaveBeenCalled();
  });
});

describe("runCommand projects", () => {
  it("renders every project name, description and URL label", () => {
    const output = runCommand("projects");

    expect(output).not.toContain("command not found");
    expect(output).toContain(`${ESC}[green]▸ Projects${ESC}[/green]`);

    for (const project of PROJECTS) {
      expect(output).toContain(project.name);
      expect(output).toContain(project.description);
      expect(output).toContain(
        `${ESC}[url:${project.link}]${project.label}${ESC}[/url]`,
      );
      expect(output).toContain(`${ESC}[amber]${project.name}${ESC}[/amber]`);
    }
  });

  it("normalizes whitespace and case", () => {
    expect(runCommand("  PrOjEcTs  ")).toBe(runCommand("projects"));
  });

  it("is discoverable through help and AVAILABLE_COMMANDS", () => {
    expect(AVAILABLE_COMMANDS).toContain("projects");
    expect(runCommand("help")).toContain(
      `${ESC}[cmd:projects]projects${ESC}[/cmd]`,
    );
  });
});
