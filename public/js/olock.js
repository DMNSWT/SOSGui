/*
$(window)    
	.bind('orientationchange', function(){
		if(window.orientation % 180 != 0){
			$(document.body).css("-webkit-transform-origin", "")
				.css("-webkit-transform", "");               
		} 
		else{
			if (window.orientation > 0){ //clockwise
			$(document.body).css("-webkit-transform-origin", "200px 190px")
				.css("-webkit-transform",  "rotate(-90deg)");  
			}
			else{
				$(document.body).css("-webkit-transform-origin", "280px 190px")
					.css("-webkit-transform",  "rotate(90deg)"); 
			}
		}
	})
	.trigger('orientationchange');
	*/