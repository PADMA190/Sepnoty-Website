// automation-agent/queue_manager.js
const Bull = require('bull');

// Initialize a new Bull queue.
// Replace with your Redis connection string if different.
// Assumes Redis is running on the default local port.
const automationQueue = new Bull('automation-tasks', 'redis://127.0.0.1:6379');

console.log('Automation task queue initialized.');

// Optional: Event listeners for queue events (globally or per job)
automationQueue.on('error', function(error) {
  console.error('Bull queue error:', error);
});

automationQueue.on('waiting', function(jobId){
  // A job is waiting for a worker to be available.
  // console.log(`Job ${jobId} is waiting.`);
});

automationQueue.on('active', function(job, jobPromise){
  // A job has started. You can use `jobPromise.cancel()` to abort it.
  console.log(`Job ${job.id} has started.`);
});

automationQueue.on('completed', function(job, result){
  console.log(`Job ${job.id} completed! Result:`, result);
});

automationQueue.on('failed', function(job, err){
  console.error(`Job ${job.id} failed! Error:`, err);
});

automationQueue.on('paused', function(){
  // The queue has been paused.
  console.log('Automation task queue paused.');
});

automationQueue.on('resumed', function(job){
  // The queue has been resumed.
  console.log('Automation task queue resumed.');
});

automationQueue.on('cleaned', function(jobs, type) {
  // Old jobs have been cleaned from the queue. `type` is the type of jobs cleaned.
  // console.log(`Cleaned ${jobs.length} ${type} jobs`);
});

automationQueue.on('drained', function() {
  // Emitted when the queue has processed all jobs and is empty.
  // console.log('Automation task queue drained.');
});

automationQueue.on('removed', function(job){
  // A job successfully removed.
  // console.log(`Job ${job.id} removed.`);
});


module.exports = { automationQueue };
