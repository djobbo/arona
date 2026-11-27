import type { BotMessageRoot } from "@arona/core";
import type { Interaction, Message } from "discord.js";
import type { DiscordHost } from "./host";
import type { MessageSnapshot } from "./types";

/** The explicit lifecycle handle for one Discord message. */
export type DiscordMessageRoot = BotMessageRoot<DiscordHost, Message, MessageSnapshot, Interaction>;
