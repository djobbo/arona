import type { App } from "@slack/bolt"

export type InteractionListenerPromise = Parameters<
	typeof App.prototype.action
>[1]
export type InteractionListener =
	| InteractionListenerPromise
	| ((
			payload: Parameters<InteractionListenerPromise>[0],
	  ) => Awaited<ReturnType<InteractionListenerPromise>>)
export type InteractionListenerEntry = [string, InteractionListener]
