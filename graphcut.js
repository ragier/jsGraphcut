class Graphcut {
    constructor(ctx, img) {
      this.ctx = ctx;
      this.img = img.data;
      console.log(ctx);
      console.log(this.img[0]);
      this.gamma = 50;

      this.height = img.height;
      this.width = img.width;
    }

    calcWeights() {
        console.log("calcWeight : ", this.width * this.height);
        var pixels = this.img;
        console.log("pixels", pixels);

        const beta = this.calcBeta();
        console.log("Beta : ", beta);

        const gammaDivSqrt2 = this.gamma / Math.sqrt(2.0);
        this.leftW    = new Float32Array(this.width * this.height);
        this.upleftW  = new Float32Array(this.width * this.height);
        this.upW      = new Float32Array(this.width * this.height);
        this.uprightW = new Float32Array(this.width * this.height);


        for( var y = 0; y < this.width; y++ )
        {
            for( var x = 0; x < this.height; x++ )
            {
                var pr = pixels[(y*this.width + x)*4 + 1];
                var pg = pixels[(y*this.width + x)*4 + 2];
                var pb = pixels[(y*this.width + x)*4 + 0];
                if( x-1>=0 ) // left
                {
                    var idx = (y*this.width + x-1)*4;
                    var sr = pixels[idx + 1] - pr;
                    var sg = pixels[idx + 2] - pg;
                    var sb = pixels[idx + 0] - pb;
                    
                    this.leftW[y*this.width+x] = this.gamma * Math.exp( -beta*(sr*sr + sg*sg + sb*sb) );
                }

                if( x-1>=0 && y-1>=0 ) // upleft
                {
                    var idx = ((y-1)*this.width + x-1)*4;
                    var sr = pixels[idx + 1] - pr;
                    var sg = pixels[idx + 2] - pg;
                    var sb = pixels[idx + 0] - pb;
                    
                    this.upleftW[y*this.width+x] = gammaDivSqrt2 * Math.exp( -beta*(sr*sr + sg*sg + sb*sb) );
                }
                
                if( y-1>=0 ) // up
                {
                    var idx = ((y-1)*this.width + x)*4;
                    var sr = pixels[idx + 1] - pr;
                    var sg = pixels[idx + 2] - pg;
                    var sb = pixels[idx + 0] - pb;
                    
                    this.upW[y*this.width+x] = this.gamma * Math.exp( -beta*(sr*sr + sg*sg + sb*sb) );
                }
                
                if( x+1<this.width && y-1>=0 ) // upright
                {
                    var idx = ((y-1)*this.width + x+1 )*4;
                    var sr = pixels[idx + 1] - pr;
                    var sg = pixels[idx + 2] - pg;
                    var sb = pixels[idx + 0] - pb;
                    
                    this.uprightW[y*this.width+x] = gammaDivSqrt2 * Math.exp( -beta*(sr*sr + sg*sg + sb*sb) );
                }
            }
        }

    }

    calcBeta()
    {
        var pixels = this.img;
        console.log(pixels);
        var beta = 0;
        for( var y = 0; y < this.width; y++ )
        {
            for( var x = 0; x < this.height; x++ )
            {
                var pr = pixels[(y*this.width + x)*4 + 1];
                var pg = pixels[(y*this.width + x)*4 + 2];
                var pb = pixels[(y*this.width + x)*4 + 0];

                
                if( x-1>=0 ) // left
                {
                    var idx = (y*this.width + x-1)*4;
                    var sr = pixels[idx + 1] - pr;
                    var sg = pixels[idx + 2] - pg;
                    var sb = pixels[idx + 0] - pb;
                    
                    beta += (sr*sr + sg*sg + sb*sb);
                }

                if( x-1>=0 && y-1>=0 ) // upleft
                {
                    var idx = ((y-1)*this.width + x-1)*4;
                    var sr = pixels[idx + 1] - pr;
                    var sg = pixels[idx + 2] - pg;
                    var sb = pixels[idx + 0] - pb;
                    
                    beta += (sr*sr + sg*sg + sb*sb);
                }
                
                if( y-1>=0 ) // up
                {
                    var idx = ((y-1)*this.width + x)*4;
                    var sr = pixels[idx + 1] - pr;
                    var sg = pixels[idx + 2] - pg;
                    var sb = pixels[idx + 0] - pb;
                    
                    beta += (sr*sr + sg*sg + sb*sb);
                }
                
                if( x+1<this.width && y-1>=0 ) // upright
                {
                    var idx = ((y-1)*this.width + x+1 )*4;
                    var sr = pixels[idx + 1] - pr;
                    var sg = pixels[idx + 2] - pg;
                    var sb = pixels[idx + 0] - pb;
                    
                    beta += (sr*sr + sg*sg + sb*sb);
                }
            }
        }

        beta = 1.0 / (2 * beta/(4*this.width*this.height - 3*this.width - 3*this.height + 2) );

        return beta;
    }

    drawWeights() {
        var id = this.ctx.createImageData(this.width, this.height); // only do this once per page
        var d  = id.data;                        // only do this once per page

        for( var y = 0; y < this.width; y++ )
        {
            for( var x = 0; x < this.height; x++ )
            {
                var idx = (y*this.width + x);

                d[idx*4]     = this.uprightW[idx];
                d[idx*4+1]   = this.uprightW[idx];
                d[idx*4+2]   = this.uprightW[idx];
                d[idx*4+3]   = 255;
            }
        }
        this.ctx.putImageData( id, 0, 0 );     
    }



    drawMask()
    {
        var id = this.ctx.createImageData(this.width, this.height); // only do this once per page
        var d  = id.data;                        // only do this once per page

        for( var y = 0; y < this.height; y++ )
        {
            for( var x = 0; x < this.width; x++ )
            {
                var idx = (y*this.width + x);
                if( this.graph.inSourceSegment( idx ) ) {
                    d[idx*4]     = 255;
                    d[idx*4+1]   = 0;
                    d[idx*4+2]   = 0;
                    d[idx*4+3]   = 96;
                }
                else
                {
                    d[idx*4]     = 0;
                    d[idx*4+1]   = 0;
                    d[idx*4+2]   = 0;
                    d[idx*4+3]   = 0;
                }
            }
        }
        this.ctx.putImageData( id, 0, 0 );     

    }


    constructGraph() {

        this.graph = new GCGraph();

        var lambda = this.gamma*9;

        var imgData = this.ctx.getImageData(0, 0, this.width, this.height);
        var mask = imgData.data;
        console.log("mask : ", mask);
        for( var y = 0; y < this.height; y++ )
        {
            for( var x = 0; x < this.width; x++)
            {
                // add node
                var vtxIdx = this.graph.addVtx();

                var idx= y*this.width+x;
                
                //var proba = this.mask[idx*4] / 255.0;

                // set t-weights from proba map
                var fromSource = 100;
                var toSink     = 100;

                //red for source = foreground
                if (mask[idx*4] >0) {
                    fromSource = lambda;
                    toSink = 0;
                } //background
                else if (mask[idx*4+1] >0) {
                    fromSource = 0;
                    toSink = lambda;
                }



                this.graph.addTermWeights( vtxIdx, fromSource, toSink );

                // set n-weights
                if( x>0 )
                {
                    var w = this.leftW[idx];
                    this.graph.addEdges( vtxIdx, vtxIdx-1, w, w );
                }
                if( x>0 && y>0 )
                {
                    var w = this.upleftW[idx];
                    this.graph.addEdges( vtxIdx, vtxIdx-this.width-1, w, w );
                }
                if( y>0 )
                {
                    var w = this.upW[idx];
                    this.graph.addEdges( vtxIdx, vtxIdx-this.width, w, w );
                }
                if( x<this.width-1 && y>0 )
                {
                    var w = this.uprightW[idx];
                    this.graph.addEdges( vtxIdx, vtxIdx-this.width+1, w, w );
                }
            }
        }
    }

    segment() {
        console.log("construct graph");
        this.constructGraph();

        //return;
        console.log("maxFlow");
        console.log("init flow", this.graph.flow);
        console.log( this.graph.maxFlow() );
        this.drawMask();
    }
}