/**
 * Created by arno on 15-12-1.
 */
Namespace.register("BeePower.Svg");

//================================= Svg =================================

//定义Viewer类
BeePower.Svg.Viewer = {}

BeePower.Svg.Viewer.prototype.load = function(svgPath) {
    //
    var descStart = "MeasureResult/";
    //
    var map = new Map();

    d3.xml(svgPath, function(error, documentFragment) {

        if (error) {console.log(error); return;}

        var svgNode = documentFragment.getElementsByTagName("svg")[0];
        //d3's selection.node() returns the DOM node, so we
        //can use plain Javascript to append content
        //use plain Javascript to extract the node
        var main_chart_svg = d3.select("body");
        main_chart_svg.node().appendChild(svgNode);
        var innerSVG = main_chart_svg.select("svg");
        innerSVG.selectAll("text").filter(function (d, i) {
            //this是Document中的text元素
            var desc = this.getElementsByTagName("desc");
            if(desc == null)
                return false;
            for(var i = 0; i < desc.length; i++) {
                if(desc[i].childNodes.length < 1)
                    continue;
                var descValue = desc[i].childNodes[0].nodeValue;
                if(descValue.indexOf(descStart) != -1) {
                    //是一个需要实时显示的对象
                    console.log(descValue);
                    map.set(descValue, this);
                    return true;

                }
            }
            return false;
        });
    });
    return map;
}

BeePower.Svg.Viewer.prototype.subscribe = function(topicToDomNode) {
    console.log("subscribe start");
    //存在动态数据需要查询
    if(topicToDomNode.size > 0) {
        var messageProto = dcodeIO.ProtoBuf.loadProtoFile("proto/message.proto").build("domain.message");
        var fesProto = dcodeIO.ProtoBuf.loadProtoFile("proto/fes.proto").build("eig.fes");
        var bytes = new Uint8Array(2);
        bytes[0] = 0;
        bytes[0] = 0;
        var defaultMeasure = fesProto.PowerValue.decode(bytes);
        var client = new BeePower.Mqtt.Client("mq.beepower.com.cn", "9001", "web_client_ip");
        var fieldNames = ["v", "p", "i"];
        var fieldDisplayNames = ["电压", "功率", "电流"];
        //实际响应消息的函数
        onMessageArrived = function(msg) {
            var measure;
            fieldNames.forEach(onShowField);
            function onShowField(fieldName, index, array) {
                var tmp = msg.destinationName.substring(0, msg.destinationName.lastIndexOf("/"));
                var terminalId = tmp.substring(tmp.lastIndexOf("/") + 1);
                var key = "MeasureResult/" + terminalId + "/" + fieldName;
                if(!topicToDomNode.has(key))
                    return;
                if(measure == undefined) {
                    var payload = messageProto.Payload.decode(msg.payloadBytes);
                    measure = fesProto.PowerValue.decode(payload.value);
                }
                var textNode = topicToDomNode.get(key);
                var receivedV = measure.get(fieldName);
                var defaultV = defaultMeasure.get(fieldName);
                if(receivedV == defaultV)
                    return;
                d3.select("#" + textNode.id).text(fieldDisplayNames[index] + ":" + receivedV.toFixed(1));
            }
        }

        onSuccess = function(success) {
            console.log("connection success!");
            topicToDomNode.forEach(function subscribeElements(value, key, m) {
                var tmp = key.substring(0, key.lastIndexOf("/"));
                var topic = "fes/M_/" + tmp.substring(tmp.lastIndexOf("/") + 1) + "/+";
                console.log("subscribe topic : " + topic);
                client.subscribe(topic);
            });
        }

        client.connect(onSuccess, onFailure, onConnectionLost, onMessageArrived);
    }
}