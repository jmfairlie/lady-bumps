/* Engine.js
 * This file provides the game loop functionality (update entities and render),
 * draws the initial game board on the screen, and then calls the update and
 * render methods on your player and enemy objects (defined in your app.js).
 *
 * A game engine works by drawing the entire game screen over and over, kind of
 * like a flipbook you may have created as a kid. When your player moves across
 * the screen, it may look like just that image/character is moving or being
 * drawn but that is not the case. What's really happening is the entire "scene"
 * is being drawn over and over, presenting the illusion of animation.
 *
 * This engine is available globally via the Engine variable and it also makes
 * the canvas' context (ctx) object globally available to make writing app.js
 * a little simpler to work with.
 */

var Engine = (function(global) {
    /* Predefine the variables we'll be using within this scope,
     * create the canvas element, grab the 2D context for that canvas
     * set the canvas elements height/width and add it to the DOM.
     */
    var doc = global.document,
        win = global.window,
        canvas = doc.createElement('canvas'),
        ctx = canvas.getContext('2d'),
        lastTime;

    canvas.width = 505;
    canvas.height = 606;
    doc.body.appendChild(canvas);
    var map;
    var map_tiles;
    var item_tiles;
    var numCols;
    var numRows;
    var spriteWidth = 101;
    var spriteHeight = 171;
    var mapTileWidth = 101;
    var mapTileHeight = 83;
    var mapTileTopGap = 50;
    var levelOffset = 41;
    //absolute location where the player sprite will appear on the screen
    var playerAbsolutePosX;
    var playerAbsolutePosY;

    //range of visible tiles
    var colStart,
        colEnd,
        rowStart,
        rowEnd;

    global.mapTileWidth = mapTileWidth;
    global.mapTileHeight = mapTileHeight;

    /* This function serves as the kickoff point for the game loop itself
     * and handles properly calling the update and render methods.
     */
    function main() {
        /* Get our time delta information which is required if your game
         * requires smooth animation. Because everyone's computer processes
         * instructions at different speeds we need a constant value that
         * would be the same for everyone (regardless of how fast their
         * computer is) - hurray time!
         */
        var now = Date.now(),
            dt = (now - lastTime) / 1000.0;

        /* Call our update/render functions, pass along the time delta to
         * our update function since it may be used for smooth animation.
         */
        if(update(dt))
        {
            render();
        }


        /* Set our lastTime variable which is used to determine the time delta
         * for the next time this function is called.
         */
        lastTime = now;

        /* Use the browser's requestAnimationFrame function to call this
         * function again as soon as the browser is able to draw another frame.
         */
        win.requestAnimationFrame(main);
    }

    /* This function does some initial setup that should only occur once,
     * particularly setting the lastTime variable that is required for the
     * game loop.
     */
    function init() {
        reset();
        lastTime = Date.now();
        updatePOV();
        render();
        main();
    }

    /* This function is called by main (our game loop) and itself calls all
     * of the functions which may need to update entity's data. Based on how
     * you implement your collision detection (when two entities occupy the
     * same space, for instance when your character should die), you may find
     * the need to add an additional function call here. For now, we've left
     * it commented out - you may or may not want to implement this
     * functionality this way (you could just implement collision detection
     * on the entities themselves within your app.js file).
     */
    function update(dt) {
        return updateEntities(dt);
        // checkCollisions();
    }

    /* This is called by the update function  and loops through all of the
     * objects within your allEnemies array as defined in app.js and calls
     * their update() methods. It will then call the update function for your
     * player object. These update methods should focus purely on updating
     * the data/properties related to  the object. Do your drawing in your
     * render methods.
     */
    function updateEntities(dt) {
        var entitiesMoved = false;
        allEnemies.forEach(function(enemy) {
            entitiesMoved =  enemy.update(dt) || entitiesMoved;
        });
        var playerMoved = player.update(dt);
        entitiesMoved = entitiesMoved || playerMoved;
        if(playerMoved)
        {
            updatePOV();
        }
        return entitiesMoved;
    }

    /*
     * Calculate:
     *  (1) where in the screen the player will be located and,
     *  (2) which tiles from the entire map are visible based on player location
     */
    function updatePOV() {

        if ( player.x + player.sw/2 < canvas.width/2) {
            playerAbsolutePosX = player.x;
        }
        else if( player.x + player.sw/2 > numCols*mapTileWidth - canvas.width/2) {
            playerAbsolutePosX =  canvas.width + player.x - numCols*mapTileWidth;
        }
        else {
            playerAbsolutePosX = (canvas.width - player.sw)/2;
        }

        if ( player.y + player.sh*2/3 < canvas.height/2) {
            playerAbsolutePosY = player.y;
        }
        else if( player.y + player.sh*2/3 > numRows*mapTileHeight - canvas.height/2) {
            playerAbsolutePosY =  canvas.height + player.y - numRows*mapTileHeight;
        }
        else {
            playerAbsolutePosY = canvas.height/2 - player.sh*2/3;
        }

        //don't render all tiles but just those that are visible
        colStart = Math.floor(Math.max(0, player.x - playerAbsolutePosX)/mapTileWidth),
        colEnd = Math.floor(Math.min((numCols -1)*mapTileWidth, player.x + canvas.width - playerAbsolutePosX)/mapTileWidth) + 1,
        rowStart = Math.floor(Math.max(0, player.y - playerAbsolutePosY)/mapTileHeight),
        //one extra tile to take into account stacked tiles
        rowEnd = Math.min(numRows, Math.floor(Math.min((numRows-1)*mapTileHeight, player.y + canvas.height - playerAbsolutePosY)/mapTileHeight) + 3);
    }

    function hilightTiles(entity, level, row, col, ctx, color) {
        if(entity.level == level) {
            if((entity.tileTop  == row || entity.tileBottom == row) &&
              (entity.tileLeft == col || entity.tileRight  == col))
            {
                ctx.beginPath();
                ctx.globalAlpha=0.4;
                ctx.rect(col * mapTileWidth, row * mapTileHeight + mapTileTopGap, mapTileWidth, mapTileHeight);
                ctx.fillStyle = color;
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha=1;
            }
        }
    }

    /* This function initially draws the "game level", it will then call
     * the renderEntities function. Remember, this function is called every
     * game tick (or loop of the game engine) because that's how games work -
     * they are flipbooks creating the illusion of animation but in reality
     * they are just drawing the entire screen over and over.
     */
    function render() {

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
            ctx.translate(playerAbsolutePosX - player.x,
                          playerAbsolutePosY - player.y);

            renderMap(rowStart,
                      rowEnd,
                      colStart,
                      colEnd,
                      0,
                      map.length,
                      1,
                      debug);

            renderEntities();
            renderFakeZDepth();
        ctx.restore();
    }

    function renderMap(ri, rf, ci, cf, li, lf, alpha, debug)
    {
        var row,col, level;
        /* Loop through the number of rows and columns we've defined above
         * and, using the tiles and map arrays, draw the correct image for that
         * portion of the "grid"
         */
        ctx.save();
        ctx.globalAlpha=alpha;
        ctx.translate(0, -mapTileTopGap);
        for (row = ri; row < rf; row++) {
            for (col = ci; col < cf; col++) {
                for (level = li; level < lf ; level++)
                {
                    var tile = map[level][row*numCols + col];
                    //skip empty spaces in map
                    if(tile != ".") {
                        var tileURL = Resources.get(map_tiles[tile]);
                        ctx.save();
                        ctx.translate(0, -levelOffset*level);
                        ctx.drawImage(tileURL,
                                          col * mapTileWidth,
                                          row * mapTileHeight);
                        if(debug) {
                            //highlight the tiles the player is stepping on
                            hilightTiles(player, level, row, col, ctx, 'yellow');
                            //draw tile coords
                            ctx.fillStyle = 'magenta';
                            ctx.font = "15px serif";
                            ctx.fillText("("+Math.floor(col)+", "+Math.floor(row)+", "+level+")", col * mapTileWidth + 20, row * mapTileHeight+100);
                        }
                        ctx.restore();
                    }
                }
            }
        }
        ctx.restore();
    }

    /* This function is called by the render function and is called on each game
     * tick. It's purpose is to then call the render functions you have defined
     * on your enemy and player entities within app.js
     */
    function renderEntities() {
        /* Loop through all of the objects within the allEnemies array and call
         * the render function you have defined.
         */
        player.render();
        allEnemies.forEach(function(enemy) {
            {
                enemy.render();
            }

        });
    }

    function renderFakeZDepth() {
        redrawFrontTiles(player);
        allEnemies.forEach(function(enemy) {
            redrawFrontTiles(enemy);
        });
    }

    function redrawFrontTiles(entity) {
        if(entity.tileBottom + 1 < rowEnd &&
           entity.tileBottom + 1 >= rowStart &&
           entity.tileRight >= colStart &&
           entity.tileLeft < colEnd &&
           entity.level + 1 < map.length)
        {
            var ri = entity.tileBottom + 1,
                rf = rowEnd,
                ci = Math.max(colStart, entity.tileLeft),
                cf = Math.min(colEnd, entity.tileRight + 1),
                li = entity.level + 1;
                lf = map.length;
            renderMap(ri, rf, ci, cf, li, lf, 1, true);
        }
    }

    /* This function d a good place to
     * handle game reset states - maybe a new game menu or a game over screen
     * those sorts of things. It's only called once by the init() method.
     */
    function reset() {
        var level1 =
               "BBBBBBBBBBBBBBBBBBBB\
                .GGGGGGGGGGGGGGGGGGG\
                .CCCCCCCCCCCCCCCCCC.\
                .CCCCCCCCCCCCCCCCCC.\
                .CCCCCCCCCCCCCCCCCC.\
                .CCCGGGGGGGGGGGGCCC.\
                .CCCGGGGGGGGGGGGCCC.\
                .CCCGGGGGGGGGGGGCCC.\
                .CCCGGGGGGGGGGGGCCC.\
                .CCCGGGGGGGGGGGGCCC.\
                .CCCGGGGGGGGGGGGCCC.\
                .CCCGCCGGGGGGCCGCCC.\
                .CCCGCCGGCCGGCCGCCC.\
                .CCCGGGCCGGCCGGGCCC.\
                .CCCGGGCCGGCCGGGCCC.\
                .CCCGGGGGCCGGGGGCCC.\
                .CCCGGGGGCCGGGGGCCC.\
                .CCCGGGGGGGGGGGGCCC.\
                .CCCGGGGGGGGGGGGCCC.\
                .CCCGGGGGGCGGGGGCCC.\
                .CCCGGGGGCCCGGGGCCC.\
                .CCCGGGGGGCGGGGGCCC.\
                .CCCGGCCCCCCCCCGCCC.\
                .CCCGGGGCCCCCGGGCCC.\
                .CCCGGGGGCCCGGGGCCC.\
                .CCCGGGGGCCCGGGGCCC.\
                .CCCGGGGGCGCGGGGCCC.\
                .CCCGGGGGCGCGGGGCCC.\
                .CCCGGGGGCGCGGGGCCC.\
                .CCCGGGGGGGGGGGGCCC.\
                .CCCCCCCCCCCCCCCCCC.\
                .CCCCCCCCCCCCCCCCCC.\
                .CCCCCCCCCCCCCCCCCC.\
                ....................";

        var level2 =
               "....................\
                MMMMMMMMMMMMMMMMMMMM\
                M..................M\
                M.........F.....I..M\
                M......F...........M\
                M..................M\
                M...............I..M\
                M........CC........M\
                M........CC........M\
                M........CCCC......M\
                M......CCCC........M\
                M........CC........M\
                M........CC....D...M\
                M....I.............M\
                M..................M\
                M.......D.....D....M\
                M..................M\
                M..................M\
                M....F......F......M\
                M..................M\
                M..................M\
                M..................M\
                M........F.....D...M\
                M..................M\
                M..................M\
                M...I..............M\
                M..............F...M\
                M..................M\
                M..................M\
                M.....F.......D....M\
                M..................M\
                M.........I........M\
                M..................M\
                MMMMMMMMMMMMMMMMMMMM";

        var level3 =
               "....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                .........CC.........\
                .........CC.........\
                .........CCCC.......\
                .......CCCC.........\
                .........CC.........\
                .........CC.........\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................";

        var level4 =
               "....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                .........CC.........\
                .........CC.........\
                .........CCCC.......\
                .......CCCC.........\
                .........CC.........\
                .........CC.........\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................";

//remove empty spaces from string.
        level1 = level1.replace(/\s+/g,"");
        level2 = level2.replace(/\s+/g,"");
        level3 = level3.replace(/\s+/g,"");
        level4 = level4.replace(/\s+/g,"");

        map =
            [
                level1,
                level2,
                level3,
                level4
            ]

        map_tiles = {
                      'A': 'images/ramp-west.png',
                      'B': 'images/water-block.png',
                      'C': 'images/stone-block.png',
                      'D': 'images/dirt-block.png',
                      'E': 'images/brown-block.png',
                      'F': 'images/plain-block.png',
                      'G': 'images/grass-block.png',
                      'H': 'images/stone-tall-block.png',
                      'I': 'images/wood-block.png',
                      'J': 'images/ramp-east.png',
                      'K': 'images/ramp-north.png',
                      'L': 'images/ramp-south.png',
                      'M': 'images/wall-block.png',
                      'O': 'images/wall-block-tall.png'
                    };

        item_tiles = {
                        '1': 'images/tree-short.png',
                        '2': 'images/tree-tall.png',
                        '3': 'images/tree-ugly.png'
                     }

        numCols = 20;
        numRows = map[0].length/numCols;

        global.numCols = numCols;
        global.numRows = numRows;
        global.map = map;
    }

    /* Go ahead and load all of the images we know we're going to need to
     * draw our game level. Then set init as the callback method, so that when
     * all of these images are properly loaded our game will start.
     */
    Resources.load([
        'images/stone-block.png',
        'images/water-block.png',
        'images/grass-block.png',
        'images/enemy-bug.png',
        'images/char-boy.png',
        'images/brown-block.png',
        'images/dirt-block.png',
        'images/plain-block.png',
        'images/stone-tall-block.png',
        'images/tree-short.png',
        'images/tree-tall.png',
        'images/tree-ugly.png',
        'images/wood-block.png',
        'images/ramp-east.png',
        'images/ramp-north.png',
        'images/ramp-south.png',
        'images/ramp-west.png',
        'images/shadow-east.png',
        'images/shadow-north.png',
        'images/shadow-north-east.png',
        'images/shadow-north-west.png',
        'images/shadow-side-west.png',
        'images/shadow-south.png',
        'images/shadow-south-east.png',
        'images/shadow-south-west.png',
        'images/shadow-west.png',
        'images/wall-block.png',
        'images/wall-block-tall.png'
    ]);
    Resources.onReady(init);

    /* Assign the canvas' context object to the global variable (the window
     * object when run in a browser) so that developer's can use it more easily
     * from within their app.js files.
     */
    global.ctx = ctx;
})(this);
