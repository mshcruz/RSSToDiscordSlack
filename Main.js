/**
 * @file Demo project showing how to post items from a RSS feed to Discord and Slack using Google Apps Script.
 * @author Mateus Cruz <hello@mshruz.com>
 */

/**
 * Get updates from the specified RSS feed and send new items as a message on Slack and on Discord.
 */
function getFeedUpdates() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const slackWebhookUrl = scriptProperties.getProperty('SLACK_WEBHOOK_URL');
  const discordWebhookUrl = scriptProperties.getProperties(
    'DISCORD_WEBHOOK_URL'
  );
  const feedUrl = scriptProperties.getProperties('FEED_URL');

  // Parameters used for sending messages to Slack
  const slackSettings = {
    url: slackWebhookUrl,
    bodyPropertyName: 'text',
  };
  // Parameters used for sending messages to Discord
  const discordSettings = {
    url: discordWebhookUrl,
    bodyPropertyName: 'content',
  };
  // Get new feed items
  const items = parseRSSFeed(feedUrl);
  // Iterate through the retrieved new items
  for (const item of items) {
    // Compose the message to be sent
    const message = `
    🆕 New Feed Item! 🆕
❗ ${item.title}

🔎 ${item.description}

🔗 ${item.link}
    `;
    // Send message to Slack
    sendChatMessage(message, slackSettings);
    // Send message to Discord
    const discordMessageMaxSize = 2000;
    sendChatMessage(
      message.substring(0, discordMessageMaxSize),
      discordSettings
    );
  }
}

/**
 * Get new items from the specified RSS feed.
 * @param {string} feedUrl Link to the RSS feed.
 * @returns {Object[]} New items retrieved from the feed.
 */
function parseRSSFeed(feedUrl) {
  // Make a request to fetch the feed items
  const response = UrlFetchApp.fetch(feedUrl).getContentText();
  // Parse the request's response into an XML document object
  const document = XmlService.parse(response);
  // Get the XML document object's elements
  const elements = document
    .getRootElement()
    .getChild('channel')
    .getChildren('item')
    .reverse();

  // Get date and time of previous run
  const lastRunTime =
    PropertiesService.getScriptProperties().getProperty('LAST_RUN_TIME') || 0;
  // Update last run date and time to now
  PropertiesService.getScriptProperties().setProperty(
    'LAST_RUN_TIME',
    new Date().getTime()
  );

  // Initialize an array to store new feed items
  const items = [];
  //Iterate through retrieved items
  for (const element of elements) {
    // Get the posting date and time of an item
    const publicationTime = new Date(element.getChild('pubDate').getText());
    // Only process items posted more recently than the previous run time
    if (publicationTime.getTime() > lastRunTime) {
      // Format the item's posting time
      const date = Utilities.formatDate(
        publicationTime,
        Session.getScriptTimeZone(),
        'YYYY-MM-dd HH:mm:ss'
      );
      // Get the item's title
      const title = element.getChild('title').getText();
      // Get the item's description
      const description = element
        .getChild('description')
        .getText()
        // Remove HTML entities
        .replace(/(&.*?;)/gs, '')
        // Replace multiple spaces with just a single one
        .replace(/\s{2,}/gs, ' ')
        // Replace <br /> tags with a line break
        .replace(/<br \/>/gi, '\n')
        // Remove remaining HTML tags (like <b>)
        .replace(/(<([^>]+)>)/gi, '');
      // Get the item's link
      const link = element.getChild('link').getText();
      // Add the new item to the array of new items
      items.push({
        date,
        title,
        description,
        link,
      });
    }
  }
  return items;
}

/**
 * Send a message to the specified service.
 * @param {string} message Message to be sent.
 * @param {Object} settings Settings related to the message service used.
 */
function sendChatMessage(message, settings) {
  // Configure the request body according to the service
  const body = {};
  body[settings.bodyPropertyName] = message;
  // Configure the request parameters
  const params = {
    headers: { 'Content-Type': 'application/json' },
    method: 'post',
    payload: JSON.stringify(body),
  };
  // Send the message via a POST request
  UrlFetchApp.fetch(settings.url, params);
}

/**
 * Shows the settings page for users to configurate the application.
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The settings page.
 */
function doGet() {
  const scriptProperties = PropertiesService.getScriptProperties();
  let template = HtmlService.createTemplateFromFile('ControlPanel');
  template.feedUrl =
    scriptProperties.getProperty('FEED_URL') ||
    'https://www.website.com/feed/rss?q=my+keywords';
  template.slackWebhookUrl =
    scriptProperties.getProperty('SLACK_WEBHOOK_URL') ||
    'https://hooks.slack.com/services/ABC123';
  template.discordWebhookUrl =
    scriptProperties.getProperty('DISCORD_WEBHOOK_URL') ||
    'https://discord.com/api/webhooks/XYZ456';
  template = template.evaluate();
  return template;
}

/**
 * Saves settings to script properties.
 * @param {Object} form The form submitted by the user.
 */
function saveSettings(form) {
  const settings = {
    FEED_URL: form.feedUrl,
    SLACK_WEBHOOK_URL: form.slackWebhookUrl,
    DISCORD_WEBHOOK_URL: form.discordWebhookUrl,
  };
  PropertiesService.getScriptProperties().setProperties(settings);
}
