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

//calculate the angle that the sprite should be rotated in order to create
//crawling/walking animation
Entity.prototype.angle = function() {
    var a = 40;
    var f = 60;
    var angle = (Math.abs(this.accumx) + Math.abs(this.accumy)) % a/a*Math.PI*2;
    return Math.sin(angle)/f*Math.PI*2;
}

Entity.prototype.hitLeft = function() {
    return this.x + this.hitRect.x;
}

Entity.prototype.hitRight = function() {
    return this.x + this.hitRect.x + this.hitRect.w;
}

Entity.prototype.hitTop = function() {
    return this.y + this.hitRect.y;
}

Entity.prototype.hitBottom = function() {
    return this.y + this.hitRect.y + this.hitRect.h;
}

//align sprite according to movement direction
Entity.prototype.alignAngle =  function() {
    if(this.vx != 0) {
        if(this.vy != 0) {
            return Math.atan(this.vy/this.vx) + Math.PI*(this.vx<0);
        }
        else {
            return Math.PI*(this.vx<0);
        }
    }
    else if (this.vy !=0) {
        return this.vy/Math.abs(this.vy)*Math.PI/2;
    }
    else {
        return 0;
    }
}

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
    //this.sh*2/3
    ctx.translate(this.hitRect.cx, this.hitRect.cy);
    ctx.rotate(this.angle() + this.alignAngle());
    this.customRenderOperation(ctx);
    ctx.translate(-this.hitRect.cx, -this.hitRect.cy);
    ctx.drawImage(Resources.get(this.sprite), 0, 0);
    ctx.restore();
};

Entity.prototype.customRenderOperation = function() {
    //noop
};

// Update the entity's position, required method for game
// Parameter: dt, a time delta between ticks
Entity.prototype.update = function(dt) {
    var epsilon = 5;
    var entityMoved = false;

    oldTop = Math.floor(this.hitTop()/mapTileHeight);
    oldBottom = Math.floor(this.hitBottom()/mapTileHeight);
    oldLeft = Math.floor(this.hitLeft()/mapTileWidth);
    oldRight = Math.floor(this.hitRight()/mapTileWidth);

    if(Math.abs(this.vx) > epsilon)
    {
        var xstart = this.vx < 0? this.hitLeft(): this.hitRight();
        var xend = xstart + this.vx*dt;

        var tileXStart = Math.floor(xstart/mapTileWidth);
        var tileXEnd = Math.floor(xend/mapTileWidth);


        var hit1 = false;
        var hit2 = false;

        //if player hasn't moved to a new tile or is in the top level skip collision check.
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

        var hit1 = false;
        var hit2 = false;

        //if player hasn't moved to a new tile or is in the top level skip collision check.
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

/*
 * Updates the entityList data structure which is needed to render the game
 * elements (e.g. tiles, objects, entities) in the proper order.
 */
Entity.prototype.updateEntityList = function(oldRow) {

    var level = this.level +1;
    var row = this.tileBottom;
    var id = this.id;

    //remove old entry if it exists
    if(level in entityList && oldRow in entityList[level]) {
        var index = entityList[level][oldRow].indexOf(id);
        if(index != -1) {
            entityList[level][oldRow].splice(index, 1);
        }

        if(entityList[level][oldRow].length == 0) {
            delete entityList[level][oldRow];
            if(Object.keys(entityList[level]).length == 0) {
                delete entityList[level];
            }
        }
    }


    //add current entry
    if(level in entityList) {
        if(row in entityList[level]) {
            entityList[level][row].push(id);
        }
        else {
            entityList[level][row] = [id];
        }
    }
    else {
        entityList[level] = new Object();
        entityList[level][row] = new Array();
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
    if(this.state == this.behaviourType.CHASING)
    {
        //do the blink effect
        f = 3;
        p = 50;
        t = (Math.sin(Date.now()/p)+1)/2/f + 1 - 1/f;
        ctx.globalAlpha = t;
    }

    if(this.vx < 0) {
        ctx.scale(1,-1);
    }
};

// Now write your own player class
// This class requires an update(), render() and
// a handleInput() method.

var Player = function(x, y) {
    Entity.call(this, "images/char-boy.png", x, y, 0, 0, 256);
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
};

Player.prototype = Object.create(Entity.prototype);
Player.prototype.constructor = Player;

Player.prototype.handleInput = function(direction) {
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
};

Player.prototype.alignAngle = function() {
    return 0;
}

// Now instantiate your objects.
// Place all enemy objects in an array called allEnemies
// Place the player object in a variable called player
var allEntities = new Object();
var numEnemies = 10;
var player;
var debug = true;
//used to handle required render order
var entityList = new Object();

var initAppStuff = function()
{

    var centerx = ctx.canvas.width/2;
    var centery = ctx.canvas.height/2;
    player = new Player(centerx, centery);

    for (i = 0; i < numEnemies; i++) {
        var basev = 100;

        allEntities[i] = new Enemy(
                            150 + 30*i,
                            200 + i*120,
                            (i%2*-2+1)*(basev + 10*i),
                            (i%2*2-1)*(basev + 10*i),
                            i);
    }

    allEntities[256] = player;

    // This listens for key presses and sends the keys to your
    // Player.handleInput() method. You don't need to modify this.
    document.addEventListener('keyup', function(e) {
        var allowedKeys = {
            37: 'left',
            38: 'up',
            39: 'right',
            40: 'down'
        };

        player.handleInput(allowedKeys[e.keyCode]);
    });
}

Resources.onReady(initAppStuff);