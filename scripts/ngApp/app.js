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
    //colorscale
    var colorScale = chroma
      .scale(['#f4aa42', '#f4df42'])
      .domain([exampleData[0].value, exampleData[exampleData.length-1].value]);

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
        dragging: false,
        minZoom: 6,
        maxZoom: 6
    }).setView([51, 10], 6);
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
    for (var i = 0; i < exampleData.length; i++) {
        if (layers[exampleData[i].name] !== undefined) {
            var color = colorScale(exampleData[i].value).hex();
            layers[exampleData[i].name].setStyle({
                fillColor: color,
                fillOpacity: 1,
                color: chroma(color).darken(2),
                weight: 1,
                opacity: 0.5
            });
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
});