export type PageInfo = {
  count: number
  pages: number
  next: string | null
  prev: string | null
}

export type CharacterStatus = "Alive" | "Dead" | "unknown"

export type Character = {
  id: number
  name: string
  status: CharacterStatus
  species: string
  type: string
  gender: string
  origin: {
    name: string
  }
  location: {
    name: string
  }
  image: string
}
