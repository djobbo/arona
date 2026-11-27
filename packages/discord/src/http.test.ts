import { layerMemory, MessageSessionStore, type MessageSessionStoreShape } from "@arona/core";
import { UiSchema } from "@effect/ui";
import { Effect, Schema } from "effect";
import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vite-plus/test";
import { AronaDiscordClient } from "./client";
import { ActionRow, Button, Container, Label, Modal, Text, TextInput } from "./components";
import { createSlashCommand } from "./commands/create-slash-command";
import {
  createInteractionsHandler,
  RestModalFields,
  RestOptions,
  verifyDiscordSignature,
} from "./http";
import { mountSessionMessage } from "./render";
import { FakeChannel, findButtonCustomId, findComponent } from "./testing";
import * as Discord from "./vocabulary";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const publicHex = (publicKey.export({ format: "der", type: "spki" }) as Buffer)
  .subarray(-32)
  .toString("hex");
const timestamp = "1700000000";

const signedRequest = (body: string): Request => {
  const signature = sign(null, Buffer.from(timestamp + body), privateKey).toString("hex");
  return new Request("https://example.test/interactions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature-ed25519": signature,
      "x-signature-timestamp": timestamp,
    },
    body,
  });
};

const memoryStore = (): Promise<MessageSessionStoreShape> =>
  Effect.runPromise(
    Effect.gen(function* () {
      return yield* MessageSessionStore;
    }).pipe(Effect.provide(layerMemory)),
  );

const CounterMessage = UiSchema.TaggedEnum({ Clicked: {} });

const Counter = Discord.component({
  name: "HttpCounter",
  model: Schema.Struct({ count: Schema.Number }),
  message: CounterMessage,
}).make({
  init: () => ({ count: 0 }),
  update: { Clicked: ($) => $.evolve({ count: (count) => count + 1 }) },
  view: (h, model) =>
    Container(h, {
      children: [
        Text(h, `# Count: ${model.count}`),
        ActionRow(h, {
          children: [
            Button(h, {
              style: "Primary",
              onClick: CounterMessage.Clicked(),
              children: ["+"],
            }),
          ],
        }),
      ],
    }),
});

const textOf = (payload: unknown): string | undefined =>
  findComponent(payload, (component) => component.type === 10)?.content as string | undefined;

const fakeFetch = (calls: Array<{ url: string; method: string; body: string }>) =>
  (async (url: string | URL | Request, init?: RequestInit) => {
    const target = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
    const body =
      typeof init?.body === "string"
        ? init.body
        : init?.body === undefined
          ? ""
          : JSON.stringify(init.body);
    calls.push({
      url: target,
      method: init?.method ?? "GET",
      body,
    });
    return new Response(JSON.stringify({ id: "message", channel_id: "channel", flags: 0 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

const makeClient = (store: MessageSessionStoreShape) =>
  new AronaDiscordClient({
    token: "bot-token",
    clientId: "app",
    intents: [],
    sessions: store,
  });

describe("HTTP interactions", () => {
  it("verifies signatures and answers PING", async () => {
    const store = await memoryStore();
    const client = makeClient(store);
    const handler = createInteractionsHandler({
      client,
      publicKey: publicHex,
      token: "bot-token",
    });

    const body = JSON.stringify({ id: "1", application_id: "app", type: 1, token: "t" });
    const response = await handler(signedRequest(body));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ type: 1 });

    const rejected = await handler(
      new Request("https://example.test/interactions", {
        method: "POST",
        body,
      }),
    );
    expect(rejected.status).toBe(401);
    await client.destroy();
  });

  it("resumes a component inline and returns the update as the response", async () => {
    const store = await memoryStore();
    const channel = new FakeChannel();
    const first = await mountSessionMessage(
      channel.asRef(),
      Counter,
      {},
      {
        store,
        componentKey: "HttpCounter",
        sessionProps: {},
      },
    );
    const customId = findButtonCustomId(channel.sent[0]);
    await first.root.unmount();

    const calls: Array<{ url: string; method: string; body: string }> = [];
    const client = makeClient(store).registerComponent("HttpCounter", Counter as never);
    const handler = createInteractionsHandler({
      client,
      publicKey: publicHex,
      token: "bot-token",
      fetch: fakeFetch(calls),
    });

    const body = JSON.stringify({
      id: "interaction-1",
      application_id: "app",
      type: 3,
      token: "interaction-token",
      data: { custom_id: customId, component_type: 2 },
      message: { id: "message", channel_id: "channel", flags: 0 },
    });
    const response = await handler(signedRequest(body));
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { type: number; data: unknown };
    expect(payload.type).toBe(7);
    expect(textOf(payload.data)).toBe("# Count: 1");
    expect(calls).toHaveLength(0);
    await client.destroy();
  });

  it("returns an inline command message as the initial response", async () => {
    const store = await memoryStore();
    const CommandView = Discord.component({
      name: "InlineHttpCommandView",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) => Text(h, "Inline hello"),
    });
    const command = createSlashCommand("hello", {
      command: (builder) => builder.setDescription("Say hello"),
      component: CommandView,
    });
    const client = makeClient(store).addCommands([command]);
    const handler = createInteractionsHandler({
      client,
      publicKey: publicHex,
      token: "bot-token",
      fetch: fakeFetch([]),
    });

    const body = JSON.stringify({
      id: "interaction-inline",
      application_id: "app",
      type: 2,
      token: "interaction-token",
      channel_id: "channel",
      data: { name: "hello", options: [], resolved: {} },
    });
    const response = await handler(signedRequest(body));
    const payload = (await response.json()) as { type: number; data: unknown };
    expect(payload.type).toBe(4);
    expect(textOf(payload.data)).toBe("Inline hello");

    const active = await Effect.runPromise(store.listActive());
    expect(active).toHaveLength(1);
    await client.destroy();
  });

  it("supports an inline modal from a component and resumes the modal submit", async () => {
    const FormMessage = UiSchema.TaggedEnum({
      Open: {},
      Submitted: { value: Schema.String },
    });
    const Form = Discord.component({
      name: "HttpForm",
      model: Schema.Struct({ open: Schema.Boolean, submitted: Schema.String }),
      message: FormMessage,
    }).make({
      init: () => ({ open: false, submitted: "" }),
      update: {
        Open: ($) => $.evolve({ open: true }),
        Submitted: ($, message) => $.evolve({ open: false, submitted: message.value }),
      },
      view: (h, model) =>
        Container(h, {
          children: [
            Text(h, model.submitted === "" ? "Form" : `Submitted ${model.submitted}`),
            ActionRow(h, {
              children: [
                Button(h, {
                  style: "Primary",
                  onClick: FormMessage.Open(),
                  children: ["Open"],
                }),
              ],
            }),
            model.open
              ? Modal(h, {
                  title: "Edit",
                  onSubmit: (payload: any) =>
                    FormMessage.Submitted({ value: payload.values.name ?? "" }),
                  children: [
                    Label(h, {
                      label: "Name",
                      children: [TextInput(h, { name: "name" })],
                    }),
                  ],
                })
              : false,
          ],
        }),
    });

    const store = await memoryStore();
    const channel = new FakeChannel();
    const first = await mountSessionMessage(
      channel.asRef(),
      Form,
      {},
      {
        store,
        componentKey: "HttpForm",
        sessionProps: {},
      },
    );
    const customId = findButtonCustomId(channel.sent[0]);
    await first.root.unmount();

    const client = makeClient(store).registerComponent("HttpForm", Form as never);
    const handler = createInteractionsHandler({
      client,
      publicKey: publicHex,
      token: "bot-token",
      fetch: fakeFetch([]),
    });

    const openBody = JSON.stringify({
      id: "interaction-open",
      application_id: "app",
      type: 3,
      token: "open-token",
      data: { custom_id: customId, component_type: 2 },
      message: { id: "message", channel_id: "channel", flags: 0 },
    });
    const opened = (await (await handler(signedRequest(openBody))).json()) as {
      type: number;
      data: any;
    };
    expect(opened.type).toBe(9);
    expect(opened.data.title).toBe("Edit");

    const input = findComponent(opened.data, (component) => component.type === 4);
    const inputId = input?.custom_id;
    expect(typeof inputId).toBe("string");

    const submitBody = JSON.stringify({
      id: "interaction-submit",
      application_id: "app",
      type: 5,
      token: "submit-token",
      data: {
        custom_id: opened.data.custom_id,
        components: [
          {
            type: 18,
            component: { type: 4, custom_id: inputId, value: "Ada" },
          },
        ],
      },
      message: { id: "message", channel_id: "channel", flags: 0 },
    });
    const submitted = (await (await handler(signedRequest(submitBody))).json()) as {
      type: number;
      data: unknown;
    };
    expect(submitted.type).toBe(7);
    expect(textOf(submitted.data)).toBe("Submitted Ada");
    await client.destroy();
  });

  it("defers a command and finishes through the REST original response", async () => {
    const store = await memoryStore();
    const calls: Array<{ url: string; method: string; body: string }> = [];

    const CommandView = Discord.component({
      name: "HttpCommandView",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) => Text(h, "Hello from HTTP"),
    });

    const command = createSlashCommand("hello", {
      command: (builder) => builder.setDescription("Say hello"),
      component: CommandView,
    });

    const client = makeClient(store).addCommands([command]);
    let pending: Promise<void> = Promise.resolve();
    const handler = createInteractionsHandler({
      client,
      publicKey: publicHex,
      token: "bot-token",
      fetch: fakeFetch(calls),
      defer: true,
      background: (work) => {
        pending = work;
      },
    });

    const body = JSON.stringify({
      id: "interaction-2",
      application_id: "app",
      type: 2,
      token: "interaction-token",
      channel_id: "channel",
      data: { name: "hello", options: [], resolved: {} },
    });
    const response = await handler(signedRequest(body));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ type: 5 });
    await pending;

    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("PATCH");
    expect(calls[0]?.url).toContain("/webhooks/app/interaction-token/messages/@original");
    expect(calls[0]?.body).toContain("Hello from HTTP");

    const active = await Effect.runPromise(store.listActive());
    expect(active).toHaveLength(1);
    expect(active[0]?.component).toBe("hello");
    await client.destroy();
  });

  it("reads modal fields and command options from raw payloads", () => {
    const fields = new RestModalFields({
      components: [
        { type: 18, component: { type: 4, custom_id: "name", value: "Ada" } },
        { type: 18, component: { type: 23, custom_id: "newsletter", value: true } },
        {
          type: 18,
          component: {
            type: 22,
            custom_id: "plans",
            values: ["free", "pro"],
          },
        },
        {
          type: 18,
          component: { type: 21, custom_id: "plan", value: "pro" },
        },
      ],
      resolved: {
        users: { u1: { id: "u1", username: "ada" } },
        roles: { r1: { id: "r1", name: "admin" } },
      },
    });
    expect(fields.getTextInputValue("name")).toBe("Ada");
    expect(fields.getCheckbox("newsletter")).toBe(true);
    expect(fields.getCheckboxGroup("plans")).toEqual(["free", "pro"]);
    expect(fields.getRadioGroup("plan")).toBe("pro");

    const options = new RestOptions({
      options: [
        { name: "name", type: 3, value: "Ada" },
        { name: "count", type: 4, value: 2 },
        { name: "user", type: 6, value: "u1" },
      ],
      resolved: { users: { u1: { id: "u1", username: "ada" } } },
    });
    expect(options.getString("name")).toBe("Ada");
    expect(options.getInteger("count")).toBe(2);
    expect(options.getUser("user")).toMatchObject({ id: "u1", username: "ada" });
  });

  it("exposes the verification helper on its own", () => {
    const body = JSON.stringify({ type: 1 });
    const signature = sign(null, Buffer.from(timestamp + body), privateKey).toString("hex");
    expect(
      verifyDiscordSignature({
        publicKey: publicHex,
        signature,
        timestamp,
        body,
      }),
    ).toBe(true);
    expect(
      verifyDiscordSignature({
        publicKey: publicHex,
        signature,
        timestamp: "1",
        body,
      }),
    ).toBe(false);
  });
});
