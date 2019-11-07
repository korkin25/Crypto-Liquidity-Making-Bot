let socket_io = require('socket.io');
let io = socket_io();
let websocket = {};
let sockets = [];
let tools = require('./tools');
let db = require('../db/sqlite3');

websocket.io = io;

let setSocket = function (socket){
    sockets.push(socket);
};

let removeSocket = function (socket){
    let i = sockets.indexOf(socket);
    if(i !== -1) {
        sockets.splice(i, 1);
    }
};

websocket.emitPendingOrders = async function(data){
    if(sockets.length > 0){
        const po = await db.getAllSellOrders(data.exchange, data.pair.name, data.pair.id);
        const tS = await db.getTotalSellSize(data.exchange, {"name": data.pair.name, "id": data.pair.id, "digitsSize": data.pair.digitsSize});


        const dailyProfit = await db.getDailyProfit(data.exchange, data.pair.name, data.pair.id, new Date().toISOString().substr(0,10)+"%");
        const totalProfit = await db.getProfit(data.exchange, data.pair);
        if(dailyProfit.total === null){
            dailyProfit.total = 0;
        }
        let pendingOrders = [];
        let totalAmount = 0;
        let frozenAmount = 0;
        for(let i=0;i<po.length;i++){
            const orderAmount = (po[i].buy_price * po[i].sell_size);
            totalAmount += (orderAmount+po[i].buy_fee);
            if(po[i].frozen){
                frozenAmount += (orderAmount+po[i].buy_fee);
            }
            const pl = tools.calculatePendingProfit(po[i], tools.takePipsFromPrice(data.tick.ask, 1, data.pair.digitsPrice));
            pendingOrders.push({"buy_id": po[i].buy_id, "buy_price": po[i].buy_price, "sell_size":po[i].sell_size.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: data.pair.digitsSize
                }), "sell_target_price": tools.setPrecision(po[i].sell_target_price, data.pair.digitsPrice), "pl": pl.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: data.pair.digitsSize
                }), "oA": tools.setPrecision(orderAmount, data.pair.digitsPrice), "f": po[i].frozen});
        }
        let budgetLimit = 0;
        if(data.pair.moneyManagement.autopilot.active){
            budgetLimit = data.pair.moneyManagement.autopilot.budgetLimit;
        } else if(data.pair.moneyManagement.supportLevel.active){
            budgetLimit = data.pair.moneyManagement.supportLevel.budgetLimit;
        } else if(data.pair.moneyManagement.buyPercentageAvailableBalance.active){
            budgetLimit = data.pair.moneyManagement.buyPercentageAvailableBalance.budgetLimit;
        } else if(data.pair.moneyManagement.buyPercentageAvailableBudget.active){
            budgetLimit = data.pair.moneyManagement.buyPercentageAvailableBudget.budgetLimit;
        } else if (data.pair.moneyManagement.buyForAmount.active){
            budgetLimit = data.pair.moneyManagement.buyForAmount.budgetLimit;
        } else if (data.pair.moneyManagement.buySize.active){
            budgetLimit = data.pair.moneyManagement.buySize.budgetLimit;
        }
        emitToAll("ticker", {"e": data.exchange, "p": {"n": data.pair.name, "i": data.pair.id, "s":data.pair.separator}, "tS": tS, "tA": tools.setPrecision(totalAmount, data.pair.digitsPrice), "fA": tools.setPrecision(frozenAmount, data.pair.digitsPrice), "d": data.pair.digitsSize, "mA": budgetLimit , "t": data.tick, "tP":totalProfit, "dP": dailyProfit, "pO": pendingOrders});
    }
};

websocket.emitFilledBuyOrder = async function(data){
    if(sockets.length > 0){
        emitToAll("filledBuyOrder", {"p": {"n": data.pair.name, "e":data.exchange, "l": data.order.pair+" #"+data.pair.id, "s":data.pair.separator}, "s": data.order.size_filled, "bP": data.order.price, "f": data.order.fee, "sP":data.sellTargetPrice});
    }
};

websocket.emitCompletedOrder = async function(data){
    if(sockets.length > 0){
        emitToAll("completedOrder", {"p": {"n": data.pair.name,"e": data.order.exchange, "l": data.order.pair+" #"+data.order.pair_id, "s":data.pair.separator}, "s": data.order.sell_filled, "bP": data.order.buy_price, "bF": data.order.buy_fee, "sP": data.order.sell_price, "sF": data.order.sell_fee, "oP": data.profit});
    }
};

let emitToAll = function(event, data){
    if(sockets !== undefined) {
        sockets.forEach(function (socketSingle){
            socketSingle.emit(event, data);
        });
    }
};

io.on('connection', function (socket) {
    setSocket(socket);

    socket.on('disconnect', function(){
        removeSocket(socket);
    });

    socket.on('freezeOrder', async function (data, fn) {
        const resultFreeze = await db.setFreeze(data.orderId, 1);
        fn({done:resultFreeze});
    });

    socket.on('unfreezeOrder', async function (data, fn) {
        const resultFreeze = await db.setFreeze(data.orderId, 0);
        fn({done:resultFreeze});
    });

    socket.on('killOrder', async function (data, fn) {
        const resultKill = await db.killOrder(data.orderId);
        fn({done:resultKill});
    });
});

module.exports = websocket;
