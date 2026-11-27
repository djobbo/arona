import { Telemetry, TelemetryMetrics, TelemetrySpans, type TelemetryHandle } from "./telemetry";

/**
 * Shared lifecycle for a platform message target.
 *
 * Renderers can commit faster than a chat platform accepts edits, so the
 * target keeps only the newest snapshot and drains it after the in-flight
 * request. This gives last-write-wins semantics without overlapping requests.
 *
 * Platforms implement `send` for their edit API and `fingerprint` to skip
 * snapshots that did not actually change.
 */
export abstract class BotMessageTarget<Message, Snapshot> {
  /** The platform this target sends to, such as `discord` or `slack`. */
  readonly platform: string;
  readonly #telemetry: TelemetryHandle;
  readonly #ready: Promise<Message>;
  #resolveReady: (message: Message) => void = () => {};
  #rejectReady: (error: unknown) => void = () => {};
  #message: Message | null = null;
  #latest: Snapshot | null = null;
  #lastSent: string | null = null;
  #running = false;
  #closed = false;
  #settled = false;

  protected constructor(platform = "unknown", telemetry: TelemetryHandle = Telemetry.current()) {
    this.platform = platform;
    this.#telemetry = telemetry;
    this.#ready = new Promise<Message>((resolve, reject) => {
      this.#resolveReady = resolve;
      this.#rejectReady = reject;
    });
  }

  /** The first platform message, once it has been created. */
  get message(): Message | null {
    return this.#message;
  }

  /** Resolves with the first platform message, or rejects if creation fails. */
  get ready(): Promise<Message> {
    return this.#ready;
  }

  /** The platform message a subclass should edit, if it exists. */
  protected get currentMessage(): Message | null {
    return this.#message;
  }

  protected get closed(): boolean {
    return this.#closed;
  }

  queue(snapshot: Snapshot): void {
    if (this.#closed) return;
    this.#latest = snapshot;
    void this.#drain();
  }

  /** Stops future sends and rejects `ready` if no message was created yet. */
  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#latest = null;
    if (!this.#settled) {
      this.#settled = true;
      this.#rejectReady(new Error("Message closed before it was created"));
    }
  }

  /** Creates the first message or edits the existing one. */
  protected abstract send(snapshot: Snapshot): Promise<Message>;

  /** A stable string used to skip snapshots that produce no visible change. */
  protected abstract fingerprint(snapshot: Snapshot): string;

  async #drain(): Promise<void> {
    if (this.#running) return;
    this.#running = true;

    try {
      while (!this.#closed) {
        const snapshot = this.#latest;
        if (snapshot === null) break;
        this.#latest = null;

        const fingerprint = this.fingerprint(snapshot);
        if (fingerprint === this.#lastSent) continue;
        this.#lastSent = fingerprint;

        const operation = this.#message === null ? "send" : "edit";
        const attributes = {
          "messaging.system": this.platform,
          "messaging.operation": operation,
        };

        let message: Message;
        try {
          message = await this.#telemetry.span(
            TelemetrySpans.messageSend,
            { kind: "client", attributes },
            () => this.send(snapshot),
          );
          this.#telemetry.counter(TelemetryMetrics.messagesSent, 1, attributes);
        } catch (error) {
          this.#telemetry.counter(TelemetryMetrics.messageErrors, 1, attributes);
          throw error;
        }

        if (!this.#settled) {
          this.#settled = true;
          this.#message = message;
          this.#resolveReady(message);
        }
      }
    } catch (error) {
      this.#rejectReady(error);
    } finally {
      this.#running = false;
    }
  }
}
