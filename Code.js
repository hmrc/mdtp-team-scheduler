function team_runTests() {
  startTests();
  test_getPermanentGroupMemberIds();
  test_getUnavailableMatchStrings();
  test_constructPairString();
  test_getSupportEventForDay();
  test_isSupportEvent();
  test_getPairMessage()
  test_getDaysPairRow()
  endTests();
}

function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('Team Functions')
      .addItem('Synchronise Calendar', 'getTeamEvents')
      .addItem('Post todays pairs', 'postPairsToChannel')
      .addItem('Post tomorrows pairs', 'postTomorrowsPairsToChannel')
      .addSeparator()
      .addItem('Configure Team Properties', 'setupTeamProperties')
      .addToUi();
}

//
// Retrieves calendar readPeriod number of days events from the teams calendar and copies into calendarSheetName sheet
//
function getTeamEvents(){
  Logger.log("getTeamEvents started");
  var config = getScriptConfiguration();
  var calendarName = config["Team Whereabouts Calendar"];
  var calendarSheetName = config["Team Calendar Sheet"];
  var readPeriod = config["Calendar Read Period"];
  var unavailableMatchStrings = getUnavailableMatchStrings();

  var calendars = CalendarApp.getCalendarsByName(calendarName);
  var cal = calendars[0];
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(calendarSheetName)
  var events = cal.getEvents(new Date(new Date().getTime()-(readPeriod/2)*24*60*60*1000), new Date(new Date().getTime()+(readPeriod/2)*24*60*60*1000));
  for (var i=0;i<events.length;i++) {
    //http://www.google.com/google-d-s/scripts/class_calendarevent.html

    var isUnavailable = matchInArray(events[i].getTitle().toLowerCase(),unavailableMatchStrings);
//    Logger.log("Available :" + isUnavailable);

    var details=[[events[i].getDateCreated(),events[i].getLastUpdated(),events[i].getTitle(), events[i].getDescription(), events[i].getStartTime(), events[i].getEndTime(), isUnavailable]];
    var row=i+1;
    var range=sheet.getRange(row+1,1,1,7);
    range.setValues(details);
  }
  // Blank out the rest of the sheet
  sheet.getRange(i+2,1,sheet.getLastRow()-i,7).clearContent();
  Logger.log("getTeamEvents ended");
}


function test_getUnavailableMatchStrings() {
  var matchStrings = getUnavailableMatchStrings();
  assertEquals("matchInArray: Pete out",true,matchInArray("Pete out",matchStrings))
  assertEquals("matchInArray: Dave sick",true,matchInArray("Dave sick",matchStrings))
  assertEquals("matchInArray: Pete listening to the music",false,matchInArray("Pete listening to music",matchStrings))
}
//
// Retrieves the unavailable match strings from config
//
function getUnavailableMatchStrings() {
  var config = getScriptConfiguration();

  var matchStringString = config["Team Unavailable Match List"];
  var matchStrings = matchStringString.split(";");
  return matchStrings;
}

function getPairHangouts() {
  var config = getScriptConfiguration();
  var hangoutsStrings = [];

  var hangoutsString = config["Pair Hangouts List"];
  if (hangoutsString) {
    var hangoutsStrings = hangoutsString.split(";");
  }
    return hangoutsStrings;
}

function matchInArray(stringSearch, arrayExpressions){
//    var position = String(arrayExpressions).search(stringSearch);
//   var result = (position > -1) ? true : false
//    return result;
  for (i = 0; i < arrayExpressions.length; i++) {
//    Logger.log("String = " + stringSearch + " (" + arrayExpressions[i] +  ")");
    if (stringSearch.search(new RegExp(arrayExpressions[i],"ig")) > -1) {
      return true;
    }
  }
 return false;
}

//
//  Loops through the currently selected week, creating support calendar events,
//  deleting any pre-existing support events
//  NB: This adds the email to the description field to enable UID lookups in the
//      swapSupportEvents function
//
function createSupportEvents() {
  // We will ignore any days that are labelled as anything in this list
  var specialDays = ["xmas day","boxing day","new year","bank holiday","bh"]
 
  var config = getScriptConfiguration();
  var calendarName = config["Team Support Calendar"];
  var dateRow = config["Date Row in Rota"];
  var pgToken = getPagerdutyAPIToken();
  var pgScheduleId = config["Pager Duty Schedule Id"];
  var today = new Date();

  // forename -> email address lookup map
  var slackEmails = getForenameToEmails();
  
  //
  // Loop through each day, raising calendar events
  //
  var calendar = CalendarApp.getCalendarsByName(calendarName)[0];
  var rotaColumn = SpreadsheetApp.getActiveSpreadsheet().getActiveCell().getColumn();
  var rotaRangeValues = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange(dateRow,rotaColumn,6,1).getValues();
  var supportDate = new Date(rotaRangeValues[0][0].valueOf());
  for (var i=1; i<6; i++) {
    var supportPerson = rotaRangeValues[i][0];
    if (specialDays.indexOf(supportPerson.toString().toLowerCase()) < 0) {
      // Delete support event(s) for the day
      var events = calendar.getEventsForDay(supportDate);
      var found = false;
      for (var j = 0; j < events.length; j++) {
        if (isSupportEvent(events[j].getTitle())) {
          events[j].deleteEvent();
        }
      } // loop over events

      var supportEventTitle = supportPerson + " on support";
      calendar.createAllDayEvent(supportEventTitle, supportDate,{description: slackEmails[supportPerson]});
      Logger.log("User " + supportPerson + " " + supportDate);

      // If PagerDuty is configured, and the support day is in the future, 
      // attempt to amend the overrides for the day
      if (!isEqual(pgToken,"") && !isEqual(pgScheduleId,"") && supportDate > today) {
        removePgOverridesForDay(new Date(supportDate));
        var pgId = pgGetUserIdByEmail(pgToken,slackEmails[supportPerson]);    
        if (pgId) { 
//          Logger.log("User " + slackEmails[supportPerson] + " = pager duty id " + pgId);
          pgCreateScheduleOverride(pgToken,pgScheduleId,new Date(supportDate),pgId);
        }
      }
  
    }
  
    supportDate = new Date(supportDate.getTime()+24*60*60*1000);
  }
}


function test_getPermanentGroupMemberIds() {
  var members = getPermanentGroupMemberIds();
  assertEquals("Check getPermanentGroupMemberIds list","UP0NSMH6F,ULMBYBCFL,U66CSEUEM",members);
}

//
// Retrieves the permanent memebers of the support group from config.
//
function getPermanentGroupMemberIds() {
  var config = getScriptConfiguration();
  var bearer = getSlackBotBearerToken();

  var permanentMembersString = config["Team Support Permanent Members"];
  var permanentMembers = permanentMembersString.split(";");
  
  var permanentMembersSlackIds = [];
  for (var i = 0; i < permanentMembers.length; i++) {
    permanentMembersSlackIds.push(getSlackUserByEmail(bearer,permanentMembers[i].replace(' ', '')).id);
  }//endfor
  return permanentMembersSlackIds;
}


//
// Swaps the support person in the slack group and notifies the team channel
//
function swapSupportPerson() {
  var config = getScriptConfiguration();
  var calendarName = config["Team Support Calendar"];
  var slackSupportGroup = config["Team Support Group"];
  var teamChannel = config["Team Internal Channel"];
  var bearer = getSlackBotBearerToken();
  
  var calendar = CalendarApp.getCalendarsByName(calendarName)[0];
  var usergroup = getSlackUsergroup(bearer,slackSupportGroup);
  
  var today = new Date();

  // Only run on weekdays
  if (today.getDay() > 0 && today.getDay() < 6) {
    // Weekday
    todaysSupportEvent = getSupportEventForDay(calendar,today);

    // Search backwards to try and find the last support event.
    // 7 should be enough days of search to avoid weekends, bank holidays etc.
    lastSupportEvent = null;
    for (k=-1; k>-7; k--) {
      lastWorkingDay = getLastWorkingDay(k);
      lastSupportEvent = getSupportEventForDay(calendar,lastWorkingDay);
      if (lastSupportEvent) {break;}
    }
    if (todaysSupportEvent && lastSupportEvent) {
      todaysEmail = todaysSupportEvent.getDescription();
      lastEmail   = lastSupportEvent.getDescription();

      todaysUser = getSlackUserByEmail(bearer,todaysEmail);
      lastUser   = getSlackUserByEmail(bearer,lastEmail);
      // Only swap if the user has changed
      // This comparison is odd, as == doesn't seem to work here hence using > and <
      if ( !(todaysEmail > lastEmail || todaysEmail < lastEmail) ) {
        postSlackMeesage(bearer, teamChannel, "Support person stays as <@" + todaysUser.id + ">.");
//        postSlackMeesage(bearer, "@peter.harper", "Support person stays as <@" + todaysUser.id + ">.");
      } else {
        // Remove and add support persons to the list, update the usergroup and post in channel
        newusers = removeValue(usergroup.users, todaysUser.id)
        newusers = removeValue(newusers, lastUser.id)
        newusers = newusers.concat(todaysUser.id);
      
        // Remove and then re-add permanent members of the group
        permanentGroupMembers = getPermanentGroupMemberIds();
        for (var i = 0; i < permanentGroupMembers.length; i++) {
          newusers = removeValue(newusers, permanentGroupMembers[i]);
          newusers = newusers.concat(permanentGroupMembers[i]);
        }
    
        setSlackUsergroupsUsers(bearer,usergroup.id,newusers.toString());
        postSlackMeesage(bearer, teamChannel, "Devops Support person swapped over in @" + slackSupportGroup + "; <@" + todaysUser.id + "> takes over from <@" + lastUser.id + ">");
//        postSlackMeesage(bearer, "@peter.harper", "Support person swapped over in @" + slackSupportGroup + "; <@" + todaysUser.id + "> takes over from <@" + lastUser.id + ">");
      }
    } else {
        if (!lastSupportEvent) {
           Logger.log("Couldn't find last support event in calendar");
           throw new Error("Couldn't find last support event in calendar");
        }
        if (!todaysSupportEvent) {
           throw new Error("Couldn't find todays support event in calendar");
        }
    }
  } else {
    // No need to run
  }
}

//
// Posts days pairs to team channel
//
function postPairsToChannel() {
  var config = getScriptConfiguration();
  var bearer = getSlackBotBearerToken();
  var teamChannel = config["Team Internal Channel"];
  var pairingTemplateHREF = config["Pairing Template HREF"];
  var pairChangeMessage = config["Pair Change Message"];

  var pairMessage = getPairMessage(new Date(),pairingTemplateHREF,getPairHangouts(),"Todays pairs",pairChangeMessage);
  if (pairMessage) {
    postSlackMeesage(bearer, teamChannel, pairMessage);
//    postSlackMeesage(bearer, "@peter.harper", pairMessage);
  }
}

//
// Posts tomorrows pairs to team channel
//
function postTomorrowsPairsToChannel() {
  var config = getScriptConfiguration();
  var bearer = getSlackBotBearerToken();
  var teamChannel = config["Team Internal Channel"];
  var pairingTemplateHREF = config["Pairing Template HREF"];
  var pairChangeMessage = config["Pair Change Message"];

  var today = new Date()
  var tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  var pairMessage = getPairMessage(tomorrow,pairingTemplateHREF,getPairHangouts(),"Tomorrows pairs",pairChangeMessage);
  if (pairMessage) {
    postSlackMeesage(bearer, teamChannel, pairMessage);
//    postSlackMeesage(bearer, "@peter.harper", pairMessage);
  }
}


function test_getPairMessage() {
  var pairHangouts = [];
  var dayDescription = "Todays pairs"
  var pairChangeMessage = " - :alert: due to change"
  // Test getting a Friday with a change
  var pairingTemplateHref="https://github.com/hmrc/ddcops-utils/blob/main/docs/pairing_checklist.md"
  var day = new Date("12/4/2020");
  assertEquals(day + " pair string","<https://docs.google.com/spreadsheets/d/13MoHN9DB7dh8n5AISXe1_ypsOuZpHKDF9_8l72AMGaA/edit#gid=89066985range=A161|Todays pairs> are:\nPair 1: Andrew / Rob\nPair 2: Danial / Tess - :alert: due to change\n\n<https://github.com/hmrc/ddcops-utils/blob/main/docs/pairing_checklist.md|Pairing template link>",
                                     getPairMessage(day,pairingTemplateHref,pairHangouts,dayDescription,pairChangeMessage));
  // Test getting a weekend day
  var day = new Date("12/5/2020");
  assertEquals(day + " pair string",null,getPairMessage(day,pairingTemplateHref,pairHangouts,dayDescription,pairChangeMessage));

  // Test with a pair that disolves; pair with nickname not changing
  var day = new Date("12/11/2020");
  assertEquals(day + " pair string","<https://docs.google.com/spreadsheets/d/13MoHN9DB7dh8n5AISXe1_ypsOuZpHKDF9_8l72AMGaA/edit#gid=89066985range=A168|Todays pairs> are:\nPair 1: Andrew / Rob - :alert: due to change\nPair 2: Tess / Tim - :alert: due to change\nPair 3: Danial / Duncan (Dancan)\n\n<https://github.com/hmrc/ddcops-utils/blob/main/docs/pairing_checklist.md|Pairing template link>",
                                    getPairMessage(day,pairingTemplateHref,pairHangouts,dayDescription,pairChangeMessage));

 // Test with a pair with a nickname that is due to change
  var day = new Date("01/11/2021");
  assertEquals(day + " pair string","<https://docs.google.com/spreadsheets/d/13MoHN9DB7dh8n5AISXe1_ypsOuZpHKDF9_8l72AMGaA/edit#gid=89066985range=A199|Todays pairs> are:\nPair 1: Danial / Duncan (Dancan) - :alert: due to change\nPair 2: Rob / Tess - :alert: due to change\nPair 3: Andrew / Tim - :alert: due to change\n\n<https://github.com/hmrc/ddcops-utils/blob/main/docs/pairing_checklist.md|Pairing template link>",
                                    getPairMessage(day,pairingTemplateHref,pairHangouts,dayDescription,pairChangeMessage));

// Test with a pair with a nickname that is due to change, no pairing template passed
  var day = new Date("01/11/2021");
  assertEquals(day + " pair string","<https://docs.google.com/spreadsheets/d/13MoHN9DB7dh8n5AISXe1_ypsOuZpHKDF9_8l72AMGaA/edit#gid=89066985range=A199|Todays pairs> are:\nPair 1: Danial / Duncan (Dancan) - :alert: due to change\nPair 2: Rob / Tess - :alert: due to change\nPair 3: Andrew / Tim - :alert: due to change",
                                    getPairMessage(day,"",pairHangouts,dayDescription,pairChangeMessage));

// Test with a pair with a nickname that is due to change, no pairing template passed, hangouts are added
  var day = new Date("01/11/2021");
  pairChangeMessage = " - :arrow_right: due to change"
  dayDescription = "Tomorrows pairs"
  pairHangouts = [null,"","http://hangout3/","",""]
  assertEquals(day + " pair string, with hangouts","<https://docs.google.com/spreadsheets/d/13MoHN9DB7dh8n5AISXe1_ypsOuZpHKDF9_8l72AMGaA/edit#gid=89066985range=A199|Tomorrows pairs> are:\nPair 1: Danial / Duncan (Dancan) - :arrow_right: due to change\nPair 2: Rob / Tess - :arrow_right: due to change\nPair 3: <http://hangout3/|Andrew / Tim> - :arrow_right: due to change",
                                    getPairMessage(day,null,pairHangouts,dayDescription,pairChangeMessage));
}

//
// Constructs the pair message for a particular day, given a pairingTemplate url and a
// list of pairing hangouts
//
function getPairMessage(day,pairingTemplateHREF,pairHangouts,dayDescription,pairChangeMessage) {
  var config = getScriptConfiguration();
  var calendarName = config["Team Support Calendar"];
  var pairTab = config["Pair Tab"];
  var pairDateCol = config["Pair Date Column"];
  var pairColumnList = config["Pair Column List"];
  var pairTabHREF = config["Pair Tab HREF"];
//  var pairingTemplateHREF = config["Pairing Template HREF"];

  var pairNicknames = getPairNicknames();
 
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(pairTab)
  var calendar = CalendarApp.getCalendarsByName(calendarName)[0];
  var pairString = "";
  var pairMessage = null;
  // Only run on weekdays
  if (day.getDay() > 0 && day.getDay() < 6) {
    // Weekday
    dayRow =  getDaysPairRow(day);
    // Find the next day with a support event
    nextSupportEvent = null;
    nextDayRow = null;
    for (k=1; k<7; k++) {
      nextWorkingDay = getNextWorkingDay(day, k);
      nextSupportEvent = getSupportEventForDay(calendar,nextWorkingDay);
      if (nextSupportEvent) {
        nextDayRow = getDaysPairRow(nextSupportEvent.getAllDayStartDate())
        break;
      }
    }
    
    // Only return pair info on days where getDaysPairRow returned a value
    if (dayRow) {
      // Construct array of column locations for each pair
      cols = pairColumnList.split(",")
      
      // Construct arrays of pairs for each day
      var todaysPairsList = new Array();
      var nextPairsList = new Array();
      for (j = 0; j < cols.length; j++) {
        pairValues = sheet.getRange(dayRow,cols[j],1,3).getValues()
        pairString = constructPairString(pairValues[0],pairNicknames);

        // If pairs are recorded, add them to the message string
        if (pairString != "") {
          todaysPairsList.push(pairString);
        }
        if (nextDayRow) {
          var nextPairValues = sheet.getRange(nextDayRow,cols[j],1,3).getValues()
          var nextPairString = constructPairString(nextPairValues[0],pairNicknames)
          if (nextPairString != "") {
            nextPairsList.push(nextPairString);
          }
        }
      }
      
      // Loop through todays Pairs constructing the message
      pairMessage = "<" + pairTabHREF + "range=A" + dayRow + "|" + dayDescription + "> are:"
      for (j = 0; j < todaysPairsList.length; j++) {
        pairString = todaysPairsList[j];

        if (pairHangouts[j]) {
          pairMessage = pairMessage + "\nPair " + (j+1) + ": <" + pairHangouts[j] + "|" + pairString + ">"
        } else {
          pairMessage = pairMessage + "\nPair " + (j+1) + ": " + pairString
        }
        // If we found a following days pair row, compare the pair and flag if it's changing
        if (nextDayRow && nextPairsList.indexOf(pairString)<0) {
          pairMessage = pairMessage + pairChangeMessage;
        }
      }
      if (pairingTemplateHREF != null && !isEqual(pairingTemplateHREF,"")) {
        pairMessage = pairMessage + "\n\n<" + pairingTemplateHREF + "|Pairing template link>"
      }
    } // if today has pair and support data 
  } else {
    // No need to run
  }
  return pairMessage;
}

function test_getDaysPairRow() {
  var config = getScriptConfiguration();
  var calendarName = config["Team Support Calendar"];
  var calendar = CalendarApp.getCalendarsByName(calendarName)[0];

  testDay = new Date("12/4/2020");
  testDay.setDate(testDay.getDate());
  assertEquals("4/12/2020 row found",161,getDaysPairRow(testDay));

  testDay = new Date("12/7/2020");
  testDay.setDate(testDay.getDate());
  assertEquals("7/12/2020 row found",164,getDaysPairRow(testDay));  

  testDay.setDate(testDay.getDate() + 200);
  assertEquals("Seeking days pair role for day without pairing data",null,getDaysPairRow(testDay));
}

//
// Given a date, returns the row number in pairing sheet for that date, assuming there is a support event present
//
function getDaysPairRow(theDay) {
  var config = getScriptConfiguration();
  var calendarName = config["Team Support Calendar"];
  var teamChannel = config["Team Internal Channel"];
  var pairTab = config["Pair Tab"];
  var pairDateCol = config["Pair Date Column"];
  var bearer = getSlackBotBearerToken();
 
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(pairTab)
  var calendar = CalendarApp.getCalendarsByName(calendarName)[0];
  
  // theDay is the date of the day to construct the pair data for
  // var theDay = new Date();

  var pairRow = null;
  // Only run on weekdays
  if (theDay.getDay() > 0 && theDay.getDay() < 6) {
    // Weekday
    var todaysSupportEvent = getSupportEventForDay(calendar,theDay);

    // Only find pair info on days with a support event
    if (todaysSupportEvent) {
      // Retrieve and search for todays pairs row number
      var theDayDate = new Date(theDay);
      theDayDate.setHours(0,0,0,0);
      theDay = Date.parse(theDayDate);
      var dateValues = sheet.getRange(1,pairDateCol,sheet.getMaxRows()).getValues()
      // Search for todays row
      for (i = 1; i < sheet.getMaxRows(); i++) {
        rowDate = Date.parse(dateValues[i-1]);
//        Logger.log(rowDate + " " + today)
        if (rowDate) {
          if (rowDate == theDay) {
            pairRow = i;
            break;
          } // if today
        }
      } // search for todays date         
    }
  }
  return pairRow
}

function test_constructPairString() {
  var names = ["Name1", "Name3", "Name2"];
  assertEquals("Check pair string construction needing a sort","Name1 / Name2 / Name3",constructPairString(names,{}));
  
  var names = ["Name1", "Name3"];
  assertEquals("Check pair string construction without a sort and excercising default nickname map","Name1 / Name3",constructPairString(names,{}));

  var names = ["Name3", "", "Name1"];
  assertEquals("Check pair string construction with gaps","Name1 / Name3",constructPairString(names,{}));

  var names = ["", "", ""];
  assertEquals("Check pair string construction with no values","",constructPairString(names,{}));

  var nicknameMap = {};
  nicknameMap["Name2 / Name3"] = "nm23nickname";
  nicknameMap["Name1 / Name3"] = "nm13nickname";
  var names = ["Name3", "", "Name1"];
  assertEquals("Check pair string construction with gaps","Name1 / Name3 (nm13nickname)",constructPairString(names,nicknameMap));

}

function constructPairString(pairArray,nicknameMap) {
  var pairString = ""
  var sortedPairArray = pairArray.sort();
  
  for (i = 0; i < sortedPairArray.length; i++) {
    if (sortedPairArray[i] != "") {
      if (pairString == "") {
        pairString = sortedPairArray[i]
      } else {
        pairString = pairString + " / " + sortedPairArray[i];   
      }
    }
  }
  if (nicknameMap[pairString]) {
    pairString = pairString + " (" + nicknameMap[pairString] + ")"
  }
  return pairString  
}

function test_getSupportEventForDay() {
  var config = getScriptConfiguration();
  var calendarName = config["Team Support Calendar"];
  var calendar = CalendarApp.getCalendarsByName(calendarName)[0];
  testDay = new Date("12/10/2020");
  assertEquals("Check Tess found on support on " + testDay,"Tess on support",getSupportEventForDay(calendar, testDay).getTitle());

  testDay = new Date("12/10/2018");
  assertEquals("Check non-existent support day case " + testDay,null,getSupportEventForDay(calendar, testDay));

}
//
// Searches and returns the support event for the specified calendar/day
// Returns null if not found
//
function getSupportEventForDay(calendar, day) {
  var supportEvent = null;

  // Search for a support event
  events = calendar.getEventsForDay(day);
  var found = false;
  for (var j = 0; j < events.length; j++) {
    if (isSupportEvent(events[j].getTitle())) {
      supportEvent = events[j];
      break;
    }
  } // loop over events
  return supportEvent;
}


function test_isSupportEvent(eventTitle) {
  assertEquals("Should be true: 'Pete on support'",true,isSupportEvent("Pete on support"));
  assertEquals("Should be false: 'Pete on holiday'",false,isSupportEvent("Pete on holiday"));
}

//
// isSupportEvent
//
function isSupportEvent(eventTitle) {
  if (eventTitle.match(/on support/)) {
    return true;
  } else {
    return false;
  }
}

//
//  Retrieves a list of slack emails from the spreadsheet, providing a map to lookup email address
//  using forename
//
function getForenameToEmails() {
  var config = getScriptConfiguration();
  slackHandlesSheet = config["Slack Handles Sheet"];
  forenameCol = config["Slack Handles Sheet Forename Column"];
  emailCol = config["Slack Handles Sheet Email Column"];
  var slackSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(slackHandlesSheet);
  var slackRange = slackSheet.getRange(1,1,50,10);
  var slackRangeValues = slackRange.getValues();
  var map = {};

  for (var i=1;i<50; i++) {
    forename = slackRangeValues[i][forenameCol];
    email = slackRangeValues[i][emailCol];
    if (email) {
      map[forename] = email;
    }
  }
  return map;
}


function test_getScriptConfiguration() {
  var map =   getScriptConfiguration();
  Logger.log(map);
}
//
// Retrieves configuration from the ScriptArgs tab, returning a name/value map
//
function getScriptConfiguration() {
  // Read the script parameters in ScriptArgs sheet and pick out the relevant values
  var argsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ScriptArgs");
  var argsRange = argsSheet.getRange(1,1,50,2);
  var argsRangeValues = argsRange.getValues();
  var map = {};
  for (var i=1;i<50; i++) {
    paramName = argsRangeValues[i][0];
    paramVal = argsRangeValues[i][1]; 
    if (paramName) {
      map[paramName] = paramVal
    }
  }
  return map;
}
//
// Retrieves nicknames for pairs, returning them in a map
//
function test_getPairNicknames() {
  Logger.log(getPairNicknames());
}
function getPairNicknames() {
  var config = getScriptConfiguration();
  var nicknamesSheet = config["Pair Nicknames Sheet"];
  var map = {};
  if (!nicknamesSheet || isEqual(nicknamesSheet,"")) {
    return map;
  }

  // Read the nickname values
  var nicksSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nicknamesSheet);
  var argsRange = nicksSheet.getRange(1,1,50,2);
  var argsRangeValues = argsRange.getValues();

  for (var i=0;i<50; i++) {
    nickNames = argsRangeValues[i][0];
    nickVal = argsRangeValues[i][1]; 
    if (nickNames) {
      map[nickNames] = nickVal
    }
  }
  return map;
}

//
// Finds the last working day for a specified date
// additionalDays = 0 (search backwards from today)
// additionalDays = -1 (search backwards from yesterday)
// additionalDays = 1 (search backwards from tomorrow)
//
function getLastWorkingDay(additionalDays) {
	var days;
  
	// Check if parameter 'daysFromToday' is correct type
	if(!isNaN(parseInt(additionalDays))) 
		days = parseInt(additionalDays);
	else days = 0;
	
	// Get today's date and set new date based on parameter value
	var today = new Date();
	today.setDate(today.getDate() + days);
	
	// Sun, minus two days to get to Friday
	if (today.getDay() == 0) {
		today.setDate(today.getDate() - 2);
	}
	// Sat, minus one day to get to Friday
	else if (today.getDay() == 6) {
		today.setDate(today.getDate() - 1);
	} 
    return today;
}

//
// Finds the next working day for a specified date
// additionalDays = 0 (search forwards from today)
// additionalDays = -1 (search forwards from yesterday)
// additionalDays = 1 (search forwards from tomorrow)
//
function getNextWorkingDay(startDay, additionalDays) {
	var days;
	// Check if parameter 'daysFromToday' is correct type
	if(!isNaN(parseInt(additionalDays))) 
		days = parseInt(additionalDays);
	else days = 0;
	
	// Get today's date and set new date based on parameter value
	var today = startDay;
	today.setDate(today.getDate() + days);
	
	// Sun, plus one day to get to Monday
	if (today.getDay() == 0) {
		today.setDate(today.getDate() + 1);
	}
	// Sat, plus two days to get to Monday
	else if (today.getDay() == 6) {
		today.setDate(today.getDate() + 2);
	} 
    return today;
}

function removeValue(list, value) {
  for (i=0; i<list.length; i++) {
    if (list[i] == value) {
      list.splice(i,1);
      return list
    }
  }
  return list;
}

function pad(pad, str, padLeft) {
  if (typeof str === 'undefined') 
    return pad;
  if (padLeft) {
    return (pad + str).slice(-pad.length);
  } else {
    return (str + pad).substring(0, pad.length);
  }
}


function test_removePgOverridesForDay() {
  removePgOverridesForDay(new Date("2021-02-02"));
}

function removePgOverridesForDay(day) {
  var config = getScriptConfiguration();
  var token = getPagerdutyAPIToken();
  var scheduleId = config["Pager Duty Schedule Id"];

  var overrides = pgGetScheduleOverrides(token, scheduleId, day);
  Logger.log("Removing overrides for day " + day)
  overrides.forEach(function (override) {
    Logger.log(override.id);
    pgDeleteOverride(token,scheduleId,override.id)
  });
}

function populateBankHolidays() {
  var bankholidays = getBankHolidays();
  var config = getScriptConfiguration();
  var bankHolidaySheet = config["Bank Holiday Sheet"];
  populateBankHolidaysSheet(bankHolidaySheet);
}

