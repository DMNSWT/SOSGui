(function($){
	function getNativeEvent(event){ while(event && typeof event.originalEvent !== "undefined"){ event = event.originalEvent; } return event; }
	$.fn.draggable = function(){
		return this.each(function(){
			var $t = $(this);
			$t.on('mousedown touchstart', function(event){
				var ne      = getNativeEvent(event);
					isTouch = ne.touches,
					startX  = isTouch? ne.touches[0].pageX : event.clientX,
					startY  = isTouch? ne.touches[0].pageY : event.clientY,
					start   = {x: startX, y: startY};
				$t.trigger('drag-start', [start, isTouch]);
				$(document).on('mousemove touchmove', function(dragEvent){
					var nem       = getNativeEvent(dragEvent);
					var mouseX    = nem.touches? nem.touches[0].pageX : dragEvent.clientX,
						mouseY    = nem.touches? nem.touches[0].pageY : dragEvent.clientY,
						relOffset = {
							x: mouseX - start.x,
							y: mouseY - start.y 
						}
					$t.trigger('drag-move', [relOffset, isTouch]);
				});
			});
			$(document).on('mouseup touchend', function(event){
				$(document).off('mousemove touchmove');
				$t.trigger('drag-end');
			});
		});
	}
})(jQuery);