var Engine = (function(global) {
    /* Predefine the variables we'll be using within this scope,
     * create the canvas element, grab the 2D context for that canvas
     * set the canvas elements height/width and add it to the DOM.
     */
    var doc = global.document,
        win = global.window,
        canvas = doc.createElement('canvas'),
        ctx = canvas.getContext('2d'),
        lastTime, gameStartTime;

    var container= doc.getElementById("container");
    var menuButton = doc.querySelector(".play-button");
    var titleBlock = doc.querySelector(".title");
    var instructions = doc.querySelector(".instructions");
    var github = doc.querySelector(".github");

    menuButton.addEventListener('mousedown', startGame, false);
    menuButton.addEventListener('touchend', startGame, false);

    canvas.addEventListener("touchend", handleTouchEnd, false);
    // This listens for key presses and sends the keys to your
    // Player.handleInput() method. You don't need to modify this.

    doc.addEventListener('keyup', keyHandler);

    window.addEventListener('resize', function(e) {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
    })

    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;

    container.appendChild(canvas);

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
    //to keep track of the state of the game
    var gameState = {
                current: null,
                type: {
                        IN_GAME:0,
                        GAME_FINISHED:1,
                        GAME_MENU: 2,
                        GAME_MENU_HIDE: 3,
                        GAME_MENU_FADEIN: 4,
                        GAME_MENU_FADEOUT: 5
                    }
                };
    var isticking= false;
    var genericTimeStamp;


    function keyHandler(e) {
      var allowedKeys = {
          37: 'left',
          38: 'up',
          39: 'right',
          40: 'down'
      };
      var dx = 0, dy = 0;
      var direction = allowedKeys[e.keyCode];
      switch(direction) {
          case "left":
              dx = -1.0;
          break;
          case "up":
              dy = -1.0;
          break;
          case "right":
              dx = 1.0;
          break;
          case "down":
              dy = 1.0;
          break;
          default:
          break;
      }

      (dx || dy) && player.move(dx, dy);
    };

    function startGame () {
        menuButton.classList.add("hidden");
        titleBlock.classList.add("hidden");
        instructions.classList.add("hidden");
        github.classList.add("hidden");
        gameState.current = gameState.type.GAME_MENU_HIDE;
        genericTimeStamp = Date.now();
    }

    //helper function
    function rgbcolor(r, g, b) {
      return "rgb("+Math.min(r, 255)+","+Math.min(g, 255)+","+Math.min(b, 255)+")";
    }

    function timeOut(now) {
        return (now - gameStartTime - player.timebonus)/1000 >= timer;
    }

    function playerDied() {
        return player.life === 0;
    }

    function didPlayerWin() {
        return player.gemcount === numItems;
    }

    function handleTouchEnd(e) {
      e.preventDefault();
      var item = e && e.changedTouches && e.changedTouches.item(0);

      if(item) {
        var playerAbsolutePosX, playerAbsolutePosY;

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

        var dx = item.clientX - playerAbsolutePosX;
        var dy = item.clientY - playerAbsolutePosY;

        var length = Math.sqrt(dx*dx + dy*dy);
        var nx = dx/length*2;
        var ny = dy/length*2;

        player.move(nx, ny);
      }

    }

    /* This function serves as the kickoff point for the game loop itself
     * and handles properly calling the update and render methods.
     */
    function main() {

        var now = Date.now(),
        duration,
        color,
        start_opacity,
        end_opacity,
        dt = (now - lastTime) / 1000.0;
        //TODO: this state machine logic is quite convoluted and impractical. Needs refactoring.
        switch (gameState.current) {
            case gameState.type.IN_GAME:
                update(dt);
                render();
                renderUI();
                var timeout = timeOut(now);
                var playerdied = playerDied();

                var gameover = timeout || playerdied;

                var playerwon = didPlayerWin();

                if (gameover || playerwon)
                {
                    if(isticking) {
                        sfx.stop("tictac");
                    }

                    sfx.fadeOut("music");
                    gameState.current = gameState.type.GAME_FINISHED;
                    genericTimeStamp = now;

                    if(timeout) {
                        sfx.play("buzzer");
                    } else if(playerdied) {
                        sfx.play("gameover");
                    } else {
                        sfx.play("win");
                    }
                } else {
                    var elapsed = (now - gameStartTime - player.timebonus)/1000;
                    var remaining = timer - elapsed;
                    if((remaining < 15) && !isticking) {
                        isticking=true;
                        sfx.play("tictac");
                    } else if ((remaining > 15) && isticking) {
                        isticking=false;
                        sfx.stop("tictac");
                    }
                }

            break;
            case gameState.type.GAME_FINISHED:
                start_opacity = 0;
                end_opacity = 0.9;
                duration = 3;
                color = 'black';

                render();
                update(dt);

                if (renderFade(genericTimeStamp, duration, start_opacity, end_opacity, color)) {
                    initGameMenu();
                }

            break;

            case gameState.type.GAME_MENU:
                color= 'black';
                start_opacity = 0.9;
                duration = 0.5;
                render();
                update(dt);
                renderSquare(0,0, canvas.width, canvas.height, color, null, 0, start_opacity);
            break;

            case gameState.type.GAME_MENU_HIDE:
                color= 'black';
                start_opacity = 0.9;
                duration = 0.5;
                render();
                update(dt);
                renderSquare(0,0, canvas.width, canvas.height, color, null, 0, start_opacity);
                if(Date.now() - genericTimeStamp > 500) {
                  gameState.current = gameState.type.GAME_MENU_FADEIN;
                  genericTimeStamp = now;
                  sfx.fadeIn('music');
                }

            break;

            case gameState.type.GAME_MENU_FADEIN:
                start_opacity = 0.9;
                end_opacity = 1;
                color = 'black';
                duration = 1;

                render();
                update(dt);

                if (renderFade(genericTimeStamp, duration, start_opacity, end_opacity, color)) {
                    reset();
                    genericTimeStamp = now;
                    gameState.current = gameState.type.GAME_MENU_FADEOUT;
                }
            break;

            case gameState.type.GAME_MENU_FADEOUT:
                start_opacity = 1;
                end_opacity =0;
                color = 'black';
                duration = 2;
                render();

                if (renderFade(genericTimeStamp, duration, start_opacity, end_opacity, color)) {
                    gameStartTime = now;
                    gameState.current = gameState.type.IN_GAME;
                }

            break;
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
        initGameMenu();
        lastTime = Date.now();
        main();
    }

/* Called everytime a new game starts*/
    function initGameMenu() {
        gameState.current = gameState.type.GAME_MENU;
        genericTimeStamp = Date.now();
        menuButton.classList.remove("hidden");
        titleBlock.classList.remove("hidden");
        instructions.classList.remove("hidden");
        github.classList.remove("hidden");
    }


/*
 * fills up the shadow_map data structure which contains the information
 * of where in the map to draw shadows. These calculations are based on
 * the topography of the tile maps.
 * This logic is mostly an implementation of the algorithm described here:
 * http://lunar.lostgarden.com/uploaded_images/PlanetCuteShadowTest-734680.jpg
 */
    function createShadowMap() {
        shadow_map = [];
        var c, r, top, shadows,t1,t2, special, valid, any, temp, se, level, row, col, tile, s, ds, ss, i, j;

        for(level=0; level< map.length; level++) {
            shadow_map.push([]);
            for(row=0; row < numRows; row++) {
                for(col=0; col< numCols; col++) {
                    shadows = null;
                    top = level < (map.length - 1) && map[level+1][row*numCols + col]>='A';
                    tile = map[level][row*numCols + col]>='A';

                    if(tile)
                    {
                        temp = [];
                        any = false;
                        s = (row + 1) < numRows &&
                             map[level][(row+1)*numCols + col]!='.';


                        se = !s && (row + 1) < numRows && (col - 1)>= 0 &&
                             map[level][(row+1)*numCols + col - 1]!='.';

                        ds = (row + 1) < numRows && (level - 1) >= 0 && level == 1 &&
                             map[level-1][(row+1)*numCols + col] !='.';

                        ss = !s && ds;
                        any = any || se || ss;
                        temp.push(se);
                        temp.push(ss);

                        if(!top && level < map.length - 1) {
                            for(i=-1; i< 2; i++) {
                                for(j=-1; j< 2; j++) {
                                    var center = j===0 && i=== 0;
                                    if(!center)
                                    {
                                        var intercardinal = j!==0 && i!== 0;
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

    /*
     * randomly allocates collectable items (gems) in the map
     *
     */
    function createItemMap() {
        var level, i;
        item_map = {};
        //for now it's limited to the 1st level
        for(level=1; level < 2; level ++) {
            var spaces = map[level].split('.').length - 1,
            index, random,row, col, gems, ind;

            item_map[level] = {};

            for (i = 0; i< numItems; i++)
            {
                random = Math.floor(Math.random()*spaces);
                index = map[level].split('.', random).join('.').length;
                row = Math.floor(index/numCols);
                col = index% numCols;
                if(!(row in item_map[level])) {
                    item_map[level][row] = {};
                    item_map[level][row][col] = {};
                }
                else if (!(col in item_map[level][row])) {
                    item_map[level][row][col] = {};
                }
                gems = ['a', 'b', 'c'];
                ind = Math.floor(Math.random()*3);
                item_map[level][row][col] = gems[ind];
            }
        }
    }

    /* This function is called by main (our game loop) and itself calls all
     * of the functions which may need to update entity's data.
     */
    function update(dt) {
        return updateEntities(dt);
    }

    /* This is called by the update function  and loops through all of the
     * objects within your allEntities array as defined in app.js and calls
     * their update() methods. These update methods should focus purely on updating
     * the data/properties related to  the object. Do your drawing in your
     * render methods.
     */
    function updateEntities(dt) {
        var entitiesMoved = false,
            playerMoved = false,
            visible,
            entity;
        for (var key in allEntities) {
            //256 is the player
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
        rowEnd = Math.min(numRows, Math.floor(Math.min((numRows-1)*mapTileHeight, player.y + canvas.height - playerAbsolutePosY)/mapTileHeight) + 1);
    }

// hilight the tiles the entity is stepping on
    function hilightTiles(entity, level, row, col, ctx, color) {
        if(entity.level == level) {
            if((entity.tileTop  == row || entity.tileBottom == row) &&
              (entity.tileLeft == col || entity.tileRight  == col))
            {
                renderSquare(col * mapTileWidth,
                            row * mapTileHeight + mapTileTopGap,
                            mapTileWidth,
                            mapTileHeight,
                            color,
                            null,
                            0,
                            0.4);
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
        var entity, i;
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
        var item = !(level in item_map) ||
                   !(row in item_map[level]) ||
                   !(col in item_map[level][row])?'.': item_map[level][row][col];

        //skip empty spaces in map
        if(tile != "." || item !=".") {

            var spriteURL = (tile!=".")?map_tiles[tile]: item_tiles[item];
            var spriteImg = Resources.get(spriteURL);

            ctx.save();
            if(tile != "." && level > (player.level +1) && row > player.tileTop && (col == player.tileLeft || col == player.tileRight))
                ctx.globalAlpha = 0.5;
            ctx.translate(col * mapTileWidth,row * mapTileHeight);
            ctx.drawImage(spriteImg,0,0);
            ctx.restore();
            //highlight the tiles the player is stepping on
            hilightTiles(player, level, row, col, ctx, 'yellow');
            if(debug) {
                //draw tile coords
                ctx.fillStyle = 'magenta';
                ctx.font = "15px serif";
                ctx.fillText("("+Math.floor(col)+", "+Math.floor(row)+", "+level+")", col * mapTileWidth + 20, row * mapTileHeight+100);
            }
        }
    }

    /*
     * renders tiles, enemies and player.
     */
    function render() {

        var numLevels = map.length,
            entityArr, inLevel, inRow, level, row, col, actualRowStart, actualRowEnd;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(playerAbsolutePosX - player.x,
                      playerAbsolutePosY - player.y);

        for (level = 0; level < numLevels; level++) {
            inLevel = level in entityList;

            ctx.save();
            ctx.translate(0, -levelOffset*level);

            actualRowStart = Math.min(numRows, rowStart + Math.floor(level/3));
            actualRowEnd = Math.min(numRows, rowEnd + Math.ceil(level/2));

            for (row = actualRowStart; row < actualRowEnd; row++) {

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
        var shadows = shadow_map[level][row*numCols + col], i;
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

    //the in game UI
    //TODO: refactor
    function renderUI () {
        renderLifeBar();
        renderGemBar();
        renderTimer();
    }

    //energy bar
    //TODO refactor
    function renderLifeBar() {
        var maxlength = canvas.width*0.4;
        var barheight = 30;
        var bargap = 5;
        var barpad = 15;
        var life =  player.life/100;

        ctx.beginPath();
        ctx.rect(barpad,
        barpad,
        maxlength + bargap*2,
        barheight + bargap*2);

        ctx.strokeStyle = 'white';
        ctx.closePath();
        ctx.stroke();

        if(life < 0.3) {
            ctx.globalAlpha = blinkEffect(0.2, 4);
        }

        ctx.beginPath();
        ctx.rect(barpad + bargap,
                barpad + bargap,
                maxlength*life,
                barheight);

        ctx.fillStyle = rgbcolor(life < 0.66?255:0, 255*(life> 0.33), 0);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        var tileImg = Resources.get('images/Heart.png');
        ctx.save();
        ctx.translate(maxlength + bargap*2 + barpad*2, -barpad);
        ctx.scale(0.5, 0.5);
        ctx.drawImage(tileImg,0,0);
        ctx.restore();
    }

    //gem count
    //TODO: refactor
    function renderGemBar() {
        var maxlength = canvas.width*0.4;
        var bargap = 5;
        var barpad = 15;

        var tileImg = Resources.get('images/Gem Blue.png');
        ctx.save();
        ctx.translate(maxlength + bargap*2 + barpad*4, -6*barpad - bargap);
        ctx.fillStyle = '#f1d950';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.font = "40px Lobster";
        ctx.strokeText("x"+ player.gemcount, 6*barpad, 10*barpad);
        ctx.fillText("x"+ player.gemcount, 6*barpad, 10*barpad );
        ctx.drawImage(tileImg,0,0);

        ctx.restore();
    }

    //the timer animation
    //TODO: refactor
    function renderTimer() {
        var maxlength = canvas.width*0.4;
        var bargap = 5;
        var barpad = 15;
        var seconds = (Date.now() - gameStartTime - player.timebonus)/1000;

        var left = Math.min(timer, timer - seconds);
        var opacity = (left < 15)?blinkEffect(0.5,3):1;
        var radius = 25;

        ctx.save();
        ctx.translate(maxlength + bargap*2 + barpad*20, 3*barpad - 10);
        renderArc(0,0, radius, (left < 15)?'red':'white', null, null, opacity, 0, 2*Math.PI);
        renderArc(0,0, radius, '#2c57f9', '#80bcff', 2, opacity, -Math.PI/2 + seconds/timer*2*Math.PI, Math.PI*1.5);
        renderArc(0,0, radius + 5, null, 'white', 5, 1, 0, 2*Math.PI);
        ctx.restore();
    }
    //hacky fade effect for menu/game transisions
    //TODO: refactor
    function renderFade(start, duration, start_opacity, end_opacity, color) {
        var elapsed  = (Date.now() - start)/1000;
        var done = elapsed > duration;
        var opacity = done? end_opacity: start_opacity + (end_opacity - start_opacity)*elapsed/duration;
        renderSquare(0,0, canvas.width, canvas.height, color, null, 0, opacity);
        return done;
    }

    /*
     * Helper functions to draw basic shapes
     */
    function renderSquare(x, y, w, h, color, strokecolor, linewidth, opacity) {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        if(color)
        {
            ctx.fillStyle = color;
            ctx.fill();
        }
        if(strokecolor)
        {
            ctx.strokeStyle = strokecolor;
            ctx.lineWidth = linewidth;
            ctx.stroke();
        }
        ctx.closePath();
        ctx.restore();
    }

    function renderArc(centerx, centery, radius, fill, stroke, linewidth, opacity, startangle, endangle) {
        var is_arc = Math.abs(endangle - startangle) < 2*Math.PI;
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.beginPath();

        if (is_arc)
            ctx.lineTo(centerx,centery);

        ctx.arc(centerx, centery,radius, startangle, endangle);

        if (is_arc)
            ctx.lineTo(centerx, centery);

        if(fill) {
            ctx.fillStyle = fill;
            ctx.fill();
        }

        if(stroke)
        {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = linewidth;
            ctx.stroke();
        }

        ctx.restore();
    }

    function queryTextDims(text, font) {
        ctx.save();
        ctx.font = font;
        var w = ctx.measureText(text).width;
        var h = 0;
        ctx.restore();
        return {width: w, height:h};
    }

    function renderText(x, y, text, lineWidth, font, size, fill, stroke) {
        ctx.save();
        ctx.fillStyle =  fill;
        ctx.strokeStyle =  stroke;
        ctx.lineWidth = lineWidth;
        ctx.font = size+"px "+font;
        ctx.fillText(text, x, y);
        ctx.strokeText(text, x, y);
        ctx.restore();
    }

    /* This function d a good place to
     * handle game reset states - maybe a new game menu or a game over screen
     * those sorts of things. It's only called once by the init() method.
     */
    function reset() {
        //levels defined in maps.js
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
                      '4': 'images/Rock.png',
                    };

        item_tiles = {
                        'a': 'images/Gem Orange.png',
                        'b': 'images/Gem Green.png',
                        'c': 'images/Gem Blue.png',
                        'd': 'images/Key.png'
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


        createShadowMap();
        createItemMap();

        genericTimeStamp = Date.now();
        global.map = map;
        global.numCols = numCols;
        global.numRows = numRows;
        global.gameState = gameState;

        initAppStuff();
        updateViewPort();
    }

    /* Go ahead and load all of the images we know we're going to need to
     * draw our game level. Then set init as the callback method, so that when
     * all of these images are properly loaded our game will start.
     *
     * All tiles are part of "Planet Cute" collection by Daniel Cook (Lostgarden.com)
     * http://www.lostgarden.com/2007/05/cutegod-prototyping-challenge.html
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
        'images/wall-block-tall.png',
        'images/Rock.png',
        'images/char-princess-girl.png',
        'images/char-princess-girl-damage.png',
        'images/char-boy-damage.png',
        'images/Heart.png',
        'images/Gem Orange.png',
        'images/Gem Green.png',
        'images/Gem Blue.png',
        'images/Key.png'
    ]);
    Resources.onReady(init);

    /* Assign the canvas' context object to the global variable (the window
     * object when run in a browser) so that developer's can use it more easily
     * from within their app.js files.
     */
        global.ctx = ctx;
        global.mapTileWidth = mapTileWidth;
        global.mapTileHeight = mapTileHeight;

})(this);
