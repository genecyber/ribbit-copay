'use strict';

angular.module('copayApp.controllers').controller('ExplorerController',
  function($scope, $rootScope, $location, $timeout, notification, isMobile, identityService) {
    $scope.title = 'Import Airdrop Wallet';
    $scope.importStatus = 'Importing wallet - Reading & decrypting file...';
    $scope.hideAdv = true;
    $scope.is_iOS = isMobile.iOS();

    window.ignoreMobilePause = true;
    $scope.$on('$destroy', function() {
      $timeout(function(){
        window.ignoreMobilePause = false;
      }, 100);
    });
  });
