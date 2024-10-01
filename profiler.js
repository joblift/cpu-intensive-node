const { Session } = require("node:inspector");

function createCPUProfiler() {
  let session;

  const start = async () => {
    if (session) {
      return Promise.reject(new Error("Session already connected"));
    }

    session = new Session();
    session.connect();

    await new Promise((resolve, reject) => {
      session.post("Profiler.enable", (err) => {
        if (err) {
          return reject(new Error("Could not enable profiler: " + JSON.stringify(err)));
        }
        // eslint-disable-next-line no-console
        console.log("Profiler enabled");

        session?.post("Profiler.start", (err) => {
          if (err) {
            // eslint-disable-next-line no-console
            return reject(new Error("Could not start profiler: " + JSON.stringify(err)));
          }
          // eslint-disable-next-line no-console
          console.log("Profiler started");
          return resolve();
        });
      });
    });
  };

  const stop = async () => {
    if (!session) {
      return Promise.reject(new Error("Profiler not connected"));
    }

    const profile = await new Promise((resolve, reject) => {
      session.post("Profiler.stop", (err, { profile }) => {
        if (err) {
          reject(err);
          return;
        }
        // eslint-disable-next-line no-console
        console.log("Profiler stopped");
        resolve(profile);
      });
    }).catch((err) => {
      return Promise.reject(new Error("Could not stop profiler: " + JSON.stringify(err)));
    });

    await new Promise((resolve, reject) => {
      session.post("Profiler.disable", (err) => {
        if (err) {
          return reject(new Error("Could not disable profiler: " + JSON.stringify(err)));
        }
        // eslint-disable-next-line no-console
        console.log("Profiler disabled");
        session = undefined;

        resolve();
      });
    });

    return Promise.resolve(profile);
  };

  return {
    start,
    stop,
  };
}

module.exports = { createCPUProfiler };