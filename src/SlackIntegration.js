//
// Functions for calling Slack APIs
//

function test_performPostMessage() {
  var config = getScriptConfiguration();
  var bearer = getSlackBotBearerToken();
  postSlackMeesage(bearer,"@david.goodall","Test :pair:-less :pepe-sad: ");
}

function postSlackMeesage(bearer, channel, message) {
  var POST_MESSAGE_ENDPOINT = 'https://slack.com/api/chat.postMessage';
  var payload = {
    "channel"     : channel,
    "text"        : message
  };
  
  var res = UrlFetchApp.fetch(
  POST_MESSAGE_ENDPOINT,
  {
    method             : 'post',
    contentType        : 'application/json',
    headers            : {
      Authorization : 'Bearer ' + bearer
    },
    payload            : JSON.stringify(payload),
    muteHttpExceptions : true,
  })

  jsonRes = JSON.parse(res);
  if (!jsonRes.ok) {
    throw new Error(
      'Failed to post messsage to channel ' + channel + ": " + jsonRes.error
    );
  }
}

function test_getSlackUserIdByEmail() {
  var config = getScriptConfiguration();
  var bearer = config["Slack Bearer Token"];
  Logger.log(getSlackUserIdByEmail(bearer,"david.goodall@digital.hmrc.gov.uk"));
}

//
//  Retrieves a Slack user ID based on email address 
//
function getSlackUserIdByEmail(bearer,email) {
  var MESSAGE_ENDPOINT = 'https://slack.com/api/users.lookupByEmail';
  
  var payload = {
    "email"     : email
  };
  
  var res = UrlFetchApp.fetch(
  MESSAGE_ENDPOINT,
  {
    method             : 'post',
    contentType        : 'application/x-www-form-urlencoded',
    headers            : {
      Authorization : 'Bearer ' + bearer
    },
    payload            : payload,
    muteHttpExceptions : true,
  })
//  Logger.log("Posted: " + payload);
//  Logger.log("Response: " + res);
  jsonRes = JSON.parse(res);
  if (!jsonRes.ok) {
    throw new Error(
      'Failed to find slack user with email "' + email + '" - ' + jsonRes.error
    );
  }
//  Logger.log("Response json: " + res);
  return(JSON.parse(res).user.id);  
}

//
//  Retrieves a users ID from slack based on email address 
//
function getSlackUserByEmail(bearer,email) {
  var MESSAGE_ENDPOINT = 'https://slack.com/api/users.lookupByEmail';
  
  var payload = {
    "email"     : email
  };
  
  var res = UrlFetchApp.fetch(
  MESSAGE_ENDPOINT,
  {
    method             : 'post',
    contentType        : 'application/x-www-form-urlencoded',
    headers            : {
      Authorization : 'Bearer ' + bearer
    },
    payload            : payload,
    muteHttpExceptions : true,
  })
//  Logger.log("Posted: " + payload);
//  Logger.log("Response: " + res);
  jsonRes = JSON.parse(res);
  if (!jsonRes.ok) {
    throw new Error(
      'Failed to find slack user with email "' + email + '" - ' + jsonRes.error
    );
  }
//  Logger.log("Response json: " + JSON.parse(res).user.id);
  return(JSON.parse(res).user);  
}


function test_getSlackUsergroups() {
  var config = getScriptConfiguration();
  var bearer = config["Slack Bearer Token"];
  usergroup = getSlackUsergroup(bearer,"infrastructure");
  Logger.log(usergroup);
}

function getSlackUsergroup(bearer, usergrouphandle) {
  usergroups = getSlackUsergroups(bearer);
  for (var i=0;i<usergroups.length;i++) {
    if (usergroups[i].handle == usergrouphandle) {
      return usergroups[i];
    }
  }
  return null;
}

//
//  Retrieves list of slack user groups
//
function getSlackUsergroups(bearer) {
  var MESSAGE_ENDPOINT = 'https://slack.com/api/usergroups.list';
  
  var payload = {
    "include_users"     : true
  };
  
  var res = UrlFetchApp.fetch(
  MESSAGE_ENDPOINT,
  {
    method             : 'post',
    contentType        : 'application/x-www-form-urlencoded',
    headers            : {
      Authorization : 'Bearer ' + bearer
    },
    payload            : payload,
    muteHttpExceptions : true,
  })
  jsonRes = JSON.parse(res);
//  Logger.log("response" + jsonRes);
  if (!jsonRes.ok) {
    throw new Error(
      'Failed to retrieve usergroups - ' + jsonRes.error
    );
  }
//  Logger.log("Response json: " + JSON.parse(res).user.id);
  return(jsonRes.usergroups);  
}

function test_setSlackUsergroupsUsers() {
  var config = getScriptConfiguration();
  var bearer = config["Slack Bearer Token"];
  Logger.log(setSlackUsergroupsUsers(bearer,"S0PFMKKCM","U8VRX6V24,UM1JMRUJ0,UHJPML18B"));
  //UHJPML18B
}

//
//  Retrieves list of slack user groups
//
function setSlackUsergroupsUsers(bearer,usergroupid,users) {
  var MESSAGE_ENDPOINT = 'https://slack.com/api/usergroups.users.update';
  
  var payload = {
    "usergroup"     : usergroupid,
    "users"         : users
  };
  
  var res = UrlFetchApp.fetch(
  MESSAGE_ENDPOINT,
  {
    method             : 'post',
    contentType        : 'application/x-www-form-urlencoded',
    headers            : {
      Authorization : 'Bearer ' + bearer
    },
    payload            : payload,
    muteHttpExceptions : true,
  })
  jsonRes = JSON.parse(res);
  if (!jsonRes.ok) {
    throw new Error(
      'Failed to update usergroup - ' + jsonRes.error
    );
  }
//  Logger.log("Response json: " + JSON.parse(res).user.id);
  return(jsonRes);  
}


function test_setSlackReminder() {
  var config = getScriptConfiguration();
  var bearer = config["Slack Bearer Token"];
//  var bearer = "xoxp-4882273589-782774731219-893676428033-a7f516975a1c42655994f263125fdf77";
  var today = new Date()
  var tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  Logger.log("Tomorrow = " + tomorrow);
  Logger.log(setSlackReminder(bearer,"UHJPML18B",tomorrow,"Remind @david.goodall"));
//  Logger.log(setSlackReminder(bearer,"#tmp-ph-test",tomorrow,"Remind @david.goodall"));
  //UHJPML18B
}

//
//  Sets a reminder:
//
function setSlackReminder(bearer,target,time,message) {
  var MESSAGE_ENDPOINT = 'https://slack.com/api/reminders.add';
  
  var payload = {
    "time"         : time.getTime().toString().slice(0, -3),
    "text"         : message,
    "user"         : target
  };
  Logger.log(payload);
  var res = UrlFetchApp.fetch(
  MESSAGE_ENDPOINT,
  {
    method             : 'post',
    contentType        : 'application/x-www-form-urlencoded',
    headers            : {
      Authorization : 'Bearer ' + bearer
    },
    payload            : payload,
    muteHttpExceptions : true,
  })
  jsonRes = JSON.parse(res);
  if (!jsonRes.ok) {
    throw new Error(
      'Failed to set reminder - ' + jsonRes.error
    );
  }
//  Logger.log("Response json: " + JSON.parse(res).user.id);
  return(jsonRes);  
}
