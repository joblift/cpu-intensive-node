const express = require('express');
const { addProfiling } = require('./express-profiling');

const app = express();
const admin = express();
addProfiling(admin);

const port = 3003;
const adminPort = 3004;

const getDuration = (req) => {
  const durationStr = req.query.duration;
  return (typeof durationStr === "string" && parseInt(durationStr)) || 0; duration;
};

const busyWait = (durationMs) => {
  const end = Date.now() + durationMs;
  while (Date.now() < end) {
    // Busy waiting
  }
};

const toChunks = (totalDurationMs, chunkDurationMs) => ({
  numChunks: totalDurationMs / chunkDurationMs,
  doWork: () => busyWait(chunkDurationMs)
});

const allChunksProcessed = (numRemainingChunks) => numRemainingChunks === 0;

const busyRecursiveSplitAsync = async (
  { numChunks, doWork }
) => {
  if (!allChunksProcessed(numChunks)) {
    doWork();
    await busyRecursiveSplitAsync({ numChunks: numChunks - 1, doWork });
  }
};

const busyRecursiveSplitPromised = (
  { numChunks, doWork }
) => {
  return new Promise((resolve) => {
    if (allChunksProcessed(numChunks)) {
      resolve(true);
    } else {
      doWork();
      resolve(false);
    }
  }).then((finished) => !finished && busyRecursiveSplitPromised({ numChunks: numChunks - 1, doWork }));
};


const busyRecursiveSplitWith = ({ numChunks, doWork }, executeFunction) => {
  return new Promise((resolve) => _busyRecursiveSplitWith({ numChunks, doWork }, executeFunction, resolve));
}

const _busyRecursiveSplitWith = (
  { numChunks, doWork },
  executeFunction,
  resolve
) => {
  if (allChunksProcessed(numChunks)) {
    resolve(null);
  } else {
    executeFunction(() => {
      doWork();
      _busyRecursiveSplitWith({ numChunks: numChunks - 1, doWork }, executeFunction, resolve);
    });
  }
};

const busyIterativeSplitWith = ({ numChunks, doWork }, executeFunction) => {
  return new Promise((resolve) => _busyIterativeSplitWith({ numChunks, doWork }, executeFunction, resolve));
}

const _busyIterativeSplitWith = (
  { numChunks, doWork },
  executeFunction,
  resolve
) => {
  let numRemainingChunks = numChunks;
  for (let i = 0; i < numChunks; i++) {
    executeFunction(() => {
      doWork();
      numRemainingChunks--;
      if (allChunksProcessed(numRemainingChunks)) {
        resolve(null);
      }
    });
  }
};

app.get('/', (req, res, next) => {
  const totalDurationMs = getDuration(req);
  const mode = req.query.mode || 'busy-wait';

  const respond = () => {
    res.send('Hello World');
    next();
  };

  if (!totalDurationMs) {
    // be as fast as possible
    respond();
    return;
  }

  switch (mode) {

    case 'busy-wait':
      // Do heavy computation directly in the request handler
      busyWait(totalDurationMs);
      respond();
      return;

    case 'busy-wait-async':
      // Naively try to offload heavy computation with async
      (async () => busyWait(totalDurationMs))()
        .then(respond)

      return;

    case 'recursive-split-async':
      // Split heavy computation into smaller chunks where one chunk schedules the next one,
      // using async/await
      busyRecursiveSplitAsync(toChunks(totalDurationMs, 10))
        .then(respond);
      return;

    case 'recursive-split-promise':
      // Split heavy computation into smaller chunks where one chunk schedules the next one,
      // using Promises
      // Note: not using await here in order to really make use of only promises and no async/await
      busyRecursiveSplitPromised(toChunks(totalDurationMs, 10))
        .then(respond);
      return;

    case 'recursive-split-next-tick':
      // Split heavy computation into smaller chunks where one chunk schedules the next one,
      // using process.nextTick
      busyRecursiveSplitWith(toChunks(totalDurationMs, 10), process.nextTick)
        .then(respond)
      return;

    case 'recursive-split-immediate':
      // Split heavy computation into smaller chunks where one chunk schedules the next one,
      // using setImmediate
      busyRecursiveSplitWith(toChunks(totalDurationMs, 10), setImmediate)
        .then(respond);
      return;

    case 'recursive-split-timeout':
      // Split heavy computation into smaller chunks where one chunk schedules the next one,
      // using setTimeout(0)
      busyRecursiveSplitWith(toChunks(totalDurationMs, 10), (cb) => setTimeout(cb, 0))
        .then(respond);
      return;

    case 'iterative-split-immediate':
      // Split heavy computation into smaller chunks that are scheduled all at once,
      // using setImmediate
      busyIterativeSplitWith(toChunks(totalDurationMs, 10), setImmediate)
        .then(respond);
      return;

    case 'iterative-split-timeout':
      // Split heavy computation into smaller chunks that are scheduled all at once,
      // using setTimeout(0)
      busyIterativeSplitWith(toChunks(totalDurationMs, 10), (cb) => setTimeout(cb, 0))
        .then(respond);
      return;

    default:
      console.error('unknown mode ' + mode);
      respond();
      return;
  }
});

admin.listen(adminPort, () => console.log('Admin Server is listening on http://localhost:' + adminPort));
app.listen(port, () => console.log('Server is listening on http://localhost:' + port));