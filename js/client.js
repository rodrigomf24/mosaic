// Edit me.
function handleFileSelect(event) {
    event.stopPropagation();
    event.preventDefault();

    var files = event.dataTransfer.files;

    var output = [];
    for (var i = 0, f; f = files[i]; i++) {
        if (!f.type.match('image.*')) {
            continue;
        }

        var reader = new FileReader();
        reader.onload = (function(file) {
            return function(e) {
                // remove mosaic wrapper if it was already created, will kick in at the second time the image is created
                if (document.getElementById('tile-img-wrapper') !== null) {
                    document.body.removeChild(document.getElementById('tile-img-wrapper'));
                }

                // create new mosaic wrapper and append it to body tag
                var container = document.createElement('div');
                container.id = 'tile-img-wrapper';
                document.body.appendChild(container);

                // create new instance of image slicer
                var tileGenerator = new ImageSlicingTest();
                container = document.getElementById('tile-img-wrapper');
                // create new mosaic
                tileGenerator.main(e, container);
            }
        })(f);

        // rad as img url
        reader.readAsDataURL(f);
    }
}

function handleDragOver(event) {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
}

// finds how many tiles fit in the image with
function findHighestDivider(size, initialCount) {
    while (size % initialCount !== 0) {
        initialCount--;
    }
    return initialCount;
}

function ImageSlicingTest() {
    var tilesContainer;
    this.main = function(event, container) {
        tilesContainer = container || document.body;
        var imageToSlice = new Image();
        imageToSlice.onload = main2;
        imageToSlice.src = event.target.result;
    }

    function main2(event) {
        var limit = 100;

        var xCoord = findHighestDivider(this.width, limit);
        // calculate amount of times the tile height would fit in the image height,
        // in order to have even tiles we use the previously calculated width of the tile
        var yCoord = Math.round(this.height / xCoord);
        // get divider of image with and tile size
        xCoord = this.width / xCoord;
        var imageToSlice = event.target;

        // get image tiles in rows and columns format
        var imageTiles = new ImageHelper().sliceImageIntoTiles(imageToSlice, new Coords(xCoord, yCoord));
        var imageTileSize = new Coords(imageTiles[0][0].width, imageTiles[0][0].height);

        // loop through rows and columns and generate html content
        for (var r = 0; r < imageTiles.length; r++) {
            var row = document.createElement('div');
            row.className += 'row';
            row.style.width = this.width + 'px'; //((this.width - xCoord)+5)+'px';
            row.style.height = 'auto';
            for (var i = 0; i < imageTiles[r].length; i++) {
                var imageTile = imageTiles[r][i];

                var drawPos = new Coords(i * 2, 0).multiply(imageTileSize);

                var col = document.createElement('div');
                col.className += 'col';
                col.style.height = imageTiles[r][i].height + 'px';
                col.style.width = imageTiles[r][i].width + 'px';
                col.style.position = 'relative';

                var tileColor = document.createElement('div');
                tileColor.style.backgroundColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
                tileColor.style.opacity = '0.5';
                // it does not mkae use of the exact height since the browser adds pixels to the html element
                tileColor.style.height = (r === (imageTiles.length - 1)) ? (imageTiles[r][i].height) + 'px' : (imageTiles[r][i].height - 4) + 'px';
                tileColor.style.width = imageTiles[r][i].width + 'px';
                tileColor.style.position = 'absolute';
                tileColor.style.zIndex = 1;
                tileColor.style.top = 0;

                imageTile.style.left = drawPos.x;
                imageTile.style.top = drawPos.y;
                col.appendChild(imageTile);
                col.appendChild(tileColor);
                row.appendChild(col);
            }
            if (i === imageTiles[r].length) {
                tilesContainer.appendChild(row);
            }
        }
    }
}

// generates x and y axis coordenates object 
function Coords(x, y) {
    this.x = x;
    this.y = y;

    this.clone = function() {
        return new Coords(this.x, this.y);
    }

    this.divide = function(other) {
        this.x /= other.x;
        this.y /= other.y;

        return this;
    }

    this.multiply = function(other) {
        this.x *= other.x;
        this.y *= other.y;

        return this;
    }

    this.overwriteWith = function(other) {
        this.x = other.x;
        this.y = other.y;

        return this;
    }

    this.toString = function() {
        return "(" + this.x + "," + this.y + ")";
    }
}
// retrieve rgb from tile
function getRgb(graphics) {
    var blockSize = 5,
        data,
        rgb = {
            r: 0,
            g: 0,
            b: 0
        };
    length,
    count = 0,
        i = -4;

    try {
        data = graphics.getImageData(0, 0, 16, 16);
    } catch (e) {
        return {
            r: 0,
            g: 0,
            b: 0
        };
    }

    length = data.data.length;

    while ((i += blockSize * 4) < length) {
        ++count;
        rgb.r += data.data[i];
        rgb.g += data.data[i + 1];
        rgb.b += data.data[i + 2];
    }

    // ~~ used to floor values
    rgb.r = ~~(rgb.r / count);
    rgb.g = ~~(rgb.g / count);
    rgb.b = ~~(rgb.b / count);

    return rgbToHex(rgb);
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

// converts rgb to hex
function rgbToHex(rgb) {
    return componentToHex(rgb.r) + componentToHex(rgb.g) + componentToHex(rgb.b);
}

// retrieves svg from server
function getTileSvg(param) {
    return new Promise(function(resolve, reject) {
        function handler() {
            if (this.status == 200 &&
                this.responseXML != null) {
                // success!
                resolve(this.responseXML);
            } else {
                // something went wrong
                resolve(false);
            }
        }

        var client = new XMLHttpRequest();
        client.onload = handler;
        client.open('GET', '/color/' + param);
        client.send();
    });
}

// slices the image into tiles based on x and y coordenates
function ImageHelper() {
    this.sliceImageIntoTiles = function(imageToSlice, sizeInTiles) {
        var returnImages = new Array();

        var imageToSliceSize = new Coords(imageToSlice.width, imageToSlice.height);
        var tileSize = imageToSliceSize.clone().divide(sizeInTiles);

        var tilePos = new Coords(0, 0);
        var sourcePos = new Coords(0, 0);

        for (var y = 0; y < sizeInTiles.y; y++) {
            tilePos.y = y;
            var row = new Array();
            for (var x = 0; x < sizeInTiles.x; x++) {
                tilePos.x = x;

                var canvas = document.createElement("canvas");
                canvas.id = "tile_" + x + "_" + y;
                canvas.width = tileSize.x;
                canvas.height = tileSize.y;

                var graphics = canvas.getContext("2d");

                sourcePos.overwriteWith(tilePos).multiply(tileSize);

                graphics.drawImage(
                    imageToSlice,
                    sourcePos.x, sourcePos.y, // source pos
                    tileSize.x, tileSize.y, // source size
                    0, 0, // destination pos
                    tileSize.x, tileSize.y // destination size
                );

                var imageFromCanvasURL = canvas.toDataURL("image/png");
                var imageFromCanvas = document.createElement("img");
                imageFromCanvas.width = canvas.width;
                imageFromCanvas.height = canvas.height;
                imageFromCanvas.src = imageFromCanvasURL;


                row.push(imageFromCanvas);

                //once we hit our size of columns, the new row is pushed to the row list
                if (x === (sizeInTiles.x - 1)) {
                    returnImages.push(row);
                    row = new Array();
                }
            }
        }

        return returnImages;
    }
}