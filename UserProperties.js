//
// This file contains functions to manage sensitive tokens within the users properties rather
// than in locations viewable by all users of the spreadsheet
//
var aesKey = "J@NcRfUjXn2r5u7x!A%D*G-KaPdSgVkY"

function setupTeamProperties() {
  var ui = SpreadsheetApp.getUi(); // Same variations.
  var slackBotTokenHandler = ui.prompt(
      'Setting up Slack API keys (step 1 of 3)',
      'Please enter your Slack Bot API token (mandatory):',
      ui.ButtonSet.OK_CANCEL);
  var slackUserTokenHandler = ui.prompt(
      'Setting up Slack API keys (step 2 of 3)',
      'Please enter your Slack User API token (mandatory):',
      ui.ButtonSet.OK_CANCEL);
  var pgTokenHandler = ui.prompt(
      'Setting up PagerDuty API key (step 3 of 3)',
      'Please enter your PagerDuty API token (leave blank if unused):',
      ui.ButtonSet.OK_CANCEL);
  var userProperties = PropertiesService.getUserProperties();
  var cipher = new Cipher(aesKey, 'aes');
  userProperties.setProperties({
    "Slack Bearer Token" : cipher.encrypt(slackBotTokenHandler.getResponseText()),
    "Slack User Bearer Token" : cipher.encrypt(slackUserTokenHandler.getResponseText()),
    "Pager Duty API Token" : cipher.encrypt(pgTokenHandler.getResponseText())
  })
}

function getSlackBotBearerToken() {
  var userProperties = PropertiesService.getUserProperties();
  var cipher = new Cipher(aesKey, 'aes');

  var etoken = userProperties.getProperty("Slack Bearer Token");
  if (!etoken) {
    throw new Error(
      '"Slack Bearer Token" User property not configured.  Please select menu Custom Menu -> Configure Team Properties to input'
    );
  } else {
 //   Logger.log(token)
    token = cipher.decrypt(etoken);
    return token
  }
}

function getPagerdutyAPIToken() {
  var userProperties = PropertiesService.getUserProperties();
  var cipher = new Cipher(aesKey, 'aes');

  token = cipher.decrypt(userProperties.getProperty("Pager Duty API Token"));
  return token;
}

function getProperties() {
   var userProperties = PropertiesService.getUserProperties();
  Logger.log(userProperties.getProperties());
}
