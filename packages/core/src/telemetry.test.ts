import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  Telemetry,
  configFromEnv,
  createTelemetry,
  current,
  install,
  uninstall,
} from "./telemetry";

afterEach(() => {
  uninstall();
});

describe("configFromEnv", () => {
  it("is disabled without an endpoint", () => {
    const config = configFromEnv({});
    expect(config.enabled).toBe(false);
    expect(config.endpoint).toBeUndefined();
  });

  it("reads the OTLP endpoint, service, headers, and signals", () => {
    const config = configFromEnv({
      OTEL_EXPORTER_OTLP_ENDPOINT: "http://collector:4318/",
      OTEL_SERVICE_NAME: "my-bot",
      OTEL_SERVICE_VERSION: "1.2.3",
      OTEL_EXPORTER_OTLP_HEADERS: "authorization=Bearer%20token, x-team=arona",
      OTEL_EXPORTER_OTLP_COMPRESSION: "gzip",
      OTEL_METRICS_EXPORTER: "console",
      OTEL_BSP_SCHEDULE_DELAY: "250",
    });

    expect(config).toMatchObject({
      enabled: true,
      endpoint: "http://collector:4318",
      serviceName: "my-bot",
      serviceVersion: "1.2.3",
      compression: "gzip",
      metrics: false,
      traces: true,
      logs: true,
      tracerExportInterval: 250,
    });
    expect(config.headers).toEqual({
      authorization: "Bearer token",
      "x-team": "arona",
    });
  });

  it("honours per-signal endpoint overrides", () => {
    const config = configFromEnv({
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "http://traces:4318/v1/traces",
      ARONA_TELEMETRY_TRACES: "false",
      ARONA_TELEMETRY_METRICS: "true",
    });

    expect(config.enabled).toBe(true);
    expect(config.tracesEndpoint).toBe("http://traces:4318/v1/traces");
    expect(config.traces).toBe(false);
    expect(config.metrics).toBe(true);
  });

  it("enables console tracing without an endpoint", () => {
    const config = configFromEnv({ ARONA_TELEMETRY_CONSOLE: "true" });
    expect(config.enabled).toBe(true);
    expect(config.console).toBe(true);
    expect(config.endpoint).toBeUndefined();

    const otelConfig = configFromEnv({ OTEL_TRACES_EXPORTER: "console" });
    expect(otelConfig.enabled).toBe(true);
    expect(otelConfig.console).toBe(true);
    expect(otelConfig.traces).toBe(true);
  });

  it("can be disabled explicitly", () => {
    expect(
      configFromEnv({
        OTEL_EXPORTER_OTLP_ENDPOINT: "http://collector:4318",
        OTEL_SDK_DISABLED: "true",
      }).enabled,
    ).toBe(false);
    expect(
      configFromEnv({
        OTEL_EXPORTER_OTLP_ENDPOINT: "http://collector:4318",
        ARONA_TELEMETRY: "0",
      }).enabled,
    ).toBe(false);
  });
});

describe("telemetry handles", () => {
  it("runs spans and effects through a disabled handle", async () => {
    const telemetry = createTelemetry({ enabled: false });
    expect(telemetry.enabled).toBe(false);
    await expect(telemetry.span("test", async () => 42)).resolves.toBe(42);
    await expect(
      telemetry.span("test", { attributes: { platform: "test" } }, async () => "ok"),
    ).resolves.toBe("ok");
    await expect(telemetry.run(Effect.succeed("effect"))).resolves.toBe("effect");
    await expect(
      telemetry.withSpan(Effect.succeed("span"), "test").pipe(Effect.runPromise),
    ).resolves.toBe("span");
    expect(() => telemetry.counter("test")).not.toThrow();
    expect(() => telemetry.histogram("test", 1)).not.toThrow();
    await expect(telemetry.flush()).resolves.toBeUndefined();
    await expect(telemetry.shutdown()).resolves.toBeUndefined();
  });

  it("runs operations when exporters are disabled", async () => {
    const telemetry = createTelemetry({
      enabled: true,
      traces: false,
      metrics: false,
      logs: false,
    });

    await expect(
      telemetry.span("test.operation", { attributes: { "messaging.system": "test" } }, async () => {
        telemetry.counter("test.counter", 1, { result: "ok" });
        telemetry.histogram("test.histogram", 5, { result: "ok" });
        return "done";
      }),
    ).resolves.toBe("done");

    await expect(telemetry.run(telemetry.withSpan(Effect.succeed(1), "test.effect"))).resolves.toBe(
      1,
    );
    telemetry.counter("test.counter");
    telemetry.histogram("test.histogram", 1);
    await telemetry.flush();
    await telemetry.shutdown();
  });

  it("prints finished spans to the console", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const telemetry = createTelemetry({
      console: true,
      metrics: false,
      logs: false,
    });

    expect(telemetry.enabled).toBe(true);
    await telemetry.span(
      "console.operation",
      { attributes: { "messaging.system": "test" } },
      async () => 42,
    );
    await telemetry.run(
      telemetry.withSpan(telemetry.withSpan(Effect.succeed(1), "console.child"), "console.parent"),
    );
    await telemetry.flush();
    await telemetry.shutdown();

    const lines = log.mock.calls.map((call) => String(call[0]));
    expect(
      lines.some(
        (line) => line.includes("console.operation") && line.includes("messaging.system=test"),
      ),
    ).toBe(true);
    expect(lines.some((line) => line.includes("console.parent"))).toBe(true);
    expect(lines.some((line) => line.includes("  ✔ console.child"))).toBe(true);
    log.mockRestore();
  });

  it("propagates span failures", async () => {
    const telemetry = createTelemetry({
      enabled: true,
      traces: false,
      metrics: false,
      logs: false,
    });

    await expect(
      telemetry.span("test.failure", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    await telemetry.shutdown();
  });
});

describe("process-wide telemetry", () => {
  it("installs, returns, and uninstalls the active handle", () => {
    const telemetry = createTelemetry({ enabled: false });
    expect(current()).toBe(Telemetry.disabled);

    install(telemetry);
    expect(current()).toBe(telemetry);

    uninstall(telemetry);
    expect(current()).toBe(Telemetry.disabled);
  });

  it("does not replace an explicit install from the environment", () => {
    const telemetry = createTelemetry({
      enabled: true,
      traces: false,
      metrics: false,
      logs: false,
    });
    install(telemetry);

    const fromEnv = Telemetry.installFromEnv({ enabled: true });
    expect(fromEnv).toBe(telemetry);
  });

  it("flushes and shuts down the active runtime", async () => {
    const telemetry = createTelemetry({
      enabled: true,
      traces: false,
      metrics: false,
      logs: false,
    });
    const flush = vi.spyOn(telemetry, "flush");
    install(telemetry);

    await Telemetry.flush();
    await Telemetry.shutdown();

    expect(flush).toHaveBeenCalledOnce();
    expect(current()).toBe(Telemetry.disabled);
  });
});
