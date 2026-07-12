import { describe, expect, it } from "vitest";

import {
  isOutputFormat,
  isPresetName,
  PRESET_NAMES,
  PRESETS,
} from "./presets.js";

describe("isPresetName", () => {
  it.each(PRESET_NAMES)("%s is valid as a preset name", (name) => {
    expect(isPresetName(name)).toBe(true);
  });

  it("an unknown preset name is invalid", () => {
    expect(isPresetName("unknown")).toBe(false);
  });
});

describe("isOutputFormat", () => {
  it.each(["jpeg", "jpg", "webp", "png"])(
    "%s is valid as an output format",
    (format) => {
      expect(isOutputFormat(format)).toBe(true);
    },
  );

  it("an unknown output format is invalid", () => {
    expect(isOutputFormat("gif")).toBe(false);
  });
});

describe("PRESETS", () => {
  it("all presets define the same keys as PRESET_NAMES", () => {
    expect(Object.keys(PRESETS).sort()).toEqual([...PRESET_NAMES].sort());
  });
});
