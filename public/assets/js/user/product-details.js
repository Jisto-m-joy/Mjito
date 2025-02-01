
//Zooming functionality for product images
$(document).ready(function(){
    console.log("Document is ready, initializing zoom...");
    console.log("Main Image Path:", $("#zoom_01").attr('src'));

    $("#zoom_01").elevateZoom({
      zoomType: "lens",
      lensShape: "round",
      lensSize: 200
    });

    window.changeImage = function (element) {
      console.log("Image clicked, changing zoom image...");
      var newImage = $(element).attr('src');
      console.log("New Image Path:", newImage);
      $("#zoom_01").attr('src', newImage);
      $("#zoom_01").data('zoom-image', newImage).elevateZoom();
    };
  });


  