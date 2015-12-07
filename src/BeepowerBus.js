//声明一个全局对象Namespace，用来注册命名空间
var Namespace = {};

// 全局对象仅仅存在register函数，参数为名称空间全路径，如"Grandsoft.GEA"
Namespace.register = function(fullNS) {
    // 将命名空间切成N部分, 比如Grandsoft, GEA等
    var nsArray = fullNS.split('.');
    var sEval = "";
    var sNS = "";
    for (var i = 0; i < nsArray.length; i++) {
        if (i != 0) sNS += ".";
        sNS += nsArray[i];
        // 依次创建构造命名空间对象（假如不存在的话）的语句
        // 比如先创建Grandsoft，然后创建Grandsoft.GEA，依次下去
        sEval += "if (typeof(" + sNS + ") == 'undefined') " + sNS + " = new Object();"
    }
    if (sEval != "") eval(sEval);
};

// 注册命名空间
Namespace.register("BeePower.Bus");

//================================= Mqtt =================================

//命名对象BeePower.Bus
BeePower.Bus = function(host, port, clientId) {
    this.messageProto = dcodeIO.ProtoBuf.loadProtoFile("../proto/message.proto").build("domain.message");
    this.client = new Paho.MQTT.Client(host, Number(port), clientId);
    this.topicToHandlers = [];
    this.connectNum = 0;
    this.connect();
};

BeePower.Bus.prototype.onMessageArrived = function(msg) {
    var beeMsg = this.messageProto.BeeMessage.decode(msg.payloadBytes);
    for(var i = 0; i < this.topicToHandlers.length; i++) {
        if(this.match(topic, this.topicToHandlers[i].topic)) {
            var handlers = this.topicToHandlers[i].handlers;
            for(var j = 0; j < handlers.length; j++) {
                handlers[j](beeMsg);
            }
        }
    }
};

BeePower.Bus.prototype.onConnectionLost = function() {
    console.log("connection lost!");
    setTimeout("DataBus.connect()", 10000);
};

BeePower.Bus.prototype.onSuccess = function() {
    console.log("connection success!");
    this.connectNum++;
    if(this.connectNum > 1) {
        console.log("connectedNum = " + this.connectNum + " and resubscribe:");
        for(var i = 0; i < this.topicToHandlers.length; i++) {
            console.log("Subscribe: " + this.topicToHandlers[i].topic);
            subscribe(this.topicToHandlers[i].topic);
        }
    }
};

BeePower.Bus.prototype.onFailure = function() {
    console.log("connection failed!");
    setTimeout("DataBus.connect()", 10000);
};

BeePower.Bus.prototype.connect = function() {
    var user = "testUser";
    var password = "";
    //client.onConnect = bp_onConnect;
    console.log("connection...");

    this.client.onMessageArrived = this.onMessageArrived;
    this.client.onConnectionLost = this.onConnectionLost;
    var onSuccess = this.onSuccess;
    var onFailure = this.onFailure;
    this.client.connect({
        timeout:30,//如果在改时间端内尚未连接成功，则认为连接失败  默认为30秒
        userName:user,
        password:password,
        //keepAliveInterval:60, //心跳信号 默认为60秒
        cleanSession:true, //若设为false，MQTT服务器将持久化客户端会话的主体订阅和ACK位置，默认为true
        //useSSL:false,
        //invocationContext:"success",//作为onSuccess回调函数的参数
        onSuccess: onSuccess,
        onFailure: onFailure
    });
    console.log("!!! connection finished !!!");
};

BeePower.Bus.prototype.subscribe = function(topic, handler) {
    for(var i = 0; i < this.topicToHandlers.length; i++) {
        if(this.topicToHandlers[i].topic == topic) {
            var handlers = this.topicToHandlers[i].handlers;
            for(var j = 0; j < handlers.length; j++) {
                if (handlers[j] == handler)
                    return;
            }
            handlers.push(handler);
            return;
        }
    }
    this.topicToHandlers.push({topic : topic, handlers: [handler]});
    if(this.client.isConnected())
        this.client.subscribe(topic);
};

BeePower.Bus.prototype.unsubscribe = function(topic, handler) {
    var shouldUnsubscribe = false;
    for(var i = 0; i < this.topicToHandlers.length; i++) {
        if(this.topicToHandlers[i].topic == topic) {
            var handlers = this.topicToHandlers[i].handlers;
            for(var j = 0; j < handlers.length; j++) {
                if(handlers[j] == handler) {
                    handlers.splice(j, 1);
                    shouldUnsubscribe = handlers.length == 0;
                    break;
                }
            }
            break;
        }
    }
    if(shouldUnsubscribe && this.client.isConnected())
        this.client.unsubscribe(topic);
};

BeePower.Bus.prototype.publish = function(publishOptions) {
    publishOptions = publishOptions || {} ;
    if(publishOptions.topic === undefined)
        return; //没有主题的消息是不会发送的
    if(publishOptions.clientIdFlag === undefined)
        publishOptions.clientIdFlag = true;
    if(publishOptions.messageIdFlag === undefined)
        publishOptions.messageIdFlag = true;
    var beeMsg = new this.messageProto.BeeMessage();
    beeMsg.topic = publishOptions.topic;
    beeMsg.payLoad = new this.messageProto.Payload();

    if(publishOptions.payload !== undefined) {
        if(publishOptions.payload instanceof Array) {
            beeMsg.payLoad.value = dcodeIO.ByteBuffer.fromBinary(String.fromCharCode(publishOptions.payload));
        } else if(typeof publishOptions.payload == "string") {
            beeMsg.payLoad.value = dcodeIO.ByteBuffer.fromUTF8(publishOptions.payload.toString());
        } else { //不是字节数组,就是
            beeMsg.payLoad.value = publishOptions.payload.encode();
        }
    }
    if (publishOptions.qos !== undefined && publishOptions.qos != 0) beeMsg.payLoad.qos = publishOptions.qos;
    if (publishOptions.retained !== undefined && publishOptions.retained) beeMsg.payLoad.retain_flag = publishOptions.retained;
    // 这三个其实已经反映在 Payload 中.
    if (publishOptions.testFlag !== undefined && publishOptions.testFlag) beeMsg.payLoad.payLoad.test_flag = publishOptions.testFlag;
    if (publishOptions.clientIdFlag ) beeMsg.payLoad.clientId = "";//todo:
    if (publishOptions.messageIdFlag ) {
        var msgId = 1;//todo:
        beeMsg.payLoad.messageId  = msgId;
    }
    var message = new Paho.MQTT.Message(beeMsg.encode().toBuffer());
    message.destinationName = beeMsg.topic;
    if(this.client.isConnected())
        this.client.send(message);
};

BeePower.Bus.prototype.match = function(topic, wildCardTopic) {
    function equals(t, wt) {
        if ( t == wt ) return true;
        return !!(wt == "+" && t.charAt(t.length - 1) != ':');
    }

    if ( wildCardTopic == "#" )
        return true;
    if ( topic.indexOf("#") != -1) {
        if (topic.substr(topic.length - 2) != "/#") return false;
    }

    var topicW = wildCardTopic;
    var hasSharp = false;
    // has #
    if ( wildCardTopic.indexOf("#") != -1 ) {
        if (wildCardTopic.substr(wildCardTopic.length - 2) != "/#") return false;
        topicW = wildCardTopic.substr(0, wildCardTopic.length - 2);
        hasSharp = true;
    }

    // no '#'
    var st = topic.split("/");
    var sw = topicW.split("/");
    for(var i = 0; i < sw.length; i++) {
        if (st.length <= i)
            return false;
        if (!equals(st[i], sw[i]))
            return false;
    }
    //  case: log/m/n/p,  log/m/#
    if (hasSharp) return true;
    // case: log/m/n, log/m/+
    return st.length == st.length
};

//定义一个全局变量供所有人使用
var DataBus = new BeePower.Bus("mq.beepower.com.cn", 9001, "web_client_ip");
