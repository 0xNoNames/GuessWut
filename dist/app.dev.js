"use strict";

var Jimp = require('jimp');

var express = require('express');

var app = express();

var server = require('http').createServer(app);

var io = require('socket.io')(server);

var clientarray = {};
var pixel_state = 0;
var game_state = 1; ////////////////////////////////

app.use(express["static"](__dirname + '/public'));
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});
server.listen(process.env.PORT || 3000); //////////////////////////////////

function getRandomIntInclusive(min, max) {
  return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
}

;

function pixel() {
  var bool = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

  if (bool) {
    if (pixel_state > 85 && pixel_state < 100) {
      Jimp.read(__dirname + '/public/images/val.png').then(function (image) {
        pixel_state += 0.25;
        var pix = image.bitmap.width / 85;
        image.pixelate(parseFloat(pix.toFixed(2))).getBuffer(image.getMIME(), function (err, buf) {
          var msg = buf.toString('base64');
          io.emit('image', msg);
        });
      });
    } else if (pixel_state > 100) {
      clearInterval(interval_img_guess);
      pixel(0);
      pixel_state = 0;
      io.emit('message', "c'était val :/");
      setTimeout(function () {
        interval_img_guess = setInterval(function () {
          return pixel();
        }, 100);
        io.emit('message', "");
      }, 3000);
    } else {
      Jimp.read(__dirname + '/public/images/val.png').then(function (image) {
        pixel_state += 0.25;
        var pix = image.bitmap.width / pixel_state;
        image.pixelate(parseFloat(pix.toFixed(2))).getBuffer(image.getMIME(), function (err, buf) {
          var msg = buf.toString('base64');
          io.emit('image', msg);
        });
      });
    }
  } else {
    Jimp.read(__dirname + '/public/images/val.png').then(function (image) {
      image.getBuffer(image.getMIME(), function (err, buf) {
        var msg = buf.toString('base64');
        io.emit('image', msg);
      });
    });
  }
}

; /////////////////////////////////////////////////

var interval_img_guess = setInterval(function () {
  pixel();
}, 100);
io.on('connection', function (ws) {
  ws.on('username', function (msg) {
    clientarray.append(msg);
  });
  ws.on('guess', function (msg) {
    if (game_state) {
      if (msg == "val" || msg == "kusok") {
        game_state = 0;
        clearInterval(interval_img_guess);
        pixel(0);
        pixel_state = 0;
        io.emit('message', "TROUVED !!!!");
        setTimeout(function () {
          interval_img_guess = setInterval(function () {
            return pixel();
          }, 100);
          io.emit('message', "");
          game_state = 1;
        }, 3000);
      } else {
        ws.emit('message', "Pas trouved");
      }
    }
  });
});