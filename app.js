var Jimp = require('jimp');
const fs = require('fs');


const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const userSocketIdMap = new Map();
var pixel_state = 0;
var game_state = 1;
var img_name = "val";
var imgs_array = ['siphano', 'chien', 'cheval', 'val']

////////////////////////////////


app.use(express.static(__dirname + '/public'));
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});

server.listen(process.env.PORT || 3000)


//////////////////////////////////


function getRandomInt(min, max) {
  return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
};


///////////////////////////

// var text = fs.readFileSync(__dirname + '/public/dictionnaire.txt','utf8')
// console.log (text[0])


function pixel(bool = 1) {
  if (bool) {
    if (pixel_state > 85 && pixel_state < 100) {
      Jimp.read(__dirname + '/public/images/val.png').then(image => {
        pixel_state += 0.25;
        var pix = image.bitmap.width / 85;
        image.pixelate(parseFloat(pix.toFixed(2))).getBuffer(image.getMIME(), (err, buf) => {
          var msg = buf.toString('base64');
          io.emit('image', msg);
        });
      });
    } else if (pixel_state > 100) {
      clearInterval(interval_img_guess);
      pixel(0);
      pixel_state = 0;
      io.emit('message', "c'était val :/")
      setTimeout(() => {
        interval_img_guess = setInterval(() => pixel(), 100)
        io.emit('message', "");
      }, 3000);
    } else {
      Jimp.read(__dirname + '/public/images/val.jpg').then(image => {
        pixel_state += 0.25;
        var pix = image.bitmap.width / pixel_state;
        image.pixelate(parseFloat(pix.toFixed(2))).getBuffer(image.getMIME(), (err, buf) => {
          var msg = buf.toString('base64');
          io.emit('image', msg);
        });
      });
    }
  } else {
    Jimp.read(__dirname + '/public/images/val.jpg').then(image => {
      image.getBuffer(image.getMIME(), (err, buf) => {
        var msg = buf.toString('base64');
        io.emit('image', msg);
      });
    });
  }
};


/////////////////////////////////////////////////


var interval_img_guess = setInterval(() => {
  pixel();
}, 100)

io.on('connection', (ws) => {

  ws.on('disconnect', function () {
    if (userSocketIdMap.has(ws.username)) {
      userSocketIdMap.delete(ws.username);
    }
    //io.sockets.emit('update', users);
  });

  ws.on('username', (username) => {
    if (!userSocketIdMap.has(username)) {
      userSocketIdMap.set(username, ws.id); //new Set([socketId]));
      ws.username = username
      ws.emit('ready', "1");
    } else {
      ws.emit('alert_msg', "Utilisateur déjà connecté");
    }
  });

  ws.on('guess', (msg) => {
    if (game_state) {
      if (msg == img_name) {
        game_state = 0;
        clearInterval(interval_img_guess);
        pixel(0);
        pixel_state = 0;
        io.emit('message', ws.username + " à TROUVED !!!!")
        setTimeout(() => {
          interval_img_guess = setInterval(() => pixel(), 100)
          io.emit('message', "");
          game_state = 1
        }, 3000);
      } else {
        ws.emit('message', "Pas trouved")
      }
    }
  })
});