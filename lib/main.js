var tabs = require('sdk/tabs');
var data = require('sdk/self').data;

//Cu = Components.utils
const {Cu} = require("chrome");

// To read & write content to file
const {TextDecoder, TextEncoder, OS} = Cu.import("resource://gre/modules/osfile.jsm", {});

console.log('Executing main');
console.log(data.url('tab-content-script'));
tabs.on('load',function(tab){
    console.log('tab is ready');
    var worker = tab.attach({
        contentScriptFile: data.url('tab-content-script.js')
    });
    worker.port.on('sync', function(message){
        var fileName = message.fileName,
            content = message.content;

        //create file
        console.log('Need to create file called: ' + fileName);
        //set content
        console.log('Need to add the following to file: ' + content);
    });
});
