var syncValue = function(){
    console.log('emitting sync event');
    self.port.emit('sync',{
        fileName:'scratch.txt',
        content:this.value
    });
}

var observer = new MutationObserver(function(){
  var getTextInputs = function(doc){
    if(doc){
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
  
  var flatten = function(xss){
    return (xss || []).reduce(function(xs, ys){
      return xs.concat(ys); 
    }, []);
  };
  
  var textInputsInMainWindow = getTextInputs(document),
      iframes = Array.from(document.querySelectorAll('iframe')),
      textInputsInIframes = flatten(iframes.map(function(iframe) iframe.contentDocument)
                                   .map(getTextInputs)),
      inputs = [].concat(textInputsInMainWindow, textInputsInIframes);

  
  inputs.forEach(function(input){
    console.log('Attaching listener to: '+input.tagName+'[name='+input.name+']');
    input.addEventListener('change', syncValue);
  });
});

observer.observe(document.body,{childList:true, subtree:true});
