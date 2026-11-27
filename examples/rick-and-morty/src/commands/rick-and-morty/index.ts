import { Query, UiSchema } from "@effect/ui";
import {
  ActionRow,
  Button,
  Container,
  Fragment,
  Label,
  Modal,
  Option,
  Section,
  Select,
  Text,
  TextInput,
  Thumbnail,
} from "@arona/discord";
import * as Discord from "@arona/discord";
import { Effect, Layer, Schema } from "effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientResponse from "effect/http/HttpClientResponse";
import { AsyncResult } from "effect/reactivity";

const Character = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  status: Schema.String,
  species: Schema.String,
  image: Schema.String,
});

type Character = typeof Character.Type;

const PageMetadata = Schema.Struct({
  count: Schema.Number,
  pages: Schema.Number,
  next: Schema.NullOr(Schema.String),
  prev: Schema.NullOr(Schema.String),
});

type PageMetadata = typeof PageMetadata.Type;

const SearchResult = Schema.Struct({
  characters: Schema.Array(Character),
  pageMetadata: Schema.NullOr(PageMetadata),
});

const SearchResponse = Schema.Struct({
  info: Schema.optional(PageMetadata),
  results: Schema.optional(Schema.Array(Character)),
});

const emptyResult: typeof SearchResult.Type = {
  characters: [],
  pageMetadata: null,
};

export class SearchCharacters extends Query.Service<SearchCharacters>()(
  "rick-and-morty/SearchCharacters",
  {
    args: { query: Schema.String, page: Schema.Number },
    success: SearchResult,
    error: Schema.Never,
    staleTime: "5 minutes",
  },
) {
  static readonly layer = this.toLayer(
    Effect.gen(function* () {
      const http = yield* HttpClient.HttpClient;
      return ({ query, page }) =>
        Effect.gen(function* () {
          const response = yield* http.get(
            `https://rickandmortyapi.com/api/character/?name=${encodeURIComponent(query)}&page=${page}`,
          );
          if (response.status === 404) return emptyResult;

          const data = yield* HttpClientResponse.schemaBodyJson(SearchResponse)(response);
          return {
            characters: data.results ?? [],
            pageMetadata: data.info ?? null,
          };
        }).pipe(Effect.catch(() => Effect.succeed(emptyResult)));
    }),
  );
}

const AppMessage = UiSchema.TaggedEnum({
  ClickedSearch: {},
  SubmittedSearch: { search: Schema.String },
  ChangedSelection: { id: Schema.String },
  ChangedPage: { page: Schema.Number },
});

const AppProps = Schema.Struct({ query: Schema.optional(Schema.String) });

const statusEmojis: Record<string, string> = {
  Alive: "🙂",
  Dead: "💀",
  unknown: "❓",
};

const statusColor = (status: string): string => {
  switch (status) {
    case "Alive":
      return "Green";
    case "Dead":
      return "Red";
    default:
      return "Default";
  }
};

export const App = Discord.component({
  name: "RickAndMorty",
  props: AppProps,
  model: Schema.Struct({
    search: Schema.String,
    page: Schema.Number,
    selected: Schema.String,
    modalOpen: Schema.Boolean,
  }),
  message: AppMessage,
  queries: {
    characters: {
      query: SearchCharacters,
      args: ({ model }) => ({ query: model.search, page: model.page }),
    },
  },
}).make({
  init: ($) => ({
    search: $.props.query ?? "",
    page: 1,
    selected: "",
    modalOpen: false,
  }),
  update: {
    ClickedSearch: ($) => $.evolve({ modalOpen: true }),
    SubmittedSearch: ($, message) =>
      $.evolve({
        search: message.search,
        page: 1,
        selected: "",
        modalOpen: false,
      }),
    ChangedSelection: ($, message) => $.evolve({ selected: message.id }),
    ChangedPage: ($, message) => $.evolve({ page: Math.max(1, message.page), selected: "" }),
  },
  view: (h, model) => {
    const result = h.queries.characters;
    const characters = AsyncResult.isSuccess(result) ? result.value.characters : [];
    const pageMetadata: PageMetadata | null = AsyncResult.isSuccess(result)
      ? result.value.pageMetadata
      : null;
    const isLoading = AsyncResult.isInitial(result);
    const pages = pageMetadata?.pages ?? 0;
    const canNavigate = !isLoading && pageMetadata !== null && pages > 0;
    const character =
      characters.find((entry) => String(entry.id) === model.selected) ?? characters[0];

    return Fragment(h, {
      children: [
        Section(h, {
          accessory: Button(h, {
            onClick: AppMessage.ClickedSearch(),
            children: ["Search"],
          }),
          children: [
            Text(h, "### Search Character"),
            model.search
              ? Text(h, `Current search: ${model.search}`)
              : Text(h, "No search term set."),
          ],
        }),
        character
          ? Container(h, {
              props: { accentColor: statusColor(character.status) },
              children: [
                Section(h, {
                  accessory: Thumbnail(h, { url: character.image }),
                  children: [Text(h, `${character.name} \`${character.species}\``)],
                }),
                Text(h, character.status),
              ],
            })
          : Container(h, { children: [Text(h, "No character selected")] }),
        characters.length > 0
          ? ActionRow(h, {
              children: [
                Select(h, {
                  disabled: isLoading,
                  onChange: (interaction) =>
                    AppMessage.ChangedSelection({ id: interaction.values[0] ?? "" }),
                  children: characters.map((entry) =>
                    Option(h, {
                      value: String(entry.id),
                      label: entry.name,
                      description: `${entry.species} - ${entry.status}`,
                      selected: entry.id === character?.id,
                      emoji: statusEmojis[entry.status] ?? "❔",
                    }),
                  ),
                }),
              ],
            })
          : false,
        ActionRow(h, {
          children: [
            Button(h, {
              style: "Secondary",
              onClick: () => AppMessage.ChangedPage({ page: 1 }),
              disabled: !canNavigate || model.page <= 1,
              children: ["<<"],
            }),
            Button(h, {
              style: "Primary",
              onClick: () => AppMessage.ChangedPage({ page: model.page - 1 }),
              disabled: !canNavigate || model.page <= 1,
              children: ["<"],
            }),
            Button(h, {
              style: "Secondary",
              disabled: true,
              children: [
                `Page ${model.page}${pageMetadata === null ? "" : ` / ${pageMetadata.pages}`}`,
              ],
            }),
            Button(h, {
              style: "Primary",
              onClick: () => AppMessage.ChangedPage({ page: model.page + 1 }),
              disabled: !canNavigate || (pageMetadata !== null && pageMetadata.pages <= model.page),
              children: [">"],
            }),
            Button(h, {
              style: "Secondary",
              onClick: () => AppMessage.ChangedPage({ page: pageMetadata?.pages ?? 1 }),
              disabled: !canNavigate || (pageMetadata !== null && pageMetadata.pages <= model.page),
              children: [">>"],
            }),
          ],
        }),
        model.modalOpen
          ? Modal(h, {
              title: "Search Character",
              onSubmit: (payload) =>
                AppMessage.SubmittedSearch({ search: payload.values.search ?? "" }),
              children: [
                Label(h, {
                  label: "Search for a character by name",
                  children: [
                    TextInput(h, {
                      name: "search",
                      style: "Short",
                      value: model.search,
                      placeholder: "e.g. Rick Sanchez, Morty Smith, etc.",
                      minLength: 1,
                      maxLength: 50,
                    }),
                  ],
                }),
              ],
            })
          : false,
      ],
    });
  },
});

export const rickAndMortySearch = Discord.createSlashCommand<{ query?: string }>("search", {
  command: (command) =>
    command
      .setDescription("Search Rick and Morty API")
      .addTypedStringOption((option) =>
        option.setName("query").setDescription("Search query").setRequired(false),
      ),
  component: App,
  layer: SearchCharacters.layer.pipe(Layer.provide(FetchHttpClient.layer)),
});
