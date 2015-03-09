var tabs = require('sdk/tabs');
var data = require('sdk/self').data;

//Cu = Components.utils
const {Cu} = require("chrome");
// To read & write content to file
const {TextDecoder, TextEncoder, OS} = Cu.import("resource://gre/modules/osfile.jsm", {});

const baseDir = OS.Path.join(OS.Constants.Path.tmpDir, 'file-sync');
const makeDirPromise = OS.File.makeDir(baseDir);

//then emit a message to the content script
//content script will pick up the message and update
//the appropriate input field
var syncFilePath;
var worker;
var lastModificationDate;
const decoder = new TextDecoder();
//setup a setinterval to poll scratch.txt all the time
console.log('Setting up poll for filesystem');
require('sdk/timers').setInterval(function(){
    if(syncFilePath){
        console.log('Polling: ' + syncFilePath);
        OS.File.stat(syncFilePath).then(function(info){
            if(info.lastModificationDate > lastModificationDate){
                console.log('current modification date: ' + info.lastModificationDate);
                console.log('last modification date: ' + lastModificationDate);
                lastModificationDate = info.lastModificationDate;
                OS.File.read(syncFilePath).then(
                    function(encodedContent){
                        var content = decoder.decode(encodedContent);
                        worker.port.emit('syncfile', content);
                    },
                    function(e){
                        console.log('Failed to read path: ' + syncFilePath);
                        console.log('Error was: ' + e);
                    }
                );
            }
        });
    }
}, 1000);

tabs.on('ready', function(tab) {
    console.log('Tab is ready');
    worker = tab.attach({
        contentScriptFile: data.url('tab-content-script.js')
    });
    worker.port.on('syncbrowser', function(message) {
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
                        OS.File.stat(path).then(function(info){
                            syncFilePath = path;
                            lastModificationDate = info.lastModificationDate;
                        });
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