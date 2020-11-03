"use strict";

const {
  createCanvas,
  loadImage
} = require('canvas');

var helmet = require('helmet');
const fs = require('fs');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);


////////////////////////////////


app.use(helmet());

app.use(express.static(__dirname + '/public'));

// app.all('/add', function (req, res) {
//   res.redirect('/add.html');
// });

app.all('*', function (req, res) {
  res.redirect('/');
});

server.listen(80);


//////////////////////////////////


const userPointsMap = new Map();
var pixel_state = 0;
var game_state = 1;

const imgs_array = fs.readdirSync(__dirname + '/public/assets/img/jpg/');
imgs_array.forEach(function (part, index) {
  this[index] = this[index].slice(0, -4);
}, imgs_array);

var copy_array = imgs_array.slice();

var random_nb = getRandomInt(imgs_array.length - 1);
var img_name = copy_array[random_nb];
copy_array.splice(random_nb, 1);


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
    interval_img_guess = setInterval(() => pixel(), 125)
    io.emit('message', "");
    game_state = 1;
  }, 3000);
}

function pixelate(image, ctx, canvas, value) {
  var size = value / 100,
    w = canvas.width * size,
    h = canvas.height * size;

  ctx.drawImage(image, 0, 0, w, h);

  ctx.msImageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(canvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height)
}


///////////////////////////


function pixel(bool = 1) {
  if (bool) {
    if (pixel_state > 24) {
      restartGame("", false);
    } else {
      loadImage(__dirname + '/public/assets/img/jpg/' + img_name + '.jpg').then((image) => {
        pixel_state += 0.1;
        var canvas = createCanvas(image.width, image.height);
        var ctx = canvas.getContext('2d');
        pixelate(image, ctx, canvas, pixel_state);
        io.emit('image', canvas.toDataURL());
      })
    }
  } else { // Image sans pixelisation
    loadImage(__dirname + '/public/assets/img/jpg/' + img_name + '.jpg').then((image) => {
      var canvas = createCanvas(image.width, image.height);
      var ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      io.emit('image', canvas.toDataURL());
    })
  }
};


/////////////////////////////////////////////////


var interval_img_guess = setInterval(() => {
  pixel();
}, 125);

io.on('connection', (ws) => {

  ws.emit('update', JSON.stringify(Array.from(userPointsMap)));

  ws.on('disconnect', function () {
    if (userPointsMap.has(ws.username)) userPointsMap.delete(ws.username);
    ws.broadcast.emit('update', JSON.stringify(Array.from(userPointsMap)));
  });

  ws.on('username', (username) => {
    if (!userPointsMap.has(username)) {
      if (username.length > 12) ws.emit('alert_msg', "Taille du nom d'utilisateur doit être inférieure à 12.")
      else {
        ws.username = username;
        ws.point = 0;
        userPointsMap.set(username, ws.point);
        ws.emit('ready', "1");
        io.emit('update', JSON.stringify(Array.from(userPointsMap)));
      }
    } else ws.emit('alert_msg', "Utilisateur déjà connecté.");
  });

  ws.on('guess', (msg) => {
    if (userPointsMap.has(ws.username)) {
      io.emit('chat', ws.username + ' : ' + msg);
      if (game_state) {
        if (msg == img_name.replace(/\d+$/, "")) restartGame(ws);
        else ws.emit('message', "Pas trouved");
      }
    }
  });
});