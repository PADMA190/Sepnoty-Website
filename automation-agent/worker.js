// automation-agent/worker.js
const { automationQueue } = require('./queue_manager');
const { searchProductOnAmazon } = require('./automation/ecommerce/amazon_handler');
const { searchFoodOnSwiggy } = require('./automation/food_delivery/swiggy_handler');
const { searchBusTicketsOnRedbus } = require('./automation/bus_booking/redbus_handler');

console.log('Worker started. Waiting for automation tasks...');

/**
 * Processes jobs from the automationQueue.
 * Each job should have a `taskType` and a `payload`.
 */
automationQueue.process(async (job) => {
  const { taskType, payload, userInputText } = job.data;
  console.log(`Processing job ${job.id}: ${taskType} with payload:`, payload);
  console.log(`Original user input for job ${job.id}: "${userInputText}"`);

  // Log payment method if provided by NLP and included in payload by API
  if (payload && payload.paymentMethod) {
    console.log(`User specified payment method for job ${job.id}: ${payload.paymentMethod}`);
  }

  try {
    let result;
    switch (taskType) {
      case 'order_product':
        if (!payload || !payload.productName) {
          throw new Error('Missing productName for order_product task');
        }
        console.log(`Worker: Calling searchProductOnAmazon for "${payload.productName}" on platform "${payload.platform || 'amazon'}"`);
        result = await searchProductOnAmazon(payload.productName); // platform is illustrative, handler uses amazon.com
        break;
      case 'order_food':
        if (!payload || !payload.foodItem) {
          throw new Error('Missing foodItem for order_food task');
        }
        console.log(`Worker: Calling searchFoodOnSwiggy for "${payload.foodItem}" in location "${payload.location || 'default'}"`);
        result = await searchFoodOnSwiggy(payload.foodItem, payload.location); // location is illustrative
        break;
      case 'book_bus_ticket':
        if (!payload || !payload.source || !payload.destination || !payload.date) {
          throw new Error('Missing source, destination, or date for book_bus_ticket task');
        }
        console.log(`Worker: Calling searchBusTicketsOnRedbus from "${payload.source}" to "${payload.destination}" on "${payload.date}"`);
        result = await searchBusTicketsOnRedbus(payload.source, payload.destination, payload.date);
        break;
      default:
        throw new Error(`Unknown taskType: ${taskType}`);
    }
    console.log(`Job ${job.id} (${taskType}) completed successfully. Result:`, result);
    return result; // This result is passed to the 'completed' event
  } catch (error) {
    console.error(`Job ${job.id} (${taskType}) failed. Error:`, error.message);
    // Log stack trace for more details if available
    if (error.stack) {
        console.error("Stack trace:", error.stack);
    }
    // It's important to throw the error for Bull to recognize it as a failed job
    throw error;
  }
});

automationQueue.on('failed', (job, err) => {
  console.error(`Worker: Job ${job.id} of type ${job.data.taskType} failed with error: ${err.message}. Payload was:`, job.data.payload);
});

automationQueue.on('completed', (job, result) => {
  console.log(`Worker: Job ${job.id} of type ${job.data.taskType} completed. Result:`, result);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Worker shutting down...');
  await automationQueue.close();
  process.exit(0);
});
