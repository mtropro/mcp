import { createServer, IncomingMessage, ServerResponse } from "http";
import { writeFileSync } from "fs";
import { getAuthFilePath, getConfig } from "./config.js";
import open from "open";

const SUCCESS_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>MTROPRO - Connected</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8fafc; }
    .card { background: white; border-radius: 12px; padding: 48px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 400px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { margin: 0 0 8px; font-size: 24px; color: #0f172a; }
    p { margin: 0; color: #64748b; font-size: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#10003;</div>
    <h1>Connected to MTROPRO</h1>
    <p>You can close this tab and return to your application.</p>
  </div>
</body>
</html>`;

const WAITING_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>MTROPRO - Connecting...</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8fafc; }
    .card { background: white; border-radius: 12px; padding: 48px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 400px; }
    .spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { margin: 0 0 8px; font-size: 24px; color: #0f172a; }
    p { margin: 0; color: #64748b; font-size: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>Connecting to MTROPRO</h1>
    <p>Complete the authentication in the browser tab that just opened...</p>
  </div>
</body>
</html>`;

export async function authenticateViaBrowser(): Promise<string> {
  const config = getConfig();

  return new Promise((resolve, reject) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url || "/", `http://localhost`);

      if (url.pathname === "/callback") {
        const key = url.searchParams.get("key");

        if (key && key.startsWith("mtro_")) {
          // Save the API key
          writeFileSync(
            getAuthFilePath(),
            JSON.stringify({ apiKey: key, authenticatedAt: new Date().toISOString() }, null, 2)
          );

          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(SUCCESS_HTML);

          // Close server and resolve
          setTimeout(() => {
            server.close();
            resolve(key);
          }, 500);
        } else {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<html><body><h1>Error</h1><p>Invalid API key received.</p></body></html>");
        }
        return;
      }

      // Default: show waiting page
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(WAITING_HTML);
    });

    // Listen on random port
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to start local auth server"));
        return;
      }

      const callbackUrl = `http://127.0.0.1:${address.port}/callback`;
      const authUrl = `${config.adminUrl}/mcp-auth?callback=${encodeURIComponent(callbackUrl)}`;

      // Open browser
      open(authUrl).catch(() => {
        // If open fails, user will need to manually navigate
      });
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("Authentication timed out after 5 minutes."));
    }, 5 * 60 * 1000);
  });
}
