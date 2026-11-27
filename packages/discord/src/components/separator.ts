import type * as Discord from "../vocabulary";

export interface SeparatorProps {
  readonly divider?: boolean;
  readonly spacing?: number;
}

/** A visual separator between Components V2 elements. */
export const Separator = <Msg>(h: Discord.H<Msg>, props: SeparatorProps = {}) =>
  h.separator.attrs({
    divider: props.divider === false ? "false" : undefined,
    spacing: props.spacing?.toString(),
  });
