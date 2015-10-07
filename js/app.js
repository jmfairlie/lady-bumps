var Entity = function(sprite, x, y, vx, vy) {
    this.sprite = sprite;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    var img = Resources.get(sprite);
    this.sw = img.width;
    this.sh = img.height;
    this.attenuation = 1;
    this.bounceFactor =1;
    // x,y, w, h: in obj coords
    this.hitRect = { 'x':0, 'y':0, 'w':0, 'h':0, 'cx':0, 'cy':0 };
    this.level= 0;
    this.tileTop;
    this.tileBottom;
    this.tileLeft;
    this.tileRight;
};

//calculate the angle that the sprite should be rotated in order to create
//crawling/walking animation
Entity.prototype.angle = function() {
    var a = 20;
    var f = 60;
    var angle = (Math.abs(this.x) + Math.abs(this.y)) % a/a*Math.PI*2;
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

// Update the entitie's position, required method for game
// Parameter: dt, a time delta between ticks
Entity.prototype.update = function(dt) {
    var epsilon = 5;
    var entityMoved = false;
    this.tileTop = Math.floor(this.hitTop()/mapTileHeight);
    this.tileBottom = Math.floor(this.hitBottom()/mapTileHeight);
    this.tileLeft = Math.floor(this.hitLeft()/mapTileWidth);
    this.tileRight = Math.floor(this.hitRight()/mapTileWidth);

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
            hit1 = map[this.level + 1][numCols*this.tileTop + tileXEnd]!= '.';
            hit2 = map[this.level + 1][numCols*this.tileBottom + tileXEnd]!= '.';
        }

        if(hit1 || hit2) {

            this.vx*=-this.bounceFactor;
        }
        else {
            this.x += this.vx*dt;
        }

        this.vx *= this.attenuation;
        entityMoved = true;
    }
    else {
        this.vx = 0;
    }

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
            hit1 = map[this.level + 1][numCols*tileYEnd + this.tileLeft]!= '.';
            hit2 = map[this.level + 1][numCols*tileYEnd + this.tileRight]!= '.';
        }

        if(hit1 || hit2) {
            this.vy*=-this.bounceFactor;
        }
        else {
            this.y += this.vy*dt;
        }
        this.vy *= this.attenuation;
        entityMoved = true;
    }
    else {
        this.vy = 0;
    }
    return entityMoved;
};

// Enemies our player must avoid
var Enemy = function(x,y, vx, vy) {
    this.radarType = {
                        SQUARE: 0,
                        TRIANGLE: 1
                     };

    this.behaviourType = {
                            ROAMING: 0,
                            CHASING: 1
                         };

    Entity.call(this, "images/enemy-bug.png", x, y, vx, vy);
    this.state = this.behaviourType.ROAMING;
    this.radarRange = 100;
    this.radarType = this.radarType.SQUARE;
    this.hitRect.x = 2;
    this.hitRect.y = 68;
    this.hitRect.w = 96;
    this.hitRect.h = 75;
    this.hitRect.cx = 50;
    this.hitRect.cy = 109;
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
    Entity.call(this, "images/char-boy.png", x, y, 0, 0);
    this.vmag = 100;
    this.attenuation = 0.98;
    //lose momentum after bounce
    this.bounceFactor = 0.25;
    this.hitRect.x = 18;
    this.hitRect.y = 98;
    this.hitRect.w = 66;
    this.hitRect.h = 41;
    this.hitRect.cx = 50;
    this.hitRect.cy = 120;
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
var allEnemies = [];
var numEnemies = 1;
var player;
var debug = true;

var initAppStuff = function()
{
    var uglyOffsetx = (ctx.canvas.width - 101)/2;
    var uglyOffsety = ctx.canvas.height/2 - 171*2/3;
    player = new Player(uglyOffsetx, uglyOffsety);

    for (i = 0; i < numEnemies; i++) {
        //
        allEnemies.push(new Enemy(300, 500 + i*80,((i%2)*2-1)*-100*(i+1), 50));
    }

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