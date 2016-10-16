GRD = {}

var createPolygons = function (numLayers) {
    var poly = [];
    var vec = [];
    var lay = getLayersFromGrid(this.data, numLayers);
    for (var i = 0; i < lay.length; i++) {
        vec.push(getVectorsFromLayer(lay[i]));
    }
    for (var j = 0; j < lay.length; j++) {
        poly.push(getRingsFromVectors(vec[j]));
    }
    for (var p = 0; p < lay.length; p++) {
        poly[p] = pixelToGeo(poly[p], this.data.length, this.data[0].length);
    }
    return poly;
}

//floodfill algorithm
var getLayersFromGrid = function(grid, numLayers) {
    var checked = [];
    var layers = [];
    var x;
    var y;
    var min = -999;
    var max = -999;
    for (x = 0; x < grid.length; x++) {
        for (y = 0; y < grid[x].length; y++) {
            if (checked[x] == undefined) checked[x] = [];
            checked[x][y] = grid[x][y] === -999;
            if (grid[x][y] !== -999) {
                if (min === -999) {
                    min = grid[x][y];
                    max = grid[x][y];
                }
                if (grid[x][y] < min)
                    min = grid[x][y];
                if (grid[x][y] > max)
                    max = grid[x][y];
            }
        }
    }
    var amountPerLayer = (max - min) / numLayers;

    var floodfill = function (x, y, minVal, maxVal) {
        var layer = [];
        var queue = [];
        queue.push([x, y]);
        while (queue.length > 0) {
            var cur = queue.shift();
            var cx = cur[0];
            var cy = cur[1];
            if (checked[cx][cy]) continue;                  //already checked 
            var cval = grid[cx][cy];
            if (cval < minVal || cval >= maxVal) continue;  //not in layer

            //add to layer
            if (layer[cx] === undefined) layer[cx] = [];
            layer[cx][cy] = 1;
            checked[cx][cy] = true;

            //add neighbours to queue
            if (cx > 0) queue.push([cx - 1, cy]);
            if (cy > 0) queue.push([cx, cy - 1]);
            if (cx < grid.length - 1) queue.push([cx + 1, cy]);
            if (cy < grid[x].length - 1) queue.push([cx, cy + 1]);
        }
        return layer;
    };

    for (x = 0; x < grid.length; x++) {
        for (y = 0; y < grid[x].length; y++) {
            if (checked[x] == undefined) checked[x] = [];
            if (grid[x][y] === -999) checked[x][y] = true;  //no information
            if (checked[x][y]) continue;                    //already checked
            //calcLayer
            var l = Math.floor((grid[x][y] - min) / amountPerLayer);
            var ff = floodfill(x, y, min + l * amountPerLayer, min + (l + 1) * amountPerLayer);
            if(ff.length > 0)
                layers.push(ff);
        }
    }

    return layers;
}

//algorithm partially from: http://cardhouse.com/computer/vector.htm
var getVectorsFromLayer = function(layer) {
    //clean up dead Vectors
    var cleanup = function (V) {
        var activeI = 0;
        for (var c = 0; c < V.length; c++) {
            if (V[c].status === 0) {
                V[V[c].prev].next = activeI;
                V[V[c].next].prev = activeI;
                V[activeI] = V[c];
                activeI++;
            }
        }
        return V.slice(0, activeI);
    }

    //create vectors
    var V = [];
    var Vi = [];
    var addSquareVector = function (x, y) {
        var vnum = V.length;
        var createVector = function(vector) {
            if (Vi[vector.sx] === undefined) Vi[vector.sx] = [];
            if (Vi[vector.sx][vector.sy] === undefined) Vi[vector.sx][vector.sy] = [];
            Vi[vector.sx][vector.sy].push(vector);
            return vector;
        };
        V.push(createVector({
            prev: vnum + 3,
            sx: x,
            ex: x + 1,
            sy: y,
            ey: y,
            next: vnum + 1,
            status: 0
        }));
        vnum++;
        V.push(createVector({
            prev: vnum - 1,
            sx: x + 1,
            ex: x + 1,
            sy: y,
            ey: y + 1,
            next: vnum + 1,
            status: 0
        }));
        vnum++;
        V.push(createVector({
            prev: vnum - 1,
            sx: x + 1,
            ex: x,
            sy: y + 1,
            ey: y + 1,
            next: vnum + 1,
            status: 0
        }));
        vnum++;
        V.push(createVector({
            prev: vnum - 1,
            sx: x,
            ex: x,
            sy: y + 1,
            ey: y,
            next: vnum - 3,
            status: 0
        }));
    };
    for (var x = 0; x < layer.length; x++) {
        if (layer[x] === undefined) continue;
        for (var y = 0; y < layer[x].length; y++) {
            if (layer[x][y] === undefined) continue;
            if (layer[x][y] !== 0)
                addSquareVector(x,y);
        }
    }
    //remove vectors
    var equalsVector = function(i, i2) {
        return (V[i].sx === V[i2].sx && V[i].sy === V[i2].sy && V[i].ex === V[i2].ex && V[i].ey === V[i2].ey) ||
               (V[i].sx === V[i2].ex && V[i].sy === V[i2].ey && V[i].ex === V[i2].sx && V[i].ey === V[i2].sy);
    }
    var removeVectors = function (i, i2) {
        var removeVector = function(mm, mm2) {
            var p = V[mm].prev;
            var n = V[mm2].next;
            V[p].next = n;
            V[n].prev = p;
        };
        removeVector(i, i2);
        removeVector(i2, i);
        V[i].status = -1;
        V[i2].status = -1;
    }
    var i;
    var i2;
    for (i = 0; i < V.length-1; i++) { //foreachVector
        var index;
        for (i2 = 0; i2 < Vi[V[i].sx][V[i].sy].length; i2++) { //that starts at same point
            index = V[Vi[V[i].sx][V[i].sy][i2].next].prev;
            if (index === i) continue; //its me again
            if (equalsVector(i, index)) {
                removeVectors(i, index);
                break;
            }
        }
        for (i2 = 0; i2 < Vi[V[i].ex][V[i].ey].length; i2++) { //that starts at end point
            index = V[Vi[V[i].ex][V[i].ey][i2].next].prev;
            if (index === i) continue; //its me again
            if (equalsVector(i, index)) {
                removeVectors(i, index);
                break;
            }
        }
    }
    //
   
    //
    V = cleanup(V);
    //lengthen vectors
    for (i = 0; i < V.length; i++) {
        if (V[i].status === 0) {
            if (V[V[i].prev].sx === V[i].ex || V[V[i].prev].sy === V[i].ey) {
                V[V[i].prev].ex = V[i].ex;
                V[V[i].prev].ey = V[i].ey;
                V[V[i].prev].next = V[i].next;
                V[V[i].next].prev = V[i].prev;
                V[i].status = -1;
            }
        }
    }
    
    return cleanup(V);
}

var getRingsFromVectors = function(vectors) {
    var rings = [];
    var createRing = function (startIndex) {
        var cur = vectors[startIndex];
        cur.status = -1;
        var ring = [[cur.sx, cur.sy], [cur.ex, cur.ey]];
        while (cur.next !== startIndex) {
            cur = vectors[cur.next];
            cur.status = -1;
            ring.push([cur.ex, cur.ey]);
        }
        return ring;
    };
    for (var i = 0; i < vectors.length; i++) {
        if (vectors[i].status === 0) {
            rings.push(createRing(i));
        }
    }
    return rings;
}

var pixelToGeo = function(polygon, maxX, maxY) {
    var minlat = 5.7;   //minX
    var maxLat = 15.68;  //maxX
    var minLong = 47.3;  //minY
    var maxLong = 55.09; //maxY

    for (var r = 0; r < polygon.length; r++) {
        for (var t = 0; t < polygon[r].length; t++) {
            var tpl = polygon[r][t];
            var x = tpl[0];
            var y = tpl[1];
            tpl[0] = Math.round((((y + x/35) * (maxLat - minlat)) / (maxY + x/9) + minlat)*100)/100;
            tpl[1] = Math.round((((maxX-x - y/40) * (maxLong - minLong)) / maxX + minLong) * 100) / 100;
        }
    }
    return polygon;
}
GRD.load = function(grid) {
    var grd = {};
    grd.data = grid;
    grd.createPolygons = createPolygons;
    return grd;
}