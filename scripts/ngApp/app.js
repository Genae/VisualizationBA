var app = angular.module('app', []);

app.controller('mainController', function mainController($scope) {
    
    //Postal Code
    $scope.postalCode = "";

    $scope.getCityName = function(pc)
    {
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
    var exampleData = [
        { name: "BB", value: 1848.2 },
        { name: "BE", value: 1848.5 },
        { name: "BRD", value: 1742.6 },
        { name: "BW", value: 1861.6 },
        { name: "BY", value: 1783.6 },
        { name: "HB", value: 1652.8 },
        { name: "HE", value: 1746.1 },
        { name: "HH", value: 1627.0 },
        { name: "MV", value: 1627.1 },
        { name: "NI", value: 1660.7 },
        { name: "NW", value: 1693.2 },
        { name: "RP", value: 1627.0 },
        { name: "SH", value: 1677.8 },
        { name: "SL", value: 1854.8 },
        { name: "SN", value: 1787.0 },
        { name: "ST", value: 1755.6 },
        { name: "TH", value: 1714.7 }
    ];

    exampleData.sort(function(a, b) {
        return b.value - a.value;
    });

    var dataToColumns = function (data, name) {
        var x = [];
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
    var vec = grid.createPolygons(5);

    //colorscale
    var colorScale = chroma
      .scale(['#000000', '#000000'])
      .domain([grid.minValue, grid.maxValue]);

    //map
    var mouseEnter = function () {
        this.bringToFront();
        this.setStyle({
            weight: 2,
            opacity: 1
        });
    }

    var mouseLeave = function () {
        this.setStyle({
            weight: 1,
            opacity: .5
        });
    }

    var mouseClick = function () {
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
    for (var i = 0; i < vec.length; i++) {
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
            columns: [
                $scope.data2[1]
            ],
            type: 'bar'
        },
        axis: {
            x: {
                type: 'category',
                categories: $scope.data2[0]
            }
        },
        subchart: {
            show: true
        },
        zoom: {
            enabled: true
        }
    });

    //window.data.sunshine
    /*
    [
        [1, 1, 1, 1],
        [1, -999, -999, 1],
        [1, -999, -999, 1],
        [1, 1, 1, 1]
    ]
    window.data.sunshine
    */
});