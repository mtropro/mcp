import { createServer } from "node:http";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class AgentMcpHarness {
  constructor(options = {}) {
    this.rootDir = options.rootDir || resolve(import.meta.dirname, "../..");
    this.apiKey = options.apiKey || "mtro_test_key";
    this.requests = [];
    this.stderr = "";
    this.coreServer = null;
    this.coreUrl = null;
    this.client = null;
    this.transport = null;
  }

  async startCore() {
    this.coreServer = createServer(async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const rawBody = Buffer.concat(chunks).toString("utf8");
      const body = rawBody ? JSON.parse(rawBody) : undefined;
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const request = {
        method: req.method,
        url: req.url,
        path: url.pathname,
        searchParams: Object.fromEntries(url.searchParams.entries()),
        headers: req.headers,
        body,
      };
      this.requests.push(request);
      const responseBody =
        request.path === "/users/get"
          ? { error: false, user: { id: "user_1", email: "owner@example.com", role: "user" }, request }
          : { error: false, request };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(responseBody));
    });

    await new Promise((resolveStart) => this.coreServer.listen(0, "127.0.0.1", resolveStart));
    const address = this.coreServer.address();
    this.coreUrl = `http://127.0.0.1:${address.port}`;
  }

  async startMcp() {
    const env = Object.fromEntries(
      Object.entries(process.env).filter((entry) => typeof entry[1] === "string"),
    );
    this.transport = new StdioClientTransport({
      command: process.execPath,
      args: ["dist/index.js"],
      cwd: this.rootDir,
      env: {
        ...env,
        MTROPRO_API_KEY: this.apiKey,
        MTROPRO_API_URL: this.coreUrl,
        MTROPRO_ADMIN_URL: "http://127.0.0.1/admin",
      },
      stderr: "pipe",
    });
    this.transport.stderr?.on("data", (chunk) => {
      this.stderr += chunk.toString();
    });
    this.client = new Client({ name: "mtro-agent-test", version: "1.0.0" });
    await this.client.connect(this.transport);
  }

  async start() {
    await this.startCore();
    await this.startMcp();
  }

  async stop() {
    await this.transport?.close();
    if (this.coreServer) {
      await new Promise((resolveStop) => this.coreServer.close(resolveStop));
    }
  }

  async listTools() {
    return this.client.listTools();
  }

  async callTool(name, args = {}) {
    return this.client.callTool({ name, arguments: args });
  }

  lastRequest() {
    return this.requests[this.requests.length - 1];
  }
}

export function parseTextResult(result) {
  return JSON.parse(result.content[0].text);
}
