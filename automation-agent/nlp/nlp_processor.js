// nlp_processor.js
const natural = require('natural');
const BayesClassifier = natural.BayesClassifier;

const intentRequirements = {
  'order_product': {
    required: ['platform', 'product_name'], // product_name will be tricky with current NLP
    optional: ['paymentMethod']
  },
  'order_food': {
    required: ['item'],
    optional: ['platform', 'paymentMethod']
  },
  'book_bus_ticket': {
    required: ['destination', 'source'], // date is also essential but not extracted by NLP yet
    optional: ['date', 'paymentMethod']
  }
};
const classifier = new BayesClassifier();
const WordTokenizer = natural.WordTokenizer;
const tokenizer = new WordTokenizer();

// Train the classifier with sample phrases for intent recognition
// Order Product Intent
classifier.addDocument('Order a laptop from Amazon', 'order_product');
classifier.addDocument('Buy an iPhone from Flipkart pay with card', 'order_product');
classifier.addDocument('Get a red dress from Meesho', 'order_product');
classifier.addDocument('purchase a book on abebooks use upi', 'order_product');
classifier.addDocument('find me a new phone', 'order_product');


// Order Food Intent
classifier.addDocument('Order a pizza from Swiggy cash on delivery', 'order_food');
classifier.addDocument('Get biryani from Zomato', 'order_food');
classifier.addDocument('I want to eat pasta pay with GPay', 'order_food');
classifier.addDocument('Fetch some sushi', 'order_food');

// Book Bus Ticket Intent
classifier.addDocument('Book a bus ticket to Delhi on RedBus use my card', 'book_bus_ticket');
classifier.addDocument('Get a bus to Bangalore', 'book_bus_ticket');
classifier.addDocument('find a bus to Mumbai pay via netbanking', 'book_bus_ticket');
classifier.addDocument('reserve a seat for Hyderabad', 'book_bus_ticket');

classifier.train();

// Regex for basic payment method spotting
const paymentMethodPatterns = {
  credit_card: /\b(?:pay\s+(?:by|with|using)\s+)?(?:credit\s+)?card\b/i,
  debit_card: /\b(?:pay\s+(?:by|with|using)\s+)?debit\s+card\b/i,
  upi: /\b(?:pay\s+(?:by|with|using)\s+)?upi\b|\bgpay\b|\bphonepe\b|\bpaytm\b/i, // Added common UPI apps
  netbanking: /\b(?:pay\s+(?:by|with|using)\s+)?net\s*banking\b/i,
  cod: /\b(?:cash\s+on\s+delivery|cod)\b/i,
};

// Basic keyword-based entity extraction
const entityKeywords = {
  order_product: {
    platform: ['Amazon', 'Flipkart', 'Meesho', 'abebooks'],
    // product_name is harder, will keep it simple or placeholder
  },
  order_food: {
    item: ['pizza', 'biryani', 'pasta', 'sushi'],
    // restaurant can be added
  },
  book_bus_ticket: {
    destination: ['Delhi', 'Bangalore', 'Mumbai', 'Hyderabad'],
    // source can be added
  }
};

/**
 * Processes the input text to identify intent and extract basic entities.
 * @param {string} inputText - The user's input text.
 * @returns {object} - An object containing the classified intent and extracted entities.
 *                     Example: { intent: 'order_product', entities: { platform: 'Amazon' } }
 */
function processText(inputText) {
  const tokens = tokenizer.tokenize(inputText.toLowerCase());
  const intent = classifier.classify(inputText);
  const entities = {};

  // Keyword-based entity extraction
  // For 'order_product', current keyword logic mainly finds 'platform'.
  // 'product_name' is more of a guess if platform isn't found.
  // For 'order_food', 'item' is extracted.
  // For 'book_bus_ticket', 'destination' and 'source' are extracted if keywords match.
  if (entityKeywords[intent]) {
    for (const entityType in entityKeywords[intent]) {
      const keywords = entityKeywords[intent][entityType];
      for (const keyword of keywords) {
        if (inputText.toLowerCase().includes(keyword.toLowerCase())) {
          entities[entityType] = keyword;
          // For simplicity, taking the first match. Could be extended.
        }
      }
    }
  }

  // Specific handling for 'product_name' for 'order_product' intent as it's more complex
  // This is a very naive placeholder for product name extraction within NLP.
  // The logic in index.js is more robust for guessing productName.
  // Here, we'll use 'product_name_guess' if it exists, or leave 'product_name' empty for NLP.
  if (intent === 'order_product') {
    const productHintWords = ['laptop', 'iphone', 'dress', 'book', 'phone', 'shirt', 'shoes'];
    if (entities.platform) { // If a platform is mentioned, try to get words before it
        const platformIndex = inputText.toLowerCase().indexOf(entities.platform.toLowerCase());
        if (platformIndex > 0) {
            const precedingText = inputText.substring(0, platformIndex).trim();
            // Very simple: assume the last few words before platform might be product
            const potentialProduct = precedingText.split(' ').slice(-3).join(' '); // take last 3 words
             if(potentialProduct) entities.product_name = potentialProduct;
        }
    }
    if (!entities.product_name) { // Fallback to hint words if no better guess
        for (const token of tokens) {
            if (productHintWords.includes(token)) {
                entities.product_name = token; // Use 'product_name' to align with intentRequirements
                break;
            }
        }
    }
  }


  // Payment Method Extraction
  for (const method in paymentMethodPatterns) {
    if (paymentMethodPatterns[method].test(inputText)) {
      entities.paymentMethod = method;
      break;
    }
  }

  // Check for missing entities
  let missingEntities = [];
  const requirements = intentRequirements[intent];
  if (requirements) {
    for (const requiredEntity of requirements.required) {
      if (!entities[requiredEntity] || entities[requiredEntity].length === 0) {
        missingEntities.push(requiredEntity);
      }
    }
  }

  return { intent, entities, missingEntities };
}

module.exports = { processText };
