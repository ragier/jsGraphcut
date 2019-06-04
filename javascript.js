var mousePressed = false;
var lastX, lastY;
var ctx;
window.onload = InitThis;

var canvas;
var canvasDiv;
var canvasImg;
var color = "red";
var eraser = false;
var ratio;

var worker;
var workerBusy = false;
//var graphcut;

var factor = 1;
var lineWidth = 7;
var radius = 15;

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
    
    ratio = 650/canvasImg.naturalWidth;

    canvas.width = canvasImg.naturalWidth;
    canvas.height = canvasImg.naturalHeight;

    canvas.style.width = canvasImg.naturalWidth*factor*ratio + "px";
    canvas.style.height = canvasImg.naturalHeight*factor*ratio + "px";

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
            case "segmented" : 
                console.log("[worker] segmented")
                var mask = e.data[1];
                ctx.putImageData( mask, 0, 0 );
                workerBusy = false;
            break;
        }
      }
    //}

    getRemoteImageData("mask.jpg", function (prior) {
        console.log(prior);
        worker.postMessage(["init", imgData, prior]);
    });
    


    ///graphcut.drawWeights();

    canvasImg.style.width  = canvasImg.naturalWidth*factor*ratio + "px";
    canvasImg.style.height = canvasImg.naturalHeight*factor*ratio + "px";

    canvasDiv.style.width  = 650 + 10 + "px";
    canvasDiv.style.height = canvasImg.naturalHeight*ratio + "px";

    //Body pour cette page = Fenêtre modale pour les plugins
    document.body.style.width  = 650 * 1.5 + 10 + "px";
    document.body.style.height = canvasImg.naturalHeight*ratio * 1.5 + 10 + "px";
    
    $('#cursor').css("width",lineWidth*factor*ratio);
    $('#cursor').css("height",lineWidth*factor*ratio);
    $('#cursor').css("border-radius",lineWidth*factor*ratio);
    
    $('#canvas').mousedown(function (e) {
        mousePressed = true;
        lastX =  e.pageX - $(this).offset().left;
        lastY = e.pageY - $(this).offset().top;
        Draw(e.pageX - $(this).offset().left, e.pageY - $(this).offset().top, false);
    });
    
    $('#canvas').mousemove(function (e) {
        if (mousePressed) {
            Draw(e.pageX - $(this).offset().left, e.pageY - $(this).offset().top, true);
        }
        if(!eraser){
            $('#cursor').css("left",e.pageX - $(this).offset().left - factor*ratio*lineWidth/2);
            $('#cursor').css("top",e.pageY - $(this).offset().top - factor*ratio*lineWidth/2);
        } else {
            $('#cursor').css("left",e.pageX - $(this).offset().left - factor*ratio*radius*1.35);
            $('#cursor').css("top",e.pageY - $(this).offset().top - factor*ratio*radius*1.35);
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

        $('#cursor').css("border-color",color);
        $('#cursor').css("width",lineWidth*factor*ratio);
        $('#cursor').css("height",lineWidth*factor*ratio);
        $('#cursor').css("border-radius",lineWidth*factor*ratio);
    });

    $(".zoom-button").click(function(){
        switch($(this).attr("id")){
            case "zoom1" :
                updateZoom(1);
                break;
            case "zoom2" :
                updateZoom(1.5);
                break;
            case "zoom3" :
                updateZoom(2);
                break;
        }
    });

    $("#size-select label").click(function(){
        switch($(this).attr("id")){
            case "size1" : 
                lineWidth = 3;
                radius = 10;
                break;
            case "size2" : 
                lineWidth = 7;
                radius = 15;
                break;
            case "size3" :
                lineWidth = 11;
                radius = 20;
                break;
        }
        updateCursorSize();
    });

    $("#eraser").click(function(){
        eraser=true;
        ctx.globalCompositeOperation = "destination-out";
        
        $('#cursor').css("border-style","dashed");
        $('#cursor').css("width",radius*2.7*factor*ratio);
        $('#cursor').css("height",radius*2.7*factor*ratio);
        $('#cursor').css("border-radius",radius*2.7*factor*ratio);
    })

    $("#submit").click(function(){
        //graphcut.segment();
        if (workerBusy) {
            console.log("Worker already busy");
            return;
        }
        workerBusy = true;
        img = document.getElementById("canvasimg");
        var mask = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
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
    if (isDown && !eraser) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = "round";
        ctx.moveTo(lastX/(factor*ratio), lastY/(factor*ratio));
        ctx.lineTo(x/(factor*ratio), y/(factor*ratio));
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
                ctx.arc(interX/(factor*ratio),interY/(factor*ratio),radius,0,Math.PI*2);
                ctx.fill();
                ctx.stroke();
            }
        }
        ctx.beginPath();
        ctx.lineWidth = lineWidth;
        ctx.arc(x/(factor*ratio),y/(factor*ratio),radius,0,Math.PI*2);
        ctx.fill();
        ctx.stroke();
    }
    lastX = x; lastY = y;
}

function updateZoom(newFactor) {
    if(newFactor <=1)
    {
        $('#canvasdiv').css("overflow","hidden");
    } else {
        $('#canvasdiv').css("overflow","auto");
    }
    factor = newFactor;

    canvasImg.style.width  = canvasImg.naturalWidth*newFactor*ratio + "px";
    canvasImg.style.height = canvasImg.naturalHeight*newFactor*ratio + "px";
    
    canvas.style.width = canvasImg.naturalWidth*newFactor*ratio + "px";
    canvas.style.height = canvasImg.naturalHeight*newFactor*ratio + "px";

    updateCursorSize();
}

function updateCursorSize(){
    if(!eraser) {
        $('#cursor').css("width",lineWidth*factor*ratio);
        $('#cursor').css("height",lineWidth*factor*ratio);
        $('#cursor').css("border-radius",lineWidth*factor*ratio);
    } else{
        $('#cursor').css("width",radius*2.7*factor*ratio);
        $('#cursor').css("height",radius*2.7*factor*ratio);
        $('#cursor').css("border-radius",radius*2.7*factor*ratio);
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
