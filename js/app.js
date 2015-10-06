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
};

//calculate the angle that the sprite should be rotated in order to create
//crawling/walking animation
Entity.prototype.angle = function() {
    var a = 20;
    var f = 60;
    var angle = (Math.abs(this.x) + Math.abs(this.y)) % a/a*Math.PI*2;
    return Math.sin(angle)/f*Math.PI*2;
}

//align sprite according to movement direction
Entity.prototype.alignAngle =  function() {
    if(this.vx != 0) {
        if(this.vy != 0) {
            return Math.atan(this.vy/this.vx);
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
        ctx.stroke();

        ctx.fillStyle = 'red';
        ctx.font = "20px serif";
        ctx.fillText("("+Math.floor(this.x)+", "+Math.floor(this.y)+")", 5, 20);
    }
    ctx.translate(this.sw/2, this.sh*2/3);
    ctx.rotate(this.angle() + this.alignAngle());
    ctx.translate(-this.sw/2, -this.sh*2/3);
    this.customRenderOperation(ctx);
    ctx.drawImage(Resources.get(this.sprite), 0, 0);
    ctx.restore();
};

Entity.prototype.customRenderOperation = function() {
    //noop
};

// Update the enemy's position, required method for game
// Parameter: dt, a time delta between ticks
Entity.prototype.update = function(dt) {
    var epsilon = 5;
    var entityMoved = false;
    if(Math.abs(this.vx) > epsilon)
    {
        var cw = numCols*mapTileWidth;
        var hnext = this.x + this.vx*dt;
        var hr = hnext + this.sw > cw;
        var hl = hnext < 0;

        if (hr && this.vx > 0) {
            this.x = 2*cw - 2* this.sw - hnext;
            this.vx *= -1;
        }
        else if (hl && this.vx < 0) {
            this.x = -hnext;
            this.vx *= -1;
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
        var ch = numRows*mapTileHeight;
        var vnext = this.y + this.vx*dt;
        var vt = vnext  < 0;
        var vb = vnext + this.sh > ch;

        if (vt && this.vy < 0) {
            this.y = -vnext;
            this.vy *= -1;
        }
        else if (vb && this.vy > 0) {
            this.y = 2*ch - 2* this.sh - vnext;
            this.vy *= -1;
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
    // Variables applied to each of our instances go here,
    // we've provided one for you to get started

    this.radarType = {
                        SQUARE: 0,
                        TRIANGLE: 1
                     };

    this.behaviourType = {
                            ROAMING: 0,
                            CHASING: 1
                         };

    Entity.call(this, "images/enemy-bug.png", x, y, vx, vy);
    this.x = -this.sw;
    this.state = this.behaviourType.ROAMING;
    this.radarRange = 100;
    this.radarType = this.radarType.SQUARE;
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
};

// Now write your own player class
// This class requires an update(), render() and
// a handleInput() method.

var Player = function(x, y) {
    Entity.call(this, "images/char-boy.png", x, y, 0, 0);
    this.vmag = 100;
    this.attenuation = 0.98;
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
var numEnemies = 3;
var player;
var debug = false;

var initAppStuff = function()
{
    var uglyOffsetx = (ctx.canvas.width - 101)/2;
    var uglyOffsety = ctx.canvas.height/2 - 171*2/3;
    player = new Player(uglyOffsetx, uglyOffsety);

    for (i = 0; i< numEnemies; i++) {
        allEnemies.push(new Enemy(0, 65 + i*80, ((i%2)*2-1)*-100*(i+1), 0));
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