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

    canvas.width = 600;
    canvas.height = 805;
    doc.body.appendChild(canvas);
    var map;
    var shadow_map;
    var map_tiles;
    var item_tiles;
    var shadow_tiles;
    var numCols;
    var numRows;
    var spriteWidth = 101;
    var spriteHeight = 171;
    var mapTileWidth = 101;
    var mapTileHeight = 81;
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
        updateViewPort();
        render();
        main();
    }

/*
 * fills up the shadow_map data structure which contains the information
 * of where in the map to draw shadows. These calculations are based on
 * the topography of the tile maps.
 * This logic is mostly an implementation of the algorithm described here:
 * http://lunar.lostgarden.com/uploaded_images/PlanetCuteShadowTest-734680.jpg
 */
    function createShadowMap() {
        shadow_map = new Array();
        var c, r, top, shadows,t1,t2, special, valid, any, temp, se;

        for(level=0; level< map.length; level++) {
            shadow_map.push(new Array());
            for(row=0; row < numRows; row++) {
                for(col=0; col< numCols; col++) {
                    shadows = null;
                    top = level < (map.length - 1) && map[level+1][row*numCols + col]>='A';
                    tile = map[level][row*numCols + col]>='A';

                    if(tile)
                    {
                        temp = []
                        any = false;
                        s = (row + 1) < numRows &&
                             map[level][(row+1)*numCols + col]!='.';


                        se = !s && (row + 1) < numRows && (col - 1)>= 0 &&
                             map[level][(row+1)*numCols + col - 1]!='.'

                        ds = (row + 1) < numRows && (level - 1) >= 0 && level == 1 &&
                             map[level-1][(row+1)*numCols + col] !='.';

                        ss = !s && ds;
                        any = any || se || ss;
                        temp.push(se);
                        temp.push(ss);

                        if(!top && level < map.length - 1) {
                            for(i=-1; i< 2; i++) {
                                for(j=-1; j< 2; j++) {
                                    var center = j==0 && i== 0;
                                    if(!center)
                                    {
                                        var intercardinal = j!=0 && i!= 0;
                                        special = true;
                                        c = col + i;
                                        r = row + j;

                                        valid = c >= 0 &&
                                                c < numCols &&
                                                r >= 0 &&
                                                r < numRows;

                                        if(intercardinal && valid) {
                                            t1 = map[level+1][r*numCols + col]=='.';
                                            t2 = map[level+1][row*numCols + c]=='.';
                                            special = t1&&t2;
                                        }

                                        var result = valid &&
                                                     map[level+1][r*numCols + c]>='A' &&
                                                     special;

                                        any = any || result;
                                        temp.push(result);
                                    }
                                }
                            }
                        }

                        if (any) {
                            shadows = temp;
                        }
                    }
                    shadow_map[level].push(shadows);
                }
            }
        }
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
        var entitiesMoved = false,
            playerMoved = false,
            visible,
            entity;
        for (var key in allEntities) {
            if(key == 256) {
                playerMoved = allEntities[key].update(dt);
            }
            else
            {
                entity = allEntities[key];
                visible =  entity.tileTop < rowEnd &&
                           entity.tileBottom >= rowStart &&
                           entity.tileRight >= colStart &&
                           entity.tileLeft < colEnd;
                entitiesMoved =  (entity.update(dt) && visible) || entitiesMoved;
            }
        }

        if(playerMoved)
        {
            updateViewPort();
        }

        return entitiesMoved || playerMoved;
    }

    /*
     * Calculate:
     *  (1) where in the screen the player will be located and,
     *  (2) which tiles from the entire map are visible based on player location
     */
    function updateViewPort() {
        /*
         * player normally is centered in the middle of the canvas but if he
         * gets close to the edges of the map then it will move to meet this
         * edges. The idea is to never show anything beyond the map.
         */
        if ( player.x + player.hitRect.cx < canvas.width/2) {
            playerAbsolutePosX = player.x;
        }
        else if( player.x + player.hitRect.cx > numCols*mapTileWidth - canvas.width/2) {
            playerAbsolutePosX =  canvas.width + player.x - numCols*mapTileWidth;
        }
        else {
            playerAbsolutePosX = canvas.width/2 - player.hitRect.cx;
        }

        if ( player.y + player.hitRect.cy < canvas.height/2) {
            playerAbsolutePosY = player.y;
        }
        else if( player.y + player.hitRect.cy > numRows*mapTileHeight - canvas.height/2) {
            playerAbsolutePosY =  canvas.height + player.y - numRows*mapTileHeight;
        }
        else {
            playerAbsolutePosY = canvas.height/2 - player.hitRect.cy;
        }

        //range of tiles that are visible at the moment
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
                ctx.rect(col * mapTileWidth,
                            row * mapTileHeight + mapTileTopGap,
                            mapTileWidth,
                            mapTileHeight);

                ctx.fillStyle = color;
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha=1;
            }
        }
    }

    /* This function is called by the render function. It's purpose is to then
     * call the render functions you have defined on your enemy and player
     * entities within app.js
     */
    function renderEntities(entityArr) {
        ctx.save();
        ctx.translate(0, levelOffset);
        var entity;
        for(i = 0; i < entityArr.length; i++) {
            entity = allEntities[entityArr[i]];
            if(entity.tileTop < rowEnd &&
               entity.tileBottom >= rowStart &&
               entity.tileRight >= colStart &&
               entity.tileLeft < colEnd)
            {
                entity.render();
            }
        }
        ctx.restore();
    }

    //renders a single tile
    function renderTile(level, row, col) {
        var tile = map[level][row*numCols + col];
        //skip empty spaces in map
        if(tile != ".") {
            var tileImg = Resources.get(map_tiles[tile]);
            ctx.save();
            ctx.translate(col * mapTileWidth,row * mapTileHeight);
            ctx.drawImage(tileImg,0,0);
            ctx.restore();
            if(debug) {
                //highlight the tiles the player is stepping on
                hilightTiles(player, level, row, col, ctx, 'yellow');
                //draw tile coords
                ctx.fillStyle = 'magenta';
                ctx.font = "15px serif";
                ctx.fillText("("+Math.floor(col)+", "+Math.floor(row)+", "+level+")", col * mapTileWidth + 20, row * mapTileHeight+100);
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

        var numLevels = map.length,
            populated = false,
            tile,
            tileImg,
            entityArr;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(playerAbsolutePosX - player.x,
                      playerAbsolutePosY - player.y);

        for (level = 0; level < numLevels; level++) {
            inLevel = level in entityList;

            ctx.save();
            ctx.translate(0, -levelOffset*level);

            for (row = rowStart; row < rowEnd; row++) {

                for (col = colStart; col < colEnd; col++) {
                    ctx.save();
                    ctx.translate(0, -mapTileTopGap);
                    renderTile(level, row, col);
                    renderTileShadows(level, row, col);
                    ctx.restore();
                }

                inRow = inLevel && row in entityList[level];

                if(inRow) {
                    entityArr = entityList[level][row];
                    renderEntities(entityArr);
                }
            }

            ctx.restore();
        }

        ctx.restore();
    }

    //renders the shadows of a specic tile
    function renderTileShadows(level, row, col) {
        var shadows = shadow_map[level][row*numCols + col];
        if(shadows)
        {
            for(i=0; i < shadows.length; i++) {
                if(shadows[i]) {
                    var shadowURL = shadow_tiles[i];
                    var shadowImg = Resources.get(shadowURL);
                    ctx.drawImage(
                                    shadowImg,
                                    col * mapTileWidth,
                                    row * mapTileHeight);
                }
            }
        }
    }

    /* This function d a good place to
     * handle game reset states - maybe a new game menu or a game over screen
     * those sorts of things. It's only called once by the init() method.
     */
    function reset() {
        var level1 =
               "BBBBBBBBBBBBBBBGGGGG\
                GGGBBBGGGBBBBBBGGGGG\
                GCGGGBGGCCBBBCCCCCC.\
                GCCCGGGCCCCCBCCCCCC.\
                .CCCCGGCCCCCCCCCCCC.\
                GCCCGGGGGGGGGGGGCCC.\
                .CCCGGGGGGGGGGGGCCC.\
                GCCCGGGGGGGGGGGGCCC.\
                .CCCGGGGGGGGGGGGCCC.\
                GCCCGGGGGGGGGGGGCCC.\
                .CCCGGGGGGGGGGGGCCC.\
                GCCCGCCGGGGGGCCGCCC.\
                .CCCGCCGGCCGGCCGCCC.\
                GCCCGGGCCGGCCGGGCCC.\
                .CCCGGGCCGGCCGGGCCC.\
                GCCCGGGGGCCGGGGGCCC.\
                .CCCGGGGGCCGGGGGCCC.\
                GCCCGGGGGGGGGGGGCCC.\
                .CCCGGGGGGGGGGGGCCC.\
                GCCCGGGGGGCGGGGGCCC.\
                .CCCGGGGGCCCGGGGCCC.\
                GCCCGGGGGGCGGGGGCCC.\
                .CCCGGCCCCCCCCCGCCC.\
                GCCCGGGGCCCCCGGGCCC.\
                .CCCGGGGGCCCGGGGCCC.\
                GCCCGGGGGCCCGGGGCCC.\
                .CCCGGGGGCGCGGGGCCC.\
                GCCCGGGGGCGCGGGGCCC.\
                .CCCGGGGGCGCGGGGCCC.\
                GCCCGGGGGGGGGGGGCCC.\
                .CCCCCCCCCCCCCCCCCC.\
                GCCCCCCCCCCCCCCCCCC.\
                .CCCCCCCCCCCCCCCCCC.\
                G...................";

        var level2 =
               "...............11111\
                111...111......F...1\
                M..11.1..F...FF....M\
                1....1....FF.F.....M\
                M...........F....F.M\
                1...M..........FF..M\
                M..............FF..M\
                1........C.....FF..M\
                M........C.........M\
                1........CCCC......M\
                M......CCCC........M\
                1.........C.....F..M\
                M.........C....F...M\
                1....I.............M\
                M..................M\
                1.......F.....F....M\
                M..........2.......M\
                1..................M\
                M....F......F......M\
                1...............2..M\
                M.........F........M\
                1..................M\
                M......1.......F...M\
                1..................M\
                M..................M\
                1...I..............M\
                M..............F...M\
                1..................M\
                M..................M\
                1.....F......F.....M\
                M..................M\
                1.........I........M\
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
                ....................\
                .........C..........\
                .........CCC........\
                ........CCC.........\
                ..........C.........\
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
                .......I....I.......\
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
                ....................\
                ....................\
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
                ........F..F........\
                ....................\
                ....................\
                ....................\
                ....................";

    var level5 =
               "....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ....................\
                ..........I.........\
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
                .........II.........\
                ....................\
                ....................\
                ....................\
                ....................";

//remove empty spaces from string.
        level1 = level1.replace(/\s+/g,"");
        level2 = level2.replace(/\s+/g,"");
        level3 = level3.replace(/\s+/g,"");
        level4 = level4.replace(/\s+/g,"");
        level5 = level5.replace(/\s+/g,"");

        map =
            [
                level1,
                level2,
                level3,
                level4,
                level5
            ];

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
                      'O': 'images/wall-block-tall.png',
                      '1': 'images/tree-short.png',
                      '2': 'images/tree-tall.png',
                      '3': 'images/tree-ugly.png',
                    };

        item_tiles = {
                        '1': 'images/tree-short.png',
                        '2': 'images/tree-tall.png',
                        '3': 'images/tree-ugly.png'
                     };

        shadow_tiles = [
            'images/shadow-side-west.png',
            'images/shadow-side-south.png',
            'images/shadow-north-west.png',
            'images/shadow-west.png',
            'images/shadow-south-west.png',
            'images/shadow-north.png',
            'images/shadow-south.png',
            'images/shadow-north-east.png',
            'images/shadow-east.png',
            'images/shadow-south-east.png'
        ];

        numCols = 20;
        numRows = map[0].length/numCols;

        global.numCols = numCols;
        global.numRows = numRows;
        global.map = map;


        createShadowMap();
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
        'images/shadow-side-south.png',
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
