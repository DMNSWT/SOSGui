var Routing = can.Control({
	init: function(){
		$('#web-link-send-btn').on('click', function(e){
			e.preventDefault();
		});
		$('#left-nav-panel-target').on('click', 'a', function(){
			$('#left-nav-panel-target .active').removeClass('active');
			var $me = $(this);
			$me.parent('li').addClass('active');
			var dat = $me.parent('li').data('clip');
			$('#web-link-btn').attr('href', dat.catalogURL);
			$('#notes-ct .lnp-content-ct').load('/get-notes/'+dat.id);
			$('#web-link-send-btn').off('click').on('click', function(e){
				var email = prompt('Link for "' + dat.title + '" Email address to send to:');
				$.get('/mail-link/'+email+'/'+dat.id);
				e.preventDefault();
			});
		});
	},
	setFooterNavActive: function(href){
		$('footer a').each(function(){
			var navItem = $(this);
			if(navItem.attr('href') != href){
				navItem.removeClass('current');
			}
			else{
				navItem.addClass('current');
			}
		});
	},
	showPage: function(id, cb){
		cb = cb || $.noop;
		var target = $('#'+id);
		if(!target.is(':visible')){
			$('.page-ct').animate({left: '-100%'}, 'fast').hide();
			setTimeout(function(){
				target.css({left: '100%'}).show().animate({left: '0%'}, 'fast', cb);
			}, 300);
		}
	},
	setTheme: function(c){
		this.theme = c;
		$('#theme-switcher a').removeClass('icon-ok');
		$('#theme-switcher a.' + c).addClass('icon-ok');
		$('#color-shift').attr('href', '/css/redux-'+c+'.css');
	},
	'route': function(){
		setTimeout(function(){ window.location.hash = '#!/media-controls'; }, 10);
	},
	'/play/:id route': function(data){
		$('#control-play').hide();
		$('#control-pause').show();
		socket.emit('play', {mediaId: data.id});
		
		setTimeout(function(){ window.location.hash = '#!/media-controls'; }, 10);
	},
	'/media/:instruction route': function(data){
		switch(data.instruction){
			case 'play':
				$('#control-play').hide();
				$('#control-pause').show();
				socket.emit('play-current');
				break;

			case 'pause':
				$('#control-play').show();
				$('#control-pause').hide();
				socket.emit('pause-current');
				break;

			case 'next':
				// do forward
				socket.emit('next');
				break;

			case 'prev':
				// do backward
				socket.emit('prev');
				break;
		}
		setTimeout(function(){ window.location.hash = '#!/media-controls'; }, 10);
	},
	'/media-controls route': function(){
		this.showPage('globe-and-media-control', function(){
			$('#media-controls .slider').slider({cls: 'mini'}).on('drag-end', function(e){
				var val = $(this).data('slider-val');
			});
			$('#momentum-slider').slider({cls: 'momentum-slider'}).on('drag-end', function(e){
				var val = $(this).data('slider-val');
			});
		});
		this.setFooterNavActive('#!/media-controls');
	},
	'/playlist-controls route': function(){
		this.showPage('playlist-control');
		this.setFooterNavActive('#!/playlist-controls');
	},
	'/settings-controls route': function(){
		this.showPage('settings-control', function(){
			$('#settings-control .slider').slider().on('drag-end', function(e){
				var val = $(this).data('slider-val');
			});
		});
		this.setFooterNavActive('#!/settings-controls');
		
	},
	'/set-theme/:color route': function(data){
		var color = data.color;
		this.setTheme(color);
		setTimeout(function(){window.location.hash = '#!/settings-controls'},100);
	}
});

$(function(){

	socket.on('playhead-update', function(percent){
		var target = $('#play-scrubber .slider');
		if(!$('#play-scrubber .slider-control .slider-knob').data('inDrag')){
			$('#play-scrubber .slider-control .slider-knob').css('left', percent+'%');
		}
		target.trigger('updateVal', true);
	});

	$('#play-scrubber .slider').on('updateVal', function(evt, silent){
		if(!silent){
			// emit a new percentage
			var percentage = $('#play-scrubber .slider-control .slider-knob')[0].style.left.replace('%',''); 
			socket.emit('scrub-to', percentage);
		}
	});

	socket.on('presenter-error', function(e){
		var reason = e.msg,
			defHeader = 'Science on a Sphere - Presenter',
			header = $('header');
		header.html('Error: ' + reason).addClass('error');
		setTimeout(function(){
			header.html(defHeader).removeClass('error');
		}, 3000);
	});
	$(document).on('click', '.on-off-indicator', function(){
		$(this).toggleClass('on');
		var index = $('li', $(this).parent().parent()).index($(this).parent('li')),
			on = $(this).hasClass('on');
		socket.emit('passthrough', 'layer ' + index + ' ' + (on? 'on':'off'));
		
	});
	$(document).on('changed', '.opac-slider', function(evt, pct){
		var opac = pct / 100;
		var index = $('li', $(this).parent().parent().parent().parent()).index($(this).parent().parent().parent('li'));
		if($(this).parent().parent().parent('li').is(':visible')){
			socket.emit('passthrough', 'layer ' + index + ' alpha ' + opac);
		}
	});
	$(document).on('click', '.big-list a', function(evt){
		var par = $(this).parent('li'),
			subList = $('ul:first', par);
		if(par.is('.sub-active')){
			evt.preventDefault();
			return false;
		}
		if(subList.length > 0){
			$('.sub-active').each(function(){
				$(this)
					.removeClass('sub-active')
					.find('ul:first').slideUp('fast');
				$(this).find('.indicator:first').toggleClass('icon-right-open-big icon-down-open-big');
			});
			par.addClass('sub-active');
			subList.slideDown('fast');
			par
				.find('.indicator:first')
				.toggleClass('icon-right-open-big icon-down-open-big');
		}		
	});
	new Routing(document.body);

	var selectTarget = $('#playlist-selector');
	$.get('/playlists', function(data){
		for(var i=0, l=data.length; i<l; i++){
			var item = data[i];
			var itemArr = item.split('/'),
				name = itemArr[itemArr.length - 1];
			$('<option value="'+item+'">'+name+'</option>').appendTo(selectTarget);
		}
	});

	selectTarget.on('change', function(){
		var playlist = $(this).val();
		if(playlist != '' && playlist != 'Default'){
			socket.emit('passthrough', 'open_playlist ' + playlist);
			window.location.reload();
		}
	});

	$('a[href="#layers"]').on('click', function(){
		//$('#notes-ct').toggle('fast');
	});
});
