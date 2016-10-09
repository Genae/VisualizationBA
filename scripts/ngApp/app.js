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

    //map
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
        layers[data.properties.GEN] = L.geoJSON().addTo($scope.map);
        layers[data.properties.GEN].addData(data);
        layers[data.properties.GEN].on({
            mouseover: mouseEnter,
            mouseout: mouseLeave
        });
        layers[data.properties.GEN].setStyle({
            fillColor: '#ddd',
            fillOpacity: 1,
            color: '#555',
            weight: 1,
            opacity: 0.5
        });
    }

});