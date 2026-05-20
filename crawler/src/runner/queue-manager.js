const fs = require("fs");

const queue = fs
  .readFileSync("./data.jsonl", "utf-8")
  .split("\n")
  .filter(Boolean)
  .map((l, i) => ({
    id: i,
    data: JSON.parse(l),
    status: "pending"
  }));

let workers = {
  tab1: null,
  tab2: null,
  tab3: null,
  tab4: null,
  tab5: null,
};

function getNextJob() {
  return queue.find((q) => q.status === "pending");
}

function assignJob(workerId) {
  const job = getNextJob();
  if (!job) return null;

  job.status = "processing";
  workers[workerId] = job.id;

  return job;
}

function completeJob(jobId, result) {
  const job = queue.find((q) => q.id === jobId);
  if (job) {
    job.status = "done";
    job.result = result;
  }

  fs.writeFileSync("./result.json", JSON.stringify(queue, null, 2));
}

module.exports = {
  assignJob,
  completeJob
};