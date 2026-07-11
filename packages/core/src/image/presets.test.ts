import { describe, expect, it } from "vitest";

import {
  isOutputFormat,
  isPresetName,
  PRESET_NAMES,
  PRESETS,
} from "./presets.js";

describe("isPresetName", () => {
  it.each(PRESET_NAMES)("%sはpreset名として有効", (name) => {
    expect(isPresetName(name)).toBe(true);
  });

  it("未知のpreset名は無効", () => {
    expect(isPresetName("unknown")).toBe(false);
  });
});

describe("isOutputFormat", () => {
  it.each(["jpeg", "jpg", "webp", "png"])(
    "%sは出力形式として有効",
    (format) => {
      expect(isOutputFormat(format)).toBe(true);
    },
  );

  it("未知の出力形式は無効", () => {
    expect(isOutputFormat("gif")).toBe(false);
  });
});

describe("PRESETS", () => {
  it("全てのpresetにPRESET_NAMESと同じキーが定義されている", () => {
    expect(Object.keys(PRESETS).sort()).toEqual([...PRESET_NAMES].sort());
  });
});
