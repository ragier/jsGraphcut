var mousePressed = false;
var lastX, lastY;
var ctx;
window.onload = InitThis;

var canvas;
var canvasDiv;
var canvasImg;
var color;

function InitThis() {
    canvasImg = document.getElementById("canvasimg");
    canvasDiv = document.getElementById("canvasdiv");
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext("2d");
    canvas.width = canvasImg.clientWidth;
    canvas.height = canvasImg.clientHeight;
    
    canvasDiv.style.width = 500 + 10 + "px";
    canvasDiv.style.height = canvas.height + 10 + "px";
    

    $('#canvas').mousedown(function (e) {
        mousePressed = true;
        Draw(e.pageX - $(this).offset().left, e.pageY - $(this).offset().top, false);
    });

    $('#canvas').mousemove(function (e) {
        if (mousePressed) {
            Draw(e.pageX - $(this).offset().left, e.pageY - $(this).offset().top, true);
        }
    });

    $('#canvas').mouseup(function (e) {
        mousePressed = false;
    });
    
    $('#canvas').mouseleave(function (e) {
        mousePressed = false;
    });

    $(".canvas-button").click(function(){
        switch($(this).attr("id")){
            case "color1" : 
                color = "black";
                break;
            case "color2" : 
                color = "red";
                break;
            case "color3" :
                color = "green";
                break;
            case "color4" :
                color = "blue";
                break;
        }
    });

    $("#submit").click(function(){
        canvas.toBlob(function(blob){
            /*
            var newImg = document.createElement('img');
            var url = URL.createObjectURL(blob);
            newImg.src = url;
            
            document.body.appendChild(newImg);
            */
           
            console.log(blob);
        });
    })

}

function Draw(x, y, isDown) {
    if (isDown) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = $('#selWidth').val();
        ctx.lineJoin = "round";
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.stroke();
    }
    lastX = x; lastY = y;
}
	
function clearArea() {
    // Use the identity matrix while clearing the canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

$.ajax({
    url: "http://137.74.115.158/api/presets",
    type: "GET",
    crossDomain: true,
    data: {},
    beforeSend: function (xhr) {
        xhr.setRequestHeader ("Authorization", "Api-Key " + "06314cf8-1993-42d7-8a88-88df63be6eae");
    },
    success: function (response) {
      console.log("Réponse API : ", response);
    },
    complete: function(e)
    {
        console.log(e);
    }
  });