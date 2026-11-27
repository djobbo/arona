import { createSlashCommand } from "@arona/discord";
import { Counter } from "./counter";

export const counter = createSlashCommand("counter", {
  command: (command) => command.setDescription("Counting example command"),
  component: Counter,
});
