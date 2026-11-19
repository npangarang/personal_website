import { describe, expect, it } from "vitest";
import { AVAILABLE_COMMANDS, PROJECTS } from "./resumeData";

// The projects list is content, not just presentation: this lock protects the
// exact copy, ordering and outbound URLs that were requested.
const EXPECTED_PROJECTS = [
  {
    name: "LiftStats",
    description:
      "Offline-first workout tracker with analytics. React Native/Expo, SQLite, Supabase sync. Shipped on the App Store.",
    link: "https://apps.apple.com/app/id6758020980",
    label: "App Store",
  },
  {
    name: "wordbridge",
    description: "Two-player word game, live in production.",
    link: "https://wordbridge.lol",
    label: "wordbridge.lol",
  },
  {
    name: "swipe-brawl",
    description: "Lightweight mobile-browser Smash Bros-style brawler.",
    link: "https://github.com/npangarang/swipe-brawl",
    label: "GitHub",
  },
  {
    name: "chess visualizer",
    description:
      "Chrome MV3 extension overlaying a per-square pressure heatmap on chess.com boards.",
    link: "https://github.com/npangarang/chess_visualizer",
    label: "GitHub",
  },
];

describe("PROJECTS", () => {
  it("has exactly four entries in the requested order", () => {
    expect(PROJECTS).toHaveLength(4);
    expect(PROJECTS.map((project) => project.name)).toEqual(
      EXPECTED_PROJECTS.map((project) => project.name),
    );
  });

  it("matches the requested copy and URLs exactly", () => {
    expect(PROJECTS).toEqual(EXPECTED_PROJECTS);
  });

  it("has non-empty labels and HTTPS links", () => {
    for (const project of PROJECTS) {
      expect(project.label.trim()).not.toBe("");
      expect(project.link.trim()).not.toBe("");
      expect(project.link).toMatch(/^https:\/\//);
    }
  });
});

describe("AVAILABLE_COMMANDS", () => {
  it("advertises the projects command", () => {
    expect(AVAILABLE_COMMANDS).toContain("projects");
  });
});
