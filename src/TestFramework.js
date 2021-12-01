function test_assertEquals () {
  assertEquals("Should be Pass","one","one");
  assertEquals("Should be FAIL","one","two");
  assertEquals("Should be Pass",1,1);
  assertEquals("Should be FAIL",1,100);
}

function assertEquals(name,expected,actual) {
  if (isEqual(expected,actual)) {
    Logger.log("Pass: " + name + ", correct value '" + expected + "'");
    __assertionsPassed++;
  } else {
    Logger.log("************** FAIL: " + name + ", expected value of '" + expected + "', actual value of '" + actual + "'");
    __testSuccess = false;
    __assertionsFailed++;    
  }
}

function startTests() {
  __testSuccess = true;
  __assertionsFailed = 0;
  __assertionsPassed = 0;

}

function endTests() {
  if (__testSuccess) {
    Logger.log("All tests Passed");
  } else {
    Logger.log("************** Tests FAILED");
  }
  Logger.log("Assertions passed = " + __assertionsPassed);    
  Logger.log("Assertions failed = " + __assertionsFailed);    
}

function test_isEqual() {
  Logger.log("True: " + isEqual("one","one"));
  Logger.log("True: " + isEqual(null,null));
  Logger.log("False: " + isEqual("one","two"));
  Logger.log("False: " + isEqual("one",null));
  Logger.log("False: " + isEqual(null,"two"));
}

function isEqual(str1, str2) {
  if (typeof __testSuccess === 'undefined') {
    startTests();
  }
  if ( str1 === null && str2 === null ){
    return true;
  } else if ( str1 === null || str2 === null ) {
    return false;
  } else if ( str1 > str2 || str1 < str2 ) {
    return false;
  } else {
    return true;
  }
}
