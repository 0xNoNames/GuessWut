var Jimp = require('jimp');

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const clientarray = {}
var pixel_state = 0;

////////////////////////////////


app.use(express.static(__dirname + '/public'));
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});

server.listen(process.env.PORT || 3000)


//////////////////////////////////


function getRandomIntInclusive(min, max) {
  return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
};

function pixel(bool = 1) {
  if (bool) {
    console.log(pixel_state)
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
      Jimp.read(__dirname + '/public/images/val.png').then(image => {
        pixel_state += 0.25;
        var pix = image.bitmap.width / pixel_state;
        image.pixelate(parseFloat(pix.toFixed(2))).getBuffer(image.getMIME(), (err, buf) => {
          var msg = buf.toString('base64');
          io.emit('image', msg);
        });
      });
    }
  } else {
    Jimp.read(__dirname + '/public/images/val.png').then(image => {
      image.getBuffer(image.getMIME(), (err, buf) => {
        var msg = buf.toString('base64');
        io.emit('image', msg);
      });
    });
  }
};


/////////////////////////////////////////////////


var interval_img_guess = setInterval(() => pixel(), 100)

io.on('connection', (ws) => {
  ws.on('username', (msg) => {
    clientarray.append(msg)
  })
  ws.on('guess', (msg) => {
    if (msg == "val" || msg == "kusok") {
      clearInterval(interval_img_guess);
      pixel(0);
      pixel_state = 0;
      io.emit('message', "TROUVED !!!!")
      setTimeout(() => {
        interval_img_guess = setInterval(() => pixel(), 100)
        io.emit('message', "");
      }, 3000);
    } else {
      ws.emit('message', "Pas trouved")
    }
  })
});