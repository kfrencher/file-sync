var tabs = require('sdk/tabs');
var data = require('sdk/self').data;
var simplePrefs = require('sdk/simple-prefs');
var prefs = simplePrefs.prefs;

//Cu = Components.utils
const {Cu} = require("chrome");
// To read & write content to file
const {TextDecoder, TextEncoder, OS} = Cu.import("resource://gre/modules/osfile.jsm", {});

var basedir;
var baseFileName;
var makeDirPromise;
var pollingInterval;
var syncTargetSelectors;
var updatePrefs = function(){
    console.log('Updating Preferences');
    basedir = prefs.basedir || OS.Path.join(OS.Constants.Path.tmpDir, 'file-sync');
    baseFileName = prefs.baseFileName || 'scratch';
    pollingInterval = prefs.pollingInterval || 1000;
    makeDirPromise = OS.File.makeDir(basedir);
    syncTargetSelectors = (prefs.syncTargetSelectors || "input[type=text],input:not([type]),textarea").split(',');
    console.log('Preferences are - ' +
        'basedir: ' + basedir +
        ', baseFileName: ' + baseFileName +
        ', pollingInterval: ' + pollingInterval +
        ', syncTargetSelectors: ' + syncTargetSelectors);
};
updatePrefs();
simplePrefs.on('',updatePrefs);

var calculateFileName = function(content) {
    if(content.contains('jelly')){
        return baseFileName+'.xml';
    } else {
        return baseFileName+'.js';
    }
}

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
}, pollingInterval);

tabs.on('ready', function(tab) {
    console.log('Tab is ready');
    worker = tab.attach({
        contentScriptFile: data.url('tab-content-script.js'),
        contentScriptOptions: {
            syncTargetSelectors: syncTargetSelectors
        }
    });
    worker.port.on('syncbrowser', function(content) {
        var fileName = calculateFileName(content),
            path = OS.Path.join(basedir, fileName);

        //create file
        console.log('Syncing to: ' + path);
        var encoder = new TextEncoder(),
            encodedContent = encoder.encode(content);

        //Wait for directory to be created
        makeDirPromise.then(
            function() {
                var fileWritePromise = OS.File.writeAtomic(path, encodedContent, {
                    tmpPath: OS.Path.join(basedir,'file-sync.txt.tmp')
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