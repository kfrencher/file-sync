var tabs = require('sdk/tabs');
var data = require('sdk/self').data;

//Cu = Components.utils
const {Cu} = require("chrome");
// To read & write content to file
const {TextDecoder, TextEncoder, OS} = Cu.import("resource://gre/modules/osfile.jsm", {});

const baseDir = OS.Path.join(OS.Constants.Path.tmpDir, 'file-sync');
const makeDirPromise = OS.File.makeDir(baseDir);

console.log('Executing main.js');
tabs.on('load', function(tab) {
    var worker = tab.attach({
        contentScriptFile: data.url('tab-content-script.js')
    });
    worker.port.on('sync', function(message) {
        var fileName = message.fileName,
            path = OS.Path.join(baseDir, fileName),
            content = message.content;

        //create file
        console.log('Syncing to: ' + path);
        var encoder = new TextEncoder(),
            encodedContent = encoder.encode(content);

        //Wait for directory to be created
        makeDirPromise.then(
            function() {
                var fileWritePromise = OS.File.writeAtomic(path, encodedContent, {
                    tmpPath: 'file.txt.tmp'
                });
                fileWritePromise.then(
                    function() {
                        console.log('Finished syncing to: ' + fileName);
                    },
                    function(e) {
                        console.log('Failed to sync to: ' + fileName);
                        console.log('Error is: ' + e);
                    }
                );

            },
            function(){
                console.log('Failed to make basedir');
                console.log('Error is: ' + e);
            }
        )
    });
});