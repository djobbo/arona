import type * as Discord from "../vocabulary";

export interface CanvasProps {
  /** An SVG document rendered to PNG by the host at commit time. */
  readonly svg: string;
  readonly width?: number;
  readonly height?: number;
  readonly name?: string;
}

/** Renders an SVG as a PNG attachment inside a media gallery. */
export const Canvas = <Msg>(h: Discord.H<Msg>, props: CanvasProps) =>
  h.canvas
    .prop("svg", props.svg)
    .prop("width", props.width)
    .prop("height", props.height)
    .prop("name", props.name);
