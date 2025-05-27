import { App } from "./app"
import { QueryClient } from "@tanstack/react-query"
import { createSlashCommand } from "@arona/discord"

export const rickAndMortySearch = createSlashCommand("search", {
  command: (command) =>
    command
      .setDescription("Search Rick and Morty API")
      .addTypedStringOption((option) =>
        option
          .setName("query")
          .setDescription("Search query")
          .setRequired(false),
      ),
  loader: () => {
    return {
      queryClient: new QueryClient(),
    }
  },
  component: App,
})
