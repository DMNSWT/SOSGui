(function($){
	$.fn.slider = function(opts){
		return this.each(function(){
			var $t = $(this);
			if($t.data('is-slider')){
				return false;
			}
			opts = $.extend(true,{
				cls: '',
				vertical: false
			}, opts);
			if($t.is('.slider-vertical')){
				opts.vertical = true;
				opts.cls += ' slider-control-vertical';
			}
			$t.data('is-slider', true);
			var renCon = $('<div class="slider-control '+opts.cls+'"></div>');
			$t.wrap(renCon);
			renCon = $t.parent();
			var bar = $('<div class="slider-bar"></div>').appendTo(renCon);
			var highLight = $('<div class="slider-highlight"></div>').appendTo(renCon);
			var knob = $('<div class="slider-knob"></div>');
			bar.appendTo(renCon);
			highLight.appendTo(renCon);
			knob.appendTo(renCon);
			var val = $t.val() && $t.val() != ''? $t.val() : 0,
				max = $t.data('max') || 100;
			$t.data('slider-val', val);
			$t.data('slider-max', max);

			$t.on('setVal', function(evt, newVal){
				var max = opts.vertical? renCon.height() : renCon.width();
			});
			
			$t.on('updateVal', function(){
				var barLeft = parseInt(knob.css('left'));
				var newPct = Math.max(Math.min(Math.ceil((barLeft / renCon.width() ) * 100), 100), 0);
				if(opts.vertical){
					barLeft = parseInt(knob.css('top'));
					newPct = Math.max(Math.min(Math.ceil((barLeft / renCon.height() ) * 100), 100), 0);
					highLight.css('height', newPct+'%');
				}
				else{
					highLight.css('width', newPct+'%');
				}
				if(opts.vertical){
					knob.css('top', newPct+'%');
				}
				else{
					knob.css('left', newPct+'%');
				}
				
				var max = $t.data('slider-max') || 100,
					newVal = Math.floor(max * (newPct/100));
				$t.data('slider-val', newVal);
				$t.trigger('changed', [newVal]);
			});

			var initPct = (val/max)*100;
			if(opts.vertical){
				knob.css('top', Math.floor(initPct)+'%');
			}
			else{
				knob.css('left', Math.floor(initPct)+'%');
			}
			
			
			$t.trigger('updateVal');
			knob.on('draginit', function(ev, drag) {
				$(this).data('inDrag', true);
				drag.limit($(this).parent());
				if(opts.vertical){
					drag.vertical();
				}
				else{
					drag.horizontal();
				}
				
			}).on('dragmove', function(ev, drag){
				$t.trigger('updateVal');
			}).on('dragend', function(ev, drag){
				$(this).data('inDrag', false);
				$t.trigger('dragEnded', [$t.data('slider-val')]);
			});
		});
	}
})(jQuery)