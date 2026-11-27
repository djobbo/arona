import { createServer } from "node:http";
import { handler } from "./app.ts";

const port = Number(process.env.PORT ?? 3000);

const server = createServer(async (request, response) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));

  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const one of value) headers.append(name, one);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  const url = `http://${request.headers.host ?? `localhost:${port}`}${request.url ?? "/"}`;
  const body = Buffer.concat(chunks);
  const fetched = new Request(url, {
    method: request.method ?? "POST",
    headers,
    ...(request.method === "GET" || request.method === "HEAD"
      ? {}
      : { body: new Uint8Array(body) }),
  });

  const result = await handler(fetched);
  response.writeHead(result.status, Object.fromEntries(result.headers.entries()));
  response.end(Buffer.from(await result.arrayBuffer()));
});

server.listen(port, () => {
  console.log(`HTTP interaction endpoint listening on http://localhost:${port}/interactions`);
  console.log("Point Discord's Interactions Endpoint URL at the public URL for this route.");
});
