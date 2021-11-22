//
// Functions for calling Pager Duty APIs.  
//

function test_pgGetScheduleOverrides() {
  var config = getScriptConfiguration();
  var token = getPagerdutyAPIToken();
//  postSlackMeesage(bearer,"@peter.harper","Test");
  testDay = new Date("2021-01-26");
  pgGetScheduleOverrides(token,"PGAI4XV",testDay);
}

//
// Return a date in YYYY-MM-DD format
//
function toYYYYMMDD(day) {
  var d = new Date(day);

  return [
    d.getFullYear(),
    ('0' + (d.getMonth() + 1)).slice(-2),
    ('0' + d.getDate()).slice(-2)
  ].join('-');

}

function pgGetScheduleOverrides(pgToken,scheduleId,day) {
  var formattedDay = toYYYYMMDD(day);
  var nextDay = day;
  nextDay.setDate(nextDay.getDate() + 1);
  var formattedNextDay = toYYYYMMDD(nextDay);

  var MESSAGE_ENDPOINT = 'https://api.pagerduty.com/schedules/' + scheduleId + '/overrides?since=' + formattedDay + '&until=' + formattedNextDay;
Logger.log("GetOverrides: " + MESSAGE_ENDPOINT)
  var options = {
      method: 'GET',
      muteHttpExceptions: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.pagerduty+json;version=2',
        'Authorization': 'Token token=' + pgToken
      }
    };
  var res = UrlFetchApp.fetch(MESSAGE_ENDPOINT,options);
  var jsonRes = JSON.parse(res);
//  Logger.log(jsonRes.overrides);
  return jsonRes.overrides;
//  Logger.log(jsonRes.schedule.overrides_subschedule);
}

function test_pgGetUserIdByEmail() {
  var config = getScriptConfiguration();
  var token = getPagerdutyAPIToken();
//  postSlackMeesage(bearer,"@peter.harper","Test");
  pgGetUserIdByEmail(token,"andrew.csoka@digital.hmrc.gov.uk");
}

function pgGetUserIdByEmail(pgToken,email) {
  var MESSAGE_ENDPOINT = 'https://api.pagerduty.com/users?query=' + email;

  var options = {
      method: 'GET',
      muteHttpExceptions: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.pagerduty+json;version=2',
        'Authorization': 'Token token=' + pgToken
      }
    };
  var res = UrlFetchApp.fetch(MESSAGE_ENDPOINT,options);
//Logger.log(res.getResponseCode());
  var jsonRes = JSON.parse(res);
//  Logger.log(jsonRes);;
  
  if (jsonRes.users[0]) {
    Logger.log(jsonRes.users[0].id);
    return jsonRes.users[0].id
  } else {
    return null;
  }
//  Logger.log(jsonRes.schedule.overrides_subschedule);
}


function test_pgDeleteOverride() {
  var config = getScriptConfiguration();
  var token = getPagerdutyAPIToken();
//  postSlackMeesage(bearer,"@peter.harper","Test");

  pgDeleteOverride(token,"PGAI4XV","Q1JW52G50UEG9V");
}

function pgDeleteOverride(pgToken,scheduleId,overrideId) {

  var MESSAGE_ENDPOINT = 'https://api.pagerduty.com/schedules/' + scheduleId + '/overrides/' + overrideId;

  var options = {
      method: 'DELETE',
      muteHttpExceptions: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.pagerduty+json;version=2',
        'Authorization': 'Token token=' + pgToken
      }
    };
  var res = UrlFetchApp.fetch(MESSAGE_ENDPOINT,options);
  if (res.getResponseCode() > 299) {
    throw new Error(
      "Pagerduty delete override failed with error code " + res.getResponseCode()
    );
  } else {
    Logger.log(res.getResponseCode());
  }
}

function test_pgCreateScheduleOverride() {
  var config = getScriptConfiguration();
  var token = getPagerdutyAPIToken();
//  postSlackMeesage(bearer,"@peter.harper","Test");
  testDay = new Date("2021-01-30");
  pgCreateScheduleOverride(token,"PGAI4XV",testDay,"POWPO6E");
}

function pgCreateScheduleOverride(pgToken,scheduleId,day,userId) {
  var formattedDay = toYYYYMMDD(day);

  var MESSAGE_ENDPOINT = 'https://api.pagerduty.com/schedules/' + scheduleId + '/overrides';
  var payload = {
    "override": {
        "start": formattedDay + "T09:00:00-00:00",
        "end": formattedDay + "T17:00:00-00:00",
        "user": {
            "id": userId,
            "type": "user_reference"
        }
    }
  };
  
  var options = {
      method: 'POST',
      muteHttpExceptions: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.pagerduty+json;version=2',
        'Authorization': 'Token token=' + pgToken
        
      },
      payload : JSON.stringify(payload)
  };
  var res = UrlFetchApp.fetch(MESSAGE_ENDPOINT,options);

}

