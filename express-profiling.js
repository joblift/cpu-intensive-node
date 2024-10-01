const { createCPUProfiler } = require("./profiler");

function addProfiling(app) {
  const profiler = createCPUProfiler();
  app.post("/startProfiler", async (req, res) => {
    try {
      let duration;

      if (typeof req.query.duration === "string") {
        duration = parseInt(req.query.duration);

        if (isNaN(duration)) {
          res.status(400).json({ error: "invalid duration" });
          return;
        }
      }

      if (duration && duration > 0) {
        setTimeout(async () => {
          const profile = await profiler.stop();
          const outFile = `${os.tmpdir()}/profile-${Date.now()}.cpuprofile`;
          fs.writeFileSync(outFile, JSON.stringify(profile));

          console.log("CPU profile written to: " + path.resolve(outFile));
        }, duration * 1000);
      }
      await profiler.start();

      res.status(200).send("CPU profiler started");
    } catch (error) {
      console.error(
        "Could not start profiler: " + JSON.stringify(error, null, 2)
      );

      res.status(500);
      if (error instanceof Error) {
        res.json({ error: error.message });
      } else {
        res.json({ error: "unknown error" });
      }

      return;
    }
  });

  app.post("/stopProfiler", async (_, res) => {
    try {
      const profile = await profiler.stop();
      res.status(200).json(profile);
      return;
    } catch (error) {
      console.error(
        "Could not stop profiler: " + error
      );

      res.status(500);
      if (error instanceof Error) {
        res.json({ error: error.message });
      } else {
        res.json({ error: "unknown error" });
      }

      return;
    }
  });
}

module.exports = { addProfiling };