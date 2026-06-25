import { createElement } from "react";
import type { ComponentType, SVGProps } from "react";

type LogoIcon = ComponentType<SVGProps<SVGSVGElement>>;

type PathDef = { kind: "path"; d: string };
type CircleDef = { kind: "circle"; cx: number; cy: number; r: number };
type ShapeDef = PathDef | CircleDef;

const buildIcon = (shapes: ShapeDef[]): LogoIcon => {
  const Icon: LogoIcon = (props) =>
    createElement(
      "svg",
      {
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.7,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        ...props,
      },
      shapes.map((shape, index) => {
        if (shape.kind === "circle") {
          return createElement("circle", { key: index, cx: shape.cx, cy: shape.cy, r: shape.r });
        }
        return createElement("path", { key: index, d: shape.d });
      })
    );
  return Icon;
};

const EMBLEM_SET: LogoIcon[] = [
  buildIcon([{ kind: "path", d: "M12 2.8l2.2 4.6L19 9.6l-4.8 2.2L12 16.4l-2.2-4.6L5 9.6l4.8-2.2L12 2.8z" }, { kind: "circle", cx: 12, cy: 12, r: 1.6 }]),
  buildIcon([{ kind: "path", d: "M3 15.5c4-1.2 7-4.3 9-9 2 4.7 5 7.8 9 9" }, { kind: "path", d: "M5 19c3.4-.7 5.8-2.6 7-5.7 1.2 3.1 3.6 5 7 5.7" }, { kind: "path", d: "M12 5v14" }]),
  buildIcon([{ kind: "circle", cx: 12, cy: 12, r: 3.2 }, { kind: "path", d: "M4.5 12c2.1-3.3 5-5 7.5-5s5.4 1.7 7.5 5c-2.1 3.3-5 5-7.5 5s-5.4-1.7-7.5-5z" }, { kind: "path", d: "M12 4.5c3.3 2.1 5 5 5 7.5s-1.7 5.4-5 7.5c-3.3-2.1-5-5-5-7.5s1.7-5.4 5-7.5z" }]),
  buildIcon([{ kind: "path", d: "M12 3l7 4.2V12c0 5-3.1 7.6-7 9-3.9-1.4-7-4-7-9V7.2L12 3z" }, { kind: "path", d: "M9 12l2 2 4-4" }]),
  buildIcon([{ kind: "path", d: "M3 12c2.3-2.3 4.6-3.5 7-3.5S14.7 9.7 17 12c-2.3 2.3-4.6 3.5-7 3.5S5.3 14.3 3 12z" }, { kind: "path", d: "M18 7a9.5 9.5 0 010 10" }, { kind: "path", d: "M6 7a9.5 9.5 0 000 10" }, { kind: "circle", cx: 10, cy: 12, r: 1.2 }]),
  buildIcon([{ kind: "path", d: "M12 2l2.4 4.7L20 9l-3.8 3 1.1 5-5.3-2.5L6.7 17l1.1-5L4 9l5.6-2.3L12 2z" }, { kind: "path", d: "M12 8v8" }, { kind: "path", d: "M8 12h8" }]),
  buildIcon([{ kind: "path", d: "M2.5 12h4l2-3.2L11 16l2.2-4.1 1.3 2.1h7" }, { kind: "path", d: "M5 7.5A7.8 7.8 0 0112 4a7.8 7.8 0 017 3.5" }, { kind: "path", d: "M5 16.5A7.8 7.8 0 0012 20a7.8 7.8 0 007-3.5" }]),
  buildIcon([{ kind: "path", d: "M12 2l7 7-7 13L5 9l7-7z" }, { kind: "path", d: "M12 2v20" }, { kind: "path", d: "M5 9h14" }]),
  buildIcon([{ kind: "circle", cx: 8, cy: 9, r: 4 }, { kind: "circle", cx: 16, cy: 9, r: 4 }, { kind: "path", d: "M5.5 16.5L12 21l6.5-4.5" }]),
  buildIcon([{ kind: "path", d: "M12 3v18" }, { kind: "path", d: "M7 6l2.2 4.2L7 14" }, { kind: "path", d: "M17 6l-2.2 4.2L17 14" }, { kind: "path", d: "M9 21h6" }]),
  buildIcon([{ kind: "path", d: "M4 8c2-2.7 4.8-4 8-4s6 1.3 8 4" }, { kind: "path", d: "M4 16c2 2.7 4.8 4 8 4s6-1.3 8-4" }, { kind: "path", d: "M7.5 12c1.3-1.8 2.8-2.7 4.5-2.7s3.2.9 4.5 2.7c-1.3 1.8-2.8 2.7-4.5 2.7S8.8 13.8 7.5 12z" }]),
  buildIcon([{ kind: "path", d: "M12 2.8l8.3 4.8v8.8L12 21.2l-8.3-4.8V7.6L12 2.8z" }, { kind: "path", d: "M12 2.8v18.4" }, { kind: "path", d: "M3.7 7.6L12 12l8.3-4.4" }]),
];

export type TeamLogoId =
  | "rocket" | "shield" | "zap" | "globe" | "cpu" | "atom" | "anchor"
  | "binary" | "boxes" | "briefcase" | "bug" | "cloud" | "code"
  | "compass" | "container" | "database" | "diamond" | "eye"
  | "feather" | "file-code" | "filter" | "flame" | "flask"
  | "folder" | "gauge" | "gem" | "ghost" | "gift" | "grad"
  | "hdd" | "heart" | "infinity" | "key" | "laptop" | "layers"
  | "bulb" | "link" | "lock" | "map" | "megaphone" | "micro"
  | "music" | "palette" | "clip" | "phone" | "pie"
  | "puzzle" | "radio" | "search" | "send" | "settings" | "share"
  | "smile" | "star" | "target" | "terminal" | "trophy" | "users"
  | "video" | "wallet" | "wand" | "watch" | "wind" | "wrench";

export interface TeamLogo {
  id: TeamLogoId;
  icon: LogoIcon;
  label: string;
  fgColor: string;
  bgColor: string;
  borderColor: string;
}

const LEGACY_LOGO_IDS: TeamLogoId[] = [
  "rocket", "shield", "zap", "globe", "cpu", "atom", "anchor",
  "binary", "boxes", "briefcase", "bug", "cloud", "code",
  "compass", "container", "database", "diamond", "eye",
  "feather", "file-code", "filter", "flame", "flask",
  "folder", "gauge", "gem", "ghost", "gift", "grad",
  "hdd", "heart", "infinity", "key", "laptop", "layers",
  "bulb", "link", "lock", "map", "megaphone", "micro",
  "music", "palette", "clip", "phone", "pie",
  "puzzle", "radio", "search", "send", "settings", "share",
  "smile", "star", "target", "terminal", "trophy", "users",
  "video", "wallet", "wand", "watch", "wind", "wrench",
];

const toLabel = (id: TeamLogoId): string =>
  id.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

const LOGO_PALETTES = [
  { fg: "#7C3AED", bg: "#EDE9FE", border: "#C4B5FD" },
  { fg: "#0891B2", bg: "#CFFAFE", border: "#67E8F9" },
  { fg: "#2563EB", bg: "#DBEAFE", border: "#93C5FD" },
  { fg: "#DB2777", bg: "#FCE7F3", border: "#F9A8D4" },
  { fg: "#DC2626", bg: "#FEE2E2", border: "#FCA5A5" },
  { fg: "#7C3AED", bg: "#E9D5FF", border: "#C4B5FD" },
  { fg: "#EA580C", bg: "#FFEDD5", border: "#FDBA74" },
  { fg: "#84CC16", bg: "#ECFCCB", border: "#BEF264" },
  { fg: "#0EA5E9", bg: "#E0F2FE", border: "#7DD3FC" },
  { fg: "#0F766E", bg: "#CCFBF1", border: "#5EEAD4" },
  { fg: "#4F46E5", bg: "#E0E7FF", border: "#A5B4FC" },
  { fg: "#D97706", bg: "#FEF3C7", border: "#FCD34D" },
] as const;

export const TEAM_LOGOS: TeamLogo[] = LEGACY_LOGO_IDS.map((id, index) => ({
  id,
  icon: EMBLEM_SET[index % EMBLEM_SET.length],
  label: toLabel(id),
  fgColor: LOGO_PALETTES[index % LOGO_PALETTES.length].fg,
  bgColor: LOGO_PALETTES[index % LOGO_PALETTES.length].bg,
  borderColor: LOGO_PALETTES[index % LOGO_PALETTES.length].border,
}));

export const getLogoById = (id: string): TeamLogo => {
  return TEAM_LOGOS.find((logo) => logo.id === id) || TEAM_LOGOS[0];
};

export const getRandomLogoId = (): TeamLogoId => {
  const randomIndex = Math.floor(Math.random() * TEAM_LOGOS.length);
  return TEAM_LOGOS[randomIndex].id;
};

export const getDeterministicLogoId = (seed: string): TeamLogoId => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % TEAM_LOGOS.length);
  return TEAM_LOGOS[index].id;
};
