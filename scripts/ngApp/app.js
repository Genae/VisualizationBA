var app = angular.module('app', []);

app.controller('mainController', function mainController($scope) {

    $scope.slider = $("#slider").slider({
        id: "",
        min: 0,
        max: 100,
        step: 10,
        range: true,
        value: [10, 90]
    });
    //Postal Code
    $scope.postalCode = "";

    $scope.getCityName = function(pc) {
        if (pc.length === 5) {
            if ($scope.marker === undefined) {
                $scope.smallmarker = [];
                $scope.marker = L.marker([window.data.postalCodes[pc].latitude, window.data.postalCodes[pc].longitude]).addTo($scope.map);
                for (var i = 0; i < $scope.smallMaps.length; i++) {
                    $scope.smallmarker.push(L.marker([window.data.postalCodes[pc].latitude, window.data.postalCodes[pc].longitude]).addTo($scope.smallMaps[i]));
                }
            } else {
                $scope.marker.setLatLng([window.data.postalCodes[pc].latitude, window.data.postalCodes[pc].longitude]);
                for (var i = 0; i < $scope.smallmarker.length; i++) {
                    $scope.smallmarker[i].setLatLng([window.data.postalCodes[pc].latitude, window.data.postalCodes[pc].longitude]);
                }
            }
            return window.data.postalCodes[pc].placeName;
        }
    }

    //exampleData
    var exampleData = window.data.sunshineR;
    
    var dataToColumns = function(data, name) {
        var x = ['x'];
        var y = [name];
        for (var i = 0; i < data.length; i++) {
            x.push(data[i].name);
            y.push(data[i].value);
        }
        return [x, y];
    }

    //data
    var grid = GRD.load(window.data.precipitation, 'precipitation', true);
    grid.load(window.data.sunshine, 'sunshine');
    grid.load(window.data.airTemp, 'airTemp');

    $scope.mixedGrid = grid;
    $scope.precGrid = GRD.load(window.data.precipitation, 'precipitation', true);
    $scope.sunGrid = GRD.load(window.data.sunshine, 'sunshine');
    $scope.tempGrid = GRD.load(window.data.airTemp, 'airTemp');

    var bars = [
        { data: window.data.precipitationR, name: 'precipitation', reverse : true},
        { data: window.data.sunshineR, name: 'sunshine', reverse: false },
        { data: window.data.airTempR, name: 'airTemp', reverse: false }
    ];

    $scope.mixItems = [
        { name: 'precipitation', value: 100, color: "#2b83ba", icon: "wi wi-rain" },
        { name: 'sunshine', value: 100, color: "#d7191c", icon: "wi wi-day-sunny" },
        { name: 'airTemp', value: 100, color: "#fdae61", icon: "wi wi-thermometer" },
        { name: 'empty', value: 0, color: "#aaaaaa", icon: "wi wi-stars" }
    ];

    var normalizeValues = function(grid) {
        var sum = 0;
        var rerun = false;
        for (let i = 0; i < $scope.mixItems.length; i++) {
            if ($scope.mixItems[i].name !== 'empty')
                sum += $scope.mixItems[i].value;
        }
        if (sum === 0) {
            $scope.mixItems[$scope.mixItems.length - 1].value = 100;
            for (let i = 0; i < $scope.mixItems.length; i++) {
                if ($scope.mixItems[i].name !== 'empty') {
                    grid.setValue($scope.mixItems[i].name, $scope.mixItems[i].value);
                }
            }
        } else {
            $scope.mixItems[$scope.mixItems.length - 1].value = 0;
            for (let i = 0; i < $scope.mixItems.length; i++) {
                if ($scope.mixItems[i].name !== 'empty') {
                    $scope.mixItems[i].value = $scope.mixItems[i].value / sum * 100;
                    if ($scope.mixItems[i].value < 5 && $scope.mixItems[i].value !== 0) {
                        $scope.mixItems[i].value = 0;
                        rerun = true;
                    }
                    grid.setValue($scope.mixItems[i].name, $scope.mixItems[i].value);
                }
            }
        }
        
        if (rerun)
            normalizeValues(grid);
        else {
            loadDataLayers(map, grid, true, ['#d7191c', '#fdae61', '#ffffbf', '#a6d96a', '#1a9641']);
            loadDataToBar();
        }

    }
    
    $(document).ready(function () {
        $scope.mixItems.forEach(function(item) {
            jQuery("#" + item.name).bind('mousewheel', function (e) {
                e.preventDefault();
                if(e.originalEvent.wheelDelta > 0)
                    item.value *= 1.3;
                else
                    item.value /= 1.3;
                normalizeValues($scope.mixedGrid);
                $scope.$apply();
            });
        });
        $scope.slider.on("change", function (ev) {
            if (ev.value.newValue[0] !== ev.value.oldValue[0] || ev.value.newValue[1] !== ev.value.oldValue[1])
                normalizeValues($scope.mixedGrid);
        });
        normalizeValues($scope.mixedGrid);
    });

    $scope.getStyle = function(item) {
        var sum = 0;
        for (let i = 0; i < $scope.mixItems.length; i++) {
            sum += $scope.mixItems[i].value;
        }
        return { width: item.value / sum * 100 + "%", "background-color": item.color };
    }

    $scope.toggleItem = function(item) {
        if (item.value !== 0) {
            item.value = 0;
        } else {
            var num = 0;
            for (let i = 0; i < $scope.mixItems.length; i++) {
                num += $scope.mixItems[i].value > 0 ? 1 : 0;
            }
            item.value = 100 / num;
        }
        normalizeValues($scope.mixedGrid);
    }

    var mouseEnterSynced = function(state) {
        $scope.map.layers[state].bringToFront();
        $scope.map.layers[state].setStyle({
            color: "#BBBBFF",
            weight: 2,
            opacity: 1
        });
        for (let i = 0; i < $scope.smallMaps.length; i++) {
            $scope.smallMaps[i].layers[state].bringToFront();
            $scope.smallMaps[i].layers[state].setStyle({
                color: "#BBBBBB",
                weight: 2,
                opacity: 1
            });
        }
        var index;
        for (index = 0; index < $scope.columns[0].length - 1; index++) {
            if($scope.columns[0][index + 1] === state)
                break;
        }
        $(".c3-event-rect-" + index).css("fill-opacity", 0.1);
    }

    var mouseExitSynced = function (state) {
        $scope.map.layers[state].setStyle({
            color: "#666666",
            weight: 1,
            opacity: 1
        });
        for (let i = 0; i < $scope.smallMaps.length; i++) {
            $scope.smallMaps[i].layers[state].setStyle({
                color: "#666666",
                weight: 1,
                opacity: 1
            });
        }
        var index;
        for (index = 0; index < $scope.columns[0].length - 1; index++) {
            if ($scope.columns[0][index + 1] === state)
                break;
        }
        $(".c3-event-rect-" + index).css("fill-opacity", 0);
    }

    //map creation
    var createMap = function(mapId, small) {
        var map = L.map(mapId, {
            zoomControl: false,
            attributionControl: false,
            minZoom: small ? 5 : 6,
            maxBounds: L.latLngBounds(L.latLng(46.66451741754238, 3.40576171875), L.latLng(54.96500166110205, 16.589355468750004))

        }).setView([51, 10], small ? 5 : 6);
        return map;
    }

    var loadGermanOverlay = function(map) {
        var mouseEnter = function () {
            for (var ln in this._layers) {
                mouseEnterSynced(this._layers[ln].feature.properties.ID);
            }
        }

        var mouseLeave = function () {
            for (var ln in this._layers) {
                mouseExitSynced(this._layers[ln].feature.properties.ID);
            }
        }

        var mouseClick = function () {
            map.options.maxZoom = 10;
            map.flyToBounds(this.getBounds());
        }

        var layers = {};
        for (var i = 0; i < window.data.geojson.deutschland.length; i++) {
            var data = window.data.geojson.deutschland[i];
            layers[data.properties.ID] = L.geoJSON().addTo(map);
            layers[data.properties.ID].addData(data);
            layers[data.properties.ID].on({
                mouseover: mouseEnter,
                mouseout: mouseLeave,
                click: mouseClick
            });
        }
        for (var i = 0; i < exampleData.length; i++) {
            if (layers[exampleData[i].name] !== undefined) {
                layers[exampleData[i].name].setStyle({
                    fillOpacity: 0,
                    color: "#666666",
                    weight: 1,
                    opacity: 1
                });
                layers[exampleData[i].name].bringToFront();
            }
        }
        map.layers = layers;
    }
    
    var loadDataLayers = function (map, grid, master, colors) {
        if (map.dataLayers !== undefined) {
            for (let i = 0; i < map.dataLayers.length; i++) {
                map.removeLayer(map.dataLayers[i]);
            }
        }
        map.dataLayers = [];
        var vec = grid.createPolygons(5, $scope.slider[0].value);
        //colorscale
        var colorScale = chroma
            .scale(colors)
            .domain([grid.minValue + (grid.maxValue - grid.minValue) / 10, grid.maxValue - (grid.maxValue - grid.minValue) / 10]);
        for (let i = 0; i < vec.length; i++) {
            map.dataLayers[i] = L.geoJSON().addTo(map);
            map.dataLayers[i].addData({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": vec[i].data
                }
            });
            var color = colorScale(vec[i].value).hex();
            map.dataLayers[i].setStyle({
                fillColor: color,
                fillOpacity: 1,
                color: color,
                weight: 3,
                opacity: 1
            });
            map.dataLayers[i].bringToBack();
        }

        if (master) {
            var lastZoom = 6;
            map.on({
                zoom: function () {
                    for (var i = 0; i < $scope.smallMaps.length; i++) {
                        $scope.smallMaps[i].flyTo(map.getCenter(), map.getZoom() - 1);
                    }
                    var newzoom = Math.floor(map.getZoom());
                    if (Math.abs(lastZoom - newzoom) >= 1) {
                        lastZoom = newzoom;
                        var nw = Math.max(lastZoom, 3);
                        for (var dl = 0; dl < map.dataLayers.length; dl++) {
                            map.dataLayers[dl].setStyle({
                                weight: nw
                            });
                        }
                    }
                },
                move: function() {
                    for (var i = 0; i < $scope.smallMaps.length; i++) {
                        $scope.smallMaps[i].flyTo(map.getCenter(), map.getZoom() - 1);
                    }
                }
            });
        }
    }

    //map mixed
    var map = createMap('mapid', false);
    loadGermanOverlay(map);
    $scope.map = map;
    loadDataLayers(map, grid, true, ['#d7191c', '#fdae61', '#ffffbf', '#a6d96a', '#1a9641']);

    $scope.smallMaps = [];

    //map Temp
    var mapTemp = createMap('mapidTemp', true);
    loadDataLayers(mapTemp, $scope.tempGrid, false, ['#2b83ba', '#abdda4', '#ffffbf', '#fdae61', '#d7191c']);
    loadGermanOverlay(mapTemp);
    $scope.smallMaps.push(mapTemp);

    //map Prec
    var mapPrec = createMap('mapidPrec', true);
    loadDataLayers(mapPrec, $scope.precGrid, false, ['#f1eef6', '#bdc9e1', '#74a9cf', '#2b8cbe', '#045a8d']);
    loadGermanOverlay(mapPrec);
    $scope.smallMaps.push(mapPrec);

    //map Sun
    var mapSun = createMap('mapidSun', true);
    loadDataLayers(mapSun, $scope.sunGrid, false, ['#ffffd4', '#fed98e', '#fe9929', '#d95f0e', '#993404']);
    loadGermanOverlay(mapSun);
    $scope.smallMaps.push(mapSun);
    
    //chart1
    var createChart = function() {
        $scope.data2 = dataToColumns(exampleData, 'sunshine');
        $scope.chart1 = c3.generate({
            bindto: '#chart1',
            data: {
                x: 'x',
                columns: [
                    $scope.data2[0]
                ],
                onmouseover: function (obj) {
                    mouseEnterSynced($scope.columns[0][obj.x+1]);
                },
                onmouseout: function (obj) {
                    mouseExitSynced($scope.columns[0][obj.x + 1]);
                },
                type: 'bar'
            },
            groups: [
                []
            ],
            axis: {
                x: {
                    type: 'category'
                }
            },
            color: {
                pattern: ['#2b83ba', '#d7191c', '#fdae61', '#ffbb78', '#2ca02c', '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5']
            },
            zoom: {
                enabled: true
            },
            tooltip: {
                format: {
                    title: function (d) { return 'Data ' + d; },
                    value: function (value, ratio, id) {
                        var format = d3.format('.3n');
                        return format(value);
                    }
                    //            value: d3.format(',') // apply this format to both y and y2
                }
            },
            order: null
        });
    }
    createChart();


    var sortColums = function(c) {
        var bars = [];
        for (var b = 0; b < c.length; b++) {
            for (var i = 1; i < c[b].length; i++) {
                if (b === 0) {
                    bars.push({ name: c[0][i], sum: 0 });
                } else {
                    bars[i - 1][c[b][0]] = c[b][i];
                    bars[i - 1].sum += c[b][i];
                }
            }
        }
        bars.sort(function (a, b) { return b.sum - a.sum });

        var cnew = [];
        for (var key in bars[0]) {
            if (bars[0].hasOwnProperty(key) && key !== "sum") {
                var col = [];
                col.push(key.replace('name', 'x'));
                for (let i = 0; i < bars.length; i++) {
                    col.push(bars[i][key]);
                }
                cnew.push(col);
            }
        }
        return cnew;
    }
    var loadDataToBar = function () {
        var show = [];
        var hide = [];
        var c = [];
        c.push(['x']);
        for (let b = 0; b < bars[0].data.length; b++) {
            c[0].push(bars[0].data[b].name);
        }
        for (let i = 0; i < bars.length; i++) {
            var mi;
            for (let m = 0; m < $scope.mixItems.length; m++) {
                if ($scope.mixItems[m].name === bars[i].name)
                    mi = $scope.mixItems[m];
            }
            if (mi.value === 0) {
                hide.push(bars[i].name);
            } else {
                show.push(bars[i].name);
                var min = bars[i].data[0].value;
                var max = bars[i].data[0].value;
                for (let b = 0; b < bars[i].data.length; b++) {
                    if (bars[i].data[b].value < min)
                        min = bars[i].data[b].value;
                    if (bars[i].data[b].value > max)
                        max = bars[i].data[b].value;
                }
                var index = c.length;

                c.push([bars[i].name]);
                for (let b = 0; b < bars[i].data.length; b++) {
                    var norm = (bars[i].data[b].value - min) / (max - min);
                    c[index].push((bars[i].reverse ? (1 - norm) : norm) * mi.value);
                }
            }
            
        }
        c = sortColums(c);
        $scope.chart1.load({
            columns: c
        });
        $scope.columns = c;
        $scope.chart1.show(show);
        $scope.chart1.groups([show]);
        $scope.chart1.hide(hide);
    }
    loadDataToBar();
});