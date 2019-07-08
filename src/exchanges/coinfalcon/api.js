var request = require('request');
const crypto = require('crypto');
const tools = require('../../tools');
let config;

let setConfig = function(data){
    config = data;
};

let sign = function(method, request_path, body = undefined) {
    let timestamp = Date.now().toString();
    timestamp = parseInt(timestamp.substring(0, timestamp.length - 3), 10);
    let payload = timestamp+"|"+method+"|"+request_path;
    if (body) {
        payload += '|' + JSON.stringify(body);
    }
    //config.debug && console.log(payload);
    const hmac = crypto.createHmac('sha256', config.CD_API_SECRET_KEY);
    hmac.update(payload);
    let signature = hmac.digest('hex');
    return {"CF-API-KEY": config.CF_API_KEY, "CF-API-TIMESTAMP": timestamp, "CF-API-SIGNATURE": signature};
};

let getBalance = function(){
    return new Promise(async function (resolve) {
        //Waiting function to prevent reach api limit
        let request_path = "/api/v1/user/accounts";
        let url = config.url + request_path;
        request.get({url: url, headers : sign("GET", request_path)}, async function (error, response, body) {
            try {
                const result = JSON.parse(body);
                if (!error && response.statusCode === 200) {
                    resolve({s:1, data: result.data});
                } else {
                    console.error("coinfalcon getBalance");
                    console.error(body);
                    resolve({s:0, data: result});
                }
            } catch (e) {
                console.error(body);
                console.error(e);
                resolve({s:0, data: {error: "getBalance"}});
            }
        });
    });
};

let getTicker = function(pair) {
    return new Promise(async function (resolve) {
        /*
            Response schema type: object

            [Object]	bids
            Aggregated bids.

            String	bids[].price
            String	bids[].size
            [Object]	asks
            Aggregated asks.

            String	asks[].price
            String	asks[].size
        */
        request.get({url: "https://coinfalcon.com/api/v1/markets/"+pair.name+"/orders", qs: { "level": "2" }}, function(error, response, body) {
            try {
                const result = JSON.parse(body);
                if (!error && response.statusCode === 200) {
                    resolve({s:1, data: result, counter: 1});
                } else {
                    console.error("coinfalcon getTicker");
                    console.error(body);
                    resolve({s:0, data: result, counter: 1});
                }
            } catch (e) {
                console.error(body);
                console.error(e);
                resolve({s:0, data: {error: "getTicker"}, counter: 1});
            }
        });
    });
};

let getOpenOrders = function(){
    return new Promise(async function (resolve) {
        let request_path = "/api/v1/user/orders?status=open";
        let url = config.url + request_path;
        request.get({url: url, headers : sign("GET", request_path)}, async function (error, response, body) {
            try {
                const result = JSON.parse(body);
                if (!error && response.statusCode === 200) {
                    resolve({s:1, data: result.data});
                } else {
                    console.error("coinfalcon getOpenOrders");
                    console.error(body);
                    resolve({s:0, data: result});
                }
            } catch (e) {
                console.error(body);
                console.error(e);
                resolve({s:0, data: {error: "getOpenOrders"}});
            }
        });
    });
};

let getOrders = function(pair, status){
    return new Promise(async function (resolve) {
        let request_path = "/api/v1/user/orders?market="+pair+"&status="+status;
        let url = config.url + request_path;
        request.get({url: url, headers : sign("GET", request_path)}, async function (error, response, body) {
            try {
                const result = JSON.parse(body);
                if (!error && response.statusCode === 200) {
                    resolve({s:1, data: result.data});
                } else {
                    console.error("coinfalcon getOrder");
                    console.error(body);
                    resolve({s:0, data: result});
                }
            } catch (e) {
                console.error(body);
                console.error(e);
                resolve({s:0, data: {error: "getOrders"}});
            }
        });
    });
};

let getOrder = function(pair, id, type, openedOrder){
    return new Promise(async function (resolve) {
        let request_path = "/api/v1/user/orders/"+id;
        let url = config.url + request_path;
        request.get({url: url, headers : sign("GET", request_path)}, async function (error, response, body) {
            try {
                const result = JSON.parse(body);
                if (!error && response.statusCode === 200) {
                    let detailOrder = new tools.orderDetailForm;
                    detailOrder.id = result.data.id;
                    detailOrder.pair = result.data.market;
                    detailOrder.type = type;
                    detailOrder.price = parseFloat(result.data.price);
                    detailOrder.size = parseFloat(result.data.size);
                    detailOrder.funds = parseFloat(result.data.funds);
                    detailOrder.size_filled = parseFloat(result.data.size_filled);
                    detailOrder.fee = parseFloat(result.data.fee);
                    detailOrder.status = result.data.status;
                    resolve({s:1, data: detailOrder});
                } else {
                    console.error("coinfalcon getOrder");
                    console.error(body);
                    resolve({s:0, data: result});
                }
            } catch (e) {
                console.error(body);
                console.error(e);
                resolve({s:0, data: {error: "getOrder"}});
            }
        });
    });
};

let cancelOrder = function(pair, id, type, openedOrder){
    return new Promise(async function (resolve) {
        let request_path = "/api/v1/user/orders/"+id;
        let url = config.url + request_path;
        request.delete({url: url, headers : sign("DELETE", request_path, {})}, async function (error, response, body) {
            try {
                const result = JSON.parse(body);
                if (!error && response.statusCode === 200) {
                    let detailOrder = new tools.orderDetailForm;
                    detailOrder.id = result.data.id;
                    detailOrder.pair = result.data.market;
                    detailOrder.type = type;
                    detailOrder.price = parseFloat(result.data.price);
                    detailOrder.size = parseFloat(result.data.size);
                    detailOrder.funds = parseFloat(result.data.funds);
                    detailOrder.size_filled = parseFloat(result.data.size_filled);
                    detailOrder.fee = parseFloat(result.data.fee);
                    detailOrder.status = result.data.status;
                    resolve({s:1, data: detailOrder});
                } else {
                    console.error("coinfalcon cancelOrder");
                    console.error(body);
                    resolve({s:0, data: result});
                }
            } catch (e) {
                console.error(body);
                console.error(e);
                resolve({s:0, data: {error: "cancelOrder"}});
            }
        });

    });
};

let createOrder = async function(pair, type, pendingSellOrder, valueForSize, price){
        let size = "";
        switch(type){
            case "BUY":
                size = tools.getBuyOrderSize(pair, valueForSize, price).toString();
                if(size > 0){
                    return await limitOrder(type, pair.name, size, price);
                } else {
                    return {s:0, errorMessage: "Size order not set in config."};
                }
            case "SELL":
                size = pendingSellOrder.sell_size.toString();
                return await limitOrder(type, pair.name, size, price);
        }
};

let limitOrder = function(type, currencyPair, size, price){
    return new Promise(async function (resolve) {
        let body = { market: currencyPair, operation_type: 'limit_order', order_type: type.toLowerCase(), price: price.toString(), size: size, post_only: "false" };
        let request_path = "/api/v1/user/orders";
        let url = config.url + request_path;
        let o1 = { 'content-type': 'application/x-www-form-urlencoded',
            accept: 'application/json' };

        let headers = Object.assign(o1, sign("POST", request_path, body));
        request.post({url: url, headers: headers, form: body}, async function(error, response, body) {
            try {
                const result = JSON.parse(body);
                if (!error && response.statusCode === 201) {
                    let createdOrder = new tools.orderCreatedForm;
                    createdOrder.id = result.data.id;
                    createdOrder.price = parseFloat(result.data.price);
                    createdOrder.size = parseFloat(result.data.size);
                    createdOrder.funds = parseFloat(result.data.funds);
                    resolve({s:1, data: createdOrder});
                } else {
                    console.error("coinfalcon limitOrder");
                    console.error(body);
                    resolve({s:0, errorMessage: body});
                }
            } catch (e) {
                console.error(body);
                console.error(e);
                resolve({s:0, errorMessage: "createOrder"});
            }
        });
    });
};

let getOrderTrades = function(id){
    return new Promise(function (resolve) {
        let request_path = "/api/v1/user/orders/"+id+"/trades";
        let url = config.url + request_path;
        request.get({url: url, headers : sign("GET", request_path)}, async function (error, response, body) {
            try {
                const result = JSON.parse(body);
                if (!error && response.statusCode === 200) {
                    resolve({s:1, data: result});
                } else {
                    console.error("coinfalcon getOrderTrades");
                    console.error(body);
                    resolve({s:0, data: result});
                }
            } catch (e) {
                console.error(body);
                console.error(e);
                resolve({s:0, data: {error: "getOrderTrades"}});
            }
        });
    });
};

let parseTicker = function(type, orders, pair, order){
    let ticks = {bid:[],bidBorder: 0, ask:[], askBorder:0};
    let ii=0;
    for(let i=0;i<orders.data.asks.length;i++){
        if(i===0){
            ticks.askBorder = parseFloat(orders.data.asks[i].price);
        }
        if(type === "ask"){
            if(typeof order !== 'undefined' && order.hasOwnProperty('sell_price') && parseFloat(orders.data.asks[i].price) === order.sell_price){
                const askSizeDiff = (parseFloat(orders.data.asks[i].size)-order.sell_size);
                if( askSizeDiff > pair.strategy.ignoreOrderSize){
                    ticks.ask.push({price: parseFloat(orders.data.asks[i].price), size: tools.setPrecision(askSizeDiff, pair.digitsSize)});
                    ii++;
                }
            } else if( parseFloat(orders.data.asks[i].size) > pair.strategy.ignoreOrderSize){
                ticks.ask.push({price: parseFloat(orders.data.asks[i].price), size: parseFloat(orders.data.asks[i].size)});
                ii++;
            }
        } else {
            break;
        }
    }
    ii=0;
    for(let i=0;i<orders.data.bids.length;i++){
        if(i === 0){
            ticks.bidBorder = parseFloat(orders.data.bids[i].price);
        }
        if(type === "bid"){
            if(typeof order !== 'undefined' && order.hasOwnProperty('buy_price') && parseFloat(orders.data.bids[i].price) === order.buy_price){
                const bidSizeDiff = (parseFloat(orders.data.bids[i].size)-order.buy_size);
                if( bidSizeDiff > pair.strategy.ignoreOrderSize){
                    ticks.bid.push({price: parseFloat(orders.data.bids[i].price), size: tools.setPrecision(bidSizeDiff, pair.digitsSize)});
                    ii++;
                } else {
                    //console.log("My position "+orders.data.bids[i].price+" was alone (Lets process ask fornot counted ignored), removed from ticks.");
                }
            } else if(parseFloat(orders.data.bids[i].size) > pair.strategy.ignoreOrderSize){
                ticks.bid.push({price: parseFloat(orders.data.bids[i].price), size: parseFloat(orders.data.bids[i].size)});
                ii++;
            }
        } else {
            break;
        }
    }
    return ticks;
};

module.exports = {
    setConfig: setConfig,
    getBalance: getBalance,
    getTicker: getTicker,
    parseTicker: parseTicker,
    getOpenOrders: getOpenOrders,
    getOrder: getOrder,
    cancelOrder: cancelOrder,
    createOrder: createOrder,
};


