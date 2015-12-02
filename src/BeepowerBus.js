// 声明一个全局对象Namespace，用来注册命名空间
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

// BeePower.Mqtt命名空间里面声明类Client
BeePower.Bus = function(host, port, clientId) {
    this.client = new Paho.MQTT.Client(host, Number(port), clientId);
    this.connectNum = 0;
    this.connect();
};

BeePower.Bus.prototype.onMessageArrived = function() {

};

BeePower.Bus.prototype.onConnectionLost = function() {
    console.log("connection lost!");
    setTimeout("DataBus.connect()", 30000);
};

BeePower.Bus.prototype.onSuccess = function() {
    console.log("connection success!");
    this.connectNum++;
};

BeePower.Bus.prototype.onFailure = function() {
    console.log("connection failed!");
    setTimeout("DataBus.connect()", 30000);
};

BeePower.Bus.prototype.connect = function() {
    var user = "testUser";
    var password = "";
    //client.onConnect = bp_onConnect;
    console.log("connection...");

    this.client.onMessageArrived = onMessageArrived;
    this.client.onConnectionLost = onConnectionLost;

    this.client.connect({
        timeout:30,//如果在改时间端内尚未连接成功，则认为连接失败  默认为30秒
        userName:user,
        password:password,
        willMessage: 'a will message!',//当连接非正常断开时，发送此遗言消息
        //keepAliveInterval:60, //心跳信号 默认为60秒
        cleanSession:true, //若设为false，MQTT服务器将持久化客户端会话的主体订阅和ACK位置，默认为true
        //useSSL:false,
        //invocationContext:"success",//作为onSuccess回调函数的参数
        onSuccess: onSuccess,
        onFailure: onFailure
    });
    console.log("!!! connection finished !!!");
    if(this.connectNum > 0) {
        //resubscribe
    }
};

BeePower.Bus.prototype.subscribe = function(topic, handler) {
    this.client.subscribe(topic);
};

BeePower.Bus.prototype.unsubscribe = function(topic, handler) {
    this.client.unsubscribe();
};

BeePower.Bus.prototype.publish = function(topic, toSendObj) {
    var oriBuf = toSendObj.encode().toBuffer();
    var buf = new ArrayBuffer(oriBuf.byteLength + 1);
    //先把测试标识位写进去
    var writer = new DataView(buf);
    writer.setInt8(0, 0);
    var reader = new DataView(oriBuf);
    for(var i = 0; i < oriBuf.byteLength; i++)
        writer.setUint8(i + 1, reader.getUint8(i));
    var message = new Paho.MQTT.Message(buf);
    message.destinationName = topic;
    this.client.send(message);
};

//定义一个全局变量供所有人使用
var DataBus = new BusData("mq.beepower.com.cn", "9001", "web_client_ip");
