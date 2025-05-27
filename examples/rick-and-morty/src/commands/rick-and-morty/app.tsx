import { CharacterDisplay } from "./components/character-display"
import { CharacterSearch } from "./components/character-search"
import { CharacterSearchProvider } from "./hooks/character-search-provider"
import { CharacterSelect } from "./components/character-select"
import { Container, Section, Text } from "@arona/discord"
import { Navigation } from "./components/navigation"
import { QueryClientProvider } from "@tanstack/react-query"
import { rickAndMortySearch } from "."

export const App = () => {
  const {
    loaderData: { queryClient },
    interaction: {
      params: { query },
    },
  } = rickAndMortySearch.useCommandContext()

  return (
    <QueryClientProvider client={queryClient}>
      <CharacterSearchProvider defaultSearch={query}>
        <CharacterSearch />
        <CharacterDisplay />
        <CharacterSelect />
        <Navigation />
      </CharacterSearchProvider>
    </QueryClientProvider>
  )
}
