let drawQuery = (svg, graph, nodeXDistance = 50, nodeYDistance = 50) => {

    let getNodeCoordX = (node) => (150 + nodeXDistance * (node.depth));
    let getNodeCoordY = (node) => {
        let nbuffer = 0;
        let tmpgroups = graph.groups.filter(gr => gr.grouptype == "table" && gr.nodes.find(n => n.depth == node.depth))
        tmpgroups.sort((a, b) => parseFloat(graph.nodeIndex[node.depth].indexOf(a.nodes[0])) > parseFloat(graph.nodeIndex[node.depth].indexOf(b.nodes[0])))
        nbuffer += tmpgroups.indexOf(graph.groups.find(gr => gr.grouptype == "table" && gr.nodes.includes(node)))*(nodeYDistance*2)
        if (node.y != undefined) return 150 + node.y * nodeYDistance;
        else return nodeYDistance + parseFloat(20 + nbuffer + graph.nodeIndex[node.depth].indexOf(node) * nodeYDistance)
    };
    let line = d3.line().curve(d3.curveBasis);
    let colors = ['#303E3F', '#A3B9B6'];

    let attrWidth = 100

    let defs = svg.append('defs').append('marker')
        .attr("id", "arrowhead")
        .attr("viewBox", '0 -5 10 10')
        .attr("refX", 8)
        .attr("refY", 0)
        .attr("orient", "auto")
        .attr("markerWidth", 8)
        .attr("markerHeight", 8)
        .attr("xoverflow", "visible")
        .append('svg:path')
        .attr('d', 'M 0,-5 L 10,0 L 0,5')
        .attr('fill', 'black')
        .style('stroke','none');

    for (let edge of graph.edges){
        let path = svg.append('path')
            .attr('class', 'edgepath')
            .attr('fill', 'none')
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr('d', () => {
                let m = 0;
                let s1 = 0;
                let s2 = 0;
                let isSameRankEdge = edge.nodes[0].depth == edge.nodes[1].depth
                if (isSameRankEdge) m = nodeXDistance*.2 + Math.max((Math.abs(getNodeCoordY(edge.nodes[0]) - getNodeCoordY(edge.nodes[1]))/(nodeYDistance/8)), nodeXDistance/4);
                else {
                    s1 = nodeXDistance*.4;
                    s2 = -nodeXDistance*.4;
                }
                return line([
                    [getNodeCoordX(edge.nodes[0]) + attrWidth/2, getNodeCoordY(edge.nodes[0])], 
                    [getNodeCoordX(edge.nodes[0]) + m + s1, getNodeCoordY(edge.nodes[0])], 
                    [getNodeCoordX(edge.nodes[1]) + m + s2, getNodeCoordY(edge.nodes[1])],
                    [getNodeCoordX(edge.nodes[1]) + (isSameRankEdge? + attrWidth/2 : - attrWidth/2), getNodeCoordY(edge.nodes[1])]
                ])
            })
 
        if (edge.operator != undefined && edge.operator != "="){
            let pathLenght = path.node().getTotalLength()
            let midpoint = path.node().getPointAtLength(pathLenght/2)

            svg.append('circle').attr('cx', midpoint.x).attr('cy', midpoint.y).attr('r', 9).attr('fill', "#f2f3f7")

            svg.append('text')
                .attr('x', midpoint.x)
                .attr('y', midpoint.y)
                .attr('text-anchor', 'middle')
                .style('font-size', '0.6em')
                .style('dominant-baseline', 'middle')
                .text(edge.operator)
        }

        if (edge.operator == "="){
            path.attr("marker-end", "url(#arrowhead)")
        }
    }

    for (let group of graph.groups.filter(gr => gr.grouptype == "table")){
        let topnode = group.nodes.sort((a, b) => getNodeCoordY(a) > getNodeCoordY(b))[0]

        let g = svg.append('g')
            .attr('transform', 'translate(' + (getNodeCoordX(topnode)) + ',' + (getNodeCoordY(topnode) - nodeYDistance) +')')
        
        g.append("rect")
            .attr('height', nodeYDistance)
            .attr("width", attrWidth)
            .attr('x', -attrWidth/2)
            .attr('y', -nodeYDistance/2)
            .attr('stroke-width', 1)
            .attr("stroke", "black")
            .attr("fill", "black")

        g.append('text')
            .text(group.name + (group.tablealias != group.name && group.tablealias != undefined? " " + group.tablealias : ""))
            .attr('text-anchor', 'middle')
            .style("font-family", "Arial")
            .attr('y', 3)
            .attr('fill', "white")
            .style('font-size', '0.7em')
            .style("font-weight", "bold")
    }

    for (let group of graph.groups.filter(gr => gr.grouptype == "subquery")){
        let topnode = group.nodes.sort((a, b) => getNodeCoordY(a) > getNodeCoordY(b))[0]
        let bottomnode = group.nodes.sort((a, b) => getNodeCoordY(a) < getNodeCoordY(b))[0]
        let leftmostnode = group.nodes.sort((a, b) => getNodeCoordX(a) > getNodeCoordX(b))[0]
        let rightmostnode = group.nodes.sort((a, b) => getNodeCoordX(a) < getNodeCoordX(b))[0]

        let groupmargin = 7

        let g = svg.append('g')
            .attr('transform', 'translate(' + (getNodeCoordX(leftmostnode)) + ',' + (getNodeCoordY(topnode) - nodeYDistance) +')')
        
        g.append("rect")
            .attr('height', getNodeCoordY(bottomnode) - getNodeCoordY(topnode) + nodeYDistance*2 + groupmargin*2)
            .attr("width", getNodeCoordX(rightmostnode) - getNodeCoordX(leftmostnode) + attrWidth + groupmargin*2)
            .attr('x', -attrWidth/2 - groupmargin)
            .attr('y', -nodeYDistance/2 - groupmargin)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr('stroke-width', 5)
            .attr("stroke", "gray")
            .attr("stroke-opacity", 0.3)
            .attr("fill", "none")
    }

    for (let group of graph.groups.filter(gr => gr.grouptype == "negated_subquery" || gr.negateSingleTable == true)){
        let topnode = group.nodes.sort((a, b) => getNodeCoordY(a) > getNodeCoordY(b))[0]
        let bottomnode = group.nodes.sort((a, b) => getNodeCoordY(a) < getNodeCoordY(b))[0]
        let leftmostnode = group.nodes.sort((a, b) => getNodeCoordX(a) > getNodeCoordX(b))[0]
        let rightmostnode = group.nodes.sort((a, b) => getNodeCoordX(a) < getNodeCoordX(b))[0]

        let groupmargin = 7

        let g = svg.append('g')
            .attr('transform', 'translate(' + (getNodeCoordX(leftmostnode)) + ',' + (getNodeCoordY(topnode) - nodeYDistance) +')')
        
        g.append("rect")
            .attr('height', getNodeCoordY(bottomnode) - getNodeCoordY(topnode) + nodeYDistance*2 + groupmargin*2)
            .attr("width", getNodeCoordX(rightmostnode) - getNodeCoordX(leftmostnode) + attrWidth + groupmargin*2)
            .attr('x', -attrWidth/2 - groupmargin)
            .attr('y', -nodeYDistance/2 - groupmargin)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr('stroke-width', 2)
            .attr("stroke", "black")
            .attr("fill", "none")
            .attr("stroke-dasharray", "5 5")
    }

    for (let group of graph.groups.filter(gr => gr.grouptype == "all_subquery" || gr.allSingleTable == true)){
        let topnode = group.nodes.sort((a, b) => getNodeCoordY(a) > getNodeCoordY(b))[0]
        let bottomnode = group.nodes.sort((a, b) => getNodeCoordY(a) < getNodeCoordY(b))[0]
        let leftmostnode = group.nodes.sort((a, b) => getNodeCoordX(a) > getNodeCoordX(b))[0]
        let rightmostnode = group.nodes.sort((a, b) => getNodeCoordX(a) < getNodeCoordX(b))[0]

        let groupmargin = 7

        let g = svg.append('g')
            .attr('transform', 'translate(' + (getNodeCoordX(leftmostnode)) + ',' + (getNodeCoordY(topnode) - nodeYDistance) +')')
        
        g.append("rect")
            .attr('height', getNodeCoordY(bottomnode) - getNodeCoordY(topnode) + nodeYDistance*2 + groupmargin*2)
            .attr("width", getNodeCoordX(rightmostnode) - getNodeCoordX(leftmostnode) + attrWidth + groupmargin*2)
            .attr('x', -attrWidth/2 - groupmargin)
            .attr('y', -nodeYDistance/2 - groupmargin)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr('stroke-width', 2)
            .attr("stroke", "black")
            .attr("fill", "none")

        g.append("rect")
            .attr('height', getNodeCoordY(bottomnode) - getNodeCoordY(topnode) + nodeYDistance*2 + (groupmargin + 3)*2)
            .attr("width", getNodeCoordX(rightmostnode) - getNodeCoordX(leftmostnode) + attrWidth + (groupmargin + 3)*2)
            .attr('x', -attrWidth/2 - groupmargin - 3)
            .attr('y', -nodeYDistance/2 - groupmargin - 3)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr('stroke-width', 2)
            .attr("stroke", "black")
            .attr("fill", "none")
    }

    for (let depth in graph.nodeIndex){
        for (let node of graph.nodeIndex[depth]){

            let g = svg.append('g')
                .attr('transform', 'translate(' + (getNodeCoordX(node)) + ',' + getNodeCoordY(node) +')')
                .attr('opacity', () => {return node.type == "fake"? 0.3 : 1})
                

            g.append('rect')
                .datum(node)
                .attr('class', 'node')
                .attr('height', nodeYDistance)
                .attr("width", attrWidth)
                .attr('x', -attrWidth/2)
                .attr('y', -nodeYDistance/2)
                .attr('stroke-width', 1)
                .attr("stroke", "black")
                .attr('fill', node.nodetype == "constraint"? "#FFFF99" : "none")
                
                

            g.append('text')
                .text(node.id)
                .attr('text-anchor', 'middle')
                .style("font-family", "Arial")
                .attr('y', 3)
                .attr('fill', node.drawtype == "th"? "white" : "black")
                .style('font-size', '0.63em')
                .style("font-weight", "bold")
                .on('mouseover', function(){
                    d3.select(this).style('fill', 'red')
                    d3.select('#sql-div-' + node.astNodeIndex).style('background-color', 'yellow')
                })
                .on('mouseout', function(){
                    d3.select(this).style("fill", node.drawtype == "th"? "white" : "black")
                    d3.select('#sql-div-' + node.astNodeIndex).style('background-color', '#ffffff00')
                })
                
        }
    }

    svg.attr("height", Math.max.apply(0, graph.nodes.map(n => getNodeCoordY(n) + 20)))
    svg.attr("viewBox", "0 0 " + Math.max.apply(0, graph.nodes.map(n => getNodeCoordX(n) + 80)) + " " + Math.max.apply(0, graph.nodes.map(n => getNodeCoordY(n) + 50)))
}