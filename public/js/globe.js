$(function(){
	var alignVal = 0;
	$(document).on('click', function(evt){
		var $overlay = $('#globe-control-overlay');
		if($overlay.is(':visible')){
			var t = $(evt.originalEvent.target);
			if($overlay.find(t).length < 1){
				$overlay.fadeOut('fast');
				return false
			}
		}
	});
	$('#show-alignment').on('click', function(){
		$('#globe-control-overlay').fadeIn('fast');
		return false;
	});

	$('#alignment-slider').on('changed', function(evt, pct){
		alignVal = ((pct/100)*360) - 180;
		socket.emit('passthrough', 'pointer on');
		socket.emit('passthrough', 'pointer red');
		socket.emit('passthrough', 'pointer 0,'+alignVal);		
		// do something with offset value
	}).on('dragEnded', function(){
		socket.emit('passthrough', 'pointer off');
	});
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
	var $t          = $(this),
		tSize       = { w: $t.width(), h: $t.height() },
		globeCT     = $('#globe-target'),
		scene       = new THREE.Scene(),
		aspectRatio = $('#globe-target').innerWidth() / $('#globe-target').innerHeight(),
		camera      = new THREE.PerspectiveCamera( 60, aspectRatio, 1, 10000 ),
		projector   = new THREE.Projector(),
		raycaster   = new THREE.Raycaster,
		renderer    = new THREE.CanvasRenderer({antialias: true}),
		sphereSegs  = 8,
		light,
		controls,
		globeRotationPerTick = 0;
	var ghostRep = $('#ghost-rep');
	var mouse = {x:0,y:0};
	if(head.webgl){
		renderer    = new THREE.WebGLRenderer({antialias: true});
		sphereSegs  = 16;
	}
	camera.position.z = 450;
	camera.position.y = 0;
	camera.rotation.z = 0; //deg2rad(23.25);
	scene.add( camera );
	controls = new THREE.TrackballControls(camera, $('#globe-target').get(0))
	controls.rotateSpeed = 3;
	controls.zoomSpeed = 0;
	controls.panSpeed = 0;

	controls.noZoom = true;
	controls.noPan = true;
	controls.staticMoving = true;
	controls.dynamicDampingFactor = 0;
	controls.keys = [65, 83, 68];

	controls.addEventListener('change', render );
	renderer.setSize( window.innerWidth, window.innerHeight);
	var mesh = new THREE.Mesh(
		new THREE.SphereGeometry( 150, sphereSegs, sphereSegs ),
		new THREE.MeshBasicMaterial({
			overdraw: true,
			color: 0xdd4814,
			wireframe: true,
			transparent: false
		})
	);
	var meshCT = new THREE.Object3D();
	meshCT.add(mesh)
	scene.add( meshCT );
	mesh.rotation.y = deg2rad(270);

	var metal = new THREE.MeshBasicMaterial({
		color: 0x666666,
		overdraw: true
	})
	var highlight = new THREE.MeshBasicMaterial( { color: 0xff0000, overdraw: true} );

	globeCT.append(renderer.domElement);

	var LLO = new can.Observe({lat: 0, lon: 0});
	function updateSphere(){
		//socket.emit('passthrough', 'pause');
		socket.emit('passthrough', 'orient 0,' + LLO.lon + ' ' + LLO.lat + ','+ alignVal +'\r\n');
	}
	LLO.bind('change', updateSphere);

	function animate(){
		requestAnimationFrame( animate );
		if(globeRotationPerTick){
			meshCT.rotation.y += globeRotationPerTick;
		}

		controls.update();
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
			if(ll.lat != LLO.lat || ll.lon != LLO.lon){
				LLO.attr({lat: ll.lat, lon: ll.lon});
			}
		}
		render();
	}
	function render(){
		renderer.render( scene, camera );
	}
	animate();
	// pushable textures
	socket.on('presenter-update-texture', function(filename){
		var file = '/img/textures/' + filename;
		mesh.material = new THREE.MeshBasicMaterial({
			map: THREE.ImageUtils.loadTexture( file ),
			overdraw: true
		});
	});
	$('#z-rot-slider').on('changed', function(evt, pct){
		if(pct == 50){
			// disable z rotation
			socket.emit('passthrough', 'zrotationenable 0' );
			socket.emit('passthrough', 'zrotationangle 0' );
		}
		else if(pct > 50){
			var normd = (pct - 50) * 2;
			var newAngle = (normd/100) * 5;
			socket.emit('passthrough', 'zrotationangle ' + newAngle );
			socket.emit('passthrough', 'zrotationenable 1' );
			socket.emit('passthrough', 'play' );
		}
		else{
			var normd = (50 - pct) * -2;
			var newAngle = (normd/100) * 5;
			socket.emit('passthrough', 'zrotationangle ' + newAngle );
			socket.emit('passthrough', 'zrotationenable 1' );
			socket.emit('passthrough', 'play' );
		}
	});
	$('#n-rot-slider').on('changed', function(evt, pct){
		if(pct == 50){
			// disable z rotation
			globeRotationPerTick = 0;
		}
		else{
			var normd;
			if(pct > 50){
				normd = (pct - 50) * 2;
			}
			else{
				normd = (50 - pct) * -2;
			}
			globeRotationPerTick = (normd/100) * 0.05;
		} 
	});
	$('#z-rot-slider-ct *').on('mousedown', function(evt){
		if(!$('#z-rot-slider').data('inDrag')){
			$('#z-rot-slider-ct .slider-knob').css('left', '50%');
			$('#z-rot-slider').trigger('updateVal');
		}
	});
	$('#n-rot-slider-ct *').on('mousedown', function(evt){
		if(!$('#n-rot-slider').data('inDrag')){
			$('#n-rot-slider-ct .slider-knob').css('top', '50%');
			$('#n-rot-slider').trigger('updateVal');
		}
	});
	$(window).on('orientationchange', function(){
		// adjust scene sizing and projection to match orientation
		setTimeout(function(){
			var w = $('#globe-target').innerWidth(),
				h = $('#globe-target').innerHeight(),
				isPortrait = h >= w;
			renderer.setSize(w, h);
			aspectRatio = w / h;
			camera.aspect = aspectRatio;
			camera.updateProjectionMatrix();
		}, 50);
	}).trigger('orientationchange');

})
