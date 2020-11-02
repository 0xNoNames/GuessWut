var Jimp = require('jimp');
const fs = require('fs');

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const userPointsMap = new Map();
var pixel_state = 0;
var game_state = 1;
var imgs_array = ['siphano', 'chien', 'chien1', 'cheval', 'val', 'arthur', 'merenathan.jpg', 'homer', 'nunu', 'porot', 'bowser', 'laink', 'boa', 'chat', 'chat1', 'caisse café', 'svastika', 'dodo', 'jerry', 'sylvain durif', 'skyyart', 'alain soral', 'chien2', 'poule', 'chien3', 'hitler', 'marine le pen', 'chien4', 'chien5', 'laink1', 'rammus', 'fien', 'braum', 'chat2', 'porot2', 'porot3', 'porot4', 'porot5', 'nathan', 'chauve-souris', 'arthur1', '^^', 'chat3', 'sardoche', 'wartek', 'shrek', 'porot6', 'porot7', 'gateau', 'chat4', 'nathan1', 't-rex', 'sardoche1']
var copy_array = imgs_array.slice();

var random_nb = getRandomInt(imgs_array.length - 1);
var img_name = copy_array[random_nb];
copy_array.splice(random_nb, 1);


////////////////////////////////


app.use(express.static(__dirname + '/public'));
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});

server.listen(process.env.PORT);


//////////////////////////////////


function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function restartGame(ws, trouved = 1) {
  clearInterval(interval_img_guess);
  game_state = 0;
  pixel_state = 0;
  pixel(0);
  if (trouved) {
    io.emit('message', ws.username + " à TROUVED !!!!" + " ct " + img_name.replace(/\d+$/, ""));
    userPointsMap.set(ws.username, ++ws.point);
    io.emit('update', JSON.stringify(Array.from(userPointsMap)));
    random_nb = getRandomInt(copy_array.length - 1);
    img_name = copy_array[random_nb];
    copy_array.splice(random_nb, 1);
  } else {
    io.emit('message', "vous êtes nazes, c'était " + img_name.replace(/\d+$/, "") + " :/");
    random_nb = getRandomInt(copy_array.length - 1);
    img_name = copy_array[random_nb];
  }

  if (copy_array.length == 0) copy_array = imgs_array.slice();

  setTimeout(() => {
    interval_img_guess = setInterval(() => pixel(), 100)
    io.emit('message', "");
    game_state = 1;
  }, 3000);
}


///////////////////////////


// var text = fs.readFileSync(__dirname + '/public/dictionnaire.txt','utf8')
// console.log (text[0])

function pixel(bool = 1) {
  if (bool) {
    if (pixel_state > 85 && pixel_state < 100) {
      Jimp.read(__dirname + '/public/images/' + img_name + '.jpg').then(image => {
        pixel_state += 0.25;
        var pix = image.bitmap.width / 85;
        image.pixelate(parseFloat(pix.toFixed(2))).getBuffer(image.getMIME(), (err, buf) => {
          var msg = buf.toString('base64');
          io.emit('image', msg);
        });
      });
    } else if (pixel_state > 100) {
      restartGame("", false);
    } else {
      Jimp.read(__dirname + '/public/images/' + img_name + '.jpg').then(image => {
        pixel_state += 0.25;
        var pix = image.bitmap.width / pixel_state;
        image.pixelate(parseFloat(pix.toFixed(2))).getBuffer(image.getMIME(), (err, buf) => {
          var msg = buf.toString('base64');
          io.emit('image', msg);
        });
      });
    }
  } else {
    Jimp.read(__dirname + '/public/images/' + img_name + '.jpg').then(image => {
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
}, 100);

io.on('connection', (ws) => {

  ws.on('disconnect', function () {
    if (userPointsMap.has(ws.username)) userPointsMap.delete(ws.username);
    ws.broadcast.emit('update', JSON.stringify(Array.from(userPointsMap)));
  });

  ws.on('username', (username) => {
    if (!userPointsMap.has(username)) {
      ws.username = username;
      ws.point = 0;
      userPointsMap.set(username, ws.point);
      ws.emit('ready', "1");
      io.emit('update', JSON.stringify(Array.from(userPointsMap)));
    } else ws.emit('alert_msg', "Utilisateur déjà connecté");
  });

  ws.on('guess', (msg) => {
    if (game_state) {
      if (msg == img_name.replace(/\d+$/, "")) restartGame(ws);
      else ws.emit('message', "Pas trouved");
    }
  });
});