var mousePressed = false;
var lastX, lastY;
var ctx;
window.onload = InitThis;

var canvas;
var canvasDiv;
var canvasImg;
var color = "red";
var eraser = false;
var ratio; //responsive ratio

var worker;
var workerBusy = false;
//var graphcut;

var zoom = 1; //zoom factor
var lineWidth = 7;
var radius = 15;

var pLength = 400;
var pSize = [undefined, undefined];

function getImageData(img) {
    var tmpCanvas = document.createElement("canvas");

    tmpCanvas.width  = pSize[0];
    tmpCanvas.height = pSize[1];

    var tmpCtx = tmpCanvas.getContext("2d");
    tmpCtx.drawImage(img, 0, 0, pSize[0], pSize[1]);

    var imgData = tmpCtx.getImageData(0, 0, pSize[0], pSize[1]);
    console.log(imgData);
    return imgData ;
}

function getRemoteImageData(url, cb) {
    var img = new Image();
    img.onload = function(){
        var data = getImageData(img);
        cb(data);
    };

    img.src= url;
}

function InitThis() {
    canvasImg = document.getElementById("canvasimg");
    canvasDiv = document.getElementById("canvasdiv");
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext("2d");
    
    aspectRatio = canvasImg.naturalHeight / canvasImg.naturalWidth;

    pLength = Math.min(pLength, canvasImg.naturalHeight, canvasImg.naturalWidth)
    console.log("pLength", pLength);
    pSize = [pLength, pLength * aspectRatio];

    ratio = 650/canvasImg.naturalWidth;

    console.log("ratio", ratio);

    canvas.width = pSize[0];
    canvas.height = pSize[1];

    canvas.style.width = canvasImg.naturalWidth*zoom*ratio + "px";
    canvas.style.height = canvasImg.naturalHeight*zoom*ratio + "px";

    //canvasImg.onload = function () {
    var imgData = getImageData(canvasImg);
    //graphcut = new Graphcut(ctx, imgData);
    //console.log(canvasImg, imgData.data[0]);
    //graphcut.calcWeights();

    worker = new Worker('graphcut.js');

    worker.onmessage = function(e) {
        var action = e.data[0];

        switch(action){
            case "initialized" : 
                console.log("[worker] initialized")
            break;
            case "exported" : 
            console.log(e.data[1]);
            var tmpCanvas = document.createElement("canvas");
            tmpCanvas.getContext('2d').putImageData( e.data[1], 0, 0 );
            tmpCanvas.toBlob(function (blob) {
                console.log(blob);
            });

            console.log("[worker] exported")
        break;
            case "segmented" : 
                console.log("[worker] segmented")
                var mask = e.data[1];
                ctx.putImageData( mask, 0, 0 );
                workerBusy = false;
                worker.postMessage(["export"]);
            break;
        }
      }
    //}

    getRemoteImageData("mask.jpg", function (prior) {
        console.log(prior);
        worker.postMessage(["init", imgData, prior]);
    });
    


    ///graphcut.drawWeights();

    canvasImg.style.width  = canvasImg.naturalWidth*zoom*ratio + "px";
    canvasImg.style.height = canvasImg.naturalHeight*zoom*ratio + "px";

    canvasDiv.style.width  = 650 + 10 + "px";
    canvasDiv.style.height = canvasImg.naturalHeight*ratio + "px";

    //Body pour cette page = Fenêtre modale pour les plugins
    document.body.style.width  = 650 * 1.5 + 10 + "px";
    document.body.style.height = canvasImg.naturalHeight*ratio * 1.5 + 10 + "px";
    
    $('#cursor').css("width",lineWidth*zoom*ratio);
    $('#cursor').css("height",lineWidth*zoom*ratio);
    $('#cursor').css("border-radius",lineWidth*zoom*ratio);
    
    $('#canvas').mousedown(function (e) {
        mousePressed = true;
        lastX =  e.pageX - $(this).offset().left;
        lastY = e.pageY - $(this).offset().top;
        Draw(e.pageX - $(this).offset().left, e.pageY - $(this).offset().top, false);
    });
    
    $('#canvas').mousemove(function (e) {
        var sx = canvas.width/parseInt(canvas.style.width);
        if (mousePressed) {
            Draw(e.pageX - $(this).offset().left, e.pageY - $(this).offset().top, true);
        }
        if(!eraser){
            $('#cursor').css("left",e.pageX - $(this).offset().left - lineWidth*zoom/1.35);
            $('#cursor').css("top",e.pageY - $(this).offset().top - lineWidth*zoom/1.35);
        } else {
            $('#cursor').css("left",e.pageX - $(this).offset().left - radius*1.35/sx);
            $('#cursor').css("top",e.pageY - $(this).offset().top - radius*1.35/sx);
        }
    });

    $('#canvas').mouseup(function (e) {
        mousePressed = false;
        lastX = null;
        lastY = null;
    });
    
    $('#canvas').mouseleave(function (e) {
        mousePressed = false;
        $('#cursor').hide();
    });

    $('#canvas').mouseenter(function (e) {
        $('#cursor').show();
    });

    $(".color-button").click(function(){
        ctx.globalCompositeOperation = "source-over";
        $('#cursor').css("border-style","solid");
        eraser = false;
        switch($(this).attr("id")){
            case "background" : 
                color = "red";
                break;
            case "foreground" : 
                color = "green";
                break;
            case "eraser" :
                color = "white";
                break;
        }

        var sx = canvas.width/parseInt(canvas.style.width);
        $('#cursor').css("border-color",color);
        updateCursorSize();
    });

    $(".zoom-button").click(function(){
        switch($(this).attr("id")){
            case "zoom1" :
                updateZoom(1);
                break;
            case "zoom2" :
                updateZoom(2);
                break;
            case "zoom3" :
                updateZoom(3);
                break;
        }
    });

    $("#size-select label").click(function(){
        switch($(this).attr("id")){
            case "size1" : 
                lineWidth = 7;
                radius = 7;
                break;
            case "size2" : 
                lineWidth = 11;
                radius = 11;
                break;
            case "size3" :
                lineWidth = 15;
                radius = 15;
                break;
        }
        updateCursorSize();
    });

    $("#eraser").click(function(){
        eraser=true;
        ctx.globalCompositeOperation = "destination-out";
        
        $('#cursor').css("border-style","dashed");
        updateCursorSize();
    })

    $("#submit").click(function(){
        //graphcut.segment();
        if (workerBusy) {
            console.log("Worker already busy");
            return;
        }
        workerBusy = true;
        img = document.getElementById("canvasimg");
        var mask = ctx.getImageData(0, 0, pSize[0], pSize[1]);
        worker.postMessage(["segment", mask]);
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
    var sx = canvas.width/parseInt(canvas.style.width);
    var sy = canvas.height/parseInt(canvas.style.height);
    if (isDown && !eraser) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = "round";
        ctx.moveTo(lastX*sx, lastY*sy);
        ctx.lineTo(x*sx, y*sy);
        ctx.closePath();
        ctx.stroke();
    } else if (eraser) {
        if(Math.abs(x-lastX) + Math.abs(y-lastY) > radius){
            var interX = lastX;
            var interY = lastY;
            var vectorX = x - lastX;
            var vectorY = y - lastY;
            var percent = (radius/4)/(Math.abs(x-lastX) + Math.abs(y-lastY));
            while(Math.abs(x-interX) + Math.abs(y-interY) > radius)
            {
                interX += vectorX * percent ;
                interY += vectorY * percent ;
                ctx.beginPath();
                ctx.lineWidth = lineWidth;
                ctx.arc(interX*sx,interY*sy,radius,0,Math.PI*2);
                ctx.fill();
                ctx.stroke();
            }
        }
        ctx.beginPath();
        ctx.lineWidth = lineWidth;
        ctx.arc(x*sx,y*sy,radius,0,Math.PI*2);
        ctx.fill();
        ctx.stroke();
    }
    lastX = x; lastY = y;
}

function updateZoom(newzoom) {
    if(newzoom <=1)
    {
        $('#canvasdiv').css("overflow","hidden");
    } else {
        $('#canvasdiv').css("overflow","auto");
    }
    zoom = newzoom;

    canvasImg.style.width  = canvasImg.naturalWidth*newzoom*ratio + "px";
    canvasImg.style.height = canvasImg.naturalHeight*newzoom*ratio + "px";
    
    canvas.style.width = canvasImg.naturalWidth*newzoom*ratio + "px";
    canvas.style.height = canvasImg.naturalHeight*newzoom*ratio + "px";

    updateCursorSize();
}

function updateCursorSize(){
    var sx = canvas.width/parseInt(canvas.style.width);
    if(!eraser) {
        $('#cursor').css("width",lineWidth/sx);
        $('#cursor').css("height",lineWidth/sx);
        $('#cursor').css("border-radius",lineWidth/sx);
    } else{
        $('#cursor').css("width",radius*2.7/sx);
        $('#cursor').css("height",radius*2.7/sx);
        $('#cursor').css("border-radius",radius*2.7/sx);
    }
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
