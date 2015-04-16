var expressio = require('express.io');

var app = expressio();
app.http().io();


app.use(expressio.cookieParser());
app.use(expressio.static(__dirname + '/public'));

app.use(expressio.session({secret: 'express.io is the best framework ever!'}));
app.use(expressio.bodyParser());

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var _ = require('lodash');
var async = require('async');

mongoose.connect('mongodb://localhost/queueBase');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.log("db open!");
});


//===============================================================

var adminSchema = new Schema({
  name: String,
});

//-----

var teacherSchema = new Schema({
  name: String,
  course: String,
});

//-----

var assistantSchema = new Schema({
  name: String,
  course: String,
});

//-----

var userSchema = new Schema({
  name: String,
  place: String,
  startTime: { type: Number, default: Date.now },
  messages: [String],
  action: { type: String, default: '' },
  comment: { type: String, default: '' }
});

userSchema.methods.toJSON = function () {
  return {
    name: this.name,
    place: this.place,
    time: this.startTime,
    action: this.action,
    comment: this.comment
  };
};

//-----

var courseSchema = new Schema({
  name: String,
  locked: { type: Boolean, default: false },
  hibernating: { type: Boolean, default: false },
  motd: { type: String, default: "You can do it!" },
  queue: {type:[userSchema], default: []}
});

courseSchema.methods.addUser = function (user) {
  this.queue.push(user);
  this.save();
};

courseSchema.methods.lock = function () {
  this.locked = true;
  this.save();
};

courseSchema.methods.unlock = function () {
  this.locked = false;
  this.save();
};

courseSchema.methods.hibernate = function (user) {
  this.hibernating = true;
  this.save();
};

courseSchema.methods.unhibernate = function (user) {
  this.hibernating = false;
  this.save();
};

courseSchema.methods.removeUser = function (username) {
  this.queue = this.queue.filter(function (user) {
    return user.name !== username;
  });
  this.save();
};

// => if we want to remove the queue from the database <=
courseSchema.methods.purgeQueue = function (course) {
  this.queue.forEach(function (usr, i, queue) {
    var newUserStatistic = new UserStatistic2({student: usr.name, course: course, action: '?'});
    newUserStatistic.save();
  });

  this.queue = [];
  this.save();
};

courseSchema.methods.forUser = function (fn) {
  this.queue.forEach(fn);
  this.save();
};

courseSchema.methods.updateUser = function (name, user) {
  this.queue.forEach(function (usr, i, queue) {
    if (usr.name === name) {
      _.extend(queue[i], user);
    }
  });
  this.save();
};

courseSchema.methods.addAssistantComment = function (name, sender, queue, message) {
  this.queue.forEach(function (usr, i, queue) {
    if (usr.name === name) {
      var user = usr;
      user.messages.push(message);
      _.extend(queue[i], user);
    }
  });
  this.save();
};

//-----

var messageSchema = new Schema({
  course: String,
  from: String,
  to: String,
  msg: String,
  time: { type: Date, default: Date.now },
  comment: { type: String, default: '' }
});

//-----

var broadcastSchema = new Schema({
  course: String,
  from: String,
  msg: String,
  time: { type: Number, default: Date.now },
  comment: { type: String, default: '' }
});

//-----

var helpSchema = new Schema({
  course: String,
  student: String,
  assistant: String,
  time: { type: Number, default: Date.now },
  comment: { type: String, default: '' }
});

//-----

var badLocationSchema = new Schema({
  course: String,
  student: String,
  assistant: String,
  time: { type: Number, default: Date.now },
  comment: { type: String, default: '' }
});

//-----

var courseActionSchema = new Schema({
  course: String,
  admin: String,
  action: String,
  time: { type: Number, default: Date.now },
  comment: { type: String, default: '' }
});

//-----

var userStatisticSchema = new Schema({
  student: String,
  course: String,
  time: { type: Number, default: Date.now },
  action: String,
  leftQueue: { type: Boolean, default: false },
  queueLength: { type: Number, default: 0},
  timesHelped: { type: Number, default: 0},
  timeAmountHelped: { type: Number, default: 0}
});

userStatisticSchema.index({time: 1});

//===============================================================

var User2 = mongoose.model("User", userSchema);

var Admin2 = mongoose.model("Admin", adminSchema);

var Teacher2 = mongoose.model("Teacher", teacherSchema);

var Assistant2 = mongoose.model("Assistant", assistantSchema);

var Course2 = mongoose.model("Course", courseSchema);

var Msg2 = mongoose.model("Message", messageSchema);

var Broadcast2 = mongoose.model("Broadcast", messageSchema);

var Help2 = mongoose.model("Help", helpSchema);

var BadLocation2 = mongoose.model("BadLocation", badLocationSchema);

var CourseAction2 = mongoose.model("CourseAction", courseActionSchema);

var UserStatistic2 = mongoose.model("UserStatistic", userStatisticSchema);

//===============================================================

// HÅRDKODAD! => ska läsas ifrån databasen vid ett senare skede
var tmpList = [
  "dbas",
  "inda",
  "logik",
  "numme",
  "mvk",
  "progp",
  "mdi"
];

courseList = [];
adminList = [];
teacherList = [];
assistantList = [];
messageList = [];
broadcastList = [];
helpList = [];
badLocationList = [];

//===============================================================

function User(name,place,comment){
  this.name = name;
  this.place = place;
  this.comment = comment;
  this.gettingHelp = false;
}

function Course(name){
  this.name = name;
  this.locked = false;
  this.hidden = false;
  this.admins = [];
  this.length = 0;
}

// REFACTOR!
function setup(){
  for (var i = 0 ; i < tmpList.length ; i++) {
    var course = tmpList[i];
    var newCourse = new Course2({name: course});
    courseList.push(newCourse);
    newCourse.save();

    var queues = Math.floor((Math.random() * 50) + 1);
    for (var j = 0; j < queues; j++) {
      var newUser = new User2({name: Math.random().toString(36).substring(7), place: 'Green', comment: 'lab1'});
      newCourse.addUser(newUser);
      newCourse.save();
    }

    console.log(course  + " " +  newCourse.queue.length);
  }

  var newAdmin = new Admin2({name: 'name'});
  newAdmin.save();
  var newMessage = new Msg2({course: 'course', from: 'from', to: 'to', msg: 'msg'});
  newMessage.save();
  var newBroadcast = new Broadcast2({course: 'course', from: 'from', msg: 'msg'});
  newBroadcast.save();
  var newHelp = new Help2({course: 'course', student: 'student', assistant: 'assistant'});
  newHelp.save();
  var newBadLocation = new BadLocation2({course: 'course', student: 'student', assistant: 'assistant'});
  newBadLocation.save();
  var newCourseAction = new CourseAction2({course: 'course', admin: 'admin', action: 'action'});
  newCourseAction.save();
  var newUserStatistic = new UserStatistic2({student: 'student', course: 'course', action: 'action'});
  newUserStatistic.save();

  var testAdmin = new Admin2({name: 'pernyb'});
  testAdmin.save();
  testAdmin = new Admin2({name: 'antbac'});
  testAdmin.save();
}

function readIn(){
  Course2.find(function (err, courses) {
    courses.forEach(function (course) {
       courseList.push(course);

      console.log(course.name + ' loaded: ' + course);
    });
  });

  Admin2.find(function (err, admins) {
    admins.forEach(function (admin) {
       adminList.push(admin);

      console.log(admin.name + ' loaded');
    });
  });
}

function findCourse(name) {
  for (var i = 0; i < courseList.length; i++) {
    if (courseList[i].name === name) {
      return courseList[i];
    }
  };
}

// name in Admins
function validate(name, type, course) {
  for (var i = 0; i < adminList.length; i++) {
    if (adminList[i].name === name) {
      console.log(name + ' is a valid admin');
      return true;
    }
  };

  console.log(name + ' is not a valid admin');
  return false;
}

//===============================================================

/**
 THIS IS IMPORTANT STUFF!!!
*/
//setup();
readIn();

//===============================================================

app.io.on('connection', function(socket){
  console.log('a user connected');
});

// Setup the ready route, join room and broadcast to room.
app.io.route('listen', function(req) {
  console.log('a user added to ' + req.data);
  req.io.join(req.data);
})

// user joins queue
app.io.route('join', function(req) {
  var queue = req.data.queue;
  var user = req.data.user;
  console.log('a user joined to ' + queue);
  app.io.room(queue).broadcast('join', user);

  var course = findCourse(queue);
  course.addUser(new User2({name: user.name, place: user.place, comment: user.comment}));
})

// user tries to join a queue with a "bad location"
//  - do nothing in backend?
app.io.route('badLocation', function(req) {
  var queue = req.data.queue;
  var name = req.data.name;

  var newBadLocation = new BadLocation2({course: queue, student: name, assistant: ''});
  badLocationList.push(newBadLocation);
  newBadLocation.save();
  console.log(newBadLocation);

  app.io.room(queue).broadcast('badLocation'); 
  console.log("Bad location at " + queue + " for " + name);
})

// user gets updated
app.io.route('update', function(req) {
  var queue = req.data.queue;
  var user = req.data.user;

  console.log('a was updated in ' + queue);
  app.io.room(queue).broadcast('update', user);

  var course = findCourse(queue);
  course.updateUser(user.name, user);
})

// admin helps a user (marked in the queue)
app.io.route('help', function(req) {
  var queue = req.data.queue;
  var name = req.data.name;
  var helper = req.data.helper;

  var newHelp = new Help2({course: queue, student: name, assistant: ''});
  helpList.push(newHelp);
  newHelp.save();

// => is this part necessary or does the database handle this? <=
//  var course = findCourse(queue);
//  course.helpUser(user.name, user);

  app.io.room(queue).broadcast('help', helper);
  console.log(name + ' is getting help in ' + queue);
})

// admin messages a user
app.io.route('messageUser', function(req) {
  var queue = req.data.queue;
  var name = req.data.name;
  var message = req.data.message;
  var sender = req.data.sender;
  var time = new Date(new Date().getTime());

  app.io.room(queue).broadcast('msg', message); // Not having user as an identifier?
  console.log('user ' + name + ' was messaged from ' + sender + ' at ' + queue + ' with: ' + message);

  var d = new Date(1382086394000);
  console.log(time);

  var newMessage = new Msg2({course: queue, from: sender, to: name, msg: message, time: time});
  messageList.push(newMessage);
  newMessage.save();
})

// admin broadcasts to all users
app.io.route('broadcast', function(req) {
  var queue = req.data.queue;
  var message = req.data.message;
//  var sender = req.data.sender;

  app.io.room(queue).broadcast('msg', message);
  console.log('broadcast in ' + queue + ', msg: ' + message);
// console.log('broadcast in ' + queue + ' by ' + sender + ', msg: ' + message);

  var newBroadcast = new Broadcast2({course: queue, from: '', msg: message});
//  var newBroadcast = new Broadcast2({course: queue, from: sender, msg: message});
  broadcastList.push(newBroadcast);
  newBroadcast.save();
})

// user leaves queue
app.io.route('leave', function(req) {
  var queue = req.data.queue;
  var user = req.data.user;
  console.log('a user left ' + queue);
  app.io.room(queue).broadcast('leave', user);

  var course = findCourse(queue);
  course.removeUser(user.name);

  var newUserStatistic = new UserStatistic2({student: user.name, course: queue, action: '?'});
  newUserStatistic.save();

  var newCourseAction = new CourseAction2({course: queue, admin: '', action: 'removed user: ' + user.name});
  newCourseAction.save();
});

// admin purges a queue
app.io.route('purge', function(req) {
  var queue = req.data.queue;

  var course = findCourse(queue);
  course.purgeQueue();
  course.queue = [];

  var newCourseAction = new CourseAction2({course: queue, admin: '', action: 'purge'});
  newCourseAction.save();

  app.io.room(queue).broadcast('purge');
  console.log(req.data.queue + ' -list purged');

  var x = validate("pernyb", "type", "course");
  console.log(x + ' ' + req);
});

//===============================================================

function doOnCourse(courseName, action){
  // console.log("doing " + action + " on course");
  var course = findCourse(courseName);
  course[action]();
  console.log('trying to ' + action + ' ' + courseName);
  app.io.room(courseName).broadcast(action);
}

// admin locks a queue
app.io.route('lock', function(req) {
  doOnCourse(req.data.queue, 'lock');
});

// admin unlocks a queue
app.io.route('unlock', function(req) {
  doOnCourse(req.data.queue, 'unlock');
});

app.io.route('hibernate', function(req) {
  doOnCourse(req.data.queue, 'hibernate');
});

app.io.route('unhibernate', function(req) {
  doOnCourse(req.data.queue, 'unhibernate');
});

//===============================================================

// not done yet -> should be implemented in a different way
app.io.route('numbers helped', function(req) {
  var queue = req.data.queue;
  var starttime = req.data.starttime;
  var endtime = req.data.endtime;

  var helpedList = [];

  // MAGIC WHERE WE GET ALL THE PEOPLE THAT LEFT THE QUEUE, BY AN ASSISTENT, BEFORE ENDTIME

  app.io.room(queue).broadcast('numbers helped', helpedList);
});

app.io.route('queueing users', function(req) {
  var queue = req.data.queue;
  var time = req.data.startTime;
  var course = findCourse(queue);
  var length = course.queue.length;

  console.log('queueing users: ' + length);
  app.io.room(queue).broadcast('queueing users', length);
})

//
app.io.route('createQueue', function(req) {
  var queueName = req.data.name;
  var queue = req.data.queue;

  var newCourse = new Course2({name: queueName});
  courseList.push(newCourse);
  newCourse.save();

  console.log(queueName + ' is getting created');
})

//
app.io.route('addAdmin', function(req) {
  var adminName = req.data.name;
  var queue = req.data.queue;

  var newAdmin = new Admin2({name: adminName});
  adminList.push(newAdmin);
  newAdmin.save();

  console.log(adminName + ' is a new admin!');
})

//
app.io.route('addTeacher', function(req) {
  var teacherName = req.data.name;
  var queue = req.data.queue;
  var course = req.data.course;

  var newTeacher = new Teacher2({name: teacherName, course: course});
  teacherList.push(newTeacher);
  newTeacher.save();

  console.log(teacherName + ' is a new teacher!');
})

//
app.io.route('addAssistant', function(req) {
  var assistantName = req.data.name;
  var queue = req.data.queue;
  var course = req.data.course;

  var newAssistant = new Assistant2({name: assistantName, course: course});
  assistantList.push(newAssistant);
  newAssistant.save();

  console.log(assistantName + ' is a new assistant!');
})

//
app.io.route('flag', function(req) {
  var queue = req.data.queue;
  var sender = req.data.sender;
  var name = req.data.name;
  var message = req.data.message;
 
  var course = findCourse(queue);
  course.addAssistantComment(name, sender, queue, message);

  console.log('flagged');
  app.io.room(queue).broadcast('flag', name, message);
})

// =================================================================================

// returnerar alla kurser som finns (lista av strängar)
app.get('/API/courseList', function(req, res) {
  var retList = [];

  for (i = 0 ; i < courseList.length ; i++) {
    console.log("trying to get length of " + courseList[i].name + ": " + courseList[i].queue.length);
    retList.push({name: courseList[i].name, length: courseList[i].queue.length, locked: courseList[i].locked, hibernating: courseList[i].hibernating});
  }

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(retList));
  console.log('list of courses requested');
})

// returns the queue-list
app.get('/API/queue/:queue', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    var course = findCourse(req.params.queue);
    console.log('queue '+ req.params.queue +' requested');
    console.log(course);
    res.end(JSON.stringify(course));
})

// TODO: add a list of admin
app.get('/API/userData', function(req, res) {
    console.log("user data: ");
    console.log(req.session.user);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(req.session.user));
})

app.post('/API/setUser', function(req,res) {
  req.session.user = req.body;
  console.log("User settings set");
  res.writeHead(200);
  res.end();
})

app.listen(8080);