export type InkTool = "pen" | "highlighter" | "eraser";

export type InkPoint = {
  x: number;
  y: number;
  pressure: number;
};

export type InkStroke = {
  id: string;
  tool: InkTool;
  color: string;
  size: number;
  opacity: number;
  points: InkPoint[];
  penInput?: boolean;
};

export type InkLayout = {
  naturalWidth: number;
  naturalHeight: number;
  drawWidth: number;
  drawHeight: number;
  offsetX: number;
  offsetY: number;
};
