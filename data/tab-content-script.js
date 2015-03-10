if(!Array.from){
    Array.from = function(xs){
        return Array.prototype.slice.call(xs);
    }
}

/**
 * Flattens the provided collection of arrays into a single array
 */
var flatten = function(xss) {
    return (xss || []).reduce(function(xs, ys) {
        return xs.concat(ys);
    }, []);
};


var syncTarget; //the current input to use as the sync target
self.port.on('syncfile', function(content){
    if(syncTarget){
        console.log('Syncing file to input');
        syncTarget.value = content;
    }
});

// Sends message to main to sync the data with file
var emitValue = function(e) {
    console.log('emitting syncbrowser event');
    syncTarget = e.target;
    self.port.emit('syncbrowser', syncTarget.value);
}

// Returns all text and textarea inputs in the passed in document
var getTextInputs = function(doc) {
    var syncTargetSelectors = self.options.syncTargetSelectors;
    if (doc) {
        return flatten(syncTargetSelectors.map(selector => Array.from(doc.querySelectorAll(selector))));
    } else {
        return [];
    }
};

var watchInputs = function() {
    var textInputsInMainWindow = getTextInputs(document),
        iframes = Array.from(document.querySelectorAll('iframe')),
        textInputsInIframes = flatten(iframes.map(iframe => iframe.contentDocument)
            .map(getTextInputs)),
        inputs = [].concat(textInputsInMainWindow, textInputsInIframes);

    inputs.forEach(function(input) {
        console.log('Attaching listener to: ' + input.tagName + '[id=' + input.id + ', name=' + input.name + ']');
        input.addEventListener('change', emitValue);
        input.addEventListener('mousedown', emitValue);
    });
}

if(document.body){
    /**
     * Create an observer that will listen to changes in the body and
     * search for all inputs on the page. The inputs will then be observed
     * for changes
     */
    var observer = new MutationObserver(watchInputs);
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    watchInputs();
}
