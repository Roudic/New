import os from "os";

function getLocalIp(): string | null {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family === "IPv4" && !entry.internal) {
        return entry.address;
      }
    }
  }
  return null;
}

const ip = getLocalIp();

console.log("\nJoltCheck dev server");
console.log("  Computer: http://localhost:3000");
if (ip) {
  console.log(`  Phone (same Wi-Fi): http://${ip}:3000`);
} else {
  console.log("  Phone: connect to this machine's Wi-Fi IP on port 3000");
}
console.log("  Do not use localhost on your phone — use the IP address above.\n");
