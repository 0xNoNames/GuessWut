"use strict";

$(document).ready(function () {
  $('#uploadButton').click(function (event) {
    event.preventDefault();
    var form = $('#uploadForm')[0];
    var data = new FormData(form);
    $.ajax({
      type: "post",
      enctype: 'multipart/form-data',
      url: "upload",
      data: data,
      processData: false,
      contentType: false,
      cache: false,
      success: function success(data) {
        $("#alert_msg").text(data);
        var source = "assets/stonks.mp3";
        var audio = document.createElement("audio");
        audio.autoplay = true;
        audio.load();
        audio.addEventListener("load", function () {
          audio.play();
        }, true);
        audio.src = source;
        audio.volume = 0.05;
      },
      error: function error(e) {
        $("#alert_msg").text(e.responseText);
      }
    });
  });
});