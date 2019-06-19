"use strict";

function Graphcut(img, imgPreview, apiKey, callback, options) {
    options = options || {};
    this.img = img;
    this.imgPreview = imgPreview;
    this.apiKey = apiKey;
    this.callback = callback;

    this.hash = options.hash;

    this.zoom = 1;
    this.color = "red";
    this.erase = false;
    this.radius = 11;
    this.lineWidth = 11;
    //this.hasDrawn = false;

    this.ready = false;

    this.timeout = undefined;

    this.state = "modal";

    this.mask;

    this.pLength = options.pLength || 400;

    this.loadingImgPath = options.loadingImgPath || "loading.gif";
    this.modalTpl = options.modalTpl || "graphcutModal.html";
    this.workerJS = options.workerJS || "worker.js";
    this.preset = options.preset || "default";
    
    if(!img.complete || !imgPreview.complete || img.naturalHeight === 0 || imgPreview.naturalHeight === 0) {
        //Erreur de chargement des images
        console.log(img, imgPreview);
        debugger;
        this.terminateGraphcut();        
    }
    
    try {
        this.worker = new Worker(this.workerJS);
    } catch (exception){
        console.log("Coud not create worker "+this.workerJS+" Exception : "+exception);
        this.terminateGraphcut();
    }

    var xhr = new XMLHttpRequest();
    var formData = new FormData();
    xhr.open('GET', this.modalTpl, true);
    var that = this;
    xhr.onload = function(e) {
        if (this.status == 200) {
        $(document.body).append(xhr.response);
        $("#whiteshop-modal").modal();
        $("#whiteshop-loading-image").attr("src",that.loadingImgPath);
        $('#whiteshop-modal').on('hidden.bs.modal', function (e) {
            $("#whiteshop-modal").remove();
            if (typeof that.callback == "function") {
                that.callback(that.valid?that.jobId:undefined);
            }
        })
        
        that.init();
        } else {
            console.log("Failed to open "+that.modalTpl+" Status : "+this.status);
            that.terminateGraphcut();
        }
    };
    
    xhr.send(formData);

}


Graphcut.prototype.init = function () {


    this.canvasImg = document.getElementById("whiteshop-canvasimg");
    this.canvasImg.src = this.img.src;
    this.previewImg = document.getElementById("whiteshop-preview-img");
    this.previewImg.src = this.imgPreview.src;

    this.canvasDiv = document.getElementById("whiteshop-canvasdiv");
    this.canvas = document.getElementById('whiteshop-canvas');
    this.ctx = this.canvas.getContext("2d");
    var lastX, lastY;

        
    var aspectRatio = this.img.naturalHeight / this.img.naturalWidth;
    this.pLength = Math.min(this.pLength, this.img.naturalHeight, this.img.naturalWidth)
    this.pSize = [this.pLength, this.pLength * aspectRatio];
    this.ratio = 650/this.img.naturalWidth;

    this.canvas.width  = this.pSize[0];
    this.canvas.height = this.pSize[1];
    this.canvas.style.width  = this.img.naturalWidth *  this.zoom*this.ratio + "px";
    this.canvas.style.height = this.img.naturalHeight * this.zoom*this.ratio + "px";

    this.imgData = this.getImageData(this.img);

    this.workerBusy = true;

    this.hasDrawn = false;


    this.worker.onmessage = function(e) {
        var action = e.data[0];

        //Disable run buttons until new modifications

        switch(action){
            case "initialized" : 
                console.log("[worker] initialized")
                that.workerBusy = false;
            break;
                case "exported" : 
                var tmpCanvas = document.createElement("canvas");
                console.log(e.data[1]);
                tmpCanvas.width = e.data[1].width;
                tmpCanvas.height = e.data[1].height;
                tmpCanvas.getContext('2d').putImageData( e.data[1], 0, 0 );
                console.log(tmpCanvas);
                tmpCanvas.toBlob(function (blob) {
                    console.log(blob);
                    that.sendMat.bind(that)(blob);
                });
                
            break;
            case "segmented" : 

                console.log("[worker] segmented");
                var mask = e.data[1];
                that.ctx.putImageData( mask, 0, 0 );
                that.workerBusy = false;
                that.ready = true;
                console.log("gcgraph ready!");
                $("#whiteshop-previewchanges").attr("disabled",false);

                if (that.hasDrawn) $("#whiteshop-button-valid").attr("disabled",false);
                
                $("#whiteshop-dropdown button").attr("disabled",false);
                $("#whiteshop-modal").css("cursor","");
                

                if (that.state == "waitEdit") that.showEdit();

            break;
        }
    }
    //}

    /*
    getRemoteImageData("mask.jpg", function (prior) {
        console.log(prior);
    });
    */
   var that = this;
   function next(img) {
        var formData = new FormData();
        formData.append("synchrone","true");
        formData.append("task", "mask");
        formData.append("image", img);
        formData.append("preset", that.preset);
        var xhr = new XMLHttpRequest();
        xhr.open('POST', "http://137.74.115.158/api/jobs", true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function(e) {
            if (this.status == 200) {
                var blob = this.response;
                var str = btoa(String.fromCharCode.apply(null, new Uint8Array(blob)));
                
                var prior = new Image();

                prior.onload = function () {
                    var data = that.getImageData(prior);
                    console.log(data);
                    that.worker.postMessage(["init",  that.imgData, data]);
                };

                prior.src = "data:image/jpg;base64,"+str;
                var headers = xhr.getAllResponseHeaders();
                console.log(headers);

                // Convert the header string into an array
                // of individual headers
                var arr = headers.trim().split(/[\r\n]+/);
            
                // Create a map of header names to values
                var headerMap = {};
                arr.forEach(function (line) {
                    var parts = line.split(': ');
                    var header = parts.shift();
                    var value = parts.join(': ');
                    headerMap[header] = value;
                });
                console.log("update hash! ", headerMap["x-api-img-id"]);
                that.hash = that.hash  || headerMap["x-api-img-id"];


            } else {
                console.log("prior, xhr api/jobs status : ",this.status);
                console.log("xhr progressEvent : ",e);
                that.terminateGraphcut();
            }
        };

        xhr.setRequestHeader ("Authorization", "Api-Key " + that.apiKey);
        xhr.send(formData);
   }

    if (this.hash) {
        next(this.hash);
    } else {
        this.getBlob(this.img, next);
    }

    
    this.canvasImg.style.width  = this.img.naturalWidth*this.zoom*this.ratio + "px";
    this.canvasImg.style.height = this.img.naturalHeight*this.zoom*this.ratio + "px";

    this.canvasImg.style.width  = this.img.naturalWidth*this.zoom*this.ratio + "px";
    this.canvasImg.style.height = this.img.naturalHeight*this.zoom*this.ratio + "px";

    this.previewImg.style.width  = this.img.naturalWidth*this.zoom*this.ratio + "px";
    this.previewImg.style.height = this.img.naturalHeight*this.zoom*this.ratio + "px";

    this.canvasDiv.style.width  = 650 + "px";
    this.canvasDiv.style.height = this.img.naturalHeight*this.ratio + "px";
    
    $('#whiteshop-cursor').css("width", this.lineWidth*this.zoom*this.ratio);
    $('#whiteshop-cursor').css("height",this.lineWidth*this.zoom*this.ratio);
    $('#whiteshop-cursor').css("border-radius",this.lineWidth*this.zoom*this.ratio);
    
    $("#whiteshop-button-valid").attr("disabled","disabled");


    function draw(x, y, isAlreadyDown) {
        var sx = that.canvas.width/parseInt(that.canvas.style.width);
        var sy = that.canvas.height/parseInt(that.canvas.style.height);

        if (!isAlreadyDown) {
            lastX = x-.01; lastY = y-.01;
        }


        if (!that.eraser) {
            that.ctx.beginPath();
            that.ctx.strokeStyle = that.color;
            that.ctx.lineWidth = that.lineWidth;
            that.ctx.lineJoin = "round";
            that.ctx.moveTo(lastX*sx, lastY*sy);
            that.ctx.lineTo(x*sx, y*sy);
            that.ctx.closePath();
            that.ctx.stroke();
        } else if (that.eraser) {
            if(Math.abs(x-lastX) + Math.abs(y-lastY) > that.radius){
                var interX = lastX;
                var interY = lastY;
                var vectorX = x - lastX;
                var vectorY = y - lastY;
                var percent = (that.radius/4)/(Math.abs(x-lastX) + Math.abs(y-lastY));
                while(Math.abs(x-interX) + Math.abs(y-interY) > that.radius)
                {
                    interX += vectorX * percent ;
                    interY += vectorY * percent ;
                    that.ctx.beginPath();
                    that.ctx.lineWidth = that.lineWidth;
                    that.ctx.arc(interX*sx,interY*sy,that.radius,0,Math.PI*2);
                    that.ctx.fill();
                    that.ctx.stroke();
                }
            }

            that.ctx.beginPath();
            that.ctx.lineWidth = that.lineWidth;
            that.ctx.arc(x*sx,y*sy,that.radius,0,Math.PI*2);
            that.ctx.fill();
            that.ctx.stroke();
        }

        lastX = x; lastY = y;
    }


    var mousePressed = false;
    $(this.canvas).mousedown(function (e) {
        window.clearTimeout(that.timeout);
        if (that.workerBusy) return;


        mousePressed = true;
        lastX =  e.pageX - $(this).offset().left;
        lastY = e.pageY - $(this).offset().top;
        draw(e.pageX - $(this).offset().left, e.pageY - $(this).offset().top, false);
        if(!that.hasDrawn) {
            that.hasDrawn = true;
        }
    });
    
    $(this.canvas).mousemove(function (e) {
        if (!that.workerBusy) {
            $('#whiteshop-cursor').show();
            $("#whiteshop-canvas").css("cursor", "none");
        }
        var sx = that.canvas.width/parseInt(that.canvas.style.width);
        if (mousePressed) {
            draw(e.pageX - $(this).offset().left, e.pageY - $(this).offset().top, true);
        }
        if(!that.eraser){
            $('#whiteshop-cursor').css("left",e.pageX - $(this).offset().left - that.lineWidth*that.zoom/1.35);
            $('#whiteshop-cursor').css("top",e.pageY - $(this).offset().top - that.lineWidth*that.zoom/1.35);
        } else {
            $('#whiteshop-cursor').css("left",e.pageX - $(this).offset().left - that.radius*1.35/sx);
            $('#whiteshop-cursor').css("top",e.pageY - $(this).offset().top - that.radius*1.35/sx);
        }
    });

    $(this.canvas).mouseup(function (e) {
        mousePressed = false;
        lastX = null;
        lastY = null;

        if ($("#whiteshop-auto").prop("checked") == true) {
            that.timeout = window.setTimeout(function () {
                $("#whiteshop-run").click();
            }, 1000);
        }
    });
    
    $(this.canvas).mouseleave(function (e) {
        mousePressed = false;
        $('#whiteshop-cursor').hide();
    });

    $(this.canvas).mouseenter(function (e) {
        if (!that.workerBusy) {
            $('#whiteshop-cursor').show();
            $("#whiteshop-canvas").css("cursor", "none");
        }
    });

    $(".whiteshop-color-button").click(function(){
        that.ctx.globalCompositeOperation = "source-over";
        $('#cursor').css("border-style","solid");
        that.eraser = false;
        switch($(this).attr("id")){
            case "whiteshop-background" :
            $('#whiteshop-cursor').css("border-style","solid"); 
            that.color = "red";
                break;
            case "whiteshop-foreground" :
            $('#whiteshop-cursor').css("border-style","solid");
            that.color = "green";
                break;
            case "whiteshop-eraser" :
            $('#whiteshop-cursor').css("border-style","dashed");
            that.color = "white";
                break;
        }

        $('#whiteshop-cursor').css("border-color",that.color);
        that.updateCursorSize();
    });

    $(".whiteshop-zoom-button").click(function(){
        switch($(this).attr("id")){
            case "whiteshop-zoom1" :
            that.updateZoom.bind(that)(1);
                break;
            case "whiteshop-zoom2" :
            that.updateZoom.bind(that)(2);
                break;
            case "whiteshop-zoom3" :
            that.updateZoom.bind(that)(4);
                break;
        }
    });

    $("#whiteshop-size-select label").click(function(){
        switch($(this).attr("id")){
            case "whiteshop-size1" : 
            that.lineWidth = 5;
            that.radius = 5;
                break;
            case "whiteshop-size2" : 
            that.lineWidth = 15;
            that.radius = 15;
                break;
            case "whiteshop-size3" :
            that.lineWidth = 45;
            that.radius = 45;
                break;
        }
        that.updateCursorSize();
    });

    $("#whiteshop-eraser").click(function(){
        that.eraser=true;
        that.ctx.globalCompositeOperation = "destination-out";
        
        var sx = that.canvas.width/parseInt(that.canvas.style.width);
        var sy = that.canvas.height/parseInt(that.canvas.style.height);
        $('#whiteshop-cursor').css("border-color","white");
        that.updateCursorSize();
    });

    $("#whiteshop-run").click(this.segment.bind(this));
    $("#whiteshop-edit").click(this.edit.bind(this));
    $("#whiteshop-previewchanges").click(this.preview.bind(this));

    $("#whiteshop-button-cancel").click(function(){
        $("[data-dismiss=modal]").trigger({ type: "click" });
    });

    $("#whiteshop-button-valid").click(function(){
        if ($("#whiteshop-canvasdiv:visible").length) {
            $("#whiteshop-previewchanges").click();
        }
        else {
            that.valid = true;
            $("[data-dismiss=modal]").trigger({ type: "click" });
            //$("#whiteshop-modal").modal('hide');
        }


    });
}

Graphcut.prototype.segment = function () {
    //Disable buttons while processing
    $("#whiteshop-dropdown button").attr("disabled","disabled");
    $("#whiteshop-previewchanges").attr("disabled","disabled");
    $("#whiteshop-button-valid").attr("disabled","disabled");
    $("#whiteshop-modal").css("cursor","progress");
    
    $("#whiteshop-canvas").css("cursor", "progress");
    $('#whiteshop-cursor').hide();
    
    if (this.workerBusy) {
        console.log("Worker already busy");
        return;
    }
    this.workerBusy = true;
    var mask = this.ctx.getImageData(0, 0, this.pSize[0], this.pSize[1]);
    this.worker.postMessage(["segment", mask]);
}

Graphcut.prototype.preview = function () {
    this.state = "waitPreview";
    $("#whiteshop-canvasdiv").hide();
    $("#whiteshop-previewchanges").hide();
    $("#whiteshop-dropdown").hide();
    $("#whiteshop-buttons-bottom-left").hide();
    $("#whiteshop-size-select").hide();
    $("#whiteshop-buttons-top-right").hide();
    $("#whiteshop-canvas").hide();
    
    $("#whiteshop-loading").show();
    
    this.worker.postMessage(["export"]);
}

Graphcut.prototype.showPreview = function() {
    this.state = "preview";

    $("#whiteshop-edit").show();
    $("#whiteshop-preview-img").show();

    $("#whiteshop-loading").hide();
    
    $("#whiteshop-zoom1").click();

};

Graphcut.prototype.edit = function () {

    $("#whiteshop-loading").show();
    $("#whiteshop-canvasdiv").hide();
    $("#whiteshop-preview-img").hide();


    if (this.ready) {
        this.showEdit();
    }

    $("#whiteshop-modal").css("cursor","progress");

    this.state = "waitEdit";

}

Graphcut.prototype.showEdit = function() {
    $("#whiteshop-canvasdiv").show();
    $("#whiteshop-previewchanges").show();
    $("#whiteshop-dropdown").show();
    $("#whiteshop-buttons-bottom-left").show();
    $("#whiteshop-size-select").show();
    $("#whiteshop-buttons-top-right").show();
    $("#whiteshop-canvas").show();
    $("#whiteshop-buttons-cancelvalidate").show();
    $("#whiteshop-exit-modal").hide();
    $("#whiteshop-edit").hide();
    $("#whiteshop-modal .close").hide();
    $("#whiteshop-preview-img").hide();
    $("#whiteshop-background").click();
    $("#whiteshop-loading").hide();

    this.state = "edit";

}


Graphcut.prototype.getImageData = function (img) {
    var tmpCanvas = document.createElement("canvas");

    tmpCanvas.width  = this.pSize[0];
    tmpCanvas.height = this.pSize[1];

    var tmpCtx = tmpCanvas.getContext("2d");
    tmpCtx.drawImage(img, 0, 0, this.pSize[0], this.pSize[1]);

    var imgData = tmpCtx.getImageData(0, 0, this.pSize[0], this.pSize[1]);
    return imgData;
}
/*
Graphcut.prototype.getRemoteImageData = function(url, cb) {
    var img = new Image();
    img.onload = function(){
        var data = getImageData(img);
        cb(data);
    };

    img.src= url;
}*/


Graphcut.prototype.updateZoom = function(newzoom) {
    console.log(this)
    if(newzoom <=1)
    {
        $(this.canvasDiv).css("overflow","hidden");
    } else {
        $(this.canvasDiv).css("overflow","auto");
    }
    this.zoom = newzoom;

    this.canvasImg.style.width  = this.canvasImg.naturalWidth*newzoom*this.ratio + "px";
    this.canvasImg.style.height = this.canvasImg.naturalHeight*newzoom*this.ratio + "px";
    
    this.canvas.style.width = this.canvasImg.naturalWidth*newzoom*this.ratio + "px";
    this.canvas.style.height = this.canvasImg.naturalHeight*newzoom*this.ratio + "px";

    this.updateCursorSize();
}

Graphcut.prototype.updateCursorSize = function(){
    var sx = this.canvas.width/parseInt(this.canvas.style.width);
    if(!this.eraser) {
        $('#whiteshop-cursor').css("width",this.lineWidth/sx);
        $('#whiteshop-cursor').css("height",this.lineWidth/sx);
        $('#whiteshop-cursor').css("border-radius",this.lineWidth/sx);
    } else{
        $('#whiteshop-cursor').css("width",this.radius*2.7/sx);
        $('#whiteshop-cursor').css("height",this.radius*2.7/sx);
        $('#whiteshop-cursor').css("border-radius",this.radius*2.7/sx);
    }
}

Graphcut.prototype.clearArea = function() {
    // Use the identity matrix while clearing the canvas
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
}

function _arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}

Graphcut.prototype.sendMat = function(maskBlob, cb) {
    var that = this;
    function next(img) {
        var formData = new FormData();
        formData.append("synchrone","true");
        formData.append("task", "matting");
        formData.append("image", that.hash);
        formData.append("preset", that.preset);
        formData.append("mask", maskBlob);
        var xhr = new XMLHttpRequest();
        xhr.open('POST', "http://137.74.115.158/api/jobs", true);
        xhr.responseType = 'arraybuffer';

        xhr.onload = function(e) {
            if (this.status == 200) {
            var blob = this.response;
            var str = _arrayBufferToBase64(blob);
            console.log(xhr.getAllResponseHeaders());
            document.getElementById("whiteshop-preview-img").src = "data:image/jpg;base64,"+str;
            // Get the raw header string
            var headers = xhr.getAllResponseHeaders();

            // Convert the header string into an array
            // of individual headers
            var arr = headers.trim().split(/[\r\n]+/);
        
            // Create a map of header names to values
            var headerMap = {};
            arr.forEach(function (line) {
                var parts = line.split(': ');
                var header = parts.shift();
                var value = parts.join(': ');
                headerMap[header] = value;
            });

            that.jobId = headerMap["x-api-job-id"];

            if (that.state == "waitPreview") that.showPreview();


            } else {
                console.log("sendMat, xhr api/jobs status : ",this.status);
                console.log("xhr progressEvent : ",e);
                that.terminateGraphcut();
            }
        };

        xhr.setRequestHeader ("Authorization", "Api-Key " + that.apiKey);
        xhr.send(formData);
    }
    console.log("this.hash", this.hash);
    if (this.hash) {
        next(this.hash);
    } else {
        this.getBlob(this.img, next);
    }
}


Graphcut.prototype.getBlob = function(img, cb) {
    var request = new XMLHttpRequest();
    request.responseType = "blob";
    request.addEventListener("load", function(evt) {
        cb(evt.target.response);
    });
    request.open("GET", $(img).attr("src"), true);
    request.send();
}


Graphcut.prototype.terminateGraphcut = function (){
    console.warn("terminateGraphcut");
    $("[data-dismiss=modal]").trigger({ type: "click" });
    if(this.worker != undefined)
    {
        this.worker.terminate();
    }
}

  