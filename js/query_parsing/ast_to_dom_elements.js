class AstToDomElements {
  constructor(ast){
    this.buffer = '';
    this.mainDOMelem = d3.select('body').append('div').attr('id', 'test')

    this.noSuffixFlag = false;
    this.astNodeIndex = 0;
    
    this.travelMain(ast);
  }

  travelMain (ast) {
    this.travel(ast.value);
    if (ast.hasSemicolon) {
      this.append(ast,';', true);
    }
  };

  travel (ast) {
    if (!ast) return;
  
    if (typeof ast === 'string') {
      return this.append(ast);
    }
  
    // console.log('travel' + ast.type)
    this['travel' + ast.type](ast);
  };

  append (ast, word, noPrefix, noSuffix) {
    if (this.noSuffixFlag) {
      noPrefix = true;
      this.noSuffixFlag = false;
    }
    if (noPrefix) {
      this.buffer += word;
      this.appendDOMElem(word, ast)
    } else {
      this.buffer += ' ' + word;
      this.appendDOMElem(word, ast);
    }
  
    if (noSuffix) {
      this.noSuffixFlag = true;
    }
  };

  appendDOMElem (keyword, astnode) {
    this.astNodeIndex++;

    let div = this.mainDOMelem
      .append('div')
      .attr('id', 'sql-div' + (astnode? "-" + this.astNodeIndex : ""))
      .style("display", "inline-block")
      .style("margin", "3px")
      .attr("data-astnodeindex", this.astNodeIndex)
      .html(keyword.toUpperCase())
      .on('mouseover', function () {
        d3.select(this).style("background-color", "yellow")
      })
      .on('mouseout', function(){
        d3.select(this).style("background-color", "#ffffff00")
      })

    if (astnode != undefined) astnode.astNodeIndex = this.astNodeIndex;
  }

  travelSelect (ast) {
    this.appendKeyword('select');
    if (ast.distinctOpt) {
      this.appendKeyword(ast.distinctOpt);
    }
    if (ast.topOpt) {
      this.appendKeyword("TOP " + ast.topOpt);
    }
    if (ast.highPriorityOpt) {
      this.appendKeyword(ast.highPriorityOpt);
    }
    if (ast.maxStateMentTimeOpt) {
      this.append(ast,'MAX_STATEMENT_TIME = ' + ast.maxStateMentTimeOpt);
    }
    if (ast.straightJoinOpt) {
      this.appendKeyword(ast.straightJoinOpt);
    }
    if (ast.SqlElemsSmallResultOpt) {
      this.appendKeyword(ast.SqlElemsSmallResultOpt);
    }
    if (ast.SqlElemsBigResultOpt) {
      this.appendKeyword(ast.SqlElemsBigResultOpt);
    }
    if (ast.SqlElemsBufferResultOpt) {
      this.appendKeyword(ast.SqlElemsBufferResultOpt);
    }
    if (ast.SqlElemsCacheOpt) {
      this.appendKeyword(ast.SqlElemsCacheOpt);
    }
    if (ast.SqlElemsCalcFoundRowsOpt) {
      this.appendKeyword(ast.SqlElemsCalcFoundRowsOpt);
    }
    if (ast.selectItems) {
      this.travelSelectExpr(ast.selectItems);
    }
    if (ast.from) {
      this.appendKeyword('from');
      this.travel(ast.from);
    }
    if (ast.partition) {
      this.travel(ast.partition);
    }
    if (ast.where) {
      this.appendKeyword('where');
      this.travel(ast.where);
    }
    if (ast.groupBy) {
      this.travel(ast.groupBy);
    }
    if (ast.having) {
      this.appendKeyword('having');
      this.travel(ast.having);
    }
    if (ast.orderBy) {
      this.travel(ast.orderBy);
    }
    if (ast.limit) {
      this.travel(ast.limit);
    }
    if (ast.procedure) {
      this.appendKeyword('procedure');
      this.travel(ast.procedure);
    }
    if (ast.updateLockMode) {
      this.appendKeyword(ast.updateLockMode);
    }
  };

  appendKeyword (keyword, noPrefix, noSuffix) {
    if (noSuffixFlag) {
      noPrefix = true;
      noSuffixFlag = false;
    }
    if (noPrefix) {
      this.buffer += keyword.toUpperCase();
      this.appendDOMElem(keyword);
    } else {
      this.buffer += ' ' + keyword.toUpperCase();
      this.appendDOMElem(keyword);
    }
  
    if (noSuffix) {
      noSuffixFlag = true;
    }
  };

  travelSelectExpr (ast) {
    var exprList = ast.value;
    for (var i = 0; i < exprList.length; i++) {
      if (typeof ast === 'string') {
        this.append(ast,exprList[i]);
      } else {
        this.travel(exprList[i]);
        if (exprList[i].alias) {
          if (exprList[i].hasAs) {
            this.appendKeyword('as');
          }
          this.travel(exprList[i].alias);
        }
      }
      if (i !== exprList.length - 1) {
        this.append(ast,',', true);
      }
    }

    this.mainDOMelem.append('div')
  };

  travelIsExpression (ast) {
    this.travel(ast.left);
    this.appendKeyword('in');
    if (ast.hasNot) {
      this.appendKeyword('not');
    }
    this.append(ast,ast.right);
  };

  travelNotExpression (ast) {
    this.appendKeyword('not');
    this.travel(ast.value);
  };

  travelOrExpression (ast) {
    this.travel(ast.left);
    this.appendKeyword(ast.operator);
    this.travel(ast.right);
  }

  travelAndExpression (ast) {
    this.travel(ast.left);
    this.mainDOMelem.append('div')
    this.appendKeyword(ast.operator);
    this.travel(ast.right);
  }

  travelXORExpression (ast) {
    this.travel(ast.left);
    this.appendKeyword(ast.operator);
    this.travel(ast.right);
  }

  travelNull (ast) {
    this.appendKeyword(ast.value);
  }

  travelBoolean (ast) {
    this.appendKeyword(ast.value);
  }

  travelBooleanExtra (ast) {
    this.appendKeyword(ast.value);
  }

  travelNumber (ast) {
    this.append(ast,ast.value);
  };

  travelString (ast) {
    this.append(ast,ast.value);
  };

  travelFunctionCall (ast) {
    this.append(ast,ast.name);
    this.append(ast,'(', true, true);
    var params = ast.params;
    for (var i = 0; i < params.length; i++) {
      var param = params[i];
      this.travel(param);
      if (i !== params.length - 1) {
        this.append(ast,',', true);
      }
    }
    this.append(ast,')', true);
  };

  travelFunctionCallParam (ast) {
    if (ast.distinctOpt) {
      this.appendKeyword(ast.distinctOpt);
    }
    this.travel(ast.value);
  };

  travelIdentifier (ast) {
    this.append(ast,ast.value);
  };

  travelIdentifierList (ast) {
    var list = ast.value;
    for (var i = 0; i < list.length; i++) {
      this.travel(list[i]);
      if (i !== list.length - 1) {
        this.append(ast,',', true);
      }
    }
  };

  travelWhenThenList (ast) {
    var list = ast.value;
    for (var i = 0; i < list.length; i++) {
      this.appendKeyword('when');
      this.travel(list[i].when);
      this.appendKeyword('then');
      this.travel(list[i].then);
    }
  };

  travelCaseWhen (ast) {
    this.appendKeyword('case');
    if (ast.caseExprOpt) {
      this.travel(ast.caseExprOpt);
    }
    this.travel(ast.whenThenList);
    if (ast.else) {
      this.appendKeyword('else');
      this.travel(ast.else);
    }
    this.appendKeyword('end');
  };

  travelPrefix (ast) {
    this.appendKeyword(ast.prefix);
    this.travel(ast.value);
  };

  travelSimpleExprParentheses (ast) {
    if (ast.hasRow) {
      this.appendKeyword('row');
    }
    this.append(ast,'(', false, true);
    this.travel(ast.value);
    this.append(ast,')', true);
  };

  travelSubQuery (ast) {
    if (ast.hasExists) {
      this.appendKeyword('exists');
    }
    this.append(ast,'(', false, true);
    this.travel(ast.value);
    this.append(ast,')', true);
  };

  travelIdentifierExpr (ast) {
    this.append(ast,'{');
    this.travel(ast.identifier);
    this.travel(ast.value);
    this.append(ast,'}');
  };
  travelBitExpression (ast) {
    this.travel(ast.left);
    this.appendKeyword(ast.operator);
    this.travel(ast.right);
  };
  travelInSubQueryPredicate (ast) {
    this.travel(ast.left);
    if (ast.hasNot) {
      this.appendKeyword('not');
    }
    this.appendKeyword('in');
    this.append(ast,'(', false, true);
    this.travel(ast.right);
    this.append(ast,')');
  };
  travelInExpressionListPredicate (ast) {
    this.travel(ast.left);
    if (ast.hasNot) {
      this.appendKeyword('not');
    }
    this.appendKeyword('in');
    this.append(ast,'(', false, true);
    this.travel(ast.right);
    this.append(ast,')');
  };
  travelBetweenPredicate (ast) {
    this.travel(ast.left);
    if (ast.hasNot) {
      this.appendKeyword('not');
    }
    this.appendKeyword('between');
    this.travel(ast.right.left);
    this.appendKeyword('and');
    this.travel(ast.right.right);
  };
  travelSoundsLikePredicate (ast) {
    this.travel(ast.left);
    this.appendKeyword('sounds');
    this.appendKeyword('like');
    this.travel(ast.right);
  };
  travelLikePredicate (ast) {
    this.travel(ast.left);
    if (ast.hasNot) {
      this.appendKeyword('not');
    }
    this.appendKeyword('like');
    this.travel(ast.right);
    if (ast.escape) {
      this.appendKeyword('escape');
      this.travel(ast.escape);
    }
  };
  travelRegexpPredicate (ast) {
    this.travel(ast.left);
    if (ast.hasNot) {
      this.appendKeyword('not');
    }
    this.appendKeyword('regexp');
    this.travel(ast.right);
  };
  travelIsNullBooleanPrimary (ast) {
    this.travel(ast.value);
    this.appendKeyword('is');
    if (ast.hasNot) {
      this.appendKeyword('not');
    }
    this.appendKeyword('null');
  };
  travelComparisonBooleanPrimary (ast) {
    this.travel(ast.left);
    this.append(ast,ast.operator);
    this.travel(ast.right);
  };
  travelComparisonSubQueryBooleanPrimary (ast) {
    this.travel(ast.left);
    this.append(ast,ast.operator);
    this.appendKeyword(ast.subQueryOpt);
    this.append(ast,'(', false, true);
    this.travel(ast.right);
    this.append(ast,')');
  };
  travelExpressionList (ast) {
    var list = ast.value;
    for (var i = 0; i < list.length; i++) {
      this.travel(list[i]);
      if (i !== list.length - 1) {
        this.append(ast,',', true);
      }
    }
  };
  travelGroupBy (ast) {
    this.appendKeyword('group by');
    var list = ast.value;
    for (var i = 0; i < list.length; i++) {
      this.travel(list[i]);
      if (i !== list.length - 1) {
        this.append(ast,',', true);
      }
    }
  };
  travelOrderBy (ast) {
    this.appendKeyword('order by');
    var list = ast.value;
    for (var i = 0; i < list.length; i++) {
      this.travel(list[i]);
      if (i !== list.length - 1) {
        this.append(ast,',', true);
      }
    }
    if (ast.rollUp) {
      this.appendKeyword('with rollup');
    }
  };
  travelGroupByOrderByItem (ast) {
    this.travel(ast.value);
    if (ast.sortOpt) {
      this.appendKeyword(ast.sortOpt);
    }
  };
  travelLimit (ast) {
    this.appendKeyword('limit');
    var list = ast.value;
    if (list.length === 1) {
      this.append(ast,list[0]);
    } else if (list.length === 2) {
      if (ast.offsetMode) {
        this.append(ast,list[1]);
        this.append(ast,'offset');
        this.append(ast,list[0]);
      } else {
        this.append(ast,list[0]);
        this.append(ast,',', true);
        this.append(ast,list[1]);
      }
    }
  };
  travelTableReferences (ast) {
    var list = ast.value;
    if (ast.TableReferences) {
      this.append(ast,'(', false, true);
    }
    for (var i = 0; i < list.length; i++) {
      this.travel(list[i]);
      if (i !== list.length - 1) {
        this.append(ast,',', true);
      }
    }
    if (ast.TableReferences) {
      this.append(ast,')');
    }
  };
  travelTableReference (ast) {
    if (ast.hasOj) {
      this.append(ast,'{');
      this.appendKeyword('oj');
      this.travel(ast.value);
      this.append(ast,'}');
    } else {
      this.travel(ast.value);
    }
  };
  travelInnerCrossJoinTable (ast) {
    this.travel(ast.left);
    if (ast.innerCrossOpt) {
      this.appendKeyword(ast.innerCrossOpt);
    }
    this.appendKeyword('join');
    this.travel(ast.right);
    if (ast.condition) {
      this.travel(ast.condition);
    }
  };
  travelStraightJoinTable (ast) {
    this.travel(ast.left);
    this.appendKeyword('straight_join');
    this.travel(ast.right);
    this.travel(ast.condition);
  };
  travelLeftRightJoinTable (ast) {
    this.travel(ast.left);
    this.appendKeyword(ast.leftRight);
    if (ast.outOpt) {
      this.appendKeyword(ast.outOpt);
    }
    this.appendKeyword('join');
    this.travel(ast.right);
    this.travel(ast.condition);
  };
  travelNaturalJoinTable (ast) {
    this.travel(ast.left);
    this.appendKeyword('natural');
    if (ast.leftRight) {
      this.appendKeyword(ast.leftRight);
    }
    if (ast.outOpt) {
      this.appendKeyword(ast.outOpt);
    }
    this.appendKeyword('join');
    this.travel(ast.right);
  };
  travelOnJoinCondition (ast) {
    this.appendKeyword('on');
    this.travel(ast.value);
  };
  travelUsingJoinCondition (ast) {
    this.appendKeyword('using');
    this.appendKeyword('(', false, true);
    this.travel(ast.value);
    this.appendKeyword(')');
  };
  travelPartitions (ast) {
    this.appendKeyword('partition');
    this.appendKeyword('(', false, true);
    var list = ast.value;
    for (var i = 0; i < list.length; i++) {
      this.travel(list[i]);
      if (i !== list.length - 1) {
        this.append(ast,',', true);
      }
    }
    this.appendKeyword(')');
  };
  travelForOptIndexHint (ast) {
    this.appendKeyword('for');
    this.appendKeyword(ast.value);
  };
  travelIndexList (ast) {
    var list = ast.value;
    for (var i = 0; i < list.length; i++) {
      this.travel(list[i]);
      if (i !== list.length - 1) {
        this.append(ast,',', true);
      }
    }
  };
  travelUseIndexHint (ast) {
    this.appendKeyword('use');
    this.appendKeyword(ast.indexOrKey);
    if (ast.forOpt) {
      this.travel(ast.forOpt);
    }
    this.appendKeyword('(', false, true);
    if (ast.value) {
      this.travel(ast.value);
    }
    this.appendKeyword(')');
  };
  travelIgnoreIndexHint (ast) {
    this.appendKeyword('ignore');
    this.appendKeyword(ast.indexOrKey);
    if (ast.forOpt) {
      this.travel(ast.forOpt);
    }
    this.appendKeyword('(', false, true);
    if (ast.value) {
      this.travel(ast.value);
    }
    this.appendKeyword(')');
  };
  travelForceIndexHint (ast) {
    this.appendKeyword('force');
    this.appendKeyword(ast.indexOrKey);
    if (ast.forOpt) {
      this.travel(ast.forOpt);
    }
    this.appendKeyword('(', false, true);
    if (ast.value) {
      this.travel(ast.value);
    }
    this.appendKeyword(')');
  };
  travelTableFactor (ast) {
    this.travel(ast.value);
    if (ast.partition) {
      this.travel(ast.partition);
    }
    if (ast.alias) {
      if (ast.hasAs) {
        this.appendKeyword('as');
      }
      this.travel(ast.alias);
    }
    if (ast.indexHintOpt) {
      this.travel(ast.indexHintOpt);
    }
  };
  travelUnion (ast) {
    this.travel(ast.left);
    this.appendKeyword('UNION');
    if (ast.distinctOpt) {
      this.appendKeyword(ast.distinctOpt);
    }
    this.travel(ast.right);
  };
  travelSelectParenthesized (ast) {
    this.appendKeyword('(');
    this.travel(ast.value);
    this.appendKeyword(')');
  };
  
}







