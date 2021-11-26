//
// Retrieves an list of bank holidays as an array of strings in YYYY-MM-DD format
//
var bankHolidaysService = 'https://www.gov.uk/bank-holidays.json';

function getBankHolidays() {
  var MESSAGE_ENDPOINT = bankHolidaysService;
  var options = {
      method: 'GET',
      muteHttpExceptions: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.pagerduty+json;version=2',
      }
    };
  var res = UrlFetchApp.fetch(MESSAGE_ENDPOINT,options);
  var jsonRes = JSON.parse(res);
  var bankholidays = new Array();
//  Logger.log(  jsonRes["england-and-wales"]["events"]);
  jsonRes["england-and-wales"]["events"].forEach (function (bankholidayobj) {
    bankholidays.push(bankholidayobj.date);
  })
 
  return bankholidays;
}

function populateBankHolidaysSheet(bankHolidaySheet) {
  var bankholidays = getBankHolidays();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(bankHolidaySheet)
  for (i = 0; i < bankholidays.length; i++) {
    var range=sheet.getRange(i+1,1,1,1);
    range.setValues([[bankholidays[i]]])
  }
}
