// Now instantiate your objects.
// Place all enemy objects in an array called allEnemies
// Place the player object in a variable called player
var allEntities;
var minEnemies = 15;
var maxEnemies = 30;
var numEnemies;
var player;
var debug = false;
//used to handle required render order
var entityList;
//number of gems to pickup
var numItems = 10;
//game duration in s
var timer = 60;

//wasn't able to declare this in engine.js, but it should go there.
var item_map;

/*
 * returns an alpha value between min_transparency and 1
 *
 */
function blinkEffect(min_transparency, frequency) {
    return (Math.sin(Date.now()*frequency/1000*2*Math.PI)+1)/2*(min_transparency - 1) + 1 ;
}

var Entity = function(sprite, x, y, vx, vy, id) {
    this.sprite = sprite;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.accumx = 0;
    this.accumy = 0;

    var img = Resources.get(sprite);
    this.sw = img.width;
    this.sh = img.height;
    this.attenuation = 1;
    this.bounceFactor =1;
    this.hitRect = { 'x':0, 'y':0, 'w':0, 'h':0, 'cx':0, 'cy':0 };
    this.level= 0;
    this.tileTop = 0;
    this.tileBottom = 0;
    this.tileLeft = 0;
    this.tileRight = 0;
    this.id = id;
};

Entity.prototype.getSprite = function() {
    return this.sprite;
};

//calculate the angle that the sprite should be rotated in order to create
//crawling/walking animation
Entity.prototype.angle = function() {
    var a = 40;
    var f = 60;
    var angle = (Math.abs(this.accumx) + Math.abs(this.accumy)) % a/a*Math.PI*2;
    return Math.sin(angle)/f*Math.PI*2;
};

Entity.prototype.hitLeft = function() {
    return this.x + this.hitRect.x;
};

Entity.prototype.hitRight = function() {
    return this.x + this.hitRect.x + this.hitRect.w;
};

Entity.prototype.hitTop = function() {
    return this.y + this.hitRect.y;
};

Entity.prototype.hitBottom = function() {
    return this.y + this.hitRect.y + this.hitRect.h;
};

Entity.prototype.hitCenterx = function() {
    return this.x + this.hitRect.cx;
};

Entity.prototype.hitCentery = function() {
    return this.y + this.hitRect.cy;
};

//align sprite according to movement direction
Entity.prototype.alignAngle =  function() {
    if(this.vx !== 0) {
        if(this.vy !== 0) {
            return Math.atan(this.vy/this.vx) + Math.PI*(this.vx<0);
        }
        else {
            return Math.PI*(this.vx<0);
        }
    }
    else if (this.vy !==0) {
        return this.vy/Math.abs(this.vy)*Math.PI/2;
    }
    else {
        return 0;
    }
};

Entity.prototype.render = function() {
    ctx.save();
    ctx.translate(this.x, this.y);
    if(debug) {
        ctx.beginPath();
        ctx.rect(0, 0, this.sw, this.sh);
        ctx.strokeStyle = 'red';
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.rect(this.hitRect.x, this.hitRect.y, this.hitRect.w, this.hitRect.h);
        ctx.strokeStyle = 'blue';
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = 'red';
        ctx.font = "20px serif";
        ctx.fillText("("+Math.floor(this.x)+", "+Math.floor(this.y)+")", 5, 20);
    }
    ctx.translate(this.hitRect.cx, this.hitRect.cy);
    ctx.rotate(this.angle() + this.alignAngle());
    this.customRenderOperation(ctx);
    ctx.translate(-this.hitRect.cx, -this.hitRect.cy);
    ctx.drawImage(Resources.get(this.getSprite()), 0, 0);
    ctx.restore();
};

Entity.prototype.customRenderOperation = function() {
    //noop
};


Entity.prototype.customUpdateLogic = function() {
    //noop
};

// Update the entity's position, required method for game
// Parameter: dt, a time delta between ticks
Entity.prototype.update = function(dt) {
    var epsilon = 5;
    var entityMoved = false, hit1, hit2;

    var oldTop = Math.floor(this.hitTop()/mapTileHeight);
    var oldBottom = Math.floor(this.hitBottom()/mapTileHeight);
    var oldLeft = Math.floor(this.hitLeft()/mapTileWidth);
    var oldRight = Math.floor(this.hitRight()/mapTileWidth);

    this.customUpdateLogic(dt);

    if(Math.abs(this.vx) > epsilon)
    {
        var xstart = this.vx < 0? this.hitLeft(): this.hitRight();
        var xend = xstart + this.vx*dt;

        var tileXStart = Math.floor(xstart/mapTileWidth);
        var tileXEnd = Math.floor(xend/mapTileWidth);

        hit1 = false;
        hit2 = false;

        //if entity hasn't moved to a new tile or is in the top level skip collision check.
        if (tileXStart != tileXEnd && map.length - 1 > this.level) {
            hit1 = map[this.level + 1][numCols*oldTop + tileXEnd]!= '.';
            hit2 = map[this.level + 1][numCols*oldBottom + tileXEnd]!= '.';
        }

        if(hit1 || hit2) {

            this.vx*=-this.bounceFactor;
        }
        else {
            this.x += this.vx*dt;
            this.accumx += Math.abs(this.vx)*dt;
        }

        this.vx *= this.attenuation;
        entityMoved = true;
    }
    else {
        this.vx = 0;
    }

    this.tileLeft = Math.floor(this.hitLeft()/mapTileWidth);
    this.tileRight = Math.floor(this.hitRight()/mapTileWidth);

    if (Math.abs(this.vy) > epsilon)
    {
        var ystart = this.vy < 0? this.hitTop(): this.hitBottom();
        var yend = ystart + this.vy*dt;

        var tileYStart = Math.floor(ystart/mapTileHeight);
        var tileYEnd = Math.floor(yend/mapTileHeight);

        hit1 = false;
        hit2 = false;

        //if entity hasn't moved to a new tile or is in the top level skip collision check.
        if (tileYStart != tileYEnd && map.length-1 > this.level) {
            hit1 = map[this.level + 1][numCols*tileYEnd + oldLeft]!= '.';
            hit2 = map[this.level + 1][numCols*tileYEnd + oldRight]!= '.';
        }

        if(hit1 || hit2) {
            this.vy*=-this.bounceFactor;
        }
        else {
            this.y += this.vy*dt;
            this.accumy += Math.abs(this.vy)*dt;
        }
        this.vy *= this.attenuation;
        entityMoved = true;
    }
    else {
        this.vy = 0;
    }

    this.tileTop = Math.floor(this.hitTop()/mapTileHeight);
    this.tileBottom = Math.floor(this.hitBottom()/mapTileHeight);

    if(oldBottom != this.tileBottom) {
        this.updateEntityList(oldBottom);
    }

    return entityMoved;
};


Entity.prototype.checkCollision = function(entity) {
    return !(entity.hitCenterx() < this.hitLeft() ||
            entity.hitCenterx() > this.hitRight() ||
            entity.hitCentery() < this.hitTop()||
            entity.hitCentery() > this.hitBottom());
};

/*
 * Updates the entityList data structure which is needed to render the game
 * elements (e.g. tiles, objects, entities) in the proper order.
 */
Entity.prototype.updateEntityList = function(oldRow) {

    var level = this.level +1;
    var row = this.tileBottom;
    var id = this.id;
    var isPlayer = id==256;

    //remove old entry if it exists
    if(level in entityList && oldRow in entityList[level]) {
        var index = entityList[level][oldRow].indexOf(id);
        if(index != -1) {
            entityList[level][oldRow].splice(index, 1);
        }

        if(entityList[level][oldRow].length === 0) {
            delete entityList[level][oldRow];
            if(Object.keys(entityList[level]).length === 0) {
                delete entityList[level];
            }
        }
    }

    //add current entry
    if(level in entityList) {
        if(row in entityList[level]) {
            if(isPlayer)
                entityList[level][row].push(id);
            else
                entityList[level][row].unshift(id);
        }
        else {
            entityList[level][row] = [id];
        }
    }
    else {
        entityList[level] = {};
        entityList[level][row] = [];
        entityList[level][row] = [id];
    }

};

// Enemies our player must avoid
var Enemy = function(x,y, vx, vy, id) {
    this.radarType = {
                        SQUARE: 0,
                        TRIANGLE: 1
                     };

    this.behaviourType = {
                            ROAMING: 0,
                            CHASING: 1
                         };

    Entity.call(this, "images/enemy-bug.png", x, y, vx, vy, id);
    this.state = this.behaviourType.ROAMING;
    this.radarRange = 100;
    this.radarType = this.radarType.SQUARE;
    this.hitRect.x = 2;
    this.hitRect.y = 68;
    this.hitRect.w = 96;
    this.hitRect.h = 75;
    this.hitRect.cx = 50;
    this.hitRect.cy = 109;
    this.update(0);
};

Enemy.prototype = Object.create(Entity.prototype);
Enemy.prototype.constructor = Enemy;

Enemy.prototype.customRenderOperation = function(ctx) {
    //flip the sprite vertically so that feet keep facing down after rotation
    if(this.vx < 0) {
        ctx.scale(1,-1);
    }
};

Enemy.prototype.customUpdateLogic = function(dt) {
    if(this.checkCollision(player)) {
        var transfer = 10;

        player.vx += this.vx*dt*transfer;
        player.vy += this.vy*dt*transfer;
        player.doDamage();
    }
};

var Player = function(x, y) {
    Entity.call(this, 'images/char-princess-girl.png', x, y, 0, 0, 256);
    this.vmag = 100;
    this.attenuation = 0.98;
    //lose momentum after bounce
    this.bounceFactor = 0.25;
    this.hitRect.x = 15;
    this.hitRect.y = 105;
    this.hitRect.w = 72;
    this.hitRect.h = 35;
    this.hitRect.cx = 50;
    this.hitRect.cy = 120;
    this.x-=this.hitRect.cx;
    this.y-=this.hitRect.cy;
    this.update(0);
    this.updateEntityList(-1);
    this.damageSprite = 'images/char-princess-girl-damage.png';
    this.stateType = {
        DAMAGE: 0,
        DEFAULT: 1
    };
    this.state = this.stateType.DEFAULT;
    this.life = 100;
    this.gemcount = 0;
};

Player.prototype = Object.create(Entity.prototype);
Player.prototype.constructor = Player;

Player.prototype.doDamage = function() {
    if(this.state != this.stateType.DAMAGE) {
        this.state = this.stateType.DAMAGE;
        var shittyClosures = this;
        //stop the damage animation in 1 sec
        setTimeout(function(){ shittyClosures.state = shittyClosures.stateType.DEFAULT; }, 1000);
        this.life = Math.max(0, this.life- 10);
    }
};

Player.prototype.customUpdateLogic = function(dt) {
    this.checkItems();
};

Player.prototype.checkItems = function() {
    var level = this.level + 1, col;
    if ((level in item_map) && (this.tileTop in item_map[level]) &&
       ((this.tileRight in item_map[level][this.tileTop]) || (this.tileLeft in item_map[level][this.tileTop]))) {

        var gx, gy = (this.tileTop + 0.5)*mapTileHeight;

        if (this.tileRight in item_map[level][this.tileTop]) {
            col = this.tileRight;
        }
        else {
            col = this.tileLeft;
        }

        gx = (col + 0.5)*mapTileWidth;
        var gotit =  !(gx < this.hitLeft() ||
        gx > this.hitRight() ||
        gy < this.hitTop()||
        gy > this.hitBottom());

        if(gotit) {
            delete item_map[level][this.tileTop][col];
            this.gemcount++;
        }
    }
};

Player.prototype.handleInput = function(direction) {
    if (gameState.current == gameState.type.IN_GAME) {
        switch(direction) {
            case "left":
                this.vx -= this.vmag;
            break;
            case "up":
                this.vy -= this.vmag;
            break;
            case "right":
                this.vx += this.vmag;
            break;
            case "down":
                this.vy += this.vmag;
            break;
            default:
            break;
        }
    }
};

Player.prototype.getSprite = function() {
    if (this.state == this.stateType.DAMAGE) {
        return this.damageSprite;
    }
    else {
        return this.sprite;
    }
};

Player.prototype.alignAngle = function() {
    return 0;
};

Player.prototype.customRenderOperation = function(ctx) {
    if(this.state == this.stateType.DAMAGE)
    {

        ctx.globalAlpha = blinkEffect(0.6, 4);
    }
};

var keyHandler = function(e) {
        var allowedKeys = {
            37: 'left',
            38: 'up',
            39: 'right',
            40: 'down'
        };

        player.handleInput(allowedKeys[e.keyCode]);
};

var initAppStuff = function()
{
    allEntities = {};
    entityList = {};
    deployPlayer();
    deployEnemies();

    // This listens for key presses and sends the keys to your
    // Player.handleInput() method. You don't need to modify this.
    document.removeEventListener('keyup', keyHandler);
    document.addEventListener('keyup', keyHandler);
};


var deployEnemies = function() {
    var level, i;
    numEnemies = minEnemies + Math.floor((maxEnemies - minEnemies)*Math.random());

    //for now it's limited to the 1st level
    for(level=1; level < 2; level ++) {
        var spaces = map[level].split('.').length - 1,
        index, random,row, col, basev, angle;

        for (i = 0; i< numEnemies; i++)
        {
            random = Math.floor(Math.random()*spaces);
            index = map[level].split('.', random).join('.').length;
            row = Math.floor(index/numCols);
            col = index% numCols;
            basev = 150 + 100*Math.random();
            angle = Math.random()*Math.PI*2;
            //console.log("#enemy", i, row, col, basev, angle*180/Math.PI);
            allEntities[i] = new Enemy(
                            (col + 0.5)*mapTileWidth,
                            (row + 0.5)*mapTileHeight,
                            Math.cos(angle)*basev,
                            Math.sin(angle)*basev,
                            i);
        }
    }
};

//put player in some random empty space in level 1;
var deployPlayer = function() {
    var level = 1;
    var spaces = map[level].split('.').length - 1;
    var random = Math.floor(Math.random()*spaces);
    var index = map[level].split('.', random).join('.').length;
    var row = Math.floor(index/numCols);
    var col = index% numCols;
    var centerx = (col + 0.5)*mapTileWidth;
    var centery = (row + 0.5)*mapTileHeight;
    player = new Player(centerx, centery);
    allEntities[256] = player;
};