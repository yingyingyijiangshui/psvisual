/**
 * Created by hp on 2015/12/23.
 */

// 注册命名空间
Namespace.register("beepower.util");

//命名对象beepower.
beepower.util.Log = function() {};

/**
 * @param container html node
 */
beepower.bus.Log.prototype.showLog = function(container) {
    var onLogComming = function() {

    };
    DataBus.subscribe("+/LogFilter/#", onLogComming)
};

