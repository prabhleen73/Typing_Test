const fs = require("fs");
const path = require("path");

function readEnvValue(key) {
  const envPath = path.join(__dirname, ".env.local");
  if (!fs.existsSync(envPath)) return undefined;

  const content = fs.readFileSync(envPath, "utf8");
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}=`));

  return line?.slice(key.length + 1).trim();
}

module.exports = {
  reactStrictMode: false,
  allowedDevOrigins: [
    "10.40.5.191",
    "localhost",
    "127.0.0.1",
  ],
  env: {
    NEXT_PUBLIC_CONVEX_URL:
      readEnvValue("NEXT_PUBLIC_CONVEX_URL") || process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_CONVEX_SITE_URL:
      readEnvValue("NEXT_PUBLIC_CONVEX_SITE_URL") || process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
  },
  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        ignored: [
          '**/node_modules/**',             // Ignore node_modules folder
          '**/pagefile.sys',                // Ignore pagefile.sys
          '**/System Volume Information',   // Ignore system volume information folder
          '**/*.bak',                       // Ignore backup files
          '**/*.swp',                       // Ignore swap files
          '**/.git/**',                     // Ignore git folders and files
          '**/.next/**',                    // Ignore next.js cache files
          '**/.vscode/**',                  // Ignore VS Code settings
        ],
        poll: 1000,  // Poll every second (adjust as needed)
        aggregateTimeout: 300,  // Delay rebuild after changes (300ms)
      };
    }
    return config;
  },
};
