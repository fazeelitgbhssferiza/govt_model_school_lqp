const { spawn } = require("node:child_process");

const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  stdio: ["inherit", "pipe", "pipe"],
});

const forwardWithoutBaselineWarning = (source, destination) => {
  let pending = "";

  source.on("data", (chunk) => {
    pending += chunk.toString();
    const lines = pending.split(/(?<=\n)/);
    pending = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.includes("[baseline-browser-mapping]")) destination.write(line);
    }
  });

  source.on("end", () => {
    if (pending && !pending.includes("[baseline-browser-mapping]")) {
      destination.write(pending);
    }
  });
};

forwardWithoutBaselineWarning(child.stdout, process.stdout);
forwardWithoutBaselineWarning(child.stderr, process.stderr);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
