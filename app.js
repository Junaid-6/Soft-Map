$(".helpDropdown").on({
  click: function () {
    $("#helpCenter").toggle();
  },
});

$(".MapAddDropdown").on({
  click: function () {
    $("#MapAddCenter").toggle();
  },
});
 

$(".help").on("click", function () {
  var value = $(this).data("value");
  console.log("Selected value:", value);
  //logic
});


var zoomSpeed = 0.01;

const Layers = [];

// CONSTANTS
DEFUALT_CANVAS_SIZE = 0.84;

class Projection {
  constructor(canvasWidth, canvasHeight, extent) {
    this.MIN_LONGITUDE = extent.min_x; // Minimum X coordinate in projected space
    this.MAX_LONGITUDE = extent.max_x; // Maximum X coordinate in projected space
    this.MIN_LATITUDE = extent.min_y; // Minimum Y coordinate in projected space
    this.MAX_LATITUDE = extent.max_y; // Maximum Y coordinate in projected space
    this.width = canvasWidth; // Width of the canvas in pixels
    this.height = canvasHeight; // Height of the canvas in pixels 
  }

  setExtent(extent){
    this.MIN_LONGITUDE = extent.min_x; // Minimum X coordinate in projected space
    this.MAX_LONGITUDE = extent.max_x; // Maximum X coordinate in projected space
    this.MIN_LATITUDE = extent.min_y; // Minimum Y coordinate in projected space
    this.MAX_LATITUDE = extent.max_y; // Maximum Y coordinate in projected space
  }

  canvasToProjected(x, y) {
    var scaleX = (this.MAX_LONGITUDE - this.MIN_LONGITUDE) / this.width;
    var scaleY = (this.MAX_LATITUDE - this.MIN_LATITUDE) / this.height;
    // Applying TransFormation
    var projectedX = this.MIN_LONGITUDE + x * scaleX;
    var projectedY = this.MAX_LATITUDE - y * scaleY;

    return { x: projectedX, y: projectedY }; // return projected corrdinate object
  }

  projectedToCanvas(projectedX, projectedY) {
    var scaleX = (this.MAX_LONGITUDE - this.MIN_LONGITUDE) / this.width;
    var scaleY = (this.MAX_LATITUDE - this.MIN_LATITUDE) / this.height;

    // Applying reverse transformation
    var canvasX = (projectedX - this.MIN_LONGITUDE) / scaleX;
    var canvasY = (this.MAX_LATITUDE - projectedY) / scaleY;

    return { x: canvasX, y: canvasY }; // return canvas coordinates object
  }

  update(canvasWidth, canvasHeight) {
    this.width = canvasWidth; // Width of the canvas in pixels
    this.height = canvasHeight; // Height of the canvas in pixels 
  }
} 

class ImageMap {
  constructor() {
    this.image = null;
  }

  loadImage(file, callback) {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.image = new Image();
        this.image.src = e.target.result;
        this.image.onload = callback;
      };
      reader.readAsDataURL(file);
    } else {
      // If no file is provided, execute the callback without loading an image
      callback();
    }
  }

  draw(ctx, zoom) {
    if (this.image) {
      const imageWidth = this.image.naturalWidth;
      const imageHeight = this.image.naturalHeight;

      const drawX = (ctx.canvas.width - imageWidth * zoom) / 2;
      const drawY = (ctx.canvas.height - imageHeight * zoom) / 2;

      ctx.drawImage(
        this.image,
        drawX,
        drawY,
        imageWidth * zoom,
        imageHeight * zoom
      );
    }
  }
}
 

class Canvas {
  constructor(canvasId = "canvas1", x = 50, y = 50, extent = { min_x: -180, max_x: 180, min_y: -90, max_y: 90 }) {
    this.canvasMap = document.getElementById(canvasId);
    this.ctx = this.canvasMap.getContext("2d");
    this.canvasMap.width = 1000;
    this.canvasMap.height = 500;
    this.zoom = 1;
    this.scale = 1;
    this.projecter = new Projection(this.canvasMap.width, this.canvasMap.height, extent);
    this.imageMap = new ImageMap();
    this.cursor = { x: 10, y: 10 };
    this.setDimensions();
    this.setupEventListeners();
    this.isDragging = false;
    this.pan = false;
    this.setPosition(x, y);
    this.canvasName = canvasId;
  }
 
  setDimensions() {
    const aspectRatio = 2;  
    if (this.imageMap.image) {
      this.canvasMap.width = this.imageMap.image.width * this.zoom;
      this.canvasMap.height = this.imageMap.image.height * this.zoom;
    } else {
      // Calculate the new dimensions based on the aspect ratio and zoom
      const newWidth = Math.max(this.canvasMap.width * this.zoom, 1);
      const newHeight = newWidth / aspectRatio;
  
      // Set the canvas dimensions
      this.canvasMap.width = newWidth;
      this.canvasMap.height = newHeight;
      this.zoom = 1;
    }
  
    this.projecter.update(this.canvasMap.width, this.canvasMap.height); 
    if(this.canvasName === 'mainCanvas'){
      this.drawBaseMap();
    }
    
  }
  
  setPosition(x, y) {
    this.canvasMap.style.left = `${x}px`;
    this.canvasMap.style.top = `${y}px`;
    this.drawFeatures();
  }

  moveCanvas(dx, dy) {
    const currentX = parseInt(this.canvasMap.style.left) || 0;
    const currentY = parseInt(this.canvasMap.style.top) || 0;
    const newX = currentX + dx;
    const newY = currentY + dy;
    this.setPosition(newX, newY);
  } 

  addPan(){
    let dragStart = { x: 0, y: 0 };
    $("#pan").on({
      click: () => {
        this.pan = !this.pan;
        if (this.pan) {
          $("#pan").addClass("selected"); 
        } else {
          $("#pan").removeClass("selected");
        }
      },
    });
    this.canvasMap.addEventListener("mousedown", (event) => {
      this.isDragging = true;
      dragStart = { x: event.clientX, y: event.clientY };
    });

    this.canvasMap.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    this.canvasMap.addEventListener("mousemove", (event) => {
      if (this.isDragging && this.pan) {
        const deltaX = event.clientX - dragStart.x;
        const deltaY = event.clientY - dragStart.y;
        dragStart = { x: event.clientX, y: event.clientY };

        Layers.forEach((layer)=>{
           // Update cursor position
          layer.canvas.cursor.x += deltaX / this.zoom;
          layer.canvas.cursor.y += deltaY / this.zoom; 
          // Redraw the base map
          layer.canvas.setDimensions();
          dragStart = { x: event.clientX, y: event.clientY };
          layer.canvas.moveCanvas(deltaX, deltaY);
        });    
         
      }
    });
  }

  setupEventListeners() {  

    this.canvasMap.addEventListener("wheel", (event) => { 
      event.preventDefault(); 
      const cursorBefore = { x: event.clientX, y: event.clientY };

      if (event.deltaY < 0) {
        this.zoomIn(zoomSpeed);
      } else {
        this.zoomOut(zoomSpeed);
      }
      // Adjust cursor position based on zoom
      const cursorAfter = { x: event.clientX, y: event.clientY };
      this.adjustCursorPosition(cursorBefore, cursorAfter);       
    });
  }

  zoomIn(zoomSpeed) { 
    Layers.forEach((layer)=>{
      layer.canvas.zoom *= 1 + zoomSpeed; 
      layer.canvas.applyTransform();
    }); 
  }

  zoomOut(zoomSpeed) {
    Layers.forEach((layer)=>{
      layer.canvas.zoom *= 1 - zoomSpeed; 
      layer.canvas.applyTransform();
    }); 
  }

  adjustCursorPosition(cursorBefore, cursorAfter) {
    const deltaX = cursorAfter.x - cursorBefore.x;
    const deltaY = cursorAfter.y - cursorBefore.y;

    this.cursor.x -= deltaX / this.zoom;
    this.cursor.y -= deltaY / this.zoom;
  }

  applyTransform() {
    $("#scale").html("Scale: " + this.zoom.toFixed(2));
    if (!this.imageMap.image) {
      this.imageMap.loadImage(document.getElementById("imageInput").files[0], () => {
        this.setDimensions();
        this.projecter.update(this.canvasMap.width, this.canvasMap.height); 
        this.ctx.clearRect(0, 0, this.canvasMap.width, this.canvasMap.height);
        this.ctx.save();
        if(this.canvasName === 'mainCanvas'){
          this.imageMap.draw(this.ctx, this.zoom);
        }        
        this.ctx.restore();
      });
    } else {
      this.setDimensions();
      this.projecter.update(this.canvasMap.width, this.canvasMap.height); 
      this.ctx.clearRect(0, 0, this.canvasMap.width, this.canvasMap.height);
      this.ctx.save(); 
      if(this.canvasName === 'mainCanvas'){
        this.imageMap.draw(this.ctx, this.zoom);
      }  
      this.ctx.restore();
    }
    this.drawFeatures();
  }

  drawFeatures() {
    Layers.forEach((layer) => {
      if (layer.canvas === this) {
        layer.draw();
      }
    });
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
        this.canvasMap.width = this.mapImage.width * this.zoom;
        this.canvasMap.height = this.mapImage.height * this.zoom;
        if(this.canvasName === 'mainCanvas')
        this.drawBaseMap(); // Redraw the base image map after loading 
      };
      reader.readAsDataURL(file);
    } 
  }

  drawBaseMap() {
    // Draw the base image map with the current dimensions
    if (this.mapImage) {
      const imageWidth = this.mapImage.naturalWidth;
      const imageHeight = this.mapImage.naturalHeight;

      // Calculate the position to draw the image at the center of the canvas
      const drawX = (this.canvasMap.width - imageWidth * this.zoom) / 2;
      const drawY = (this.canvasMap.height - imageHeight * this.zoom) / 2;
      if(this.canvasName === 'mainCanvas'){
        this.ctx.drawImage(
          this.mapImage,
          drawX,
          drawY,
          imageWidth * this.zoom,
          imageHeight * this.zoom
        );
      }
      
    }
  }
}

class Attribute {
  constructor() {
    this.matrix = [];
  }

  addColumn(columnData) {
    this.matrix.push(columnData.slice()); // Copy the array to avoid references
  }

  removeColumn(index) {
    this.matrix.splice(index, 1);
  }

  resizeColumn(index, newSize) {
    this.matrix[index].length = newSize;
  }

  addRow(rowData) {
    if (rowData.length === this.matrix.length) {
      rowData.forEach((value, columnIndex) => {
        this.matrix[columnIndex].push(value);
      });
    } else {
      console.error("Row data length does not match the number of columns.");
    }
  }

  removeRow(rowIndex) {
    this.matrix.forEach(column => {
      column.splice(rowIndex, 1);
    });
  }

  resizeRow(rowIndex, newSize) {
    this.matrix.forEach(column => {
      column[rowIndex] = column[rowIndex].slice(0, newSize);
    });
  }
 
  displayMatrix() {
   const $popup = $('<div id="matrix-popup">')
    .css({
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)', // Center the popup
      backgroundColor: '#fff',
      border: '1px solid #000',
      zIndex: 9999,
      padding: '20px',
      minWidth: '400px', // Set a minimum width
      minHeight: '300px', // Set a minimum height
      borderRadius: '8px', // Add rounded corners
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', // Add a subtle shadow
      overflowX: 'auto', // Add horizontal scrollbar 
    })
    .appendTo('body')
    .draggable({
      handle: 'div.handle', // Set the handle for dragging
    });
  
    const $handle = $('<div class="handle">').css({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'move',
      height: '30px', // Set the height of the handle
      backgroundColor: '#3498db', // Set the background color of the handle
      color: '#fff', // Set text color
      padding: '0 10px',
      borderTopLeftRadius: '8px', // Match popup's border-radius
      borderTopRightRadius: '8px', // Match popup's border-radius
    }).appendTo($popup);
  
    // Close button on the top right corner
    const $closeButton = $('<button>&times;</button>')
      .css({
        cursor: 'pointer',
        border: 'none',
        background: 'none',
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#fff',
      })
      .appendTo($handle)
      .on('click', () => {
        $popup.remove();
      });
  
    // Add column button
    const $addColumnButton = $('<button>Add Column</button>')
      .css({
        cursor: 'pointer',
        backgroundColor: '#27ae60',
        color: '#fff',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '4px',
      })
      .appendTo($handle)
      .on('click', () => {
        const columnName = prompt('Enter column name:');
  
        if (columnName !== null) {
          // Add new column with the given name and data type
          const newColumn = Array(this.matrix[0].length).fill(null);
          newColumn[0] = columnName; // Set the column name in the first row
          this.matrix.push(newColumn);
  
          // Update the table with the new column and name
          this.updateTable();
        }
      });
  
    const $table = $('<table>').css({
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '10px',
    }).appendTo($popup);
  
      // Add header row with column names
    const $headerRow = $('<tr>').css({
      backgroundColor: '#3498db',
      color: '#fff',
    }).appendTo($table);

    this.matrix.forEach((column, columnIndex) => {
      $('<th>').text(column[0] || `Column ${columnIndex + 1}`).css({
        padding: '15px',
        textAlign: 'left',
        borderBottom: '1px solid #ddd',
      }).appendTo($headerRow);
    });

  
    // Add data rows
    for (let rowIndex = 1; rowIndex < this.matrix[0].length; rowIndex++) {
      const $row = $('<tr>').appendTo($table);

      for (let columnIndex = 0; columnIndex < this.matrix.length; columnIndex++) {
        const $cell = $('<td>').css({
          border: '1px solid #ddd',
          padding: '10px',
        }).appendTo($row);
        const $input = $('<input>').val(this.matrix[columnIndex][rowIndex] !== null ? this.matrix[columnIndex][rowIndex] : '').css({
          width: '100%',
          boxSizing: 'border-box',
          padding: '8px',
        }).appendTo($cell);
      }
    }

  
    // Add save button
    const $saveButton = $('<button id="save-button">Save Changes</button>')
      .css({
        marginTop: '15px',
        backgroundColor: '#e74c3c',
        color: '#fff',
        border: 'none',
        padding: '10px 15px',
        borderRadius: '4px',
        cursor: 'pointer',
      })
      .appendTo($popup)
      .on('click', () => {
        // Update matrix values with input values
        $('table input').each((index, element) => {
          const newValue = $(element).val();
          const columnIndex = index % this.matrix.length;
          const rowIndex = Math.floor(index / this.matrix.length);
          this.matrix[columnIndex][rowIndex] = newValue !== '' ? newValue : null;
        });
  
        // Close the popup
        $popup.remove();
      });
  }
  
  updateTable() {
    const $table = $('#matrix-popup table').empty();
    // Add data rows
    for (let rowIndex = 0; rowIndex < this.matrix[0].length; rowIndex++) {
      const $row = $('<tr>').appendTo($table);
  
      for (let columnIndex = 0; columnIndex < this.matrix.length; columnIndex++) {
        const $cell = $('<td>').css({
          border: '1px solid #ddd',
          padding: '10px',
        }).appendTo($row);
        const $input = $('<input>').val(this.matrix[columnIndex][rowIndex] !== null ? this.matrix[columnIndex][rowIndex] : '').css({
          width: '100%',
          boxSizing: 'border-box',
          padding: '8px',
        }).appendTo($cell);
      }
    }
  } 

}
  

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 4;
    this.color = "red";
  }
  setColor(color){
    this.color = color;
  }
  setSize(size) {
    this.size = size;
  }

  draw(canvasctx) {
    canvasctx.beginPath();
    canvasctx.fillStyle = this.color;
    canvasctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    canvasctx.fill(); 
    $("#scale").html(this.x + ", " + this.y);
  }
}

class Line {
  constructor(x1, y1, x2 = undefined, y2 = undefined) {
    this.linePoints = [];
    this.linePoints.push(new Point(x1, y1));
    if (x2 !== undefined && y2 !== undefined) {
      this.linePoints.push(new Point(x2, y2));
    }
    this.size = 2;
    this.color = "white";
    this.completed = false;
  }

  setSize(size){
    this.size = size;
  }
  setColor(color){
    this.color = color;
  }

  addNextPoint(x, y) {
    this.linePoints.push(new Point(x, y));
  }

  draw(canvasctx) { 
    if (this.linePoints.length < 2) {
      return; // Need at least two points to draw a line
    }

    canvasctx.beginPath();
    canvasctx.strokeStyle = this.color;
    canvasctx.lineWidth = this.size;

    // Move to the starting point
    canvasctx.moveTo(this.linePoints[0].x, this.linePoints[0].y);

    // Draw lines between consecutive points
    for (let i = 1; i < this.linePoints.length; i++) {
      canvasctx.lineTo(this.linePoints[i].x, this.linePoints[i].y);
    }

    canvasctx.stroke();

    // Draw each point
    this.linePoints.forEach((point) => {
      point.color = this.color;
      point.draw(canvasctx);
    });
  }
}

class Polygon {
  constructor(startX, startY) {
    this.Polypoints = [];
    this.Polypoints.push(new Point(startX, startY));
    this.OutlineColor = "white";
    this.color = "rgba(255,0,0,0.2)";
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

  draw(canvasctx) {
    canvasctx.lineWidth = this.size;
    let nPoint = this.Polypoints.length;
    if (nPoint >= 2) { 
      canvasctx.beginPath();
      canvasctx.strokeStyle = this.OutlineColor;
      canvasctx.fillStyle = this.color;
  
      canvasctx.moveTo(this.Polypoints[0].x, this.Polypoints[0].y);
  
      for (let i = 1; i < nPoint; i++) {
        canvasctx.lineTo(this.Polypoints[i].x, this.Polypoints[i].y);
      }
  
      canvasctx.closePath();
      canvasctx.fill();
      canvasctx.stroke();
  
      // Draw each point
      for (let i = 0; i < nPoint; i++) {
        this.Polypoints[i].color = this.color;
        this.Polypoints[i].draw(canvasctx);
      }
    }
  }
  

}

class Layer {
  constructor(canvas, layerName,  type='line', color = "rgba(0,0,255, 0.5)", size = 1, coordinateSystem = "WGS84") {
    this.type = type; 
    this.layerName = layerName;
    this.color = color;
    this.featureSet = [];
    this.size = size;
    this.canvas = canvas;
    this.coordinateSystem = coordinateSystem; 
    this.layerId = 'layer' + Layers.length; 
    this.attributeTable = new Attribute();
    this.initAttr();
  }  

  initAttr(){
    switch(this.type){
      case 'point': 
        this.attributeTable.addColumn(['id']); 
        this.attributeTable.addColumn(['Latitude']);
        this.attributeTable.addColumn(['Longitude'])
        break;
      case 'line':
        this.attributeTable.addColumn(['id']);
        this.attributeTable.addColumn(['Type']);
        break;
      case 'polygon':
        this.attributeTable.addColumn(['id']);
        this.attributeTable.addColumn(['Type']);
        break;
    }
  }

  addFeatureToAttrTable(object){
    switch(this.type){
      case 'point':
        this.attributeTable.addRow([this.featureSet.length, object.y, object.x]);
        break;
      case 'line':
        this.attributeTable.addRow([this.featureSet.length, object.type]);
    }
    
  }

  addToLayerBar(layerName) {
    // Add a div with a checkbox and layer name for the new layer
    const layerDiv = $('<div>', { id: this.layerId });
    const checkbox = $('<input>', {
      type: 'checkbox', 
      name: 'layerCheckbox',
      value: this.layerId
    });
    const checkboxAttr = $('<input>', {
      type: 'checkbox', 
      name: 'layerCheckbox',
      value: this.layerId,
      id: this.layerId+'Attr'
    });
    layerDiv.addClass('Hover');
    layerDiv.addClass('margin');
    const layerNameSpan = $('<span>').text(layerName);
 
    layerDiv.append(checkbox, layerNameSpan, checkboxAttr);
 
    $('#layersBar').append(layerDiv);
 
    checkbox.change(() => {
      this.toggleVisibility();      
    });

    checkboxAttr.change(()=>{
      this.attributeTable.displayMatrix();  // Attr
    })
  }

  toggleVisibility() { 
    console.log(`Layer ${this.layerId} visibility toggled.`);
    $('#'+this.canvas.canvasName).toggle();
  }
 
  draw() {  
    let reprojected = [];  
    for (let i = 0; i < this.featureSet.length; i++) {
      if (this.type === 'point') {
        let rpro = this.canvas.projecter.projectedToCanvas(this.featureSet[i].x, this.featureSet[i].y);
        reprojected.push(new Point(rpro.x, rpro.y));
      } else if (this.type === 'line') {
        let lin = [];
        for(let j = 0; j < this.featureSet[i].linePoints.length; j++){
          let rpro = this.canvas.projecter.projectedToCanvas(this.featureSet[i].linePoints[j].x, this.featureSet[i].linePoints[j].y);
          lin.push(new Point(rpro.x, rpro.y));
        }
        reprojected.push(lin); 
      } else if (this.type === 'polygon') {
        let pol = [];
        for (let j = 0; j < this.featureSet[i].Polypoints.length; j++) {
          let rpro = this.canvas.projecter.projectedToCanvas(this.featureSet[i].Polypoints[j].x, this.featureSet[i].Polypoints[j].y);
          pol.push(new Point(rpro.x, rpro.y));
        }
        reprojected.push(pol);
      }
    }
  
    let polygons = [];
    if (this.type === 'polygon') {
      for (let i = 0; i < reprojected.length; i++) {
        let polygonPoints = reprojected[i];
        let polygon = null;  
        for (let j = 0; j < polygonPoints.length; j++) {
          if(j == 0){
            polygon = new Polygon(polygonPoints[j].x, polygonPoints[j].y);
          }else{
            polygon.addNextPoint(polygonPoints[j].x, polygonPoints[j].y);
          }            
        }  
        polygon.draw(this.canvas.ctx);
        polygons.push(polygon);
      }
    }

    let lines = [];
    if(this.type === 'line'){      
      for(let i =  0; i < reprojected.length; i++){        
        let linePoints = reprojected[i];
        let line = null;
        for(let j = 0; j < linePoints.length; j++){
          if(j == 0){
            line = new Line(linePoints[j].x, linePoints[j].y);
          }else{
            line.addNextPoint(linePoints[j].x, linePoints[j].y);
          }
        }
        line.draw(this.canvas.ctx);
        lines.push(line);
      }
    }
  
    switch (this.type) {
      case 'polygon':
        polygons.forEach((polygon) => {
          polygon.setColor(this.color)
          polygon.setSize(this.size);
          polygon.draw(this.canvas.ctx);
        });
        break;
      case 'point':
        reprojected.forEach((point) => {
          point.setColor(this.color)
          point.setSize(this.size);
          point.draw(this.canvas.ctx);
        });
        break;      
      case 'line':
        lines.forEach((line)=>{
          line.setColor(this.color);
          line.setSize(this.size);
          line.draw(this.canvas.ctx);
        });
        break;
    }
  }
   
  addBaseMap(){
    this.canvas.addBaseMap();   
  }

  setDimensions(dimensions=DEFUALT_CANVAS_SIZE){
    this.canvas.setDimensions(dimensions);
  }

  addPan(){ 
    this.canvas.addPan();
  }

  showCoordinate(){
    this.canvas.canvasMap.addEventListener('mousemove', (event)=>{
      let rect = this.canvas.canvasMap.getBoundingClientRect();
      let x = event.clientX - rect.left;
      let y = event.clientY - rect.top;
      let pro = {};
      pro = this.canvas.projecter.canvasToProjected(x, y);
      $("#scale").html("Point: (" + pro.x.toPrecision(5) + ", " + pro.y.toPrecision(5) + ")");
    });
  }

  addClickListener(){
    this.canvas.canvasMap.addEventListener("click", (event)=> {
      if (this.canvas.pan || this.canvas.canvasName === 'mainCanvas') return; // panning don't distrub        
      let rect = this.canvas.canvasMap.getBoundingClientRect();
      let x = event.clientX - rect.left;
      let y = event.clientY - rect.top;
      let pro = {};
      pro = this.canvas.projecter.canvasToProjected(x, y);
      x = pro.x;
      y = pro.y; 
      let object = {}
      switch (this.type) {
        case "point": 
          this.featureSet.push(new Point(x, y)); 
          object = {x: x, y: y}
          this.addFeatureToAttrTable(object);
          break;
        case "line":
          if(this.featureSet.length == 0 || this.featureSet[this.featureSet.length-1].completed){
            this.featureSet.push(new Line(x,y));
            this.featureSet[this.featureSet.length-1].completed = false;
          }else{
            this.featureSet[this.featureSet.length-1].addNextPoint(x,y);
          }              
          break;
        case "polygon":
          if (this.featureSet.length == 0 ||this.featureSet[this.featureSet.length-1].completed) { 
            this.featureSet.push(new Polygon(x, y));
            this.featureSet[this.featureSet.length-1].completed = false; 
          } else { 
            this.featureSet[this.featureSet.length - 1].addNextPoint(x,y);  
          }
          break;
      }
      this.draw();
    });
  }

  addKeyBoard(){
    document.addEventListener("keydown", (e)=> {
      console.log('F2 pressed');
      let object = {};
      switch (e.key) {        
        case "F2":
          if(this.type === 'polygon'){ 
            object = {type: this.layerName};
            this.addFeatureToAttrTable(object);
            this.featureSet[this.featureSet.length-1].completed = true;                                    
          }  
          else if(this.type === 'line'){
            this.featureSet[this.featureSet.length-1].completed = true;
            object = {type: this.layerName}
            this.addFeatureToAttrTable(object);
          }        
          break; 
      }
    });
  }

 
}



 
const c2 = new Canvas('mainCanvas', 0, 0);  
const layer2 = new Layer(c2);

Layers.push(layer2);
 
Layers[0].addBaseMap();

$(".baseMap").on({
  change: function () { 
    Layers[0].addBaseMap();
  },
});
 

window.addEventListener("resize", function () { 
  Layers[0].setDimensions();
}); 
 

Layers[0].showCoordinate(); 
Layers[0].addClickListener(); 
Layers[0].addKeyBoard(); 
Layers[0].addPan();

$(document).ready(function () {
  const openButton = $("#createLayer");
  const layerForm = $("#layerForm");
  const closeButton = $("#closeButton");
  const form = $("#layerProperties");

  openButton.click(function () {
    layerForm.show(100);
  });

  closeButton.click(function () {
    layerForm.hide();
  });

  form.submit(function (event) {
    event.preventDefault();
    const formData = new FormData(form[0]);
    const formDataObject = {};
    formData.forEach((value, key) => {
      formDataObject[key] = value;
    }); 
    console.log("Form Data:", formDataObject);
 
    let canvas = $('<canvas>', {
      id: 'canvas' + Layers.length + 1,
      class: 'canvas'
    });
 
    $('#workspace').append(canvas);
 
    $(document).ready(function () { 
      const c = new Canvas('canvas' + Layers.length + 1, 0, 0);
      const newLayer = new Layer(
        c,
        formDataObject.layerName,
        formDataObject.layerType,
        formDataObject.layerColor,
        formDataObject.layerSize,
        formDataObject.projection
      );
      Layers.push(newLayer);
 
      newLayer.addToLayerBar(formDataObject.layerName);
      newLayer.addClickListener();
      newLayer.showCoordinate();
      newLayer.addKeyBoard();
      newLayer.addPan(); 
    });
 
    layerForm.hide(100);
  });
 
  $(window).click(function (event) {
    if (event.target === layerForm[0]) {
      layerForm.hide();
    }
  });
});

 

 


