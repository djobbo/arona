import { mountMessage } from "@arona/discord";
import { FakeChannel, findComponent } from "@arona/discord/testing";
import { Effect } from "effect";
import { describe, expect, it, vi } from "vite-plus/test";
import { App, SearchCharacters } from ".";

const character = {
  id: 1,
  name: "Rick Sanchez",
  status: "Alive",
  species: "Human",
  image: "https://example.com/rick.png",
};

const morty = {
  id: 2,
  name: "Morty Smith",
  status: "Alive",
  species: "Human",
  image: "https://example.com/morty.png",
};

const summer = {
  id: 3,
  name: "Summer Smith",
  status: "Alive",
  species: "Human",
  image: "https://example.com/summer.png",
};

const pageMetadata = (page = 1, pages = 2) => ({
  count: 40,
  pages,
  next: page < pages ? String(page + 1) : null,
  prev: page > 1 ? String(page - 1) : null,
});

const loaded = (characters = [character, morty], page = 1, pages = 2) => ({
  characters,
  pageMetadata: pageMetadata(page, pages),
});

const empty = { characters: [], pageMetadata: null };

const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

const payload = (channel: FakeChannel) => channel.edits.at(-1) ?? channel.sent[0];

const textContents = (value: unknown): string[] => {
  const out: string[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (record.type === 10 && typeof record.content === "string") out.push(record.content);
    for (const key of ["components", "items"]) {
      const children = record[key];
      if (Array.isArray(children)) for (const child of children) visit(child);
    }
    if (record.accessory) visit(record.accessory);
  };
  visit(value);
  return out;
};

const buttons = (value: unknown) => {
  const out: Array<Record<string, unknown>> = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (record.type === 2) out.push(record);
    for (const key of ["components", "items"]) {
      const children = record[key];
      if (Array.isArray(children)) for (const child of children) visit(child);
    }
    if (record.accessory) visit(record.accessory);
  };
  visit(value);
  return out;
};

const fakeButton = (customId: string, showModal?: (builder: unknown) => Promise<void>) => {
  const interaction = {
    customId,
    replied: false,
    deferred: false,
    isButton: () => true,
    isAnySelectMenu: () => false,
    isModalSubmit: () => false,
    isRepliable: () => true,
    ...(showModal === undefined ? {} : { showModal }),
    deferUpdate: async () => {
      interaction.deferred = true;
    },
  };
  return interaction;
};

const fakeSelect = (customId: string, values: string[]) => {
  const interaction = {
    customId,
    values,
    replied: false,
    deferred: false,
    isButton: () => false,
    isStringSelectMenu: () => true,
    isAnySelectMenu: () => true,
    isModalSubmit: () => false,
    isRepliable: () => true,
    deferUpdate: async () => {
      interaction.deferred = true;
    },
  };
  return interaction;
};

const fakeModal = (customId: string, values: Record<string, string>) => {
  const interaction = {
    customId,
    fields: {
      getTextInputValue: (_name: string) => Object.values(values)[0] ?? "",
    },
    replied: false,
    deferred: false,
    isButton: () => false,
    isAnySelectMenu: () => false,
    isModalSubmit: () => true,
    isRepliable: () => true,
    deferUpdate: async () => {
      interaction.deferred = true;
    },
  };
  return interaction;
};

const layerFor = (result: (args: { query: string; page: number }) => unknown) =>
  SearchCharacters.toLayer((args) => Effect.succeed(result(args) as never));

describe("rick-and-morty example", () => {
  it("renders the search, character display, select, and navigation", async () => {
    const channel = new FakeChannel();
    const { root } = await mountMessage(
      channel.asRef(),
      App,
      { query: "rick" },
      {
        layer: layerFor(() => loaded()),
      },
    );

    await settle();
    const view = payload(channel);

    expect(textContents(view)).toEqual(
      expect.arrayContaining([
        "### Search Character",
        "Current search: rick",
        "Rick Sanchez `Human`",
        "Alive",
      ]),
    );

    const container = findComponent(view, (component) => component.type === 17);
    expect(container?.accent_color).toBe(5763719);

    const select = findComponent(view, (component) => component.type === 3);
    expect(select).toMatchObject({
      options: [
        {
          label: "Rick Sanchez",
          value: "1",
          description: "Human - Alive",
          default: true,
          emoji: { name: "🙂" },
        },
        { label: "Morty Smith", value: "2" },
      ],
    });

    expect(buttons(view).map((button) => button.label)).toEqual([
      "Search",
      "<<",
      "<",
      "Page 1 / 2",
      ">",
      ">>",
    ]);
    expect(findComponent(view, (component) => component.type === 11)).toMatchObject({
      media: { url: "https://example.com/rick.png" },
    });

    await root.unmount();
  });

  it("shows the empty state when the query returns no characters", async () => {
    const channel = new FakeChannel();
    const { root } = await mountMessage(
      channel.asRef(),
      App,
      { query: "missing" },
      {
        layer: layerFor(() => empty),
      },
    );

    await settle();
    const view = payload(channel);

    expect(textContents(view)).toEqual(
      expect.arrayContaining(["Current search: missing", "No character selected"]),
    );
    expect(findComponent(view, (component) => component.type === 3)).toBeUndefined();
    expect(buttons(view).map((button) => button.label)).toEqual([
      "Search",
      "<<",
      "<",
      "Page 1",
      ">",
      ">>",
    ]);
    expect(buttons(view).find((button) => button.label === ">")?.disabled).toBe(true);

    await root.unmount();
  });

  it("updates the character display when the selection changes", async () => {
    const channel = new FakeChannel();
    const { root } = await mountMessage(
      channel.asRef(),
      App,
      { query: "rick" },
      {
        layer: layerFor(() => loaded()),
      },
    );
    await settle();

    const select = findComponent(payload(channel), (component) => component.type === 3);
    await root.interactionListener(fakeSelect(String(select?.custom_id), ["2"]) as never);
    await settle();

    const view = payload(channel);
    expect(textContents(view)).toEqual(expect.arrayContaining(["Morty Smith `Human`"]));
    expect(findComponent(view, (component) => component.type === 3)).toMatchObject({
      options: [
        { label: "Rick Sanchez", value: "1", default: false },
        { label: "Morty Smith", value: "2", default: true },
      ],
    });

    await root.unmount();
  });

  it("navigates pages with the arrow buttons", async () => {
    const channel = new FakeChannel();
    const { root } = await mountMessage(
      channel.asRef(),
      App,
      { query: "rick" },
      {
        layer: layerFor(({ page }) => loaded(page === 1 ? [character, morty] : [summer], page)),
      },
    );
    await settle();

    const next = buttons(payload(channel)).find((button) => button.label === ">");
    await root.interactionListener(fakeButton(String(next?.custom_id)) as never);
    await settle();

    const view = payload(channel);
    expect(textContents(view)).toEqual(expect.arrayContaining(["Summer Smith `Human`"]));
    expect(buttons(view).map((button) => button.label)).toEqual([
      "Search",
      "<<",
      "<",
      "Page 2 / 2",
      ">",
      ">>",
    ]);

    await root.unmount();
  });

  it("opens the search modal and searches on submit", async () => {
    const channel = new FakeChannel();
    const { root } = await mountMessage(
      channel.asRef(),
      App,
      { query: "rick" },
      {
        layer: layerFor(({ query }) =>
          query === "morty" ? { characters: [morty], pageMetadata: pageMetadata(1, 1) } : loaded(),
        ),
      },
    );
    await settle();

    const search = buttons(payload(channel)).find((button) => button.label === "Search");
    const showModal = vi.fn(async (_builder: unknown) => undefined);
    await root.interactionListener(fakeButton(String(search?.custom_id), showModal) as never);

    expect(showModal).toHaveBeenCalledOnce();
    const builder = showModal.mock.calls[0]?.[0] as {
      toJSON: () => { custom_id: string; title: string; components: unknown[] };
    };
    const modal = builder.toJSON();
    expect(modal.title).toBe("Search Character");
    expect(JSON.stringify(modal.components)).toContain("Search for a character by name");

    await root.interactionListener(fakeModal(modal.custom_id, { search: "morty" }) as never);
    await settle();

    const view = payload(channel);
    expect(textContents(view)).toEqual(
      expect.arrayContaining(["Current search: morty", "Morty Smith `Human`"]),
    );

    await root.unmount();
  });
});
