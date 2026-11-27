import { Cause, Effect, Exit, Fiber, Layer, ManagedRuntime, Metric, Option, Tracer } from "effect";
import { FetchHttpClient } from "effect/http";
import {
  OtlpExporter,
  OtlpLogger,
  OtlpMetrics,
  OtlpSerialization,
  OtlpTracer,
} from "effect/observability";

/**
 * Low-cardinality span names used by Arona's renderers and integrations.
 *
 * Add attributes such as `messaging.system` or `arona.platform` instead of
 * creating platform-specific span names.
 */
export const TelemetrySpans = {
  messageMount: "arona.message.mount",
  messageSend: "arona.message.send",
  messageClose: "arona.message.close",
  messageInteraction: "arona.message.interaction",
  interaction: "arona.interaction",
  command: "arona.command",
  commandsReload: "arona.commands.reload",
  clientLogin: "arona.client.login",
  clientStart: "arona.client.start",
  slackEvent: "arona.slack.event",
} as const;

/** Metric names emitted by Arona's core and integrations. */
export const TelemetryMetrics = {
  operations: "arona.operations",
  operationDuration: "arona.operation.duration",
  operationErrors: "arona.operation.errors",
  messagesMounted: "arona.messages.mounted",
  messagesSent: "arona.messages.sent",
  messagesClosed: "arona.messages.closed",
  messageErrors: "arona.messages.errors",
  renders: "arona.renders",
  interactions: "arona.interactions",
  commandsExecuted: "arona.commands.executed",
  commandsRegistered: "arona.commands.registered",
  commandsReloaded: "arona.commands.reloaded",
  commandErrors: "arona.commands.errors",
} as const;

export interface TelemetrySpanOptions {
  readonly attributes?: Readonly<Record<string, unknown>> | undefined;
  readonly kind?: Tracer.SpanKind | undefined;
}

/** Configuration for the built-in OTLP exporters. */
export interface TelemetryConfig {
  /**
   * Set to `false` to disable every exporter. Defaults to `true` when an
   * endpoint or console tracing is configured.
   */
  readonly enabled?: boolean | undefined;
  /** OTLP/HTTP base endpoint, for example `http://localhost:4318`. */
  readonly endpoint?: string | undefined;
  /**
   * Write finished spans to the console instead of exporting them over OTLP.
   *
   * Console spans still keep Effect's trace context, so nested Arona spans are
   * indented and printed when they end. Metrics and logs keep using the OTLP
   * endpoint when one is configured.
   */
  readonly console?: boolean | undefined;
  /** Per-signal endpoint overrides. */
  readonly tracesEndpoint?: string | undefined;
  readonly metricsEndpoint?: string | undefined;
  readonly logsEndpoint?: string | undefined;
  readonly serviceName?: string | undefined;
  readonly serviceVersion?: string | undefined;
  readonly attributes?: Readonly<Record<string, unknown>> | undefined;
  readonly headers?: Readonly<Record<string, string>> | undefined;
  /** Enable traces. Defaults to `true`. */
  readonly traces?: boolean | undefined;
  /** Enable metrics. Defaults to `true`. */
  readonly metrics?: boolean | undefined;
  /** Enable Effect logs. Defaults to `true`. */
  readonly logs?: boolean | undefined;
  readonly compression?: "gzip" | "none" | undefined;
  readonly tracerExportInterval?: number | undefined;
  readonly metricExportInterval?: number | undefined;
  readonly loggerExportInterval?: number | undefined;
  readonly maxBatchSize?: number | undefined;
  readonly maxQueueSize?: number | undefined;
  readonly onDrop?: ((count: number) => void) | undefined;
  readonly shutdownTimeout?: number | undefined;
}

export type TelemetryLayer = Layer.Layer<any, never, never>;

export interface TelemetryHandle {
  readonly enabled: boolean;
  readonly config: TelemetryConfig;
  readonly layer: TelemetryLayer;
  /** Runs a self-contained Effect on the telemetry runtime. */
  run<A, E>(effect: Effect.Effect<A, E, never>): Promise<A>;
  /** Forks a long-lived Effect on the telemetry runtime, such as a message renderer. */
  runFork<A, E>(effect: Effect.Effect<A, E, never>): Fiber.Fiber<A, E>;
  /** Adds a span to an Effect. Use this inside command and query Layers. */
  withSpan<A, E, R>(
    effect: Effect.Effect<A, E, R>,
    name: string,
    options?: TelemetrySpanOptions,
  ): Effect.Effect<A, E, R>;
  /** Traces a Promise-based integration call and records operation metrics. */
  span<A>(name: string, fn: () => Promise<A>): Promise<A>;
  span<A>(name: string, options: TelemetrySpanOptions, fn: () => Promise<A>): Promise<A>;
  counter(name: string, value?: number, attributes?: Readonly<Record<string, unknown>>): void;
  histogram(name: string, value: number, attributes?: Readonly<Record<string, unknown>>): void;
  /** Exports any buffered telemetry. */
  flush(): Promise<void>;
  /** Flushes and releases the telemetry runtime. */
  shutdown(): Promise<void>;
}

const metricDescriptions: Readonly<Record<string, string>> = {
  [TelemetryMetrics.operations]: "Completed traced operations",
  [TelemetryMetrics.operationDuration]: "Trace operation duration in milliseconds",
  [TelemetryMetrics.operationErrors]: "Failed traced operations",
  [TelemetryMetrics.messagesMounted]: "Messages mounted by a renderer",
  [TelemetryMetrics.messagesSent]: "Messages created or edited on a platform",
  [TelemetryMetrics.messagesClosed]: "Messages closed by their root",
  [TelemetryMetrics.messageErrors]: "Message sends that failed",
  [TelemetryMetrics.renders]: "Host commits that serialized a snapshot",
  [TelemetryMetrics.interactions]: "Platform interactions routed to a handler",
  [TelemetryMetrics.commandsExecuted]: "Slash commands executed",
  [TelemetryMetrics.commandsRegistered]: "Application commands registered",
  [TelemetryMetrics.commandsReloaded]: "Successful application command reloads",
  [TelemetryMetrics.commandErrors]: "Failed command executions",
};

const durationBoundaries = Metric.exponentialBoundaries({ start: 1, factor: 2, count: 14 });

const cleanAttributes = (
  attributes: Readonly<Record<string, unknown>> | undefined,
): Record<string, string> => {
  if (!attributes) return {};
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined || value === null) continue;
    cleaned[key] =
      typeof value === "string"
        ? value
        : typeof value === "number" || typeof value === "boolean" || typeof value === "bigint"
          ? value.toString()
          : (JSON.stringify(value) ?? "unknown");
  }
  return cleaned;
};

const counterMetric = (name: string, attributes: Readonly<Record<string, unknown>> | undefined) =>
  Metric.counter(name, {
    ...(metricDescriptions[name] === undefined ? {} : { description: metricDescriptions[name] }),
    attributes: cleanAttributes(attributes),
    incremental: true,
  });

const histogramMetric = (name: string, attributes: Readonly<Record<string, unknown>> | undefined) =>
  Metric.histogram(name, {
    ...(metricDescriptions[name] === undefined ? {} : { description: metricDescriptions[name] }),
    attributes: cleanAttributes(attributes),
    boundaries: durationBoundaries,
  });

const recordOperation = (
  exit: Exit.Exit<unknown, unknown>,
  name: string,
  attributes: Readonly<Record<string, unknown>>,
  durationMs: number,
) =>
  Effect.gen(function* () {
    const metricAttributes = { "arona.operation": name, ...attributes };
    yield* Metric.update(
      histogramMetric(TelemetryMetrics.operationDuration, metricAttributes),
      durationMs,
    );
    if (Exit.isSuccess(exit)) {
      yield* Metric.update(counterMetric(TelemetryMetrics.operations, metricAttributes), 1);
      return;
    }

    const errorType = describeError(Cause.squash(exit.cause));
    yield* Effect.annotateCurrentSpan({ "error.type": errorType });
    yield* Metric.update(
      counterMetric(TelemetryMetrics.operationErrors, {
        ...metricAttributes,
        "error.type": errorType,
      }),
      1,
    );
  });

const describeError = (error: unknown): string => {
  if (error instanceof Error) return error.name;
  if (typeof error === "object" && error !== null && "_tag" in error) {
    return String((error as { _tag: unknown })._tag);
  }
  return typeof error;
};

const readBoolean = (value: string | undefined): boolean | undefined => {
  if (value === undefined) return undefined;
  switch (value.trim().toLowerCase()) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    default:
      return undefined;
  }
};

const parseHeaders = (value: string | undefined): Record<string, string> | undefined => {
  if (!value) return undefined;
  const headers: Record<string, string> = {};
  for (const entry of value.split(",")) {
    const index = entry.indexOf("=");
    if (index <= 0) continue;
    const key = entry.slice(0, index).trim();
    const rawValue = entry.slice(index + 1).trim();
    try {
      headers[key] = decodeURIComponent(rawValue);
    } catch {
      headers[key] = rawValue;
    }
  }
  return Object.keys(headers).length === 0 ? undefined : headers;
};

const parseMilliseconds = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const exporterList = (value: string | undefined): ReadonlyArray<string> | undefined =>
  value?.split(",").map((entry) => entry.trim().toLowerCase());

const signalEnabled = (
  value: string | undefined,
  explicit: string | undefined,
  accepted: ReadonlyArray<string> = ["otlp"],
): boolean => {
  const explicitFlag = readBoolean(explicit);
  if (explicitFlag !== undefined) return explicitFlag;
  const exporters = exporterList(value);
  if (exporters === undefined) return true;
  return exporters.some((exporter) => accepted.includes(exporter));
};

const trimEndpoint = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/+$/, "");
};

/**
 * Reads OTLP configuration from environment variables.
 *
 * Telemetry is enabled when `OTEL_EXPORTER_OTLP_ENDPOINT` (or a per-signal
 * endpoint) is present, or when console tracing is enabled.
 * `OTEL_SDK_DISABLED=true` and `ARONA_TELEMETRY=0` disable every exporter.
 *
 * Set `ARONA_TELEMETRY_CONSOLE=true` (or `OTEL_TRACES_EXPORTER=console`) to
 * print finished spans to the console instead of exporting them over OTLP.
 */
export const configFromEnv = (
  env: Readonly<Record<string, string | undefined>> = process.env,
): TelemetryConfig => {
  const endpoint = trimEndpoint(env.OTEL_EXPORTER_OTLP_ENDPOINT);
  const tracesEndpoint = trimEndpoint(env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);
  const metricsEndpoint = trimEndpoint(env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT);
  const logsEndpoint = trimEndpoint(env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT);
  const explicitlyEnabled = readBoolean(env.ARONA_TELEMETRY);
  const sdkDisabled = readBoolean(env.OTEL_SDK_DISABLED) === true;
  const hasEndpoint = Boolean(endpoint ?? tracesEndpoint ?? metricsEndpoint ?? logsEndpoint);
  const consoleEnabled =
    readBoolean(env.ARONA_TELEMETRY_CONSOLE) === true ||
    exporterList(env.OTEL_TRACES_EXPORTER)?.includes("console") === true;
  const enabled = !sdkDisabled && (explicitlyEnabled ?? (hasEndpoint || consoleEnabled));

  return {
    enabled,
    console: consoleEnabled,
    ...(endpoint === undefined ? {} : { endpoint }),
    ...(tracesEndpoint === undefined ? {} : { tracesEndpoint }),
    ...(metricsEndpoint === undefined ? {} : { metricsEndpoint }),
    ...(logsEndpoint === undefined ? {} : { logsEndpoint }),
    serviceName: env.OTEL_SERVICE_NAME ?? env.ARONA_SERVICE_NAME ?? "arona",
    ...(env.OTEL_SERVICE_VERSION === undefined ? {} : { serviceVersion: env.OTEL_SERVICE_VERSION }),
    ...(parseHeaders(env.OTEL_EXPORTER_OTLP_HEADERS) === undefined
      ? {}
      : { headers: parseHeaders(env.OTEL_EXPORTER_OTLP_HEADERS) }),
    traces: signalEnabled(env.OTEL_TRACES_EXPORTER, env.ARONA_TELEMETRY_TRACES, [
      "otlp",
      "console",
    ]),
    metrics: signalEnabled(env.OTEL_METRICS_EXPORTER, env.ARONA_TELEMETRY_METRICS),
    logs: signalEnabled(env.OTEL_LOGS_EXPORTER, env.ARONA_TELEMETRY_LOGS),
    compression: env.OTEL_EXPORTER_OTLP_COMPRESSION === "gzip" ? "gzip" : "none",
    ...(parseMilliseconds(env.OTEL_BSP_SCHEDULE_DELAY) === undefined
      ? {}
      : { tracerExportInterval: parseMilliseconds(env.OTEL_BSP_SCHEDULE_DELAY) }),
    ...(parseMilliseconds(env.OTEL_METRIC_EXPORT_INTERVAL) === undefined
      ? {}
      : { metricExportInterval: parseMilliseconds(env.OTEL_METRIC_EXPORT_INTERVAL) }),
  };
};

const spanDepth = (span: Tracer.NativeSpan): number => {
  let depth = 0;
  let parent: Tracer.AnySpan | undefined = Option.getOrUndefined(span.parent);
  while (parent) {
    depth++;
    parent = parent._tag === "Span" ? Option.getOrUndefined(parent.parent) : undefined;
  }
  return depth;
};

const formatAttributeValue = (value: unknown): string =>
  typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "boolean" || typeof value === "bigint"
      ? value.toString()
      : (JSON.stringify(value) ?? "unknown");

const formatConsoleSpan = (span: Tracer.NativeSpan): string => {
  const status = span.status;
  if (status._tag !== "Ended") return span.name;

  const durationMs = Number(status.endTime - status.startTime) / 1e6;
  const attributes = [...span.attributes]
    .map(([key, value]) => `${key}=${formatAttributeValue(value)}`)
    .join(" ");
  const marker = Exit.isSuccess(status.exit) ? "✔" : "✖";

  return [
    "  ".repeat(spanDepth(span)),
    marker,
    " ",
    span.name,
    " ",
    durationMs.toFixed(1),
    "ms",
    attributes.length > 0 ? ` · ${attributes}` : "",
  ].join("");
};

class ConsoleSpan extends Tracer.NativeSpan {
  override end(endTime: bigint, exit: Exit.Exit<unknown, unknown>): void {
    super.end(endTime, exit);
    if (this.status._tag === "Ended") console.log(formatConsoleSpan(this));
  }
}

/**
 * A tracer Layer that prints finished spans to the console.
 *
 * Spans are indented by nesting depth and include duration and attributes.
 */
export const consoleTracerLayer = (): TelemetryLayer =>
  Layer.succeed(
    Tracer.Tracer,
    Tracer.make({
      span: (options) => new ConsoleSpan(options),
    }),
  ) as unknown as TelemetryLayer;

/** The default OTLP/HTTP collector endpoint, used when telemetry is explicitly enabled. */
export const defaultEndpoint = "http://localhost:4318";

const endpointFor = (
  config: TelemetryConfig,
  signal: "traces" | "metrics" | "logs",
): string | undefined => {
  const override =
    signal === "traces"
      ? config.tracesEndpoint
      : signal === "metrics"
        ? config.metricsEndpoint
        : config.logsEndpoint;
  if (override) return override;
  const base =
    config.endpoint ??
    (config.enabled === true && config.console !== true ? defaultEndpoint : undefined);
  return base ? `${base.replace(/\/+$/, "")}/v1/${signal}` : undefined;
};

/**
 * Builds an OTLP observability Layer using Effect's built-in exporters.
 *
 * Provide the result to your own Effect runtime, or let
 * {@link createTelemetry} manage one for the Promise-based Discord and Slack
 * clients.
 */
export const layer = (config: TelemetryConfig = configFromEnv()): TelemetryLayer => {
  const enabled = config.enabled ?? config.console === true;
  if (!enabled) return Layer.empty as unknown as TelemetryLayer;

  const resource = {
    ...(config.serviceName === undefined ? {} : { serviceName: config.serviceName }),
    ...(config.serviceVersion === undefined ? {} : { serviceVersion: config.serviceVersion }),
    ...(config.attributes === undefined ? {} : { attributes: { ...config.attributes } }),
  };
  const shared = {
    resource,
    ...(config.headers === undefined ? {} : { headers: config.headers }),
    ...(config.compression === undefined ? {} : { compression: config.compression }),
    ...(config.shutdownTimeout === undefined ? {} : { shutdownTimeout: config.shutdownTimeout }),
  };

  const exporters: Array<Layer.Layer<any, never, any>> = [];

  if (config.traces !== false) {
    if (config.console === true) {
      exporters.push(consoleTracerLayer());
    } else {
      const url = endpointFor(config, "traces");
      if (url) {
        exporters.push(
          OtlpTracer.layer({
            url,
            ...shared,
            ...(config.tracerExportInterval === undefined
              ? {}
              : { exportInterval: config.tracerExportInterval }),
            ...(config.maxBatchSize === undefined ? {} : { maxBatchSize: config.maxBatchSize }),
            ...(config.maxQueueSize === undefined ? {} : { maxQueueSize: config.maxQueueSize }),
            ...(config.onDrop === undefined ? {} : { onDrop: config.onDrop }),
          }),
        );
      }
    }
  }

  if (config.metrics !== false) {
    const url = endpointFor(config, "metrics");
    if (url) {
      exporters.push(
        OtlpMetrics.layer({
          url,
          ...shared,
          ...(config.metricExportInterval === undefined
            ? {}
            : { exportInterval: config.metricExportInterval }),
        }),
      );
    }
  }

  if (config.logs !== false) {
    const url = endpointFor(config, "logs");
    if (url) {
      exporters.push(
        OtlpLogger.layer({
          url,
          ...shared,
          ...(config.loggerExportInterval === undefined
            ? {}
            : { exportInterval: config.loggerExportInterval }),
          ...(config.maxBatchSize === undefined ? {} : { maxBatchSize: config.maxBatchSize }),
          ...(config.maxQueueSize === undefined ? {} : { maxQueueSize: config.maxQueueSize }),
          ...(config.onDrop === undefined ? {} : { onDrop: config.onDrop }),
        }),
      );
    }
  }

  const combined = exporters.reduce(
    (all, exporter) => Layer.merge(all, exporter),
    Layer.empty as unknown as Layer.Layer<any, never, any>,
  );

  return Layer.merge(combined, OtlpExporter.layerFlusher).pipe(
    Layer.provide(OtlpSerialization.layerJson),
    Layer.provide(FetchHttpClient.layer),
  ) as unknown as TelemetryLayer;
};

const disabledTelemetry: TelemetryHandle = {
  enabled: false,
  config: { enabled: false },
  layer: Layer.empty as unknown as TelemetryLayer,
  run: (effect) => Effect.runPromise(effect),
  runFork: (effect) => Effect.runFork(effect),
  withSpan: (effect) => effect,
  span: ((name: string, optionsOrFn: unknown, maybeFn?: () => Promise<unknown>) => {
    const fn = typeof optionsOrFn === "function" ? optionsOrFn : maybeFn;
    if (!fn) return Promise.reject(new Error(`Missing telemetry span function for ${name}`));
    return fn();
  }) as TelemetryHandle["span"],
  counter: () => {},
  histogram: () => {},
  flush: async () => {},
  shutdown: async () => {},
};

export { disabledTelemetry as disabled };

interface RuntimeTelemetryOptions {
  readonly runtime: ManagedRuntime.ManagedRuntime<never, never>;
  readonly config: TelemetryConfig;
}

const makeRuntimeTelemetry = ({ runtime, config }: RuntimeTelemetryOptions): TelemetryHandle => {
  let disposed = false;

  const run: TelemetryHandle["run"] = (effect) =>
    disposed ? Effect.runPromise(effect) : runtime.runPromise(effect);
  const runFork: TelemetryHandle["runFork"] = (effect) =>
    disposed ? Effect.runFork(effect) : runtime.runFork(effect);

  const withSpan: TelemetryHandle["withSpan"] = (effect, name, options = {}) =>
    Effect.suspend(() => {
      const start = Date.now();
      const attributes = cleanAttributes(options.attributes);
      return effect.pipe(
        Effect.withSpan(name, {
          attributes,
          kind: options.kind ?? "internal",
        }),
        Effect.onExit((exit) => recordOperation(exit, name, attributes, Date.now() - start)),
      );
    });

  const span: TelemetryHandle["span"] = ((
    name: string,
    optionsOrFn: TelemetrySpanOptions | (() => Promise<unknown>),
    maybeFn?: () => Promise<unknown>,
  ) => {
    const fn = typeof optionsOrFn === "function" ? optionsOrFn : maybeFn;
    if (!fn) return Promise.reject(new Error(`Missing telemetry span function for ${name}`));
    const options = typeof optionsOrFn === "function" ? {} : optionsOrFn;
    const attributes = cleanAttributes(options.attributes);

    return run(
      Effect.suspend(() => {
        const start = Date.now();
        return Effect.exit(
          Effect.tryPromise({
            try: fn,
            catch: (error) => error,
          }),
        ).pipe(
          Effect.flatMap((exit) =>
            recordOperation(exit, name, attributes, Date.now() - start).pipe(
              Effect.andThen(
                Exit.isFailure(exit) ? Effect.failCause(exit.cause) : Effect.succeed(exit.value),
              ),
            ),
          ),
          Effect.withSpan(name, {
            attributes,
            kind: options.kind ?? "internal",
          }),
        );
      }),
    );
  }) as TelemetryHandle["span"];

  const counter: TelemetryHandle["counter"] = (name, value = 1, attributes) => {
    if (disposed) return;
    void runFork(Metric.update(counterMetric(name, attributes), value));
  };

  const histogram: TelemetryHandle["histogram"] = (name, value, attributes) => {
    if (disposed) return;
    void runFork(Metric.update(histogramMetric(name, attributes), value));
  };

  const flush = async (): Promise<void> => {
    if (disposed) return;
    await runtime.runPromise(
      Effect.flatMap(OtlpExporter.Flusher, (flusher) => flusher.flush) as Effect.Effect<void>,
    );
  };

  const shutdown = async (): Promise<void> => {
    if (disposed) return;
    disposed = true;
    await runtime.dispose();
  };

  return {
    enabled: true,
    config,
    layer: layer(config),
    run,
    runFork,
    withSpan,
    span,
    counter,
    histogram,
    flush,
    shutdown,
  };
};

/** Creates a telemetry runtime from an explicit configuration. */
export const createTelemetry = (config: TelemetryConfig = configFromEnv()): TelemetryHandle => {
  if (!(config.enabled ?? config.console === true)) return disabledTelemetry;
  const telemetryLayer = layer(config);
  return makeRuntimeTelemetry({
    runtime: ManagedRuntime.make(telemetryLayer as unknown as Layer.Layer<never, never, never>),
    config,
  });
};

let activeTelemetry: TelemetryHandle | undefined;

/** Makes a telemetry runtime the process-wide default used by Arona. */
export const install = (telemetry: TelemetryHandle): TelemetryHandle => {
  activeTelemetry = telemetry;
  return telemetry;
};

/** Removes the process-wide runtime. Primarily useful in tests. */
export const uninstall = (telemetry?: TelemetryHandle): void => {
  if (telemetry === undefined || activeTelemetry === telemetry) {
    activeTelemetry = undefined;
  }
};

/** The active telemetry runtime, or a no-op implementation. */
export const current = (): TelemetryHandle => activeTelemetry ?? disabledTelemetry;

/** Installs an environment-configured runtime once. Existing installs win. */
export const installFromEnv = (config: TelemetryConfig = configFromEnv()): TelemetryHandle => {
  if (activeTelemetry) return activeTelemetry;
  const telemetry = createTelemetry(config);
  return telemetry.enabled ? install(telemetry) : telemetry;
};

/**
 * Flushes all buffered telemetry from the active runtime.
 *
 * Call this before a process exits or a serverless instance is suspended.
 */
export const flush = (): Promise<void> => current().flush();

/** Flushes and disposes the active runtime. */
export const shutdown = async (): Promise<void> => {
  const telemetry = activeTelemetry;
  if (!telemetry) return;
  if (activeTelemetry === telemetry) activeTelemetry = undefined;
  await telemetry.shutdown();
};

/** The public telemetry namespace, also available through named exports. */
export const Telemetry = {
  Spans: TelemetrySpans,
  Metrics: TelemetryMetrics,
  configFromEnv,
  layer,
  create: createTelemetry,
  install,
  installFromEnv,
  uninstall,
  current,
  flush,
  shutdown,
  disabled: disabledTelemetry,
} as const;

export { describeError };
