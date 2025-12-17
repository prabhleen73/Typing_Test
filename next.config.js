module.exports = {
  reactStrictMode: false,
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
