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
    if (req.body.namefile === "") res.send(JSON.parse('{"success": false, "msg": "Mot manquant."}'));
    else if (err || req.file === undefined) res.send(JSON.parse('{"success": false, "msg": "Pas de fichier ou fichier trop volumineux. (max 10MB)"}'));
    else if (req.file.mimetype != "image/jpeg" && req.file.mimetype != "image/png") {
      fs.appendFile(__dirname + '/private/log.txt', req.file.mimetype + " non autorisé." + "\r\n", function (err) {});
      res.send(JSON.parse('{"success": false, "msg": "Seulement des fichiers jped et png."}'));
    } else if (/\d/.test(req.body.namefile)) res.send(JSON.parse('{"success": false, "msg":"Pas de nombres dans le mot à deviner"}'));
    else {
      let nums = [];
      let namefile = req.body.namefile.replace(/\s/g, '')

      for (let i = 0; i < copy_array.length; i++) {
        if (namefile == copy_array[i].replace(/\d+$/, '')) nums.push(copy_array[i]);
      }

      for (let i = 0; i < nums.length; i++) {
        nums[i] = nums[i].replace(namefile, '');
      }

      nums.push(0);
      let indice = Math.max.apply(Math, nums) + 1;
      namefile = namefile + indice;

      // if (dimensions.height >= dimensions.width) 
      //   if (dimensions.height > 750) resize = 750
      //   // else resize = dimensions.height
      // } else {
      //   if (dimensions.width > 750) resize = 750
      //   // else resize = dimensions.width
      // }

      sharp(req.file.buffer)
        .resize(750, 750)
        .toFormat('jpeg', {
          progressive: true,
          quality: 50
        })
        .toFile(__dirname + "/../guesswut-jpgs/" + namefile + ".jpg")
        .then(() => {
          fs.appendFile(__dirname + '/private/log.txt', namefile + " ajouté." + "\r\n", function (err) {});
          res.send(JSON.parse('{"success": true, "msg": "Fichier envoyé !"}'));
          io.emit("newfile", "1");
          copy_array.push(namefile);
        })
        .catch((err) => {
          fs.appendFile(__dirname + '/private/log.txt', err.fileName + "; " + err.message + "; " + err.lineNumber + "\r\n", function (err) {})
        });
    }
  })
})


server.listen(80);


//////////////////////////////////


const userPointsMap = new Map();
var pixel_state = 0;
var game_state = 1;
var img_name;
var random_nb;
var copy_array;
var imgs_array;

init_arrays()


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
    copy_array.splice(random_nb, 1);
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


/////////////////////////


function pixel(bool = 1) {
  if (!fs.existsSync(__dirname + '/../guesswut-jpgs/' + img_name + '.jpg')) {
    io.emit('message', "Image supprimée.");
    init_arrays();
    clearInterval(interval_img_guess);
    game_state = 0;
    pixel_state = 100;
    setTimeout(() => {
      interval_img_guess = setInterval(() => pixel(), 125)
      io.emit('message', "");
      io.emit('restart');
      game_state = 1;
    }, 3000);
  } else {
    if (bool) {
      if (pixel_state > 24) {
        restartGame("", false);
      } else {
        loadImage(__dirname + '/../guesswut-jpgs/' + img_name + '.jpg').then((image) => {
          pixel_state + = 0.1;
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
    let encoded_msg = encodeURI(username).replace(/%20/g, "", '');
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
    let encoded_msg = msg.toLowerCase().replace(/\s/g, "", '');
    if (userPointsMap.has(ws.username)) {
      io.emit('chat', ws.username + ' : ' + encoded_msg);
      if (game_state) {
        if (encoded_msg == img_name.replace(/\d+$/, "")) restartGame(ws);
        else ws.emit('message', "Pas trouved");
      }
    }
  });
});


// process.on("uncaughtException", function (err) {
//   process.exit();
// });