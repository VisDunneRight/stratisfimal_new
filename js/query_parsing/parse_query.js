class QueryParser {
    constructor (query, schema) {
        this.query = query;
        this.schema = schema;

        let ast = sqlParser.parse(query);
        // console.log(ast);

        this.g = new SimpleGraph();
        this.subquerycount = 0;
        this.subquerymap = {};

        let selectTable = {nodes: [], name: "SELECT", grouptype: "table", tablealias: "SELECT"}
        this.g.addGroup(selectTable);
        this.exploreNode(ast.value, selectTable);
        this.assignRanks(selectTable);

        for (let q=1; q<=this.subquerycount; q++){
            let subqgroup = this.g.groups.filter(gr => gr.grouptype == "table" && gr.subqueryid == q)
            if (subqgroup.length == 0) continue;
            else if (subqgroup.length == 1){
                if (this.subquerymap[q] == "negate") subqgroup[0].negateSingleTable = true;
                else if (this.subquerymap[q] == "ALL") subqgroup[0].allSingleTable = true;
            } else {
                let newGroup;
                if (this.subquerymap[q] == "negate") newGroup = {nodes: [], grouptype: "negated_subquery"};
                else if (this.subquerymap[q] == "negate") newGroup = {nodes: [], grouptype: "all_subquery"};
                else newGroup = {nodes: [], grouptype: "subquery"};
                newGroup.nodes = subqgroup.map(d => d.nodes).flat()
                this.g.addGroup(newGroup);
            }
        }

        // this.g.groups = this.g.groups.filter(gr => gr.nodes.length > 0)

        for (let group of this.g.groups.filter(gr => gr.grouptype == "table")){
            group.restricted_vertically = true;
            group.restricted_height = group.nodes.length;
        }

        // console.log(this.g)
    }

    exploreNode(node, prevtable) {
        // console.log("exploring ", node)

        if (node.type == "Select"){
            for (let el of node.from.value){
                let ref = el.value
                let refName = ref.value.value
                let refAlias;
                if (ref.alias != undefined) refAlias = ref.alias.value;
                else refAlias = refName;

                let newTable = {nodes: [], name: refName, tablealias: refAlias, grouptype: "table", subqueryid: this.subquerycount}
                this.g.addGroup(newTable)
            }

            if (node.selectItems.value[0].value != "*" && prevtable != undefined) {
                for (let el of node.selectItems.value){
                    if (el.value.includes(".*")) {
                        let tname = this.g.groups.find(gr => gr.tablealias == el.value.split(".")[0]).name;
                        let attrlist = this.getAttrsFromSchema(tname);
                        for (let attr of attrlist){
                            let n1 = {name: attr, depth: 0, table: prevtable, subqueryid: this.subquerycount}
                            prevtable.nodes.push(n1);
                            this.g.addNode(n1);
                            let t2 = this.g.groups.find(gr => gr.tablealias == el.value.split(".")[0])
                            let n2 = {name: attr, depth: 0, table: t2, subqueryid: this.subquerycount};
                            this.g.addNode(n2);
                            t2.nodes.push(n2);
                            this.g.addEdge({nodes: [n1, n2]})
                        }
                    } else {
                        let attr1 = this.getAttrInTable(el)
                        let attr2 = {name: attr1.name, depth: 0, table: prevtable, subqueryid: this.subquerycount}
                        prevtable.nodes.push(attr2);
                        this.g.addNode(attr2);
                        this.g.addEdge({nodes: [attr1, attr2]});
                    }
                }
            } else if (prevtable != undefined) {
                for (let el of node.from.value){
                    
                    let tname = el.value.value.value;
                    let attrlist = this.getAttrsFromSchema(tname);
                    for (let attr of attrlist){
                        let n1 = {name: attr, depth: 0, table: prevtable, subqueryid: this.subquerycount}
                        prevtable.nodes.push(n1)
                        this.g.addNode(n1);
                        let g2 = this.g.groups.find(gr => gr.tablealias == tname)
                        let n2 = g2.nodes.find(n => n.name == attr)
                        if (n2 == undefined){
                            n2 = {name: attr, table: g2, depth: 0, subqueryid: this.subquerycount}
                            this.g.addNode(n2)
                            g2.nodes.push(n2)
                        }
                        this.g.addEdge({nodes: [n1, n2]})
                    }
                }
            }

            if (node.where != undefined) return this.exploreNode(node.where);
            
        } else if (node.nodeType == "Main") {
            return this.exploreNode(node.value, prevtable);
        } else if (node.type == "AndExpression"){
            let newnodes1 = this.exploreNode(node.left);
            let newnodes2 = this.exploreNode(node.right);
            if (newnodes1 != undefined && newnodes2 != undefined) return newnodes1.concat(newnodes2)
        } else if (node.type == "NotExpression") {
            this.subquerycount += 1;
            this.subquerymap[this.subquerycount] = "negate";
            return this.exploreNode(node.value.value);
        } else if (node.type == "SubQuery") {
            this.subquerycount += 1;
            return this.exploreNode(node.value)
        } else if (node.type == "ComparisonSubQueryBooleanPrimary") {
            // this.subquerycount += 1;
            // this.subquerymap[this.subquerycount] = "ALL";

            // for (let el of node.right.from.value){
            //     let ref = el.value
            //     let refName = ref.value.value
            //     let refAlias;
                
            //     if (ref.alias != undefined) refAlias = ref.alias.value;
            //     else refAlias = refName;
        
            //     if (this.g.groups.find(gr => gr.grouptype == "table" && gr.tablealias == refAlias)) continue;
            //     else {
            //         let newTable = {nodes: [], name: refName, tablealias: refAlias, grouptype: "table", subqueryid: this.subquerycount}
            //         this.g.addGroup(newTable)
            //     }
            // }

            // for (let el of node.right.selectItems.value){
            //     if (el.value.includes("*")) continue;
            //     let attr1 = this.getAttrInTable(el)
            //     let attr2 = this.getAttrInTable(node.left)
    
            //     this.g.addEdge({nodes: [attr1, attr2], operator: node.operator})
            // }

            // return this.exploreNode(node.right);

            return this.manageSubQuery(node.right, "ALL", node);
        } else if (node.type == "ComparisonBooleanPrimary") {
            if (node.left.type == "Identifier" && node.right.type == "Identifier"){
                let leftTableAttr = this.getAttrInTable(node.left)
                let rightTableAttr = this.getAttrInTable(node.right)
                this.g.addEdge({nodes: [leftTableAttr, rightTableAttr], operator: node.operator})
                return [leftTableAttr, rightTableAttr]
            } else if (node.left.type == "Identifier" && node.right.type != "Identifier") {
                let attrName;
                let leftTable = this.getTableFromAttrIdentifier(node.left)
                if (node.left.value.includes(".")) attrName = node.left.value.split(".")[1]
                else attrName = node.left.value

                let newNode = {name: attrName + " " + node.operator + " " + node.right.value, subqueryid: this.subquerycount, depth: 0, table: leftTable, nodetype: "constraint"}
                this.g.addNode(newNode)
                leftTable.nodes.push(newNode)
            }
        }
    }

    manageSubQuery(astNode, subquerytype, prevnode){
        this.subquerycount += 1;
    
        if (subquerytype == "negate") this.subquerymap[this.subquerycount] = "negate"
        else if (subquerytype == "ALL") this.subquerymap[this.subquerycount] = "ALL"
    
        for (let el of astNode.from.value){
            let ref = el.value
            let refName = ref.value.value
            let refAlias;
            
            if (ref.alias != undefined) refAlias = ref.alias.value;
            else refAlias = refName;
    
            if (this.g.groups.find(gr => gr.grouptype == "table" && gr.tablealias == refAlias)) continue;
            else {
                let newTable = {nodes: [], name: refName, tablealias: refAlias, grouptype: "table", subqueryid: this.subquerycount}
                this.g.addGroup(newTable)
            }
        }
    
        if (subquerytype == "ALL"){
            for (let el of astNode.selectItems.value){
                if (el.value.includes("*")) continue;
                let attr1 = this.getAttrInTable(el)
                let attr2 = this.getAttrInTable(prevnode.left)
    
                this.g.addEdge({nodes: [attr1, attr2], operator: prevnode.operator})
            }
        }
        
        let newnodes = []
        if (astNode.where != undefined) {
            newnodes = this.exploreNode(astNode.where);
        }
    
        return newnodes
    }

    getAttrsFromSchema(tname) {
        return this.schema.split("\n").find(l => l.includes(tname)).split("(")[1].replace(")", "").replaceAll(" ", "").split(",")
    }

    getAttrInTable(node) {
        let tableidentifier, attrname;
    
        if (node.value.includes(".")){
            tableidentifier = node.value.split(".")[0]
            attrname = node.value.split(".")[1]
        } else {
            tableidentifier = this.getTableFromAttrIdentifier(node).tablealias;
            attrname = node.value;
        }
    
        let t = this.g.groups.find(gr => gr.tablealias == tableidentifier && gr.grouptype == "table")
        if (this.g.groups.find(gr => gr.tablealias == tableidentifier && gr.subqueryid == this.subquerycount && gr.grouptype == "table"))
            t = this.g.groups.find(gr => gr.tablealias == tableidentifier && gr.subqueryid == this.subquerycount && gr.grouptype == "table")
        // if (t == undefined){
        //     t = {nodes: [], grouptype: "table", subqueryid: this.subquerycount, tablealias: tableidentifier, name: tableidentifier}
        //     this.g.addGroup(t);
        // }

        let attr = t.nodes.find(n => n.name == attrname)
        if (attr == undefined){
            attr = {name: attrname, depth: 0, table: t}
            t.nodes.push(attr)
            this.g.addNode(attr)
        }
    
        return attr
    }

    getTableFromAttrIdentifier(node) {
        let table, talias;

        if (node.value.includes(".")){
            talias = node.value.split(".")[0]
            table = this.g.groups.find(gr => gr.grouptype == "table" && gr.tablealias == talias)
        } else {
            let schemaEntry = this.schema.split('\n').filter(l => 
                l.split("(")[1].replace(")", "").split(",").find(el => el.trim() == node.value + "")
            ).map(l => l.split("(")[0])
            
            let tname = schemaEntry.find(e => this.g.groups.find(gr => gr.grouptype == "table" && gr.name == e));
            if (tname == undefined) tname = schemaEntry[0] 
            
            table = this.g.groups.find(gr => gr.grouptype == "table" && (gr.name == tname))
        }

        return table;
    }

    assignRanks(selectTable){
        let moveToDepth = (table, newDepth) => {
            for (let node of table.nodes){
                // console.log(table.name, node, newDepth, g.nodeIndex[node.depth])
                if (this.g.nodeIndex[node.depth].indexOf(node) != -1) 
                    this.g.nodeIndex[node.depth].splice(this.g.nodeIndex[node.depth].indexOf(node), 1);
                node.depth = newDepth;
                while (this.g.nodeIndex.length <= node.depth + 10) this.g.nodeIndex.push([]);
                this.g.nodeIndex[node.depth].push(node);
            }
        }
    
        let curIndex = 0;
        while(this.g.nodeIndex[curIndex] != undefined){
            if (curIndex == 0){
                for (let table of this.g.groups){
                    if (table.name == selectTable.name) moveToDepth(table, 0);
                    else moveToDepth(table, curIndex+1);
                }
            } else {
                let tableSet = this.g.groups.filter(gr => {
                    if (gr.name == selectTable.name) return false;
                    if (!gr.nodes.some(n => n.depth == curIndex)) return false;
                    let isMovable = gr.nodes.every(n => {
                        return this.g.edges.find(e => (e.nodes[0].depth == curIndex-1 && e.nodes[1] == n) || (e.nodes[1].depth == curIndex-1 && e.nodes[0] == n)) == undefined
                    })
                    return isMovable;
                })
                for (let table of tableSet){
                    moveToDepth(table, curIndex+1)
                }
            }
            curIndex++;
            if (curIndex == 10) break;
        }
    
        for (let edge of this.g.edges){
            if (edge.nodes[0].depth > edge.nodes[1].depth){
                if (edge.operator == "<") edge.operator = ">"
                else if (edge.operator == ">") edge.operator = "<"
                else if (edge.operator == ">=") edge.operator = "<="
                else if (edge.operator == "<=") edge.operator = ">="
                edge.nodes = [edge.nodes[1], edge.nodes[0]];
            }
        }
    }

    addAnchors(){
        if (this.g.groups.filter(gr => gr.grouptype != "table").length == 0) return;
        // console.log(this.g.groups.map(gr => new Set(gr.nodes.map(n => n.depth)).size), this.g.groups.some(gr => new Set(gr.nodes.map(n => n.depth)).size != 1))
        if (!this.g.groups.some(gr => new Set(gr.nodes.map(n => n.depth)).size != 1)) return;

        for (let e of this.g.edges){
            if (Math.abs(e.nodes[0].depth - e.nodes[1].depth) > 1) {
                let minDepth = Math.min(e.nodes[0].depth, e.nodes[1].depth)
                let maxDepth = Math.max(e.nodes[0].depth, e.nodes[1].depth)
                let newanchors = [];

                for (let i = minDepth + 1; i<maxDepth; i++){
                    let n = {depth: i, name: 'a' + this.g.fakeNodeCount++, type: 'fake'};
                    this.g.addNode(n);
                    newanchors.push(n);
                }

                let firstEdge = {nodes:[e.nodes[0], newanchors[0]]};
                let lastEdge = {nodes:[newanchors[newanchors.length - 1], e.nodes[1]]};  

                if (e.value != undefined){
                    firstEdge.value = e.value;
                    lastEdge.value = e.value;
                }

                this.g.addEdge(firstEdge);
                this.g.addEdge(lastEdge);

                for (let i = 1; i < newanchors.length; i++){
                    let newEdge = {nodes: [newanchors[i-1], newanchors[i]]}; 
                    if (e.value != undefined) newEdge.value = e.value;
                    
                    this.g.addEdge(newEdge);
                }
            }
        }

        this.g.edges = this.g.edges.filter(e => Math.abs(e.nodes[0].depth - e.nodes[1].depth) <= 1);

        // note: this is important
        this.g.groups = this.g.groups.sort((a, b) => a.nodes.length > b.nodes.length? 1 : -1)

        for (let g of this.g.groups){
            let minRank = Math.min.apply(0, g.nodes.map(n => n.depth))
            let maxRank = Math.max.apply(0, g.nodes.map(n => n.depth))
            let maxNodesInRank = 0;
            for (let r = minRank; r <= maxRank; r++){
                if (g.nodes.filter(n => n.depth == r).length > maxNodesInRank) maxNodesInRank = g.nodes.filter(n => n.depth == r).length;
            }
            for (let r = minRank; r <= maxRank; r++){
                while (g.nodes.filter(n => n.depth == r).length < maxNodesInRank){
                    let n = {depth: r, name: 'a' + this.fakeNodeCount++, type: 'fake'};
                    for (let gr of this.g.groups){
                        if (g.nodes.every(val => gr.nodes.includes(val)) && gr != g) gr.nodes.push(n);
                    }
                    g.nodes.push(n);
                    this.g.addNode(n);
                }
            }
        }

        let maxNodesInRank = Math.max.apply(0, this.g.nodeIndex.map(n => n.length))
        for (let r in this.g.nodeIndex){
            if (this.g.groups.length == 0) continue;
            while (this.g.nodeIndex[r].length < maxNodesInRank){
                this.g.addNode({depth: r, name: 'a' + this.g.fakeNodeCount++, type: 'fake'});
            }
        }
    }
}
