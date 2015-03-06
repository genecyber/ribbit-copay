'use strict';

angular.module('copayApp.controllers').controller('ImportAirdropController',
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

    var reader = new FileReader();

    var updateStatus = function(status) {
      $scope.importStatus = status;
      $scope.$digest();
    }

    var _importBackup = function (str) {
      var bitcore = require('bitcore');
      var sjcl = bitcore.sjcl;
      var wConf = {network: bitcore.networks.livenet};
      var secp256k1_n = new bitcore.Bignum('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141', 16);
      var root = angular.element(document).scope().$root;

      var password = $scope.password;

      var hmacSHA512 = function(key) {
      var hasher = new sjcl.misc.hmac(key, sjcl.hash.sha512);
        this.encrypt = function() {
          return hasher.encrypt.apply(hasher, arguments);
        };
      };

      var c = 0;

      do {
        var derivedKey = new bitcore.Buffer(sjcl.misc.pbkdf2(password+c, 'bigsalt'+password+c, 10000, 1024, hmacSHA512), 'hex');
        c++;
      } while (new bitcore.Bignum.fromBuffer(derivedKey).cmp(secp256k1_n) >= 0);

      // Encryption key
      var ek = new bitcore.Key();
      ek.private = derivedKey;
      ek.regenerateSync();
      try {
      	var encd = bitcore.ECIES.decrypt(ek.private, new bitcore.Buffer(str,'hex'));
      } catch(err) {
	if (err.message == "Invalid hex string") {
		alert('Invalid Wallet Backup');
		$scope.loading = false;
		return;
	}
	else {
		alert('Incorrect Password');
    		$scope.loading = false;
		return;
	}
      }
      // Wallet privkey
      var wallet = new bitcore.Key();
      wallet.private = new bitcore.Buffer(encd, 'hex');
      wallet.regenerateSync();
   
      var airdropAddress = bitcore.Address.fromPubKey(wallet.public).as('base58');
      
      var firstAddress = root.wallet.getAddresses()[0];
      console.log(" AIRDROP address : " + airdropAddress);
      console.log("  wallet address : " + firstAddress);

      console.log('try');
      var blockchain = root.wallet.blockchain;
      var unspent;
/**      blockchain.getUnspent([airdropAddress], function(err, unspentList) {
        
        if (err) {
           console.log('error');
          return cb(err);
        }
        unspent = unspentList;
	console.log(unspent);
	//crossing fingers
	var ribbitcore = require('ribbitcore');
        var simpleTx = new bitcore.Transaction();

	simpleTx.from(unspent).to(firstAddress, 249);
	simpleTx.sign(wallet.private);


//        console.log(simpleTx);
  //      simpleTx.from(unspent);
    //    simpleTx.to(address, amount)
      //  simpleTx.sign(wallet);
        console.log(simpleTx);
 
      });**/

	var CoinKey = require('coinkey');
	var privateKeyHex = bitcore.buffertools.toHex(wallet.private);
	//Ribbitcoin WIF
	var key = new CoinKey(wallet.private, {private: bitcore.networks.livenet.privKeyVersion, public: bitcore.networks.livenet.addressVersion})
	key.compressed = true
	var signingKey = key.privateWif;

	console.log(key.privateWif)

	var unspent;
	var tx;
	blockchain.getUnspent([airdropAddress], function(err, unspentList) {

   	 	if (err) {
         		console.log('error');
         		//return cb(err);
   	 	 }
    	    unspent = unspentList;
	    //handle this via rpc now
  	    blockchain.import(key.privateWif,firstAddress, function(){
		var totalOut = 0; unspentList.forEach(function(n){totalOut = totalOut + n.amount});
		blockchain.sendfrom(firstAddress,firstAddress,totalOut-5,function(){
			$scope.loading = false;			            
       		 });
	    });
    	 // var txp = new bitcore.TransactionBuilder();
    	 // txp.setUnspent(unspentList);
    	 // txp.setOutputs([{address: firstAddress, amount: 249}]);
    	 //tx = txp.build();
	 //blockchain.broadcast(tx.serialize().toString("hex"),function(err,txid) {
	 //
         //       if (err) {
         //               console.log('error: '+err);
         //               //return cb(err);
         //        }

         // console.log(txid);
	 // });
       });

    } 

    $scope.getFile = function() {
      // If we use onloadend, we need to check the readyState.
      reader.onloadend = function(evt) {
        if (evt.target.readyState == FileReader.DONE) { // DONE == 2
          var encryptedObj = evt.target.result;
          _importBackup(encryptedObj);
        }
      };
    };

    $scope.importA = function(form) {

      if (form.$invalid) {
        $scope.error = 'Please enter the required fields';
        return;
      }
      var backupFile = $scope.file;
      var backupText = form.backupText.$modelValue;
      var password = form.password.$modelValue;

      if (!backupFile && !backupText) {
        $scope.error = 'Please, select your backup file';
        return;
      }

      $scope.loading = true;
      if (backupFile) {
        reader.readAsBinaryString(backupFile);
      } else {
        _importBackup(backupText);
      }
    };
  });
