'use strict';

crop.directive('imgCrop', ['$timeout', 'cropHost', 'cropPubSub', function($timeout, CropHost, CropPubSub) {
  return {
    restrict: 'E',
    scope: {
      image: '=',
      resultImage: '=',

      changeOnFly: '=',
      areaType: '@',
      areaMinSize: '=',
      resultImageSize: '=',
      resultImageFormat: '@',
      resultImageQuality: '=',
      areaCoords: '=',
      areaCoordsAbsoluteInit: '=',

      onChange: '&',
      onLoadBegin: '&',
      onLoadDone: '&',
      onLoadError: '&'
    },
    template: '<canvas></canvas>',
    controller: ['$scope', function($scope) {
      $scope.events = new CropPubSub();
    }],
    link: function(scope, element/*, attrs*/) {
      // Init Events Manager
      var events = scope.events;

      if(!scope.areaCoords) {
        scope.areaCoords = {};
      }

      // Init Crop Host
      var cropHost=new CropHost(element.find('canvas'), {}, events);

      // Store Result Image to check if it's changed
      var storedResultImage;

      var updateResultImage=function(scope) {
        var resultImage=cropHost.getResultImageDataURI();
        if(storedResultImage!==resultImage) {
          storedResultImage=resultImage;
          if(angular.isDefined(scope.resultImage)) {
            scope.resultImage=resultImage;
          }
          scope.onChange({$dataURI: scope.resultImage});
        }
        updateAreaCoords(scope);
      };

      var updateAreaCoords = function(scope) {
        var area = cropHost.getArea();
        var relativeSize = area._size;
        var relativeX = area._x - relativeSize/2;
        var relativeY = area._y - relativeSize/2;
        var absoluteWidth = area._image.width;
        var absoluteHeight = area._image.height;

        var relativeWidth = area._ctx.canvas.width;
        var relativeHeight = area._ctx.canvas.height;
        var scaleFactor = absoluteWidth / relativeWidth;
        var absoluteX = relativeX * scaleFactor;
        var absoluteY = relativeY * scaleFactor;
        var absoluteSize = relativeSize * scaleFactor;
        scope.areaCoords = {
          relative: {
            x: relativeX,
            y: relativeY,
            size: relativeSize,
            image: {
              width: relativeWidth,
              height: relativeHeight
            }
          },
          absolute: {
            x: absoluteX,
            y: absoluteY,
            size: absoluteSize,
            image: {
              width: absoluteWidth,
              height: absoluteHeight
            }
          }
        };
      };

      // Wrapper to safely exec functions within $apply on a running $digest cycle
      var fnSafeApply=function(fn) {
        return function(){
          $timeout(function(){
            scope.$apply(function(scope){
              fn(scope);
            });
          });
        };
      };

      // Setup CropHost Event Handlers
      events
        .on('load-start', fnSafeApply(function(scope){
          scope.onLoadBegin({});
        }))
        .on('load-done', fnSafeApply(function(scope){
          scope.onLoadDone({});
        }))
        .on('load-error', fnSafeApply(function(scope){
          scope.onLoadError({});
        }))
        .on('area-move area-resize', fnSafeApply(function(scope){
          if(!!scope.changeOnFly) {
            updateResultImage(scope);
          }
        }))
        .on('area-move-end area-resize-end image-updated', fnSafeApply(function(scope){
          updateResultImage(scope);
        }));

      // Sync CropHost with Directive's options
      scope.$watch('image',function(){
        cropHost.setNewImageSource(scope.image);
      });
      scope.$watch('areaType',function(){
        cropHost.setAreaType(scope.areaType);
        updateResultImage(scope);
      });
      scope.$watch('areaMinSize',function(){
        cropHost.setAreaMinSize(scope.areaMinSize);
        updateResultImage(scope);
      });
      scope.$watch('resultImageSize',function(){
        cropHost.setResultImageSize(scope.resultImageSize);
        updateResultImage(scope);
      });
      scope.$watch('resultImageFormat',function(){
        cropHost.setResultImageFormat(scope.resultImageFormat);
        updateResultImage(scope);
      });
      scope.$watch('resultImageQuality',function(){
        cropHost.setResultImageQuality(scope.resultImageQuality);
        updateResultImage(scope);
      });

      var updateRelativeCoords = function () {
        var relativeAreaCoords = convertAbsoluteToRelativeCoords(scope.areaCoordsAbsoluteInit);
        cropHost.setAreaCoordsFromRelative(relativeAreaCoords);
        updateResultImage(scope);
      };
      scope.$watch('areaCoordsAbsoluteInit', updateRelativeCoords, true);
      scope.$watch(function () {
        return cropHost.getArea()._image.width;
      }, updateRelativeCoords);

      var convertAbsoluteToRelativeCoords = function(absCoords) {
        var area = cropHost.getArea();
        var absoluteWidth = area._image.width;
        var relativeWidth = area._ctx.canvas.width;
        var scaleFactor = absoluteWidth / relativeWidth;
        return {
          x: absCoords.x / scaleFactor,
          y: absCoords.y / scaleFactor,
          size: absCoords.size / scaleFactor
        }
      };

      // Update CropHost dimensions when the directive element is resized
      scope.$watch(
        function () {
          return [element[0].clientWidth, element[0].clientHeight];
        },
        function (value) {
          cropHost.setMaxDimensions(value[0],value[1]);
          updateResultImage(scope);
        },
        true
      );

      // Destroy CropHost Instance when the directive is destroying
      scope.$on('$destroy', function(){
          cropHost.destroy();
      });
    }
  };
}]);
