var mousePressed = false;
var lastX, lastY;
var ctx;
window.onload = InitThis;

var canvas;
var canvasDiv;
var canvasImg;
var color;

var graphcut;

var factor = 1;

function getImageData(img) {
    var tmpCanvas = document.createElement("canvas");

    tmpCanvas.width = img.naturalWidth;
    tmpCanvas.height = img.naturalHeight;

    var tmpCtx = tmpCanvas.getContext("2d");
    tmpCtx.drawImage(img, 0, 0);

    var imgData = tmpCtx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
    console.log(imgData);
    return imgData ;

    
}

function InitThis() {
    canvasImg = document.getElementById("canvasimg");
    canvasDiv = document.getElementById("canvasdiv");
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext("2d");


    canvas.width = canvasImg.naturalWidth;
    canvas.height = canvasImg.naturalHeight;

    canvas.style.width = canvasImg.naturalWidth*factor + "px";
    canvas.style.height = canvasImg.naturalHeight*factor + "px";

    //canvasImg.onload = function () {
        var imgData = getImageData(canvasImg);
        graphcut = new Graphcut(ctx, imgData);
        console.log(canvasImg, imgData.data[0]);

        graphcut.calcWeights();
    //}


    ///graphcut.drawWeights();

    canvasImg.style.width  = canvasImg.naturalWidth*factor + "px";
    canvasImg.style.height = canvasImg.naturalHeight*factor + "px";

    canvasDiv.style.width  = canvasImg.naturalWidth*factor + 10 + "px";
    canvasDiv.style.height = canvasImg.naturalHeight*factor + 10 + "px";
    

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
        graphcut.segment();
        /*
        canvas.toBlob(function(blob){
            
            var newImg = document.createElement('img');
            var url = URL.createObjectURL(blob);
            newImg.src = url;
            
            document.body.appendChild(newImg);
            
           
            console.log(blob);
        });
        */
    })

}

function Draw(x, y, isDown) {
    if (isDown) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = $('#selWidth').val();
        ctx.lineJoin = "round";
        ctx.moveTo(lastX/factor, lastY/factor);
        ctx.lineTo(x/factor, y/factor);
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
/*
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

  */