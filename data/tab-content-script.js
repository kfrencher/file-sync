/**
 * Flattens the provided collection of arrays into a single array
 */
var flatten = function(xss) {
    return (xss || []).reduce(function(xs, ys) {
        return xs.concat(ys);
    }, []);
};

var calculateFileName = function(input) {
    return 'scratch.txt';

}

// Sends message to main to sync the data with file
var emitValue = function(e) {
    console.log('emitting sync event');
    self.port.emit('sync', {
        fileName: calculateFileName(e.target),
        content: this.value
    });
}

// Returns all text and textarea inputs in the passed in document
var getTextInputs = function(doc) {
    if (doc) {
        var inputs = [].concat(
            Array.from(doc.querySelectorAll('input[type=text]')),
            Array.from(doc.querySelectorAll('input:not([type])')),
            Array.from(doc.querySelectorAll('textarea'))
        );
        return inputs;
    } else {
        return [];
    }
};

/**
 * Create an observer that will listen to changes in the body and
 * search for all inputs on the page. The inputs will then be observed
 * for changes
 */
var observer = new MutationObserver(function() {

    var textInputsInMainWindow = getTextInputs(document),
        iframes = Array.from(document.querySelectorAll('iframe')),
        textInputsInIframes = flatten(iframes.map(iframe => iframe.contentDocument)
            .map(getTextInputs)),
        inputs = [].concat(textInputsInMainWindow, textInputsInIframes);


    inputs.forEach(function(input) {
        console.log('Attaching listener to: ' + input.tagName + '[name=' + input.name + ']');
        input.addEventListener('change', emitValue);
        input.addEventListener('mousedown', emitValue);
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});