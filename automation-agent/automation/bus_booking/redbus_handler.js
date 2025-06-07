// automation-agent/automation/bus_booking/redbus_handler.js
const { Builder, By, Key, until } = require('selenium-webdriver');
const fs = require('fs'); // For saving screenshots

/**
 * Placeholder function to check and handle RedBus login.
 * @param {import('selenium-webdriver').WebDriver} driver - The WebDriver instance.
 */
async function checkAndHandleLoginRedbus(driver) {
  // Redbus login is typically through an icon that opens a modal or navigates.
  console.log("RedBus: Checking login status. Assuming user is logged in or login would be handled if required for booking.");
  // Example: Look for a user profile icon or "My Bookings" link that's common for logged-in states.
  // const userIcon = await driver.findElements(By.xpath("//i[contains(@class,'rb_user_icon')]")); // Example selector
  // if (userIcon.length > 0) {
  //    console.log("RedBus: User profile icon found, potentially logged in.");
  // } else {
  //    console.log("RedBus: User profile icon not found.");
  // }
}

/**
 * Searches for bus tickets on RedBus.in using Selenium.
 *
 * Assumptions:
 * - ChromeDriver is installed and in the system's PATH.
 * - Input field IDs/Classes are relatively stable (src, dest, ondate, search_button).
 * - Date format for input is 'YYYY-MM-DD' and we will try to pick the day directly.
 *   More complex date picking (changing month/year) is not fully implemented here.
 * - Basic pop-up handling by pressing Escape key.
 *
 * @param {string} source - The source city.
 * @param {string} destination - The destination city.
 * @param {string} dateString - The date of travel (e.g., '25 Mar 2024' or a full date that can be parsed).
 *                              For simplicity, we'll try to click the day directly.
 * @returns {Promise<object>} - A promise that resolves to an object indicating success or failure.
 */
async function searchBusTicketsOnRedbus(source, destination, dateString) {
  let driver;
  console.log(`Attempting to search for bus tickets from "${source}" to "${destination}" on "${dateString}" on RedBus.`);

  try {
    driver = await new Builder().forBrowser('chrome').build();
    await driver.manage().window().maximize(); // Maximize window for better stability

    // Call login check
    await checkAndHandleLoginRedbus(driver);

    // Navigate to RedBus
    await driver.get('https://www.redbus.in');

    // Handle potential initial pop-up (common on Redbus)
    // A common strategy is to send an Escape key press to the body to close overlays.
    try {
      await driver.wait(until.elementLocated(By.tagName('body')), 5000);
      await driver.findElement(By.tagName('body')).sendKeys(Key.ESCAPE);
      console.log('Sent ESCAPE key to close potential pop-ups.');
      await driver.sleep(1000); // Give it a moment to close
    } catch (e) {
      console.log('No pop-up to close or ESC did not work, continuing...');
    }

    // 1. Enter Source
    const sourceInput = await driver.wait(until.elementLocated(By.id('src')), 10000);
    await sourceInput.sendKeys(source);
    console.log(`Entered source: "${source}"`);
    await driver.sleep(1000); // Wait for suggestions
    // Click the first suggestion (assuming it's the most relevant)
    // Redbus suggestions are often in <ul> with class 'autoFill' or similar
    const sourceSuggestion = await driver.wait(until.elementLocated(By.xpath("//ul[contains(@class,'autoFill')]/li[1] | //ul[contains(@class,'rb-auto-complete')]/li[1]")), 5000);
    await sourceSuggestion.click();
    console.log('Clicked source suggestion.');

    // 2. Enter Destination
    const destinationInput = await driver.wait(until.elementLocated(By.id('dest')), 10000);
    await destinationInput.sendKeys(destination);
    console.log(`Entered destination: "${destination}"`);
    await driver.sleep(1000); // Wait for suggestions
    const destinationSuggestion = await driver.wait(until.elementLocated(By.xpath("//ul[contains(@class,'autoFill')]/li[1] | //ul[contains(@class,'rb-auto-complete')]/li[1]")), 5000);
    await destinationSuggestion.click();
    console.log('Clicked destination suggestion.');

    // 3. Select Date
    // Redbus date picker can be complex. We'll try a simplified approach.
    // The 'dateString' should ideally be in a format that allows direct day clicking.
    // e.g. if dateString is "25 Mar 2024", we need to parse day "25".
    // For this example, let's assume dateString gives us the day of the month directly.
    // And that the current or next month is displayed.

    const dateInput = await driver.wait(until.elementLocated(By.id('onward_cal')), 10000); // This is often the trigger
    await dateInput.click(); // Open the calendar
    console.log('Clicked to open date picker.');
    await driver.sleep(500);

    // Example: dateString = "28" (day of the month)
    // This is a simplified selector and assumes the day is in the current view.
    // A robust solution would parse dateString, check current month/year, and navigate if needed.
    // Redbus calendar days are often `<td>` elements with class `wd day` or just `day`.
    // We'll try to find a td that is not disabled and matches the day.
    // Let's parse the day from a string like "28 Mar 2024"
    const dayToSelect = dateString.split(' ')[0]; // e.g., "28"

    // This XPath tries to find a clickable day in the calendar.
    // It looks for a <td> that is not marked as 'disabled', contains the specific day, and is within the current month if possible.
    // The structure is often like: div.rb-calendar -> ... -> td.wd.day or td.we.day etc.
    const dateElementXPath = `//div[contains(@class, 'rb-calendar')]//td[contains(@class, 'day') and not(contains(@class, 'disabled')) and text()='${dayToSelect}'] | //div[contains(@class, 'DatePicker__CalendarContainer')]//span[text()='${dayToSelect}' and not(contains(@class, 'DatePicker__Date--disabled'))]`;
    // The second part of XPath is for newer Redbus UI.
    try {
        const dateToClick = await driver.wait(until.elementLocated(By.xpath(dateElementXPath)), 10000);
        await dateToClick.click();
        console.log(`Selected date: Day "${dayToSelect}"`);
    } catch (dateError) {
        console.error(`Could not select day "${dayToSelect}". Calendar might not show this day or month. Error: ${dateError.message}`);
        throw dateError; // Rethrow to be caught by the main try-catch
    }

    // 4. Click Search Buses
    // Common ID: search_btn or a button with text "Search Buses"
    const searchButton = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(),'Search Buses')] | //button[@id='search_button'] | //div[@id='search_button']/button")), 10000);
    await searchButton.click();
    console.log('Clicked Search Buses button.');

    // Wait for search results to load.
    // This usually involves a container for bus results, or a "View Seats" button appearing.
    // Example: presence of elements with class 'bus-item' or 'view-seats'
    // Or a results count div: //span[contains(@class,'busFound')]
    await driver.wait(until.elementLocated(By.xpath("//div[contains(@class,'bus-item')] | //button[contains(text(),'View Seats')] | //span[contains(@class,'busFound')] | //div[contains(@class,'w-100') and .//div[contains(text(),'VIEW SEATS')]] ")), 20000);
    console.log('RedBus search results page loaded.');

    // Conceptual point for selecting seats, providing passenger details, and payment
    console.log("RedBus: Conceptual seat selection / passenger details point reached.");
    console.log("RedBus: Payment processing placeholder. Real payment integration needed here.");

    return { success: true, message: `Successfully initiated search for buses from "${source}" to "${destination}" on "${dateString}" on RedBus and reached conceptual payment point.` };

  } catch (error) {
    console.error(`Error during RedBus search:`, error);
    if (driver) {
      try {
        const image = await driver.takeScreenshot();
        const screenshotPath = `redbus_error_screenshot_${Date.now()}.png`;
        fs.writeFileSync(screenshotPath, image, 'base64');
        console.log(`Screenshot taken on error: ${screenshotPath}`);
      } catch (ssError) {
        console.error('Failed to take screenshot:', ssError);
      }
    }
    return { success: false, message: `Failed to search on RedBus. Error: ${error.message}` };
  } finally {
    if (driver) {
      await driver.quit();
      console.log('Browser closed.');
    }
  }
}

module.exports = { searchBusTicketsOnRedbus };
