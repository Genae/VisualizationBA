GRD = {}
var MIN_SIZE = 0;
var SKIP_AMOUNT = 1;
var RESOLUTION_DIVIDEND = 5;


var createPolygons = function (numLayers) {
    var poly = [];
    var vec = [];
    var lay = getLayersFromGrid(this, numLayers);
    for (var i = 0; i < lay.length; i++) {
        vec.push(getVectorsFromLayer(lay[i]));
    }
    for (var j = 0; j < lay.length; j++) {
        poly.push(getRingsFromVectors(vec[j]));
    }
    for (var p = 0; p < poly.length; p++) {
        poly[p] = pixelToGeo(poly[p], this.data[0].grid.length, this.data[0].grid[0].length);
    }
    return poly;
}

//floodfill algorithm
var getLayersFromGrid = function (gridObj, numLayers) {
    var grid = gridObj.getGrid();
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
    gridObj.minValue = min;
    gridObj.maxValue = max;
    var amountPerLayer = (max - min) / numLayers;

    var floodfill = function (x, y, minVal, maxVal) {
        var layer = [];
        var queue = [];
        var count = 0;
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
            count++;

            //add neighbours to queue
            if (cx > 0) queue.push([cx - 1, cy]);
            if (cy > 0) queue.push([cx, cy - 1]);
            if (cx < grid.length - 1) queue.push([cx + 1, cy]);
            if (cy < grid[x].length - 1) queue.push([cx, cy + 1]);
        }
        if (count < MIN_SIZE) return undefined;
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
            if(ff != undefined && ff.length > 0)
                layers.push({ value: min + (l+0.5) * amountPerLayer, data: ff });
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
    for (var x = 0; x < layer.data.length; x++) {
        if (layer.data[x] === undefined) continue;
        for (var y = 0; y < layer.data[x].length; y++) {
            if (layer.data[x][y] === undefined) continue;
            if (layer.data[x][y] !== 0)
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
    
    return { value: layer.value, data: cleanup(V) };
}

var getRingsFromVectors = function(vectors) {
    var rings = [];
    var createRing = function (startIndex) {
        var cur = vectors.data[startIndex];
        cur.status = -1;
        var ring = [[cur.sx, cur.sy], [cur.ex, cur.ey]];
        var num = 0;
        while (cur.next !== startIndex) {
            cur = vectors.data[cur.next];
            cur.status = -1;
            if (cur.next === startIndex || num++ % SKIP_AMOUNT === 0)
                ring.push([cur.ex, cur.ey]);
        }
        return ring;
    };
    for (var i = 0; i < vectors.data.length; i++) {
        if (vectors.data[i].status === 0) {
            var ring = createRing(i);
            if(rings.length === 0 || ring.length > MIN_SIZE)
                rings.push(ring);
        }
    }
    return { value: vectors.value, data: rings };
}

var pixelToGeo = function(polygon, maxX, maxY) {
    var minlat = 5.7;   //minX
    var maxLat = 15.68;  //maxX
    var minLong = 47.3;  //minY
    var maxLong = 55.09; //maxY

    for (var r = 0; r < polygon.data.length; r++) {
        for (var t = 0; t < polygon.data[r].length; t++) {
            var tpl = polygon.data[r][t];
            var x = tpl[0];
            var y = tpl[1];
            tpl[0] = Math.round((((y + x/35) * (maxLat - minlat)) / (maxY + x/9) + minlat)*100)/100;
            tpl[1] = Math.round((((maxX-x - y/40) * (maxLong - minLong)) / maxX + minLong) * 100) / 100;
        }
    }
    return polygon;
}

var getGrid = function () {
    if (this.data.length === 1) {
        return this.data[0].grid;
    }
    var sumGrid = [];
    for (var i = 0; i < this.data[0].grid.length; i++) {
        sumGrid[i] = [];
        for (var j = 0; j < this.data[0].grid[i].length; j++) {
            var val = 0;
            var num = 0;
            for (var g = 0; g < this.data.length; g++) {
                if (this.data[g].grid[i][j] !== -999) {
                    var norm = ((this.data[g].grid[i][j] - this.data[g].min) / (this.data[g].max - this.data[g].min));
                    val += (this.data[g].reverse ? 1 - norm : norm) * this.data[g].multiplier; //normalize between 0 and 1, multiply with multiplier
                    num++;
                }
            }
            if (num > 0) sumGrid[i][j] = val / num;
            else sumGrid[i][j] = -999;
        }
    }
    return sumGrid;
}

var load = function (grid, name, reverse) {
    if (reverse === undefined) {
        reverse = false;
    }
    var smallGrid = [];
    var min = -999;
    var max = -999;
    for (var i = 0; i < grid.length; i += RESOLUTION_DIVIDEND) {
        smallGrid[i / RESOLUTION_DIVIDEND] = [];
        for (var j = 0; j < grid[i].length; j += RESOLUTION_DIVIDEND) {
            var val = 0;
            var num = 0;
            for (var ii = 0; ii < RESOLUTION_DIVIDEND; ii++) {
                for (var ij = 0; ij < RESOLUTION_DIVIDEND; ij++) {
                    if (grid.length > (i + ii) && grid[i + ii].length > (j + ij)) {
                        if (grid[i + ii][j + ij] !== -999) {
                            val += grid[i + ii][j + ij];
                            num++;
                        }
                    }
                }
            }
            if (num > 0) {
                smallGrid[i / RESOLUTION_DIVIDEND][j / RESOLUTION_DIVIDEND] = val / num;
                if (smallGrid[i / RESOLUTION_DIVIDEND][j / RESOLUTION_DIVIDEND] !== -999) {
                    if (min === -999) {
                        min = smallGrid[i / RESOLUTION_DIVIDEND][j / RESOLUTION_DIVIDEND];
                        max = smallGrid[i / RESOLUTION_DIVIDEND][j / RESOLUTION_DIVIDEND];
                    }
                    if (smallGrid[i / RESOLUTION_DIVIDEND][j / RESOLUTION_DIVIDEND] < min)
                        min = smallGrid[i / RESOLUTION_DIVIDEND][j / RESOLUTION_DIVIDEND];
                    if (smallGrid[i / RESOLUTION_DIVIDEND][j / RESOLUTION_DIVIDEND] > max)
                        max = smallGrid[i / RESOLUTION_DIVIDEND][j / RESOLUTION_DIVIDEND];
                }
            }
            else smallGrid[i / RESOLUTION_DIVIDEND][j / RESOLUTION_DIVIDEND] = -999;
            
        }
    }
    this.data.push({grid: smallGrid, multiplier: 100, min: min, max: max, reverse: reverse, name: name});
    return this;
}

GRD.load = function(grid, name, reverse) {
    var grd = {};
    grd.data = [];
    grd.createPolygons = createPolygons;
    grd.load = load;
    grd.getGrid = getGrid;
    grd.load(grid, name, reverse);
    return grd;
}