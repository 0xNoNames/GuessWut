$(function () {
    var socket = io();

    socket.on('alert_msg', (socket_msg) => {
        $('#alert_msg').html(socket_msg);
    });

    socket.on('message', (socket_msg) => {
        $('#message').html(socket_msg);
    });

    socket.on('image', (socket_img) => {
        var image = new Image($("body").height() / 1.3, $("body").height() / 1.3);
        console.log(socket_img)
        image.src = socket_img;
        $("#image").html(image);
    });

    socket.on('ready', (socket_rdy) => {
        if (socket_rdy) {
            $("#username_form, #alert_msg").remove();
            $("#guess_form, #main, #highscore").show();
            $("#forms").css("bottom", "2.5%");
            $('#scoreboard')
        }
    });

    socket.on('update', (socket_msg) => {
        var userPointsArray = JSON.parse(socket_msg);
        userPointsArray.sort(function(a,b){return b[1] - a[1];});
        $('#navscores').html('');
        for (let i = 0; i < userPointsArray.length; i++) {
            $('#navscores').append('<ul><span>' + userPointsArray[i][0] + '</span><span>' +
                userPointsArray[i][1] + '</span></ul>');
        }
        $('#scoreboard').show()
    });

    $("#username_form").submit(function (e) {
        e.preventDefault();
        if ($('#username_input').val() != '') {
            socket.emit('username', $('#username_input').val());
        }
    });

    $("#guess_form").submit(function (e) {
        e.preventDefault();
        socket.emit('guess', $('#guess_input').val());
        $('#guess_input').val('');
    });
});