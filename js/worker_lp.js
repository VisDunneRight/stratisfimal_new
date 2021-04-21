importScripts('../lib/glpk.min.js');
importScripts('../simple/simpleLp.js');
importScripts('../simple/simplegraph.js');

onmessage = function(e) {
    let g = new SimpleGraph()
    for(var prop in e.data.graph){
        g[prop] = e.data.graph[prop];
    }

    let algorithm = new SimpleLp(g)
    for (let el in e.data.algorithm_options) {algorithm.options[el] = e.data.algorithm_options[el]}

    algorithm.arrange()
    algorithm.apply_solution();

    postMessage({'graph': g, 'algorithm': algorithm})
  }