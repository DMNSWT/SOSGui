angular.module('sosv5', ['uiSlider', 'toggle-switch'])
  .value('socket', io.connect())
  .controller('LeftList', ['$scope', '$http', function($scope, $http){
    $scope.availablePlaylists = new Array();
    $scope.currentPlaylistItems = new Array();
    $http.get('/playlists').success(function(data){
      for(var i=0, l=data.length; i<l; i++){
        var item = data[i];
        var itemArr = item.split('/'),
          name = itemArr[itemArr.length - 1];
        $scope.availablePlaylists.push({name: name, id: item});
      }
    });
    $http.get('/get-playlist-items').success(function(data){
      for(var i=0, l=data.length; i<l; i++){
        $scope.currentPlaylistItems.push( data[i] );
      }
    });
  }])
  .directive('playlistItem', function(){
    return{
      restrict: 'C',
      scope: true,
      controller: ['$scope', '$timeout', function($scope, $timeout){
        $scope.showChildren = true;
        $timeout(function(){
          $scope.showChildren = false;
        }, 1000)
      }]
    }
  })
  .directive('layerItem', function(){
    return{
      restrict: 'C',
      scope: true,
      link: function(scope, el){
        el.on('click', function(event){
          event.stopPropagation();
        });
      },
      controller: ['$scope', function($scope){
        $scope.opacity = 100;
        $scope.layerOn = true;
        $scope.layerIndex = 0;
        $scope.$watch('layerOn', function(v){

        });
        $scope.$watch('opacity', function(v){

        });
      }]
    }
  })
  .directive('mediaControl', function(){
    return{
      restrict: 'E',
      controller: ['$scope', 'socket',  function($scope, socket){
        $scope.playheadLocation = 25.5;
        $scope.paused = true;
        socket.on('playhead-update', function(percent){
          playheadLocation = percent;
        });
      }],
      templateUrl: '/tpl/media-control.html'
    }
  })
  .directive('globeControl', function(){
    function getNativeEvent(event){ while(event && typeof event.originalEvent !== "undefined"){ event = event.originalEvent; } return event; }
    function deg2rad(d){ return d*(Math.PI/180); }
    function rad2deg(r){ return r/(Math.PI/180); }
    function vec3toLatLng(vec, radius){
      var lat = lat = 90 - (Math.acos(vec.y / radius)) * 180 / Math.PI,
        lon = ((270 + (Math.atan2(vec.x , vec.z)) * 180 / Math.PI) % 360) - 180;
      return {lat: lat * -1, lon: lon};
    }
    function rot2latlng(rot){
      var diff = {
        x: rad2deg(rot.x),
        y: (rad2deg(rot.y) - 270)%360 //adjust for offset
      }
      if(diff.x < 0){ diff.x = 360 + diff.x; }
      if(diff.y < 0){ diff.y = 360 + diff.y; }
      var lat = 0,
        lng = 0;
      if(diff.x <= 90 && diff.x >= 0){ lat = diff.x; }
      else if(diff.x <= 180 && diff.x >= 90){ lat = 90 - (diff.x - 90); }
      else if(diff.x <= 270 && diff.x >= 180){ lat = -1*(diff.x - 180); }
      else{ lat = -90 - -1*(diff.x - 270); }
      if(diff.y <= 180 && diff.x >= 0){ lng = diff.y; }
      else{ lng = -180 + (diff.y-180); }
      var coords = { lat: lat, lng: lng };
      return {coords: coords, degRotation: diff};
    }
    return {
      controller: ['$scope', 'socket', function($scope, socket){
        $scope.foci = {lat: 0, long: 0};
      }],
      link: function(scope, el){
        head.load([
          '/js/vendor/three.min.js',
          '/js/vendor/TrackballControls.js',
          '/js/vendor/Projector.js',
          '/js/vendor/SoftwareRenderer.js',
          '/js/vendor/CanvasRenderer.js',
          ], function(){

            var scene = new THREE.Scene(),
              aspectRatio = el.innerWidth() / el.innerHeight(),
              camera = new THREE.PerspectiveCamera( 60, aspectRatio, 1, 10000 ),
              projector = new THREE.Projector(),
              raycaster = new THREE.Raycaster,
              renderer = new THREE.CanvasRenderer({antialias: true, alpha: true}),
              globeRotationPerTick = 0

            if(head.webgl){
              renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
            }

            //renderer.setClearColor( 0x2a3643, 1 );

            camera.position.z = 350;
            camera.position.y = 0;
            camera.rotation.z = 0; //deg2rad(23.25);

            scene.fog = new THREE.FogExp2( 0x0d1124, 0.0015 );
            scene.add( camera );
            controls = new THREE.TrackballControls(camera, el.get(0))
            controls.rotateSpeed = 3;
            controls.zoomSpeed = 0;
            controls.panSpeed = 0;

            controls.noZoom = true;
            controls.noPan = true;
            controls.staticMoving = true;
            controls.dynamicDampingFactor = 0;
            controls.keys = [65, 83, 68];

            controls.addEventListener('change', render );
            renderer.setSize( el.innerWidth(), el.innerHeight());

            var meshCT = new THREE.Object3D();

            var loader = new THREE.TextureLoader();
            loader.load( '/img/textures/gradient.png', function ( texture ) {


              var mesh = new THREE.Mesh(
                new THREE.IcosahedronGeometry( 150, 4 ),
                new THREE.MeshBasicMaterial({
                  overdraw: true,
                  //color: 0xdd4814,
                  wireframe: true,
                  map: texture,
                  //transparent: false
                })
              );
              mesh.rotation.y = deg2rad(270);
              meshCT.add(mesh);
            } );

            scene.add( meshCT );

            el.append(renderer.domElement);

            function render(){
              renderer.render( scene, camera );
            }
            function animate(){
              requestAnimationFrame( animate );
              if(globeRotationPerTick){
                meshCT.rotation.y += globeRotationPerTick;
              }

              controls.update();
              /*
              // find intersections
              var pos = globeCT.offset(),
                dims = {w: globeCT.width(), h: globeCT.height()}
                center =  {
                  x: parseInt(pos.left) + (parseInt(dims.w)/2),
                  y: parseInt(pos.top) + (parseInt(dims.h)/2)
                }
              var vector = new THREE.Vector3( 0, 0.5, 1 );
              projector.unprojectVector( vector, camera );
              raycaster.set( camera.position, vector.sub( camera.position ).normalize() );
              var intersects = raycaster.intersectObjects( scene.children, true );
              if ( intersects.length > 0 ) {
                var inter = intersects[0],
                  ll = vec3toLatLng(inter.point, 150);
              }
              */
              render();
            }
            animate();

          });


      }
    };
  })
