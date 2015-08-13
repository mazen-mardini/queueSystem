/* jslint node: true */
"use strict";

var queueSystem = require('../model/queueSystem.js');
var validate = queueSystem.validate;

var User = require("../model/user.js");
var Statistic = require("../model/statistic.js");

module.exports = function (socket, io) {
    
  function doOnQueue(queueName, action) {
    var queue = queueSystem.findQueue(queueName);
    queue[action]();

    console.log('trying to ' + action + ' ' + queueName);

    io.to(queueName).emit(action);
    io.to("lobby").emit("lobby" + action, queueName);

    if (action === 'hide') {
      io.to("admin").emit('hide', queueName);
    } else if (action === 'show') {
      io.to("admin").emit('show', queueName);
    }
  }

  // user tries to join a queue with a "bad location"
  //  - do nothing in backend?
  socket.on('badLocation', function (req) {
    var username = socket.handshake.session.user.name;
    var user = req.user;
    var queueName = req.queueName;
    user.badLocation = true;

    // teacher/assistant-validation
    if (!(validate(username, "teacher", queueName) || validate(username, "assistant", queueName))) {
      console.log("validation for badLocation failed");
      //res.end();
      return;
    }

    io.to("user_" + user.name).emit('badLocation', {name: user.name, sender: username, queueName: queueName});
    io.to(queueName).emit('update', user);

    var course = queueSystem.findQueue(queueName);
    course.updateUser(user);

    console.log("Bad location at " + queueName + " for " + user.name);
  });

  // admin stops helping a user (marked in the queue)
  socket.on('stopHelp', function (req) {
    var queueName = req.queueName;
    var name = req.name;
    var username = req.helper;

    // teacher/assistant-validation
    if (!(validate(username, "teacher", queueName) || validate(username, "assistant", queueName))) {
      console.log("validation for help failed");
      //res.end();
      return;
    }

    var course = queueSystem.findQueue(queueName);
    course.stopHelpingQueuer(name, queueName);

    io.to(queueName).emit('stopHelp', {
      name: name,
      helper: username
    });

    console.log(name + ' is no longer getting help in ' + queueName);
  });


  // teacher/assistant messages a user
  socket.on('messageUser', function (req) {
    var queue = req.queueName;
    var name = req.name;
    var message = req.message;
    var sender = req.sender;

    io.to("user_" + name).emit('msg', {
      message: message,
      sender: sender
    });

    console.log('user ' + name + ' was messaged from ' + sender + ' at ' + queue + ' with: ' + message);
  });

  // teacher/assistant emits to all users (teacher/assistant included)
  socket.on('broadcast', function (req) {
    var queueName = req.queueName;
    var message = req.message;
    var username = req.sender;

    // teacher/assistant-validation
    console.log("validation is :" + validate(username, "assistant", queueName));
    if (!(validate(username, "assistant", queueName))) {
      console.log("validation for emit failed");
      //res.end();
      return;
    }

    io.to(queueName).emit('msg', {
      message: message,
      sender: username
    });

    console.log('emit in ' + queueName + ', msg: ' + message);
  });

  // teacher/assistant emits to all teacher/assistant
  socket.on('broadcastFaculty', function (req) {
    console.log("Recevie request to send message to faculty");
    var queueName = req.queueName;
    var message = req.message;
    var username = req.sender;

    console.log("queueName = " + queueName);
    console.log("message = " + message);
    console.log("username = " + username);

    // teacher/assistant-validation
    if (!(validate(username, "teacher", queueName) || validate(username, "assistant", queueName))) {
      console.log("validation for emitTA failed");
      //res.end();
      return;
    }

    var queue = queueSystem.findQueue(queueName);
    var teacherList = queue.teacher;
    var assistantList = queue.assistant;

    for (var i = teacherList.length - 1; i >= 0; i--) {
      var teacher = teacherList[i];

      io.to("user_" + teacher.name).emit('msg', {
        message: message,
        sender: username
      });

      console.log("emiting teacher: " + "user_" + teacher.name);
    }

    for (var i = assistantList.length - 1; i >= 0; i--) {
      var assistant = assistantList[i];

      io.to("user_" + assistant.name).emit('msg', {
        message: message,
        sender: username
      });

      console.log("emiting assistant: " + assistant.name);
    }

    //  io.to(queueName).emit('msg', {message: message, sender: username});
    console.log('emitTA in ' + queueName + ', msg: ' + message);
  });


  // admin helps a user (marked in the queue)
  socket.on('help', function (req) {
    var queueName = req.queueName;
    var user = req.user;
    var username = req.helper;

    // teacher/assistant-validation
    if (!(validate(username, "teacher", queueName) || validate(username, "assistant", queueName))) {
      console.log("validation for help failed");
      //res.end();
      return;
    }

    var course = queueSystem.findQueue(queueName);
    course.helpingQueuer(user.name, queueName);

    io.to(queueName).emit('help', {
      name: user.name,
      helper: username
    });

    console.log(user.name + ' is getting help in ' + queueName);
  });


  // user being kicked from queue
  socket.on('kick', function (req) {
    var queueName = req.queueName;
    var user = req.user;

    console.log(JSON.stringify(user)); // check which uses is given --- need the one doing the action and the one who is "actioned"
    console.log("Validerande: " + JSON.stringify(socket.handshake.session.user));

    var queue = queueSystem.findQueue(queueName);

    var name = user.name;
    var stat = new Statistic({
      name: name,
      queue: queue.name,
      action: user.type,
      leftQueue: true,
      queueLength: queue.queue.length - 1,
    });
    stat.save();

    queueSystem.userLeavesQueue(queue, user.name);
    if (user.type === 'P') {
      if (user.completion) {
        queue.removeCompletion(user.name);
      }
    }

    console.log('a user was kicked from ' + queueName);

    io.to(queueName).emit('leave', user);
    io.to("lobby").emit('lobbyleave', {
      queueName: queueName,
      username: user.name
    });
  });


  // admin purges a queue
  socket.on('purge', function (req) {
    console.log("called purge:");
    console.log(socket.handshake.session.user);

    var queueName = req.queueName;
    var username = socket.handshake.session.user.name;
    // socket.handshake.session.user = "troll";

    console.log(validate(username, "teacher", queueName));

    // admin/teacher/assistant-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName) || validate(username, "assistant", queueName))) {
      console.log("validation for purge failed");
      //res.end();
      return;
    }

    var queue = queueSystem.findQueue(queueName);

    for (var i = queue.queue.length - 1; i >= 0; i--) { // TODO : While length > 0
      queueSystem.userLeavesQueue(queue, queue.queue[i].name);
    }

    queue.purgeQueue();
    queue.queue = [];

    console.log(req.queue + ' -list purged by ' + username);

    io.to(queueName).emit('purge');
    io.to("lobby").emit('lobbypurge', queueName);
  });

  // trying to schedule a lab session
  socket.on('addSchedule', function (req) {
    var queueName = req.queueName;
    var username = socket.handshake.session.user.name;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName) || validate(username, "assistant", queueName))) {
      console.log("validation for lock failed");
      //res.end();
      return;
    }

    console.log("Validation successful. Would have scheduled: " + JSON.stringify(req.schedule));
  });

  // trying to clear all schedules for a given queue
  socket.on('removeSchedules', function (req) {
    var queueName = req.queueName;
    var username = socket.handshake.session.user.name;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName) || validate(username, "assistant", queueName))) {
      console.log("validation for lock failed");
      //res.end();
      return;
    }

    console.log("Validation successful. Would have cleared the schedule for : " + queueName);
  });

  //===============================================================


  // admin locks a queue
  socket.on('lock', function (req) {
    var queueName = req.queueName;
    var username = socket.handshake.session.user.name;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName) || validate(username, "assistant", queueName))) {
      console.log("validation for lock failed");
      //res.end();
      return;
    }

    doOnQueue(queueName, 'lock');
  });

  // admin unlocks a queue
  socket.on('unlock', function (req) {
    var queueName = req.queueName;
    var username = socket.handshake.session.user.name;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName) || validate(username, "assistant", queueName))) {
      console.log("validation for unlock failed");
      //res.end();
      return;
    }

    doOnQueue(queueName, 'unlock');
  });


  // Add a comment about a user
  socket.on('flag', function (req) {
    var username = req.name;
    var queueName = req.queueName;
    var sender = socket.handshake.session.user.name;
    var message = req.message;

    // teacher/assistant-validation
    if (!(validate(sender, "teacher", queueName) || validate(sender, "assistant", queueName))) {
      console.log("validation for flag failed");
      //res.end();
      return;
    }

    var course = queueSystem.findQueue(queueName);
    course.addAssistantComment(username, sender, queueName, message);

    console.log('flagged');
    io.to(queueName).emit('flag', {
      name: username,
      message: message
    });
  });

  // Remove all comments about a user
  socket.on('removeFlags', function (req) {
    var username = req.name;
    var queueName = req.queueName;
    var sender = socket.handshake.session.user.name;

    // teacher/assistant-validation
    if (!(validate(sender, "teacher", queueName) || validate(sender, "assistant", queueName))) {
      console.log("validation for flag failed");
      //res.end();
      return;
    }

    var course = queueSystem.findQueue(queueName);
    course.removeAssistantComments(username, sender, queueName);

    console.log('removed flags');
    io.to(queueName).emit('removeFlags', {
      name: username
    });
  });

  socket.on('completion', function (req) {
    var queueName = req.queueName;
    var assistant = socket.handshake.session.user.name;

    // teacher/assistant-validation
    if (!(validate(assistant, "teacher", queueName) || validate(assistant, "assistant", queueName))) {
      console.log("validation for addMOTD failed");
      //res.end();
      return;
    }

    var completion = req.completion;
    completion.assistant = assistant;

    console.log("Added the following completion: " + JSON.stringify(completion));

    var queue = queueSystem.findQueue(queueName);
    queue.addCompletion(completion);

    queueSystem.userLeavesQueue(queue, completion.name, false); // TODO : should take a variable 'booking' instead of hardcoding 'false'

    console.log('completion set for user : ' + completion.name);
    io.to(queueName).emit('leave', {
      name: completion.name
    });
    io.to("lobby").emit('lobbyleave', {
      queueName: queueName,
      username: completion.name
    });
    if (completion.task) {
      io.to("user_" + completion.name).emit('completion', {
        message: completion.task
      });
    }
  });

  socket.on('setMOTD', function (req) {
    var queueName = req.queueName;
    var MOTD = req.MOTD;
    var sender = req.sender;

    // teacher/assistant-validation
    if (!(validate(sender, "teacher", queueName) || validate(sender, "assistant", queueName))) {
      console.log("validation for addMOTD failed");
      //res.end();
      return;
    }

    // find the course and save the MOTD to the course in the database
    var course = queueSystem.findQueue(queueName);
    course.addMOTD(MOTD);

    console.log('\'' + MOTD + '\' added as a new MOTD in ' + queueName + '!');

    io.to(queueName).emit('setMOTD', {
      MOTD: MOTD
    });
  });

  socket.on('setInfo', function (req) {
    var queueName = req.queueName;
    var info = req.info;
    var sender = req.sender;

    // teacher/assistant-validation
    if (!(validate(sender, "teacher", queueName) || validate(sender, "assistant", queueName))) {
      console.log("validation for addMOTD failed");
      //res.end();
      return;
    }

    // find the course and save the MOTD to the course in the database
    var course = queueSystem.findQueue(queueName);
    course.setInfo(info); // TODO : does not exist

    console.log('\'' + info + '\' added as a new info in ' + queueName + '!');

    io.to(queueName).emit('setInfo', {
      info: info
    });
  });

};