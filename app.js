"use strict";

const {
  createCanvas,
  loadImage
} = require('canvas');

const hpp = require('hpp');
const helmet = require('helmet');
const fs = require('fs');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const multer = require('multer');
const bodyParser = require('body-parser');
const {
  nextTick
} = require('process');


////////////////////////////////


app.use(helmet());

app.use(hpp());

app.use(express.static(__dirname + '/public'));

app.get('/add', authentication, (req, res) => {
  res.sendFile(__dirname + '/private/add.html')
})

const upload = multer({
  limits: {
    fileSize: 4000000
  }
}).single('file');


app.post('/upload', (req, res) => {
  upload(req, res, async function (err) {
    if (req.body.namefile === "") res.send(JSON.parse('{"success": false, "msg": "Mot manquant."}'));
    else if (err || req.file === undefined) res.send(JSON.parse('{"success": false, "msg": "Pas de fichier ou fichier trop volumineux. (max 2MB)"}'));
    else if (req.file.mimetype != "image/jpeg") {
      fs.appendFile(__dirname + '/private/log.txt', "Extension non autorisée." + "\r\n", function (err) {});
      res.send(JSON.parse('{"success": false, "msg": "Seulement des fichiers jpg ou jpeg."}'));
    } else if (/\d/.test(req.body.namefile)) res.send(JSON.parse('{"success": false, "msg":"Pas de nombres dans le mot à deviner"}'));
    else {
      let nums = []
      let namefile = req.body.namefile.replace(/\s/g, '')

      for (let i = 0; i < copy_array.length; i++) {
        if (namefile == copy_array[i].replace(/\d+$/, "")) {
          nums.push(copy_array[i]);
        }
      }

      for (let i = 0; i < nums.length; i++) {
        nums[i] = nums[i].replace(namefile, '');
      }

      nums.push(0);
      let indice = Math.max.apply(Math, nums) + 1;
      namefile = namefile + indice;

      fs.writeFile(__dirname + "/../guesswut-jpgs/" + namefile + ".jpg", req.file.buffer, (err) => {
        if (err) fs.appendFile(__dirname + '/private/log.txt', "jps" + "\r\n", function (err) {})
        res.send(JSON.parse('{"success": true, "msg": "Fichier envoyé !"}'));
        io.emit("newfile", "1");
        copy_array.push(namefile);
      });
    }
  })
})


server.listen(80);


//////////////////////////////////


const userPointsMap = new Map();
var pixel_state = 0;
var game_state = 1;

var imgs_array = fs.readdirSync(__dirname + '/../guesswut-jpgs/');
imgs_array.forEach(function (part, index) {
  this[index] = this[index].slice(0, -4);
}, imgs_array);

var copy_array = imgs_array.slice();

var random_nb = getRandomInt(imgs_array.length - 1);
var img_name = copy_array[random_nb];
copy_array.splice(random_nb, 1);


//////////////////////////////////


function authentication(req, res, next) {
  const auth = {
    login: 'groschien',
    password: 'Bontoutou'
  }

  const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':')

  if (login && password && password === auth.password) return next();

  res.set('WWW-Authenticate', 'Basic realm="Access to upload files"')
  res.status(401).send('Authentication required.')
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function restartGame(ws, trouved = 1) {
  clearInterval(interval_img_guess);
  game_state = 0;
  pixel_state = 0;
  pixel(0);
  if (trouved) {
    io.emit('message', ws.username + " le boss," + " c'était : " + img_name.replace(/\d+$/, ""));
    userPointsMap.set(ws.username, ++ws.point);
    io.emit('update', JSON.stringify(Array.from(userPointsMap)));
    random_nb = getRandomInt(copy_array.length - 1);
    img_name = copy_array[random_nb];
    copy_array.splice(random_nb, 1);
  } else {
    io.emit('message', "C'était : " + img_name.replace(/\d+$/, "") + " :/");
    random_nb = getRandomInt(copy_array.length - 1);
    img_name = copy_array[random_nb];
  }

  if (copy_array.length == 0) copy_array = imgs_array.slice();

  setTimeout(() => {
    interval_img_guess = setInterval(() => pixel(), 125)
    io.emit('message', "");
    io.emit('restart');
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
      loadImage(__dirname + '/../guesswut-jpgs/' + img_name + '.jpg').then((image) => {
        pixel_state += 0.1;
        var canvas = createCanvas(image.width, image.height);
        var ctx = canvas.getContext('2d');
        pixelate(image, ctx, canvas, pixel_state);
        io.emit('image', canvas.toDataURL());
      })
    }
  } else { // Image sans pixelisation
    loadImage(__dirname + '/../guesswut-jpgs/' + img_name + '.jpg').then((image) => {
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
    let encoded_msg = encodeURI(username).replace(/%20/g,"", '');
    if (!userPointsMap.has(encoded_msg)) {
      if (encoded_msg.length > 12) ws.emit('alert_msg', "Taille du nom d'utilisateur doit être inférieure à 12.")
      else {
        ws.username = encoded_msg;
        ws.point = 0;
        userPointsMap.set(encoded_msg, ws.point);
        ws.emit('ready', "1");
        io.emit('update', JSON.stringify(Array.from(userPointsMap)));
      }
    } else ws.emit('alert_msg', "Utilisateur déjà connecté.");
  });

  ws.on('guess', (msg) => {
    let encoded_msg = encodeURI(msg).toLowerCase().replace(/%20/g,"", '');
    if (userPointsMap.has(ws.username)) {
      io.emit('chat', ws.username + ' : ' + encodeURI(encoded_msg));
      if (game_state) {
        if (encoded_msg == img_name.replace(/\d+$/, "")) restartGame(ws);
        else ws.emit('message', "Pas trouved");
      }
    }
  });
});


// process.on("uncaughtException", function(err) {
//   // clean up allocated resources
//   // log necessary error details to log files
//   process.exit(); // exit the process to avoid unknown state
// });