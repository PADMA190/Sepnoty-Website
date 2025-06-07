// automation-agent/automation/food_delivery/swiggy_handler.js
const { Builder, By, Key, until } = require('selenium-webdriver');

/**
 * Placeholder function to check and handle Swiggy login.
 * @param {import('selenium-webdriver').WebDriver} driver - The WebDriver instance.
 */
async function checkAndHandleLoginSwiggy(driver) {
  // Swiggy's login is often modal-based or a separate page.
  // For this placeholder, we'll just log and assume login is handled or not strictly required for search.
  console.log("Swiggy: Checking login status. Assuming user is logged in or login would be handled if required for the action.");
  // Example: One might look for a user profile icon or name if logged in.
  // const userProfileElement = await driver.findElements(By.xpath("//div[contains(@class,'user-profile')]")); // Example selector
  // if (userProfileElement.length > 0) {
  //   console.log("Swiggy: User appears to be logged in.");
  // } else {
  //   console.log("Swiggy: User does not appear to be logged in, or login not checked at this stage.");
  // }
}

/**
 * Searches for a food item on Swiggy.com using Selenium.
 *
 * Assumptions:
 * - ChromeDriver is installed and in the system's PATH.
 * - Swiggy's initial page has a location search input with ID 'location'.
 * - After typing a location, the first suggestion is clicked.
 * - Food search input is identifiable (e.g., by a placeholder or class after location is set).
 *
 * @param {string} foodItemName - The name of the food item to search for.
 * @param {string} [locationName='Bangalore'] - The location to search within.
 * @returns {Promise<object>} - A promise that resolves to an object indicating success or failure.
 */
async function searchFoodOnSwiggy(foodItemName, locationName = 'Bangalore') {
  let driver;
  console.log(`Attempting to search for "${foodItemName}" in "${locationName}" on Swiggy.`);

  try {
    driver = await new Builder().forBrowser('chrome').build();
    await driver.manage().window().maximize();

    // Call login check
    await checkAndHandleLoginSwiggy(driver);

    // Navigate to Swiggy
    await driver.get('https://www.swiggy.com');

    // 1. Handle Location
    // Wait for the location input field to be present
    const locationInput = await driver.wait(until.elementLocated(By.id('location')), 15000);
    await driver.wait(until.elementIsVisible(locationInput), 5000);
    console.log('Swiggy location input located.');

    await locationInput.sendKeys(locationName);
    console.log(`Entered location: "${locationName}"`);

    // Wait for the location suggestions to appear (this selector might be fragile)
    // Swiggy uses dynamic class names, this is a common pattern for suggestions.
    // Using a more robust selector if possible is advised, e.g., one with a stable parent.
    const firstSuggestion = await driver.wait(until.elementLocated(By.xpath('//div[contains(@class, "_1oLDb")]/button[1]')), 10000);
    // The class _1oLDb was observed on 2024-03-15 for the suggestion dropdown items. This is highly likely to change.
    // A safer XPath might be: //button[.//span[contains(text(), "Bangalore")]] if the text is predictable.
    // For this example, we'll stick to a generic first suggestion click.
    await driver.wait(until.elementIsVisible(firstSuggestion), 5000);
    await firstSuggestion.click();
    console.log('Clicked on the first location suggestion.');

    // Wait for the page to update after location selection.
    // This could be waiting for the food search input to become available/visible or a known element on the post-location page.
    // Swiggy's food search input appears after location. It's often within a div with class like 'SearchBar<y_bin_46>'.
    // Let's look for an input that typically has placeholder "Search for restaurants and food" or similar.
    // This is a bit of a guess as Swiggy's classes are dynamic.
    // Using a more generic XPath that looks for an input within a specific search-related div.
    await driver.wait(until.elementLocated(By.xpath('//input[@placeholder="Search for restaurants and food"]')), 15000); // Common placeholder
    console.log('Page updated after location selection. Food search should be available.');

    // 2. Search for Food
    // The search input might now be different or might be the same input field repurposed.
    // Often, after location selection, you are taken to a page where a prominent search bar is available.
    // Let's try to find the search input again, it might be a different element or the same one cleared.
    // Swiggy might use a specific class or type for its food search input.
    // Using a common pattern for search inputs: an input tag with type 'text' inside a div that looks like a search bar.
    const foodSearchInput = await driver.wait(until.elementLocated(By.xpath('//input[@placeholder="Search for restaurants and food"]')), 10000);
    await driver.wait(until.elementIsVisible(foodSearchInput), 5000);
    console.log('Swiggy food search input located.');

    await foodSearchInput.sendKeys(foodItemName);
    console.log(`Entered food item: "${foodItemName}"`);

    // Swiggy often shows search suggestions dynamically. We might need to click a search button or just press Enter.
    // Pressing Enter is usually a safe bet if there isn't an obvious search button.
    await foodSearchInput.sendKeys(Key.RETURN); // Or Key.ENTER
    console.log('Submitted food search.');

    // Wait for search results to load.
    // This is highly dependent on Swiggy's dynamic content.
    // We'll look for a container that typically holds restaurant or food item cards.
    // Example: a div that contains multiple items with a class like '_3XX_A' (observed for restaurant cards).
    // This selector is very likely to change.
    await driver.wait(until.elementLocated(By.xpath("//div[contains(@class, 'RestaurantList__wrapper')] | //div[contains(@class, 'styles_container')] | //div[contains(@class, '_3XX_A')] | //div[contains(@class,'styles_SUCCESS')]")), 20000);
    console.log('Swiggy food search results page/section loaded.');

    // Conceptual point for adding items to cart and payment
    console.log("Swiggy: Conceptual checkout/cart point reached.");
    console.log("Swiggy: Payment processing placeholder. Real payment integration needed here.");

    return { success: true, message: `Successfully initiated search for "${foodItemName}" in "${locationName}" on Swiggy and reached conceptual payment point.` };

  } catch (error) {
    console.error(`Error during Swiggy search for "${foodItemName}" in "${locationName}":`, error);
    // Take a screenshot on error for debugging
    if (driver) {
        try {
            const image = await driver.takeScreenshot();
            require('fs').writeFileSync(`swiggy_error_screenshot_${Date.now()}.png`, image, 'base64');
            console.log('Swiggy: Screenshot taken on error.');
        } catch (ssError) {
            console.error('Swiggy: Failed to take screenshot:', ssError);
        }
    }
    return { success: false, message: `Failed to search for "${foodItemName}" on Swiggy. Error: ${error.message}` };
  } finally {
    if (driver) {
      await driver.quit();
      console.log('Browser closed.');
    }
  }
}

module.exports = { searchFoodOnSwiggy };
