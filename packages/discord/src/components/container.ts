import type { View } from "@effect/ui";
import type * as Discord from "../vocabulary";

export interface ContainerProps {
  readonly accentColor?: string;
  readonly spoiler?: boolean;
}

export interface ContainerOptions<Msg, C extends View.Children<Msg>> {
  readonly props?: ContainerProps;
  readonly children: C;
}

/** A Components V2 container, the top-level grouping element. */
export const Container = <Msg, C extends View.Children<Msg>>(
  h: Discord.H<Msg>,
  { props, children }: ContainerOptions<Msg, C>,
) =>
  h.container
    .attr("accentColor", props?.accentColor)
    .attr("spoiler", props?.spoiler ? "" : undefined)
    .children(children);
