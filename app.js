$('.helpDropdown').on({
  click: function(){
    $("#helpCenter").toggle();
  }
});

$('.MapAddDropdown').on({
  click: function(){
    $('#MapAddCenter').toggle();
  }
});

 
$(".help").on("click", function () {
  var value = $(this).data("value");
  console.log("Selected value:", value);
  //logic 
});

$("#workspaceZoom").on({
  change: function () {
    canvas.setDimensions($(this).val() / 100);
  },
});


class Projection{
  constructor(canvasWidth, canvasHeight){
      this.MIN_LONGITUDE = -180;      // Minimum X coordinate in projected space
      this.MAX_LONGITUDE = 180;       // Maximum X coordinate in projected space
      this.MIN_LATITUDE = -90;        // Minimum Y coordinate in projected space
      this.MAX_LATITUDE = 90;         // Maximum Y coordinate in projected space 
      this.width = canvasWidth;       // Width of the canvas in pixels
      this.height = canvasHeight;     // Height of the canvas in pixels

  }
  canvasToProjected(x, y) {
      var scaleX = (this.MAX_LONGITUDE - this.MIN_LONGITUDE) / this.width;
      var scaleY = (this.MAX_LATITUDE - this.MIN_LATITUDE) / this.height;
      // Applying TransFormation
      var projectedX = this.MIN_LONGITUDE + x * scaleX;
      var projectedY = this.MAX_LATITUDE - y * scaleY;

      return { x: projectedX, y: projectedY }; // return projected corrdinate object
    }
  update(canvasWidth, canvasHeight){
      this.width = canvasWidth;       // Width of the canvas in pixels
      this.height = canvasHeight;     // Height of the canvas in pixels
  }
}
class Canvas {
  constructor(canvasId = "canvas1") {
    this.canvasMap = document.getElementById(canvasId);
    this.ctx = this.canvasMap.getContext("2d");
    this.projecter = new Projection(this.canvasMap.width, this.canvasMap.height);
    this.zoom = 1;
    this.scale = 1;
    this.mapImage = null;
    this.cursor = { x: 0, y: 0 };
    this.setDimensions();
    this.setupEventListeners();
  }

  setDimensions(size = 0.9) {
    const newHeight = Math.min(window.innerWidth, window.innerHeight) * size;
    const newWidth = 2 * newHeight;
    this.canvasMap.width = newWidth;
    this.canvasMap.height = newHeight; 
    this.projecter.update(this.canvasMap.width, this.canvasMap.height);
    this.drawBaseMap();
  }

  setupEventListeners() {
    this.canvasMap.addEventListener("wheel", (event) => {
      event.preventDefault();      
      const zoomSpeed = .1;
      const cursorBefore = { x: event.clientX, y: event.clientY };

      if (event.deltaY < 0) {
        if (this.zoom >= 100) {
          this.zoom = 100;
          $('#scale').html('Scale: ' + this.zoom.toFixed(2)); 
          this.applyTransform();
          return;
        }
        this.zoomIn(zoomSpeed);
      } else {
        if (this.zoom <= 1) {  
          this.zoom = 1;
          $('#scale').html('Scale: ' + this.zoom.toFixed(2));
          this.applyTransform();       
          return;    
        }
        this.zoomOut(zoomSpeed);
      }
      

      // Adjust cursor position based on zoom
      const cursorAfter = { x: event.clientX, y: event.clientY };
      this.adjustCursorPosition(cursorBefore, cursorAfter);
      this.applyTransform();
    });
  }   

  zoomIn(zoomSpeed) {
    this.zoom *= 1 + zoomSpeed;
    this.applyTransform();
  }

  zoomOut(zoomSpeed) {
    this.zoom *= 1 - zoomSpeed;
    this.applyTransform();
  }

  adjustCursorPosition(cursorBefore, cursorAfter) {
    const deltaX = cursorAfter.x - cursorBefore.x;
    const deltaY = cursorAfter.y - cursorBefore.y;

    this.cursor.x -= deltaX / this.zoom;
    this.cursor.y -= deltaY / this.zoom;
  }

  applyTransform() {
    console.log('Scale: '+this.zoom + ', size: ('+ this.canvasMap.width+', '+this.canvasMap.height+')');
    $('#scale').html('Scale: '+(this.zoom).toFixed(2)); 
    if (!this.mapImage) {
      // Load the original image when applying the first transform
      this.addBaseMap();
    }

    this.ctx.clearRect(0, 0, this.canvasMap.width, this.canvasMap.height);
    this.ctx.save();
    this.ctx.translate(this.cursor.x, this.cursor.y);
    this.ctx.scale(this.zoom, this.zoom);
    this.ctx.drawImage(this.mapImage, -this.cursor.x, -this.cursor.y, this.canvasMap.width, this.canvasMap.height);
    this.ctx.restore();
  }

  addBaseMap() {
    // Load the original image once
    const inputMap = document.getElementById("imageInput");
    const file = inputMap.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.mapImage = new Image();
        this.mapImage.src = e.target.result;
        this.drawBaseMap(); // Redraw the base image map after loading
  
        // Hide the file input after loading the image
        inputMap.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  }
  
  drawBaseMap() {
    // Draw the base image map with the current dimensions
    if (this.mapImage) {
      this.ctx.drawImage(this.mapImage, 0, 0, this.canvasMap.width, this.canvasMap.height);
    }
  }
}


const canvas = new Canvas();
canvas.addBaseMap();
$('.baseMap').on({
  change: function(){
    canvas.addBaseMap();
  }
}) 
 

var points = [];
var lines = [];
var polygons = [];

window.addEventListener("resize", function () {
  canvas.setDimensions(0.9);
});

class Layer {
  constructor(
    type,
    color = "rgba(0,0,255, 0.5)",
    size = 1,
    coordinateSystem = "WGS84"
  ) {
    this.type = type;
    this.color = "white";
    this.featureSet = [];
    this.size = size;
  }
}

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 4;
    this.color = "white";
  }

  setSize(size) {
    this.size = size;
  }

  draw() {
    canvas.ctx.beginPath();
    canvas.ctx.fillStyle = this.color;
    canvas.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    canvas.ctx.fill();
    let Pointed = {}
    Pointed = canvas.projecter.canvasToProjected(this.x, this.y);
    $('#scale').html(Pointed.x + ', '+ Pointed.y);
  }
}

class Line {
  constructor(x1, y1, x2 = undefined, y2 = undefined) {
    this.pointFrom = new Point(x1, y1);
    this.pointTo = new Point(x2, y2);
    this.size = 2;
    this.color = "white";
  }

  setPointTo(point) {
    this.pointTo = point;
  }

  setPointFrom(point) {
    this.pointFrom = point;
  }

  draw() {
    canvas.ctx.beginPath();
    canvas.ctx.strokeStyle = this.color;
    canvas.ctx.moveTo(this.pointFrom.x, this.pointFrom.y);
    canvas.ctx.lineWidth = this.size;
    canvas.ctx.lineTo(this.pointTo.x, this.pointTo.y);
    canvas.ctx.stroke();
    this.pointFrom.color = "red";
    this.pointTo.color = "red";
    this.pointFrom.draw();
    this.pointTo.draw();
  }
}

class Polygon {
  constructor(startX, startY) {
    this.Polypoints = [];
    this.Polypoints.push(new Point(startX, startY));
    this.OutlineColor = "white";
    this.color = "red";
    this.size = 2;
    this.completed = false;
  }
  setColor(color) {
    this.color = color;
  }
  setOutlineColor(color) {
    this.OutlineColor = color;
  }
  setSize(size) {
    this.size = size;
  }
  addNextPoint(x, y) {
    this.Polypoints.push(new Point(x, y));
  }

  draw() {
    let nPoint = this.Polypoints.length;
    if (nPoint >= 2) {
      canvas.ctx.beginPath();
      canvas.ctx.strokeStyle = this.OutlineColor;
      canvas.ctx.fillStyle = this.color;
      canvas.ctx.moveTo(
        this.Polypoints[nPoint - 2].x,
        this.Polypoints[nPoint - 2].y
      );
      canvas.ctx.lineTo(
        this.Polypoints[nPoint - 1].x,
        this.Polypoints[nPoint - 1].y
      );
      canvas.ctx.fill();
      canvas.ctx.stroke();
      this.Polypoints[nPoint - 1].color = "red";
      this.Polypoints[nPoint - 1].draw();
      console.log(this.Polypoints);
    }
  }
}

function Show(object) {
  object.draw();
}

var line = [];

canvas.canvasMap.addEventListener("click", function (event) {
  var feature = document.getElementById("featureType").value;
  let rect = canvas.canvasMap.getBoundingClientRect();
  let x = (event.clientX - rect.left);
  let y = (event.clientY - rect.top); 
  switch (feature) {
    case "point":
      points.push(new Point(x, y));
      Show(points[points.length - 1]);
      break;
    case "line":
      var point = new Point(x, y);
      line.push(point);
      if (line.length == 2) {
        var point = new Line(line[0].x, line[0].y, line[1].x, line[1].y);
        lines.push(point);
        Show(lines[lines.length - 1]);
        line = [];
        console.log(point);
      }
      break;
    case "polygon":
      if (polygons.length == 0 || polygons[polygons.length - 1].completed) {
        polygons.push(new Polygon(x, y));
      } else {
        polygons[polygons.length - 1].addNextPoint(x, y);
        Show(polygons[polygons.length - 1]);
      }
      break;
  }
});
