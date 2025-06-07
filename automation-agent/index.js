const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const { processText } = require('./nlp/nlp_processor'); // Import NLP processor
const { automationQueue } = require('./queue_manager'); // Import Bull queue

// Removed direct handler imports as they are used by the worker now
// const { searchProductOnAmazon } = require('./automation/ecommerce/amazon_handler');
// const { searchFoodOnSwiggy } = require('./automation/food_delivery/swiggy_handler');
// const { searchBusTicketsOnRedbus } = require('./automation/bus_booking/redbus_handler');

app.use(express.json()); // Middleware to parse JSON bodies

// API Routes
app.post('/order_product', async (req, res) => {
  console.log('POST /order_product hit');
  const userInput = req.body.userInputText;
  if (!userInput) {
    return res.status(400).json({ error: 'userInputText is required in the request body' });
  }

  const nlpResult = processText(userInput);
  console.log('NLP Result for /order_product:', nlpResult);

  // Check for missing entities before proceeding
  if (nlpResult.missingEntities && nlpResult.missingEntities.length > 0) {
    let clarificationMessage = "I need a bit more information to order a product. ";
    nlpResult.missingEntities.forEach(entity => {
      if (entity === 'product_name') clarificationMessage += "What product are you looking for? ";
      if (entity === 'platform') clarificationMessage += "Which platform (e.g., Amazon, Flipkart)? ";
      // Add more specific messages as needed
    });
    return res.status(400).json({
      clarification_needed: true,
      message: clarificationMessage,
      missing_entities: nlpResult.missingEntities,
      original_intent: nlpResult.intent,
      extracted_entities: nlpResult.entities
    });
  }

  if (nlpResult.intent === 'order_product') {
    // Entities should be present due to the check above, but keep defaults/fallbacks for safety if any required field was missed by intentRequirements
    const platform = (nlpResult.entities && nlpResult.entities.platform) || 'amazon';
    // productName should be reliably present if it's in requiredEntities.
    // The complex fallback logic for productName might be simplified or removed if NLP is robust enough.
    // For now, we assume nlpResult.entities.product_name is populated by nlp_processor if found.
    let productName = nlpResult.entities && nlpResult.entities.product_name;

    // This specific fallback for productName might become redundant if NLP's product_name extraction is deemed sufficient
    // and 'product_name' is correctly listed in intentRequirements.
    // If NLP consistently fails for product_name, then this fallback is still useful AFTER the missingEntities check.
    // However, the missingEntities check is based on what NLP *itself* provides.
    if (!productName && userInput) {
        console.log("Warning: productName was missing from NLP but required; attempting API-level fallback. This indicates NLP may need enhancement for 'product_name'.");
        const tokens = userInput.toLowerCase().split(' ');
        const platformTokenIndex = platform ? tokens.indexOf(platform.toLowerCase()) : -1;
        if (platformTokenIndex !== -1 && platformTokenIndex > 0) {
            productName = tokens.slice(0, platformTokenIndex).join(' ');
        } else if (platformTokenIndex === -1 && tokens.length > 1 && (tokens[0] === "order" || tokens[0] === "buy" || tokens[0] === "get" || tokens[0] === "purchase" || tokens[0] === "find")) {
             productName = tokens.slice(1).join(' ');
        } else {
            productName = userInput.split(' ').slice(1).join(' '); // very crude
        }
        const commonWordsToRemove = ["a", "an", "the", "from", "on", "for"];
        productName = productName.split(' ').filter(word => !commonWordsToRemove.includes(word) && word.toLowerCase() !== platform?.toLowerCase()).join(' ').trim();
    }

    // After potentially running the fallback, we check if productName is now available.
    if (productName && productName.length > 0) {
      const jobData = {
        taskType: 'order_product',
        payload: {
          productName,
          platform,
          paymentMethod: nlpResult.entities && nlpResult.entities.paymentMethod
        },
        userInputText: userInput
      };
      try {
        const job = await automationQueue.add(jobData);
        console.log(`Job added for order_product: ${job.id}`);
        return res.json({ message: "Product order task queued successfully.", jobId: job.id, nlp_result: nlpResult });
      } catch (err) {
        console.error('Failed to add job to queue for order_product:', err);
        return res.status(500).json({ error: "Failed to queue task.", details: err.message, nlp_result: nlpResult });
      }
    } else {
      // This case should ideally be caught by the missingEntities check if 'product_name' is required.
      // If it reaches here, it means 'product_name' might not be strictly required by NLP, or the fallback also failed.
      return res.status(400).json({ error: 'Could not determine the product name even after fallback.', nlp_result: nlpResult });
    }
  } else {
    return res.status(400).json({ error: `Request intent "${nlpResult.intent}" not suitable for product ordering.`, nlp_result: nlpResult });
  }
});

app.post('/order_food', async (req, res) => {
  console.log('POST /order_food hit');
  const userInput = req.body.userInputText;
  if (!userInput) {
    return res.status(400).json({ error: 'userInputText is required in the request body' });
  }

  const nlpResult = processText(userInput);
  console.log('NLP Result for /order_food:', nlpResult);

  if (nlpResult.missingEntities && nlpResult.missingEntities.length > 0) {
    let clarificationMessage = "I need a bit more information to order food. ";
    nlpResult.missingEntities.forEach(entity => {
      if (entity === 'item') clarificationMessage += "What food item would you like to order? ";
      // Add more specific messages if other entities become required for food
    });
    return res.status(400).json({
      clarification_needed: true,
      message: clarificationMessage,
      missing_entities: nlpResult.missingEntities,
      original_intent: nlpResult.intent,
      extracted_entities: nlpResult.entities
    });
  }

  if (nlpResult.intent === 'order_food') {
    const foodItem = nlpResult.entities && nlpResult.entities.item; // Should be present
    const location = nlpResult.entities && nlpResult.entities.location;

    // foodItem should be guaranteed by the missingEntities check if 'item' is required.
    if (foodItem) {
      const jobData = {
        taskType: 'order_food',
        payload: {
          foodItem,
          location,
          paymentMethod: nlpResult.entities && nlpResult.entities.paymentMethod
        },
        userInputText: userInput
      };
      try {
        const job = await automationQueue.add(jobData);
        console.log(`Job added for order_food: ${job.id}`);
        return res.json({ message: "Food order task queued successfully.", jobId: job.id, nlp_result: nlpResult });
      } catch (err) {
        console.error('Failed to add job to queue for order_food:', err);
        return res.status(500).json({ error: "Failed to queue task.", details: err.message, nlp_result: nlpResult });
      }
    } else {
      // This path should ideally not be hit if 'item' is correctly in requiredEntities.
      return res.status(400).json({ error: 'Could not determine food item from your request (should have been caught by missing entity check).', nlp_result: nlpResult });
    }
  } else {
     return res.status(400).json({ error: `Request intent "${nlpResult.intent}" not suitable for food ordering.`, nlp_result: nlpResult });
  }
});

app.post('/book_bus_ticket', async (req, res) => {
  console.log('POST /book_bus_ticket hit');
  const userInput = req.body.userInputText;
  if (!userInput) {
    return res.status(400).json({ error: 'userInputText is required in the request body' });
  }

  const nlpResult = processText(userInput);
  console.log('NLP Result for /book_bus_ticket:', nlpResult);

  if (nlpResult.missingEntities && nlpResult.missingEntities.length > 0) {
    let clarificationMessage = "I need a bit more information to book a bus ticket. ";
    nlpResult.missingEntities.forEach(entity => {
      if (entity === 'source') clarificationMessage += "Where are you travelling from? ";
      if (entity === 'destination') clarificationMessage += "Where are you travelling to? ";
      if (entity === 'date') clarificationMessage += "On what date would you like to travel? ";
    });
    return res.status(400).json({
      clarification_needed: true,
      message: clarificationMessage,
      missing_entities: nlpResult.missingEntities,
      original_intent: nlpResult.intent,
      extracted_entities: nlpResult.entities
    });
  }

  if (nlpResult.intent === 'book_bus_ticket') {
    // source and destination should be present due to the check above.
    const source = nlpResult.entities && nlpResult.entities.source;
    const destination = nlpResult.entities && nlpResult.entities.destination;
    let travelDate = nlpResult.entities && nlpResult.entities.date;

    // Date defaulting logic remains important if 'date' is optional in NLP's requirements,
    // or if NLP can't extract it reliably yet.
    if (!travelDate) {
        const today = new Date();
        const futureDay = new Date(today.setDate(today.getDate() + 7));
        const day = futureDay.getDate();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = monthNames[futureDay.getMonth()];
        const year = futureDay.getFullYear();
        travelDate = `${day} ${month} ${year}`;
        console.log(`NLP did not provide a date for bus ticket, using default: ${travelDate}`);
        if (!nlpResult.entities) nlpResult.entities = {};
        nlpResult.entities.date_defaulted = travelDate; // Log that we defaulted it
    }

    // All required entities (source, destination) should be present due to the missingEntities check.
    // travelDate will be present either from NLP or from the fallback.
    if (source && destination && travelDate) {
      const jobData = {
        taskType: 'book_bus_ticket',
        payload: {
          source,
          destination,
          date: travelDate,
          paymentMethod: nlpResult.entities && nlpResult.entities.paymentMethod
        },
        userInputText: userInput
      };
      try {
        const job = await automationQueue.add(jobData);
        console.log(`Job added for book_bus_ticket: ${job.id}`);
        return res.json({ message: "Bus ticket booking task queued successfully.", jobId: job.id, nlp_result: nlpResult });
      } catch (err) {
        console.error('Failed to add job to queue for book_bus_ticket:', err);
        return res.status(500).json({ error: "Failed to queue task.", details: err.message, nlp_result: nlpResult });
      }
    } else {
      // This part should ideally not be reached if missingEntities logic is correct for source/destination.
      // It might be reached if travelDate somehow becomes null/empty after the default logic, which is unlikely.
      let missingDebug = [];
      if (!source) missingDebug.push("source");
      if (!destination) missingDebug.push("destination");
      if (!travelDate) missingDebug.push("travelDate");
      return res.status(400).json({ error: `Could not determine required fields (debug: ${missingDebug.join(',')}) even after checks. This indicates an issue.`, nlp_result: nlpResult });
    }
  } else {
    return res.status(400).json({ error: `Request intent "${nlpResult.intent}" not suitable for bus ticket booking.`, nlp_result: nlpResult });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
