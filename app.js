"use strict";

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const hpp = require('hpp');
const helmet = require('helmet');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const {
  createCanvas,
  loadImage
} = require('canvas');


////////////////////////////////


app.use(helmet());

app.use(hpp());

app.use(express.static(__dirname + '/public'));


app.get('/add', authentication, (req, res) => {
  res.sendFile(__dirname + '/private/add.html')
})

const upload = multer({
  limits: {
    fileSize: 10000000
  }
}).single('file');


app.post('/upload', (req, res) => {
  upload(req, res, async function (err) {
    if (req.body.namefile === "") res.send(JSON.parse('{"success": 0, "upload_add": "Mot manquant."}'));
    else if (err || req.file === undefined) res.send(JSON.parse('{"success": 0, "upload_add": "Pas de fichier ou fichier trop volumineux. (max 10MB)"}'));
    else if (req.file.mimetype != "image/jpeg" && req.file.mimetype != "image/png") {
      fs.appendFile(__dirname + '/private/log.txt', req.file.mimetype + " non autorisé." + "\r\n", function (err) { });
      res.send(JSON.parse('{"success": 0, "upload_add": "Seulement des fichiers jped et png."}'));
    } else if (/\d/.test(req.body.namefile)) res.send(JSON.parse('{"success": 0, "upload_add":"Pas de nombres dans le mot à deviner (pour l\'instant")}'));
    else {
      let nums = [];
      let namefile = req.body.namefile.replace(/ +(?= )/g,'');

      for (let i = 0; i < copy_array.length; i++) {
        if (namefile == copy_array[i].replace(/\d+$/, '')) nums.push(copy_array[i]);
      }

      for (let i = 0; i < nums.length; i++) {
        nums[i] = nums[i].replace(namefile, '');
      }

      nums.push(0);
      let indice = Math.max.apply(Math, nums) + 1;
      namefile = namefile + indice;

      sharp(req.file.buffer)
        .resize(800, 800)
        .toFormat('jpeg', {
          progressive: true,
          quality: 50
        })
        .toFile(__dirname + "/../guesswut-jpgs/" + namefile + ".jpg")
        .then(() => {
          fs.appendFile(__dirname + '/private/log.txt', namefile + " ajouté." + "\r\n", function (err) { });
          res.send(JSON.parse('{"success": 1, "upload_add": "Fichier envoyé !"}'));
          io.emit("newfile", 1);
          copy_array.push(namefile);
        })
        .catch((err) => {
          fs.appendFile(__dirname + '/private/log.txt', err.fileName + "; " + err.message + "; " + err.lineNumber + "\r\n", function (err) { })
        });
    }
  })
})


server.listen(8000);


//////////////////////////////////

const score_map = new Map();
var pixel_state = -0.0625;
var game_state = 1;
var img_name;
var random_nb;
var copy_array;
var imgs_array;
var message_json = {};
var chat_json = {};

init_arrays()


//////////////////////////////////


class StopWatch {
  constructor() {
    this.startTime = 0;
    this.pauseTime = 0;
    this.running = 0;
  }
  Start() {
    this.startTime = currentTime();
    this.running = 1;
  }
  Pause() {
    this.pauseTime = this.Elapsed();
    this.running = 0;
  }
  Reset() {
    this.startTime = currentTime();
    this.pauseTime = 0;
  }
  Elapsed() {
    if (!this.running) return this.pauseTime;
    return (currentTime() - this.startTime + this.pauseTime).toFixed(0) / 1000.0;
  }
}

function currentTime() {
  return process.hrtime()[0] * 1000 + process.hrtime()[1] / 1000000;
}


//////////////////////////////////


function init_arrays() {
  imgs_array = fs.readdirSync(__dirname + '/../guesswut-jpgs/');
  imgs_array.forEach(function (part, index) {
    this[index] = this[index].slice(0, -4);
  }, imgs_array);
  copy_array = imgs_array.slice();
  random_nb = getRandomInt(imgs_array.length - 1);
  img_name = copy_array[random_nb];
  copy_array.splice(random_nb, 1);
}

function authentication(req, res, next) {
  const auth = {
    login: 'grossechienne',
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
  pixel_state = -0.0625;

  pixel("", 0);

  if (trouved) {
    message_json.win = 1;
    message_json.message = ws.username + " le boss," + " c'était : " + img_name.replace(/\d+$/, "");
    score_map.set(ws.username, [++ws.point, score_map.get(ws.username)[1]]);
    io.emit('update', JSON.stringify(Array.from(score_map)));
    chat_json.win = 1;
  } else {
    message_json.win = 0;
    message_json.message = "C'était : " + img_name.replace(/\d+$/, "") + " :/";
  }

  io.emit('game_msg', JSON.stringify(message_json));

  random_nb = getRandomInt(copy_array.length - 1);
  img_name = copy_array[random_nb];
  copy_array.splice(random_nb, 1);

  if (copy_array.length == 0) copy_array = imgs_array.slice();

  setTimeout(() => {
    interval_img_guess = setInterval(() => pixel(""), 150);
    timer.Reset()
    timer.Start();
    message_json.message = "";
    io.emit('game_msg', JSON.stringify(message_json));
    game_state = 1;
  }, 3000);
}

function pixelate(image, ctx, canvas, value) {
  var size = value / 100,
    w = (canvas.width * size).toFixed(1),
    h = (canvas.height * size).toFixed(1);

  ctx.drawImage(image, 0, 0, w, h);

  ctx.msImageSmoothingEnabled = 0;
  ctx.mozImageSmoothingEnabled = 0;
  ctx.webkitImageSmoothingEnabled = 0;
  ctx.imageSmoothingEnabled = 0;
  ctx.patternQuality = 'fast';

  ctx.drawImage(canvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height)
}


/////////////////////////


function pixel(ws, bool = 1) {
  if (bool) {
    if (!fs.existsSync(__dirname + '/../guesswut-jpgs/' + img_name + '.jpg')) {
      message_json.message = "Image supprimée.";
      io.emit('game_msg', JSON.stringify(message_json));
      init_arrays();
      clearInterval(interval_img_guess);
      game_state = 0;
      pixel_state = -0.0625;
      setTimeout(() => {
        interval_img_guess = setInterval(() => pixel(ws), 150)
        message_json.message = "";
        io.emit('game_msg', JSON.stringify(message_json));
        game_state = 1;
      }, 3000);
    } else {
      if (pixel_state > 12) {
        restartGame(ws, 0);
      } else {
        loadImage(__dirname + '/../guesswut-jpgs/' + img_name + '.jpg').then((image) => {
          pixel_state += 0.0625;
          var canvas = createCanvas(image.width, image.height);
          var ctx = canvas.getContext('2d');
          pixelate(image, ctx, canvas, pixel_state);
          io.emit('image', canvas.toDataURL());
        })
      }
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
  pixel("");
}, 150);
const timer = new StopWatch()

timer.Start()

io.on('connection', (ws) => {

  ws.emit('update', JSON.stringify(Array.from(score_map)));

  ws.on('disconnect', function () {
    if (score_map.has(ws.username)) score_map.delete(ws.username);
    ws.broadcast.emit('update', JSON.stringify(Array.from(score_map)));
  });

  ws.on('username', (username) => {
    let encoded_msg = decodeURI(encodeURI(username));
    if (!score_map.has(encoded_msg)) {
      if (encoded_msg.length > 12) ws.emit('username_msg', "Taille du nom d'utilisateur doit être inférieure à 12.")
      else {
        ws.username = encoded_msg;
        ws.point = 0;
        score_map.set(encoded_msg, [ws.point, "hsl(" + 360 * Math.random() + ',100%,' + (60 + 10 * Math.random()) + '%)']);
        ws.emit('ready');
        io.emit('update', JSON.stringify(Array.from(score_map)));
      }
    } else ws.emit('username_msg', "Utilisateur déjà connecté.");
  });

  ws.on('guess', (msg) => {
    chat_json.user = ws.username;
    chat_json.time = timer.Elapsed().toFixed(3);
    chat_json.chat_msg = msg;
    chat_json.me = 1;
    chat_json.win = 0;

    if (score_map.has(ws.username)) {
      chat_json.color = score_map.get(ws.username)[1]
      if (game_state && timer.Elapsed() > 1) {
        let encoded_msg = msg.toLowerCase().replace(/\s/g, "", '');
        let guess_msg = img_name.toLowerCase().replace(/\d+$/, "");
        if (encoded_msg == guess_msg) {
          restartGame(ws);
        }
      }
      ws.emit('chat', JSON.stringify(chat_json));
      chat_json.me = 0;
      ws.broadcast.emit('chat', JSON.stringify(chat_json));
    } else {
      ws.emit('refresh');
    }
  });
});


process.on("uncaughtException", function (err) {
   process.exit();
});