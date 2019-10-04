var colyseus = require('colyseus');
var models = require('../app/models/');
var autoBind = require('react-autobind');
var _ = require('lodash');

class State {
    constructor() {
        this.started = false;
        this.turn = 0;
        this.players = {};
        this.simi = [];
        this.stack = [];
        this.moveable = [];
        this.userSimi = [];
    }
}
class metaData {
    constructor(options) {
        this.name = options.name;
        this.bet = options.bet;
        this.point = options.point;
        this.ready = 0;
        this.p1 = null;
        this.p2 = null;
    }
}
class Server extends colyseus.Room {
    constructor(options) {
        super(options);
        this.meta = {};
        this.player = 2;

        this.first = true;
        this.started = false;
        this.dices = [];
        this.deck = [];
        this.req = null;
        this.db = null;
        this.models = null;
        autoBind(this);
    }
    async onInit(options) {
        this.setState(new State);
        let promise = new Promise((resolve, reject) => {
            models((err, ldb) => {
                resolve(ldb);
            });
        });

        this.db = await promise;
        this.models = this.db.models;

        this.models.setting.find({ key: 'game' }, 1, (err, setting) => {
            this.setting = JSON.parse(setting[0].value);
        });
    }
    requestJoin(options, isNewRoom) {
        if (options.create && isNewRoom) {
            this.meta = new metaData({
                name: options.name || 'domino',
                bet: options.bet || 5000,
                point: options.point || 150,
            });
            this.setMetadata(this.meta);
        }
        return (options.create) ?
            (options.create && isNewRoom) :
            this.clients.length > 0;
    }
    async onAuth(options) {
        let ret = null;
        let promise = new Promise((resolve, reject) => {
            this.models.user.find({ token: options.key }, 1, (err, user) => {
                resolve(user[0])
            });
        });
        return await promise;
    }
    onJoin(client, options, auth) {
        client.id = auth.id;
        client.name = auth.fullName();
        client.balance = auth.balance;
        this.timer = this.clock.setTimeout(() => {
            if (this.first) {
                this.addPlayer(client, '1');
            } else {
                this.addPlayer(client, (this.state.players['1'] == null ? '1' : '2'));
            }
            this.first = false;
        }, 500)
        // this.checkJoinRules(client);
        this.send(client, {
            welcome: {
                table: this.meta,
                info: auth
            }
        });

    }

    onMessage(client, message) {
        var type = Object.keys(message)[0];
        var value = message[type];
        switch (type) {
            case 'stack':
                if (this.req == null && client.sit == this.state.turn) {
                    this.stackHandler(client, value)
                }
                break;
            case 'pick':
                if (client.sit == this.state.turn)
                    this.pick(client, value)
                break;
        }
    }

    onLeave(client, consented) {
        if (this.started) {
            if (consented) {
                // this.giveUp(client);
            } else {
                this.disconnected(client);
            }
        } else {
            // this.leave(client);
        }
    }
    onDispose() {

    }

    addPlayer(client, sit) {
        this.removePlayer(client);
        if (this.state.players[sit] == null) {
            client.sit = sit;

            if (sit == '1') {
                this.meta.p1 = client.name;
            } else {
                this.meta.p2 = client.name;
            }
            this.setMetadata(this.meta);

            this.state.players[sit] = {
                id: client.id,
                name: client.name,
                sit: sit,
            };
            this.setClientReady();
            this.canStart();

            return true;
        }
        else if ('disconnected' in this.state.players[sit] && this.state.players[sit].id == client.id) {
            client.sit = sit;
            this.broadcast({
                connected: client.name
            });
            this.send(client, { dices: this.deck[client.sit - 1] });
            if (this.next == sit) {
                this.checkHaveDice();
            }
            delete this.state.players[sit].disconnected;
            return true;
        }
        else {

        }
        return false;

    }
    disconnected(client) {
        if (client.sit > 0)
            this.state.players[client.sit].disconnected = true;
    }
    removePlayer(client) {
        if (client.sit > 0) {
            delete this.state.players[client.sit];
            this.setClientReady();
        }
    }
    canStart() {
        if (this.timer != undefined)
            this.timer.clear();
        this.timer = this.clock.setTimeout(() => {
            if (this.meta.ready == this.player) {
                this.start()
            }
        }, 600);
    }
    start() {
        this.started = true;
        this.state.started = true;
        this.setupNewGame();
    }
    setupNewGame(starter = null) {
        let dices = [], i, sit, j, simi = [];
        for (i = 0; i < 7; i++) {
            for (let j = 0; j <= i; j++) {
                dices.push([i, j]);
                simi.push(true);
            }
        }
        this.dices = this.shuffle(dices);
        let diceLen = this.dices.length;
        for (i = 0; i < this.player; i++) {
            this.deck[i] = [];
            while (this.deck[i].length < 7) {
                j = Math.floor(Math.random() * diceLen);
                if (this.dices[j] != null) {
                    this.deck[i].push(this.dices[j])
                    simi[j] = false;
                    this.dices[j] = null
                }
            }
            sit = this.userBySit(i + 1);
            if (sit > -1) {
                this.send(this.clients[sit], { dices: this.deck[i] });
            }
        }

        this.state.turn = starter == null ? this.findStarter() : starter;

        let state = {
            stack: [],
            moveable: [],
            simi: simi,
            userSimi: [7, 7]
        }
        Object.entries(state).forEach(([key, item]) => {
            this.state[key] = item;
        });
    }
    findStarter() {
        let i, j, k = 0, max = [0, 0], found = false, turn;
        for (i of this.deck) {
            for (j of i) {
                if (j[0] == j[1]) {
                    found = true;
                    if (j[0] > max[k]) {
                        max[k] = j[0];
                    }
                }
            }
            k++;
        }
        if (found) {
            turn = max[0] > max[1] ? 1 : 2;
        }
        else {
            k = 0;
            let sum = 0;
            for (i of this.deck) {
                for (j of i) {
                    sum = j[0] + j[1];
                    if (sum > max[k]) {
                        max[k] = sum;
                    }
                }
                k++;
            }
            turn = max[0] > max[1] ? 1 : 2;
        }
        return turn;
    }

    stackHandler(client, dice) {
        let numbers = this.clone(dice.number).sort();
        this.req = client.sit;
        let sit = client.sit - 1, i, j;
        for (i in this.deck[sit]) {
            j = this.clone(this.deck[sit][i]);
            if (_.isEqual(numbers, j.sort())) {
                this.deck[sit].splice(i, 1);
                this.send(client, { dices: this.deck[sit] });
                break;
            }
        }
        this.state.userSimi[sit] = this.state.userSimi[sit] - 1;
        this.state.stack.push(this.clone(dice));
        let target = this.state.stack.length;

        if (target == 1) {
            this.state.moveable = dice.number;
        }
        else if (dice.index > 0) {
            this.state.moveable[1] = dice.number[1];
        }
        else {
            this.state.moveable[0] = dice.number[1];
        }
        if (this.state.userSimi[sit] == 0) {
            this.RoundDone();
        }
        else {
            this.clock.setTimeout(() => {
                this.next();
            }, 500);
        }
    }
    next() {
        this.req = null;
        this.nextPlayer = this.state.turn == 1 ? 2 : 1;
        this.state.turn = this.nextPlayer;
        this.checkHaveDice();
    }
    checkHaveDice() {
        let have = this.deck[this.nextPlayer - 1].some(v => v.some(b => this.state.moveable.includes(b)));
        if (!have) {
            let sit = this.userBySit(this.nextPlayer);
            if (sit > -1) {
                this.send(this.clients[sit], { pick: true });
            }
        }
    }
    pick(client, i) {
        let j = client.sit - 1;
        let dice = this.dices[i];
        if (dice != null) {
            this.deck[j].push(dice);
            this.state.simi[i] = false;
            this.dices[i] = null;
            this.state.userSimi[j] = this.state.userSimi[j] + 1;
            this.send(client, { dices: this.deck[j] });
            if (this.checkNoMoreDice()) {
                this.RoundDone();
            }
            else {
                console.log(this.state.simi);
                if (!(this.state.moveable.some(v => dice.includes(v)))) {
                    this.send(client, { pick: true });
                }
            }
        }
    }
    RoundDone() {
        let i, j, point = [0, 0], k;
        for (i in this.deck) {
            for (j of this.deck[i]) {
                point[i] += j[0] + j[1];
            }
            k = i == 1 ? '2' : '1';
            this.state.players[k].point = point[i];
        }
        let starter = point[0] > point[1] ? 1 : 2;
        this.clock.setTimeout(() => {
            this.setupNewGame(starter);
        }, 500);

    }
    checkNoMoreDice() {
        let exist = false, i;
        for (i of this.state.simi) {
            if (i !== null) {
                exist = true;
                break;
            }
        }
        return !exist;
    }
    checkJoinRules(client) {
        var i;
        for (i in this.clients) {
            if (this.clients[i].id == client.id && client.sessionId != this.clients[i].sessionId) {
                client.close();
            }
        }
    }
    setClientReady() {
        this.meta.ready = Object.keys(this.state.players).length;
        this.setMetadata(this.meta);
    }
    userBySit(sit) {
        var ret = -1, i;
        for (i in this.clients) {
            if (this.clients[i].sit == sit) {
                ret = i;
                break;
            }
        }
        return ret;
    }
    shuffle(arr, level = 1) {
        var a, b, c;
        for (a = 0; a < level; a++) {
            for (b = arr.length - 1; b > 0; b--) {
                c = Math.floor(Math.random() * (b + 1));
                [arr[b], arr[c]] = [arr[c], arr[b]];
            }
        }
        return arr;
    }
    clone(arr) {
        let newObj = (arr instanceof Array) ? [] : {};
        for (let i in arr) {
            if (arr[i] && typeof arr[i] == "object") {
                newObj[i] = this.clone(arr[i]);
            }
            else
                newObj[i] = arr[i]
        }
        return newObj;
    }
}



module.exports = Server;