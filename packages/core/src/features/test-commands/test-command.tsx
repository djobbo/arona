import { Component } from "./component"
import { createSlashCommand } from "../command/create-slash-command"

export const testCommand = createSlashCommand("ping", {
  command: (command) =>
    command
      .setDescription("Replies with Pong!")
      .addTypedStringOption((option) =>
        option
          .setName("msg")
          .setDescription("The input to echo back")
          .setRequired(true),
      )
      .addTypedUserOption((option) =>
        option.setName("target").setDescription("Goat").setRequired(true),
      ),
  loader: async () => {
    return {
      greeting: "Hello",
    }
  },
  component: Component,
})
