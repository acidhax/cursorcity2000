/*
var sxsw = {
    full_bleed: function(boxWidth, boxHeight, imgWidth, imgHeight) {
        // Calculate new height and width...
        var initW = imgWidth;
        var initH = imgHeight;
        var ratio = initH / initW;

        imgWidth = boxWidth;
        imgHeight = boxWidth * ratio;

        // If the video is not the right height, then make it so...
        if(imgHeight < boxHeight){
            imgHeight = boxHeight;
            imgWidth = imgHeight / ratio;
        }

        //  Return new size for video
        return {
            width: imgWidth,
            height: imgHeight
        };
    },
    init: function() {
        var browserHeight = Math.round(jQuery(window).height());
        var browserWidth = Math.round(jQuery(window).width());
        var videoHeight = jQuery('video').height();
        var videoWidth = jQuery('video').width();

        var new_size = sxsw.full_bleed(browserWidth, browserHeight, videoWidth, videoHeight);

        jQuery('video')
            .width(new_size.width)
            .height(new_size.height);
    }

};
jQuery(document).ready(function($) {
    /*
     * Full bleed background
     

    sxsw.init();

    $(window).resize(function() {
        var browserHeight = Math.round($(window).height());
        var browserWidth = Math.round($(window).width());
        // var videoHeight = $('.wd-thumb-list li a').eq(0).attr('data-wd-height');
        // var videoWidth = $('.wd-thumb-list li a').eq(0).attr('data-wd-width');
        var videoHeight = 720;
        var videoWidth = 1280;

        var new_size = sxsw.full_bleed(browserWidth, browserHeight, videoWidth, videoHeight);

        $('video')
            .width(new_size.width)
            .height(new_size.height);
    });
    $(window).resize();
});
*/



$(function() {
    
var win = $(window),
      image = $('video'),
      imageWidth = 1280,
      imageHeight = 720,
      imageRatio = imageWidth / imageHeight;

var resizeImage = function () {
    var winWidth = win.width(),
        winHeight = win.height(),
        winRatio = winWidth / winHeight;
  
    if(winRatio > imageRatio) {
      image.css({
        width: winWidth,
        height: Math.round(winWidth / imageRatio)
      });
    } else {
      image.css({
        width: Math.round(winHeight * imageRatio),
        height: winHeight
      });
    }
  }

  win.bind({
    load: function() {
      resizeImage();
    },
    resize: function() {
      resizeImage();
    }
  });

    $('.videoPreview').click(resizeImage);
    
    $('video').bind('durationchange', function(e) {
        resizeImage();
        if (typeof this.duration === 'number' && this.duration != 100)
            start();
    });

var video = $('video')[0];
video.loop = false; 
    video.addEventListener('ended', function() { 
      video.currentTime=0.1; video.play(); }, false);

});