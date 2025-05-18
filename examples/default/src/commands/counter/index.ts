import { Counter } from "./counter"
import { createSlashCommand } from "@arona/core"

export const counter = createSlashCommand("counter", {
  command: (command) => command.setDescription("Counting example command"),
  component: Counter,
})
