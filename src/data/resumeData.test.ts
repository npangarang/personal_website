import { describe, expect, it } from "vitest";
import { AVAILABLE_COMMANDS, PROJECTS } from "./resumeData";

// The projects list is content, not just presentation: this lock protects the
// exact copy, ordering and outbound URLs that were requested.
const EXPECTED_PROJECTS = [
  {
    name: "LiftStats",
    description:
      "Offline-first workout tracker with analytics. React Native/Expo, SQLite, Supabase sync. Shipped on the App Store.",
    link: "https://www.liftstats.app/",
    label: "liftstats.app",
  },
];

// Projects that should no longer be presented anywhere in the list.
const REMOVED_PROJECT_NAMES = ["wordbridge", "swipe-brawl", "chess visualizer"];
const REMOVED_PROJECT_LINKS = [
  "https://wordbridge.lol",
  "https://github.com/npangarang/swipe-brawl",
  "https://github.com/npangarang/chess_visualizer",
];
const OBSOLETE_APP_STORE_URL = "https://apps.apple.com/app/id6758020980";

describe("PROJECTS", () => {
  it("has exactly one entry: LiftStats", () => {
    expect(PROJECTS).toHaveLength(1);
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

  it("does not include removed projects or the obsolete App Store URL", () => {
    const serialized = JSON.stringify(PROJECTS);

    for (const name of REMOVED_PROJECT_NAMES) {
      expect(PROJECTS.map((project) => project.name)).not.toContain(name);
      expect(serialized).not.toContain(name);
    }

    for (const link of REMOVED_PROJECT_LINKS) {
      expect(PROJECTS.map((project) => project.link)).not.toContain(link);
      expect(serialized).not.toContain(link);
    }

    expect(PROJECTS.map((project) => project.link)).not.toContain(
      OBSOLETE_APP_STORE_URL,
    );
    expect(serialized).not.toContain("apps.apple.com");
  });
});

describe("AVAILABLE_COMMANDS", () => {
  it("advertises the projects command", () => {
    expect(AVAILABLE_COMMANDS).toContain("projects");
  });
});
