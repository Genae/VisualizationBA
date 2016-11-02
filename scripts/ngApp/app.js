var app = angular.module('app', []);

app.controller('mainController', function mainController($scope) {

    //Postal Code
    $scope.postalCode = "";

    $scope.getCityName = function(pc) {
        if (pc.length === 5) {
            if ($scope.marker === undefined) {
                $scope.marker = L.marker([window.data.postalCodes[pc].latitude, window.data.postalCodes[pc].longitude]).addTo($scope.map);
            } else {
                $scope.marker.setLatLng([window.data.postalCodes[pc].latitude, window.data.postalCodes[pc].longitude]);
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

    var bars = [
        { data: window.data.precipitationR, name: 'precipitation', reverse : true},
        { data: window.data.sunshineR, name: 'sunshine', reverse: false },
        { data: window.data.airTempR, name: 'airTemp', reverse: false }
    ];

    $scope.mixItems = [
        { name: 'precipitation', value: 100, color: "#0000ff" },
        { name: 'sunshine', value: 100, color: "#ff0000" },
        { name: 'airTemp', value: 100, color: "#ff7700" },
        { name: 'empty', value: 0, color: "#aaaaaa" }
    ];

    var normalizeValues = function() {
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
            normalizeValues();
        else {
            loadDataLayers();
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
                normalizeValues();
                $scope.$apply();
            });
        });
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
        normalizeValues();
    }

    //map
    var mouseEnter = function() {
        this.bringToFront();
        this.setStyle({
            weight: 2,
            opacity: 1
        });
    }

    var mouseLeave = function() {
        this.setStyle({
            weight: 1,
            opacity: .5
        });
    }

    var mouseClick = function() {
        $scope.map.options.maxZoom = 10;
        $scope.map.flyToBounds(this.getBounds());
    }


    $scope.map = L.map('mapid', {
        zoomControl: false,
        attributionControl: false,
        minZoom: 6,
        maxBounds: L.latLngBounds(L.latLng(46.66451741754238, 3.40576171875), L.latLng(54.96500166110205, 16.589355468750004))

    }).setView([51, 10], 6);
    console.log($scope.map.getBounds());
    var layers = {};
    for (var i = 0; i < window.data.geojson.deutschland.length; i++) {
        var data = window.data.geojson.deutschland[i];
        layers[data.properties.ID] = L.geoJSON().addTo($scope.map);
        layers[data.properties.ID].addData(data);
        layers[data.properties.ID].on({
            mouseover: mouseEnter,
            mouseout: mouseLeave,
            click: mouseClick
        });
    }
    var dataLayers = [];
    var loadDataLayers = function () {
        for (let i = 0; i < dataLayers.length; i++) {
            $scope.map.removeLayer(dataLayers[i]);
        }
        var vec = grid.createPolygons(5);
        //colorscale
        var colorScale = chroma
            .scale(['#000000', '#ffffff'])
            .domain([grid.minValue, grid.maxValue]);
        for (let i = 0; i < vec.length; i++) {
            dataLayers[i] = L.geoJSON().addTo($scope.map);
            dataLayers[i].addData({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": vec[i].data
                }
            });
            var color = colorScale(vec[i].value).hex();
            dataLayers[i].setStyle({
                fillColor: color,
                fillOpacity: 1,
                color: color,
                weight: 3,
                opacity: 1
            });
            dataLayers[i].bringToBack();
        }
    }
    loadDataLayers();


    var lastZoom = 6;
    $scope.map.on({
        zoom: function() {
            var newzoom = Math.floor($scope.map.getZoom());
            if (Math.abs(lastZoom - newzoom) >= 1) {
                lastZoom = newzoom;
                var nw = Math.max(lastZoom, 3);
                console.log(nw);
                for (var dl = 0; dl < dataLayers.length; dl++) {
                    dataLayers[dl].setStyle({
                        weight: nw
                    });
                }
            }
        }
    });

    for (var i = 0; i < exampleData.length; i++) {
        if (layers[exampleData[i].name] !== undefined) {
            layers[exampleData[i].name].setStyle({
                fillOpacity: 0,
                color: "#ffffff",
                weight: 1,
                opacity: 1
            });
            layers[exampleData[i].name].bringToFront();
        }
    }

    //chart1
    $scope.data2 = dataToColumns(exampleData, 'sunshine');
    $scope.chart1 = c3.generate({
        bindto: '#chart1',
        data: {
            x: 'x',
            columns: [
                $scope.data2[0]
            ],
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
            pattern: ['#0000ff', '#ff0000', '#ff7700', '#ffbb78', '#2ca02c', '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5']
        },
        zoom: {
            enabled: true
        },
        order: null
    });

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
        $scope.chart1.load({
            columns: c
        });
        $scope.chart1.show(show);
        $scope.chart1.groups([show]);
        $scope.chart1.hide(hide);
    }
    loadDataToBar();
});