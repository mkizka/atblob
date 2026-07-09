export const PRESET_NAMES = [
  "avatar",
  "avatar_thumbnail",
  "banner",
  "feed_thumbnail",
  "feed_fullsize",
] as const;

export type PresetName = (typeof PRESET_NAMES)[number];

export type OutputFormat = "jpeg" | "jpg" | "webp" | "png";

export const OUTPUT_FORMATS: readonly OutputFormat[] = [
  "jpeg",
  "jpg",
  "webp",
  "png",
];

export type Preset = {
  width: number;
  height: number;
  fit: "cover" | "inside";
  format: OutputFormat;
  min: boolean;
};

export const PRESETS: Record<PresetName, Preset> = {
  avatar: {
    width: 1000,
    height: 1000,
    fit: "cover",
    format: "webp",
    min: true,
  },
  avatar_thumbnail: {
    width: 128,
    height: 128,
    fit: "cover",
    format: "webp",
    min: true,
  },
  banner: {
    width: 3000,
    height: 1000,
    fit: "cover",
    format: "webp",
    min: true,
  },
  feed_thumbnail: {
    width: 2000,
    height: 2000,
    fit: "inside",
    format: "webp",
    min: true,
  },
  feed_fullsize: {
    width: 1000,
    height: 1000,
    fit: "inside",
    format: "webp",
    min: true,
  },
};

export const isPresetName = (value: string): value is PresetName =>
  PRESET_NAMES.some((name) => name === value);

export const isOutputFormat = (value: string): value is OutputFormat =>
  OUTPUT_FORMATS.some((format) => format === value);
