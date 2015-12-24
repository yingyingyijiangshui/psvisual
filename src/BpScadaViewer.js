/**
 * Created by arno on 15-12-1.
 */
Namespace.register("beepower.svg");

//================================= Svg =================================

//定义Viewer类
beepower.svg.ScadaViewer = function() {};

beepower.svg.ScadaViewer.prototype.load = function(svgPath, div) {
    //
    var analogStart = "bpAnalog/";
    var discreteStart = "bpDiscrete/";
    //
    var topicToDomNode = new Map();

    var fieldNames = ["v", "p", "i", "switchOn"];
    var fieldDisplayNames = ["电压", "功率", "电流", "开关"];
    //实际响应消息的函数
    var onMeasured = function(beeMsg) {
        var measure;
        fieldNames.forEach(onShowField);
        function onShowField(fieldName, index, array) {
            var terminalId = beeMsg.topic.substring(beeMsg.topic.lastIndexOf("/") + 1);
            var key = analogStart + terminalId + "/" + fieldName;
            if(!topicToDomNode.has(key)) {
                key = discreteStart + terminalId + "/" + fieldName;
                if (!topicToDomNode.has(key))
                    return;
            }
            if(measure == undefined) {
                measure = fesProto.PowerValue.decode(beeMsg.payload.value);
            }
            var node = topicToDomNode.get(key);
            var receivedV = measure.get(fieldName);
            var defaultV = defaultFesM.get(fieldName);
            if(receivedV == defaultV)
                return;
            $("#" + node.id).text(fieldDisplayNames[index] + ":" + receivedV.toFixed(1));
            //闪烁提示
            var count = 0;
            var f = setInterval(function() {
                count++;
                $("#" + node.id).fadeOut(100).fadeIn(100);
                if(count == 5)
                    clearInterval(f);
            },500);
        }
    };


    d3.xml(svgPath, function(error, documentFragment) {

        if (error) {console.log(error); return;}

        var svgNode = documentFragment.getElementsByTagName("svg")[0];
        //selection是html DOM的API
        div.appendChild(svgNode);
        //使用D3选择器
        var innerSVG = d3.select(div).select("svg");
        innerSVG.selectAll("text").filter(function (d, i) {
            //this是Document中的text元素
            var desc = this.getElementsByTagName("desc");
            if(desc == null)
                return false;
            for(i = 0; i < desc.length; i++) {
                if(desc[i].childNodes.length < 1)
                    continue;
                var descValue = desc[i].childNodes[0].nodeValue;
                if(descValue.indexOf(analogStart) != -1 || descValue.indexOf(discreteStart) != -1) {
                    //是一个需要实时显示的对象
                    var tmp = descValue.substring(0, descValue.lastIndexOf("/"));
                    var topic = "+/EigOut/M_/" + tmp.substring(tmp.lastIndexOf("/") + 1);
                    console.log("subscribe topic : " + topic);
                    DataBus.subscribe(topic, onMeasured);
                    topicToDomNode.set(descValue, this);
                    return true;
                }
            }
            return false;
        });
        innerSVG.attr("width", "100%").attr("height", "100%").attr("preserveAspectRatio", "xMidYMid meet");
        //innerSVG.select("g").style("opacity", 0.5);

        var zoom = d3.behavior.zoom().scaleExtent([0.5, 10]).on("zoom", zoomed);
        function zoomed() {
            //d3.select(this).attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            //d3.select(this).select('g').attr("transform","translate(" + d3.event.translate + ")"+ " scale(" + d3.event.scale + ")");
        }
        innerSVG.call(zoom);
    });
};
