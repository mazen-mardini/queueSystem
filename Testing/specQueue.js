describe('Basic Queue Functionality:', function() {
var name = 'emickos';
var location = 'Red';
var ta = 'pernyb';

 beforeEach(function() {
    browser.manage().deleteAllCookies();
    browser.get('http://localhost:8080/#/list');
    browser.manage().window().maximize();
    browser.waitForAngular();
    userLogIn(ta);
    closeMOTD();
    element(by.id('listdbasBtn')).click();
    closeMOTD();
    element(by.id('queueOptionsBtn')).click();
    element(by.id('queuePurgeQueueBtn')).click();
    acceptDialogue();
  });



 function userLogIn(userName){
  element(by.id('indexLogInBtn')).isDisplayed().then(function(isVisible) {
      if (isVisible){  
        element(by.id('indexLogInBtn')).click();
      } else {  
        element(by.id('indexLogOutBtn')).click();
        element(by.id('indexLogInBtn')).click();  
      }
    });
  element(by.id('loginInputField')).sendKeys(userName);
  element(by.id('loginOKBtn')).click();
  closeMOTD();
  browser.waitForAngular();
 };


function closeMOTD(){
  // browser.sleep(100);
  // browser.switchTo().alert().then(
  //     function(alert) {  return alert.dismiss(); },
  //     function(err) { }
  //     );
    var plot0 = element(by.css('body > div.modal.fade.ng-isolate-scope.in > div > div'));
    browser.actions()
      .mouseMove({x: 200, y: 0}) // 400px to the right of current location
      .click()
      .perform();
};

function acceptDialogue(){
  //browser.switchTo().alert().then(
  //    function(alert) {  return alert.accept(); },
  //   function(err) { }
  //    );
  element(by.id('queueDoPurgeBtn')).click();
};

function userJoinQueue(joinQueue){
  element(by.id('list'+joinQueue+'Btn')).click();
  closeMOTD();
  element(by.id('queueLocationInputField')).sendKeys(location);
  element(by.id('queueJoinQueueBtn')).click();
};

function newBrowser(){
  browser.get('http://localhost:8080/#/list');
  browser.manage().deleteAllCookies();
  browser.manage().window().maximize();
  browser.waitForAngular();
};


 afterEach(function(){
 });

it('he TA class is able to, by interaction, Purge the queue of all Users', function(){
  userLogIn('emickos');
  userJoinQueue('dbas');
  newBrowser();
  userLogIn(ta);
  closeMOTD();
  element(by.id('listdbasBtn')).click();
  closeMOTD();
  element(by.id('queueOptionsBtn')).click();
  element(by.id('queuePurgeQueueBtn')).click();
  acceptDialogue();
  expect(element(by.id('queueemickosBtn')).isPresent()).toBeFalsy();
  newBrowser();
  userLogIn(name);
  userJoinQueue('dbas');
  expect(element(by.id('queueemickosBtn')).isPresent()).toBeTruthy();
});

it('a User should be able to log on', function() {
    userLogIn(name);
    closeMOTD();
    expect(element(by.id('indexNameTextField')).getText()).toEqual(name);
  });

it('a User should be able to choose a queue and join a queue.', function() {
    userLogIn(name);
    userJoinQueue('dbas');
    expect(element(by.id('queue'+name+'Btn')).isPresent()).toBeTruthy();
  });

it('a User should be able to leave a joined queue.', function() {
    userLogIn(name);
    userJoinQueue('dbas');
    element(by.id('queueLeaveQueueBtn')).click();
    expect(element(by.id('queue'+name+'Btn')).isPresent()).toBeFalsy();
  });

it('Joining a queue with a booked time slot', function(){
 //TODO
});

it('The Student class will have the possibility the change their own data in the form of location commment and personal comment.', function() {
    userLogIn(name);
    $('#listdbasBtn').click();
    closeMOTD();
    $('#queueLocationInputField').sendKeys(location);
    $('#queueCommentInputField').sendKeys('comment1');
    $('#queueJoinQueueBtn').click();
    expect(element(by.id('queueemickosBtn')).getText()).toMatch('1 emickos Red comment1');
    $('#queueCommentInputField').clear();
    $('#queueLocationInputField').clear();
    $('#queueLocationInputField').sendKeys('Yellow');
    $('#queueCommentInputField').sendKeys('comment2');
    $('#queueUpdateInformationBtn').click()
    expect(element(by.id('queue'+name+'Btn')).getText()).toMatch('1 emickos Yellow comment2');
  });

it('Broadcasting in a Queue', function(){
 //TODO
});

it('The TA class is able to, by interaction, ‘Kick’ a User from the Queue', function(){
  userLogIn(name);
  userJoinQueue('dbas');
  newBrowser();
  userLogIn(ta);
  closeMOTD();
  $('#listdbasBtn').click();
  closeMOTD();
  browser.actions().doubleClick($('#queue'+name+'Btn')).perform();
  $('#queueRemoveUser'+name+'Btn').click();
  expect(element(by.id('queue'+name+'Btn')).isPresent()).toBeFalsy();
  });

it('TA is able to use the interaction ‘Lock’ or ‘Unlock’ with a queue', function(){  
 userLogIn(ta);
 closeMOTD();
 $('#listdbasBtn').click();
 closeMOTD();
 element(by.id('queueOptionsBtn')).click();
 $('#queueLockQueueBtn').click();
 newBrowser();
 userLogIn(name);
 expect($('#listdbasBtn').isPresent()).toBeFalsy();
 newBrowser();
 userLogIn(ta);
 closeMOTD();
 $('#listdbasBtn').click();
 closeMOTD();
 element(by.id('queueOptionsBtn')).click();
 $('#queueUnlockQueueBtn').click();
 newBrowser();
 userLogIn(name);
 expect($('#listdbasBtn').isPresent()).toBeTruthy();
  });

it('TA is able to use the interaction ‘new MOTD’ (Message of the Day) with a queue for a session which he is given privileges.', function(){
  //TODO
});

it('The users of class Teacher have the system rights to change other users user class within the group:', function(){
 userLogIn(name);
 expect($('#indexAdminBtn').isPresent()).toBeFalsy();
 newBrowser();
 userLogIn(ta);
 $('#indexAdminBtn').click();
 $('#administrationSelectQueueDropDown').click();
 $('#administrationdbasDropDownBtn').click();
 $('#administrationAddAssistantInputField').sendKeys(name);
 $('#administrationAddAssistantBtn').click();
 newBrowser();
 userLogIn(name);
 expect($('#indexAdminBtn').isPresent()).toBeTruthy();
 newBrowser();
 userLogIn(ta);
 $('#indexAdminBtn').click();
 $('#administrationSelectQueueDropDown').click();
 $('#administrationdbasDropDownBtn').click();
 $('#administrationRemoveAssistantBtn').click
 newBrowser();
 userLogIn(name);
 expect($('#indexAdminBtn').isPresent()).toBeFalsy();
});

it('The Teacher class is able to Hide or Reveal the Queue. Hiding the Queue will remove the Queue from the list of Queues for Users of the Student class', function(){
 userLogIn(ta);
 $('#indexAdminBtn').click();
 $('#administrationSelectQueueDropDown').click();
 $('#administrationdbasDropDownBtn').click();
 $('#administrationHideQueueBtn').click();
 $('#administrationChangeBtn').click();

 newBrowser();
 userLogIn(name);
 expect($('#listdbasBtn').isDisplayed()).toBeFalsy();
 newBrowser();
 userLogIn(ta);
 userLogIn(ta);

 $('#indexAdminBtn').click();
 $('#administrationSelectQueueDropDown').click();
 $('#administrationdbasDropDownBtn').click();
 $('##administrationShowQueueBtn').click();
 $('#administrationChangeBtn').click();

 newBrowser();
 userLogIn(name);
 expect($('#listdbasBtn').isDisplayed()).toBeTruthy();
 userJoinQueue('dbas');
});



});