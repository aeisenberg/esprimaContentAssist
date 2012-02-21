/*******************************************************************************
 * @license
 * Copyright (c) 2012 Contributors
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     Andy Clement (vmware) - initial API and implementation
 *     Andrew Eisenberg (vmware) - implemented visitor pattern
 *******************************************************************************/

/*global define require eclipse esprima window console inTest*/
define("esprimaJsContentAssist", [], function() {

	/**
	 * A prototype of that contains the common built-in types
	 */
	var Types = function() {
		/**
		 * Properties common to all objects - ECMA 262, section 15.2.4.
		 */
		this.Object = {
			// Urrrgh...can't use the real name here because would override the real methods of that name
			$_$prototype : "Object",
			$_$toString: "String",
			$_$toLocaleString : "String",
			$_$valueOf: "Object",
			$_$hasOwnProperty: "boolean",
			$_$isPrototypeOf: "boolean",
			$_$propertyIsEnumerable: "boolean",
			
			$$args : {
				$_$toString: [],
				$_$toLocaleString: [],
				$_$hasOwnProperty: ["property"],
				$_$isPrototypeOf: ["object"],
				$_$propertyIsEnumerable: ["property"],
				$_$valueOf: []
			}
		};
		
		// the global object
		this.Global = {
			// the global 'this'
			"this": "Global",  
			Math: "Math",
			JSON: "JSON",
			$$proto : "Object",
			$$args : { }
		};
		
		/**
		 * Properties common to all Strings - ECMA 262, section 15.5.4
		 */
		this.String = {
			charAt : "String",
			charCodeAt : "Number",
			concat : "String",
			indexOf : "Number",
			lastIndexOf : "Number",
			length : "Number",
			localeCompare : "Number",
			match : "Boolean",
			replace : "String",
			search : "String",
			slice : "String",
			split : "Array",  // Array of string
			substring : "String",
			toLocaleUpperCase : "String",
			toLowerCase : "String",
			toUpperCase : "String",
			trim : "String",

			$$proto : "Object",
			$$args : {
				charAt : ["index"],
				charCodeAt : ["index"],
				concat : ["array"],
				indexOf : ["searchString"],
				lastIndexOf : ["searchString"],
				localeCompare : ["object"],
				match : ["regexp"],
				replace : ["searchValue", "replaceValue"],
				search : ["regexp"],
				slice : ["start", "end"],
				split : ["separator", "[limit]"],
				substring : ["start", "[end]"],
				toLowerCase : [],
				toUpperCase : [],
				toLocaleUpperCase : [],
				trim : []
			}
		};
		
		/**
		 * Properties common to all arrays.  may be incomplete
		 */
		this.Array = {
			length : "Number",
			sort : "Array",
			concat : "Array",
			slice : "Array",
			$$proto : "Object",
			$$args : {
				sort : ["[sorter]"],
				concat : ["left", "right"],
				slice : ["start", "end"]
			}
		};
		
		/**
		 * Properties common to all dates.  may be incomplete
		 */
		this.Date = {
			getDay : "Number",
			getFullYear : "Number",
			getHours : "Number",
			getMinutes : "Number",
			setDay : null,
			setFullYear : null,
			setHours : null,
			setMinutes : null,
			setTime : null,
			$$proto : "Object",
			$$args : {
				getDay : [],
				getFullYear : [],
				getHours : [],
				getMinutes : [],
				setDay : ["dayOfWeek"],
				setFullYear : ["year"],
				setHours : ["hour"],
				setMinutes : ["minute"],
				setTime : ["millis"]
			}
		};
		
		this.Boolean = {
			$$proto : "Object",
			$$args : {}
		};
		
		this.Number = {
			toExponential : "Number",
			toFixed : "Number",
			toPrecision : "Number",
			// do we want to include NaN, MAX_VALUE, etc?	
		
			$$proto : "Object",
			$$args : {
				toExponential : ["digits"],
				toFixed : ["digits"],
				toPrecision : ["digits"]
			}
		};
		
		// must refactor this part for the new format
		this.Function = {
			apply : "Object",
			"arguments" : "Arguments",
			bind : null,
			call : "Object",
			caller : "Function",
			length : "Number",
			name : "String",
			$$proto : "Object",
			$$args : {
				apply : ["func", "[args]"],
				bind : [],
				call: ["func", "args"]
			}
		};

		this.Arguments = {
			callee : "Function",
			length : "Number",
			
			$$proto : "Object",
			$$args : { }
		};

		this.RegExp = {
			g : "Object",
			i : "Object",
			gi : "Object",
			m : "Object",
			exec : "Array",
			test : "Array",
			
			$$proto : "Object",
			$$args : {
				exec : ["str"],
				test : ["str"]
			}
		};
		
		this.Error = {
			name : "String",
			message : "String",
			stack : "String",
			$$proto : "Object",
			$$args : { }
		};
		
		
		this.Math = {
		
			// properties
			E : "Number",
			LN2 : "Number",
			LN10 : "Number",
			LOG2E : "Number",
			LOG10E : "Number",
			PI : "Number",
			SQRT1_2 : "Number",
			SQRT2 : "Number",
		
			// Methods
			abs : "Number",
			acos : "Number",
			asin : "Number",
			atan : "Number",
			atan2 : "Number",
			ceil : "Number",
			cos : "Number",
			exp : "Number",
			floor : "Number",
			log : "Number",
			max : "Number",
			min : "Number",
			pow : "Number",
			random : "Number",
			round : "Number",
			sin : "Number",
			sqrt : "Number",
			tan : "Number",
			$$proto : "Object",
			$$args : {
				abs : ["val"],
				acos : ["val"],
				asin : ["val"],
				atan : ["val"],
				atan2 : ["val1", "val2"],
				ceil : ["val"],
				cos : ["val"],
				exp : ["val"],
				floor : ["val"],
				log : ["val"],
				max : ["val1", "val2"],
				min : ["val1", "val2"],
				pow : ["x", "y"],
				random : [],
				round : ["val"],
				sin : ["val"],
				sqrt : ["val"],
				tan : ["val"]
			}
		};

		this.JSON = {
			parse : "Object",
			stringify : "String",
			$$proto : "Object",
			$$args : {
				parse : ["str"],
				stringify : ["obj"]
			}
		};
		
	};

	/**
	 * Generic AST visitor.  Visits all children in source order, if they have a range property.  Children with
	 * no range property are visited first.
	 * 
	 * @param node The AST node to visit
	 * @param context any extra data (is this strictly necessary, or should it be folded into the operation?).
	 * @param operation function(node, context, [isInitialOp]) an operation on the AST node and the data.  Return falsy if
	 * the visit should no longer continue. Return truthy to continue.
	 * @param [postoperation] (optional) function(node, context) an operation that is exectuted after visiting the current node's children.
	 * will only be invoked if operation returns true for the current node
	 */
	function visit(node, context, operation, postoperation) {
		var i, key, child, children;
		if (operation(node, context, true)) {
			// gather children to visit
			children = [];
			for (key in node) {
				if (key !== "range" && key !== "errors") {
					child = node[key];
					if (child instanceof Array) {
						for (i = 0; i < child.length; i++) {
							if (child[i] && child[i].hasOwnProperty("type")) {
								children.push(child[i]);
							} else if (key === "properties") {
								// might be key-value pair of an object expression
								// don't visit the key since it doesn't have an sloc
								// and it is handle later by inferencing

								// FIXADE - I don't know if this is still necessary since it looks like esprima has changed the
								// way it handles properties in object expressions and they may now be proper AST nodes
								if (child[i].hasOwnProperty("key") && child[i].hasOwnProperty("value")) {
									children.push(child[i].key);
									children.push(child[i].value);
								}
							}
						}
					} else {
						if (child && child.hasOwnProperty("type")) {
							children.push(child);
						}
					}
				}
			}
			
			if (children.length > 0) {
				// sort children by source location
				children.sort(function(left, right) {
					if (left.range && right.range) {
						return left.range[0] - right.range[0];	
					} else if (left.range) {
						return 1;
					} else if (right.range) {
						return -1;
					} else {
						return 0;
					}
				});
				
				// visit children in order
				for (i = 0; i < children.length; i++) {
					visit(children[i], context, operation, postoperation);
				}
			}
			if (postoperation) {
				postoperation(node, context, false);
			}
		}
	}

	/**
	 * finds the right-most segment of a dotted MemberExpression
	 * if it is an identifier, or null otherwise
	 */
	function findRightMost(node) {
		if (!node) {
			return null;
		}
		if (node.type === "Identifier") {
			return node;
		} else if (node.type === "MemberExpression") {
			return findRightMost(node.property);
		} else {
			return null;
		}
	}
	
	/**
	 * Convert an array of parameters into a string and also compute linked editing positions
	 * @return { completion, positions }
	 */
	function calculateFunctionProposal(name, params, offset) {
		if (!params || params.length === 0) {
			return {completion: name + "()", positions:[]};
		}
		var positions = [];
		var completion = name + '(';
		var plen = params.length;
		for (var p = 0; p < plen; p++) {
			if (p > 0) {
				completion += ', ';
			}
			var argName = params[p].name ? params[p].name : params[p];
			positions.push({offset:offset+completion.length+1, length: argName.length});
			completion += argName;
		}
		completion += ')';
		return {completion: completion, positions: positions};
	}
	
	/**
	 * checks that offset overlaps with the given range
	 * Since esprima ranges are zero-based, inclusive of 
	 * the first char and exclusive of the last char, must
	 * use a +1 at the end.
	 * eg- (^ is the line start)
	 *       ^x    ---> range[0,0]
	 *       ^  xx ---> range[2,3]
	 */
	function inRange(offset, range) {
		return range[0] <= offset && range[1]+1 >= offset;
	}
	/**
	 * checks that offset is before the range
	 */
	function isBefore(offset, range) {
		if (!range) {
			return true;
		}
		return offset < range[0];
	}
	
	/**
	 * Determines if the offset is inside this member expression, but after the '.' and before the 
	 * start of the property.
	 * eg, the following returns true:
	 *   foo   .^bar	 
	 *   foo   .  ^ bar
	 * The following returns false:
	 *   foo   ^.  bar
	 *   foo   .  b^ar
	 */
	function afterDot(offset, memberExpr, contents) {
		// check for broken AST
		var end;
		if (memberExpr.property) {
			end = memberExpr.property.range[0];
		} else {
			end = memberExpr.range[1];
		}
		// only do the work if we are in between the 
		if (!inRange(offset, memberExpr.range) ||
			inRange(offset, memberExpr.object.range) ||
			offset < end) {
			return false;
		}
		
		var dotLoc = memberExpr.object.range[1];
		while (contents.charAt(dotLoc) !== "." && dotLoc < end) {
			dotLoc++;
		}
		
		if (contents.charAt(dotLoc) !== ".") {
			return false;
		}
		
		return dotLoc < offset;
	}
	
	/**
	 * @return "top" if we are at a start of a new expression fragment (eg- at an empty line, 
	 * or a new parameter).  "member" if we are after a dot in a member expression.  false otherwise
	 */
	function shouldVisit(root, offset, prefix, contents) {
		/**
		 * A visitor that finds the parent stack at the given location
		 * @param node the AST node being visited
		 * @param parents stack of parent nodes for the current node
		 * @param isInitialVisit true iff this is the first visit of the node, false if this is
		 *   the end visit of the node
		 */ 
		var findParent = function(node, parents, isInitialVisit) {
			if (!isInitialVisit) {
			
				// if we have reached the end of an inRange block expression then 
				// this means we are completing on an empty expression
				if (node.type === "Program" || (node.type === "BlockStatement") &&
						inRange(offset, node.range)) {
					throw "done";
				}
			
				parents.pop();
				// return value is ignored
				return false;
			}
			
			// the program node is always in range even if the range numbers do not line up
			if ((node.range && inRange(offset, node.range)) || node.type === "Program") {
				if (node.type === "Identifier") {
					throw "done";
				}
				parents.push(node);
				if ((node.type === "FunctionDeclaration" || node.type === "FunctionExpression") && 
						node.nody && isBefore(offset, node.body.range)) {
					// completion occurs on the word "function"
					throw "done";
				}
				// special case where we are completing immediately after a '.' 
				if (node.type === "MemberExpression" && !node.property && afterDot(offset, node, contents)) {
					throw "done";
				}
				return true;
			} else {
				return false;
			}
		};
		var parents = [];
		try {
			visit(root, parents, findParent, findParent);
		} catch (done) {
			if (done !== "done") {
				// a real error
				throw(done);
			}
		}

		if (parents && parents.length) {
			var parent = parents.pop();
			if (parent.type === "MemberExpression") {
				if (parent.property && inRange(offset, parent.property.range)) {
					// on the right hand side of a property, eg: foo.b^
					return "member";
				} else if (inRange(offset, parent.range) && afterDot(offset, parent, contents)) {
					// on the right hand side of a dot with no text after, eg: foo.^
					return "member";
				}
			} else if (parent.type === "Program" || parent.type === "BlockStatement") {
				// completion at a new expression
				if (!prefix) {
					// empty identifier
					// add a synthetic ExpressionStatemtn and Identifier
					// it doesn't have to be in the correct location since children are visited in lexical order
					// also note that this means we create synthetic nodes for arguments of method calls and
					// after binary expressions...I think this is all right. (ADE)
					
					var exprStatement = { 
						expression : {
							name: "",  // an empty expression
							type: "Identifier",
							range : [offset, offset+1]
						},
						type :"ExpressionStatement",
						range : [offset, offset+1]
					};
					
					parent.body.push(exprStatement);

			} else if (parent.type === "VariableDeclarator" && (!parent.init || isBefore(offset, parent.init.range))) {
				// the name of a variable declaration
				return false;
			} else if ((parent.type === "FunctionDeclaration" || parent.type === "FunctionExpression") && 
					isBefore(offset, parent.body.range)) {
				// a function declaration
				return false;
				}
			}
		}
		return "top";
	}	

	/**
	 * This function takes the current AST node and does the first inferencing step for it.
	 * @param node the AST node to visit
	 * @param env the context for the visitor.  See computeProposals below for full description of contents
	 */
	function proposalGenerator(node, env) {
		var type = node.type, oftype, name, i, property, params, plen, newTypeName;
		
		if (type === "VariableDeclaration" && isBefore(env.offset, node.range)) {
			// must do this check since "VariableDeclarator"s do not seem to have their range set correctly
			return false;
		}
		
		if (type === "Program") {
			// do nothing...
		} else if (type === "BlockStatement") {
			node.inferredType = env.newScope();
		} else if (type === "NewExpression") {
			node.inferredType = node.callee.name;
		} else if (type === "Literal") {
			oftype = (typeof node.value);
			node.inferredType = oftype[0].toUpperCase() + oftype.substring(1, oftype.length);
		} else if (type === "ArrayExpression") {
			node.inferredType = "Array";
		} else if (type === "ObjectExpression") {
			// for object literals, create a new object type so that we can stuff new properties into it.
			// we might be able to do better by walking into the object and inferring each RHS of a 
			// key-value pair
			newTypeName = env.newObject();
			node.inferredType = newTypeName;
			for (i = 0; i < node.properties.length; i++) {
				property = node.properties[i];
				// only remember if the property is an identifier
				if (property.key && property.key.name) {
					// first just add as an object property.
					// after finishing the ObjectExpression, go and update 
					// all of the variables to reflect their final inferred type
					env.addVariable(property.key.name, node, "Object");
					if (property.value.type === "FunctionExpression") {
						// RHS is a function, remember the name
						property.value.fname = property.key.name;
					}
				}
			}
			
		} else if (type === "AssignmentExpression") {
			if (node.left.name && node.right.type === "FunctionExpression") {
				// RHS is a function, remember the name
				node.right.fname = node.left.name;
			}			
		
		} else if (type === "FunctionDeclaration" || type === "FunctionExpression") {

			// FIXADE Function expressions have no name, so just use a generated name
			// We need to do better, but for now, just tolerate.
			if (node.id) {
				name = node.id.name;
			} else if (node.fname) {
				// likely the RHS of an assignment
				name = node.fname;
			}
			params = node.params;
			if (name) {
				// if we have a name, then add it to the scope
				env.addFunction(name, params, node.target, "Function");
			}
			
			// check for possible constructor
			// assume that function name that starts with capital is 
			// a constructor
			if (name && node.body && name.charAt(0) === name.charAt(0).toUpperCase()) {
				// create new object so that there is a custom "this"
				node.body.isConstructor = true;
				node.inferredType = env.newObject(name);
			} else {
				// FIXADE we could do better here and infer the actual return type
				// Also, should be returning a type of Function parameterized by its return type, not Function istelf
				node.inferredType = "Function";
			}
			
			env.newScope();
			env.addVariable("arguments", node.target, "Arguments");

			// add parameters to the current scope
			if (params && params.length > 0) {
				plen = params.length;
				for (i = 0; i < plen; i++) {
					name = params[i].name;
					env.addVariable(name, node.target);
				}	
			}
		} else if (type === "VariableDeclarator") {
			if (node.id.name && node.init && node.init.type === "FunctionExpression") {
				// RHS is a function, remember the name
				node.init.fname = node.id.name;
			}
		} else if (type === "CatchClause") {
			// create a new scope for the catch parameter
			node.inferredType = env.newScope();
			if (node.param) {
				node.param.inferredType = "Error";
				env.addVariable(node.param.name, node.target, "Error");
			}
		} else if (type === "MemberExpression") {
			if (node.property) {
				// keep track of the target of the property expression
				// so that its type can be used as the seed for finding properties
				node.property.target = node.object;
			}
		
		}
		return true;
	}
	
	/**
	 * called as the post operation for the proposalGenerator visitor.
	 * Finishes off the inferencing and adds all proposals
	 */
	function proposalGeneratorPostOp(node, env) {
		var type = node.type, name, inferredType, newTypeName, rightMost, kvps, i;
		
		if (type === "Program") {
			// do nothing...
		} else if (type === "BlockStatement" || type === "CatchClause") {
			env.popScope();
			
		} if (type === "MemberExpression") {
			if (afterDot(env.offset, node, env.contents)) {
				// completion after a dot with no prefix
				env.createProposals(env.scope(node.object));
			}
			// inferred type is the type of the property expression
			// node.propery will be null for mal-formed asts
			node.inferredType = node.property ? node.property.inferredType : node.object.inferredType;
		} else if (type === "CallExpression") {
			node.inferredType = node.callee.inferredType;
		} else if (type === "ObjectExpression") {
			// now that we know all the types of the values, use that to populate the types of the keys
			// FIXADE esprima has changed the way it does key-value pairs,  Should do it differently here
			kvps = node.properties;
			for (i = 0; i < kvps.length; i++) {
				if (kvps[i].hasOwnProperty("key")) {
					// only do this for keys that are identifiers
					// set the proper inferred type for the key node
					// and also update the variable
					name = kvps[i].key.name;
					if (name) {
						inferredType = kvps[i].value.inferredType;
						kvps[i].key.inferredType = inferredType;
						env.addVariable(name, node, inferredType);
					}
				}
			}
			env.popScope();
		} else if (type === "BinaryExpression") {
			if (node.operator === "+" || node.operator === "-" || node.operator === "/" || 
					node.operator === "*") {
				// assume number for now
				// rules are really much more complicated
				node.inferredType = "Number";
			} else {
				node.inferredType = "Object";
			}
		} else if (type === "UpdateExpression" || type === "UnaryExpression") {
			// assume number for now.  actual rules are much more complicated
			node.inferredType = "Number";
		} else if (type === "FunctionDeclaration" || type === "FunctionExpression") {
			env.popScope();
		} else if (type === "VariableDeclarator") {
			if (node.init) {
				inferredType = node.init.inferredType;
			} else {
				inferredType = "Object";
			}
			node.inferredType = inferredType;
			env.addVariable(node.id.name, node.target, inferredType);

		} else if (type === "AssignmentExpression") {
			inferredType = node.right.inferredType;
			node.inferredType = inferredType;
			// when we have this.that.theOther.f need to find the right-most identifier
			rightMost = findRightMost(node.left);
			if (rightMost) {
				env.addOrSetVariable(rightMost.name, rightMost.target, inferredType);
			}
		} else if (type === 'Identifier') {
			if (inRange(env.offset, node.range)) {
				// We're finished compute all the proposals
				env.createProposals(env.scope(node.target));
				throw "done";
			}
			
			name = node.name;
			newTypeName = env.lookupName(name, node.target);
			if (newTypeName) {
				// name already exists
				node.inferredType = newTypeName;
			} else {
				// If name doesn't already exist, then just assume "Object".
				node.inferredType = "Object";
			}
		} else if (type === "ThisExpression") {
			node.inferredType = env.lookupName("this");
		}
		
		if (!node.inferredType) {
			node.inferredType = "Object";
		}
	}

	function parse(contents) {
		var parsedProgram = esprima.parse(contents, {
			range: true,
			tolerant: true
		});
		return parsedProgram;
	}

	function EsprimaJavaScriptContentAssistProvider() {}
	
	/**
	 * Main entry point to provider
	 */
	EsprimaJavaScriptContentAssistProvider.prototype = {
		computeProposals: function(prefix, buffer, selection) {
			try {
				var root = parse(buffer);
				// note that if selection has length > 0, then just ignore everything past the start
				var completionKind = shouldVisit(root, selection.start, prefix, buffer);
				if (completionKind) {
					var environment = {
						/** Each element is the type of the current scope, which is a key into the types array */
						_scopeStack : ["Global"],
						/** a map of all the types and their properties currently known */
						_allTypes : new Types(),
						/** a counter used for creating unique names for object literals and scopes */
						_typeCount : 0,
						/** "member" or "top"  if Member, completion occurs after a dotted member expression.  if top, completion occurs as the start of a new expression */
						_completionKind : completionKind,
						/** an array of proposals generated */
						proposals : [], 
						/** the offset of content assist invocation */
						offset : selection.start, 
						/** 
						 * the location of the start of the area that will be replaced 
						 */
						replaceStart : selection.start - prefix.length, 
						/** the prefix of the invocation */
						prefix : prefix, 
						/** the entire contents being completed on */
						contents : buffer,
						newName: function() {
							return "gen~Object~"+ this._typeCount++;
						},
						/** Creates a new empty scope and returns the name of the scope*/
						newScope: function() {
							// the prototype is always the currently top level scope
							var targetType = this.scope();
							var newScopeName = this.newName();
							this._allTypes[newScopeName] = {
								$$proto : targetType,
								$$args : {}
							};
							this._scopeStack.push(newScopeName);
							return newScopeName;
						},
						
						/** Creates a new empty object scope and returns the name of this object */
						newObject: function(newObjectName) {
							// the prototype is always "Object"
							this.newScope();
							// if no name passed in, create a new one
							newObjectName = newObjectName? newObjectName : this.newName();
							// assume that objects have their own "this" object
							// prototype of Object
							this._allTypes[newObjectName] = {
								$$proto : "Object",
								$$args : {}
							};
							this.addVariable("this", null, newObjectName);
							
							return newObjectName;
						},
						
						/** removes the current scope */
						popScope: function() {
							// Can't delete old scope since it may have been assigned somewhere
							// but must remove "this" when outside of the scope
							this.removeVariable("this");
							var oldScope = this._scopeStack.pop();
							return oldScope;
						},
						
						/**
						 * returns the type for the current scope
						 * if a target is passed in (optional), then use the
						 * inferred type of the target instead (if it exists)
						 */
						scope : function(target) {
							return target && target.inferredType ? 
								target.inferredType : this._scopeStack[this._scopeStack.length -1];
						},
						
						/** adds the name to the target type.
						 * if target is passed in then use the type corresponding to 
						 * the target, otherwise use the current scope
						 */
						addVariable : function(name, target, type) {
							this._allTypes[this.scope(target)][name] = type ? type : "Object";
						},
						
						/** removes the variable from the current type */
						removeVariable : function(name, target) {
							this._allTypes[this.scope(target)][name] = null;
						},
						
						/** 
						 * like add variable, but first checks the prototype hierarchy
						 * if exists in prototype hierarchy, then replace the type
						 */
						addOrSetVariable : function(name, target, type) {
							var targetType = this.scope(target);
							var current = this._allTypes[targetType], found = false;
							// if no type provided, assume object
							type = type ? type : "Object";
							while (current) {
								if (current[name]) {
									// found it, just overwrite
									current[name] = type;
									found = true;
									break;
								} else {
									current = current.$$proto;
								}
							}
							if (!found) {
								// not found, so just add to current scope
								this._allTypes[targetType][name] = type;
							}
						},
						
						/** adds the name and args (array of strings) with the given return type to the current type */
						addFunction : function(name, args, target, type) {
							var targetType = this.scope(target);
							this._allTypes[targetType][name] = type ? type : "Object";
							this._allTypes[targetType].$$args[name] = args;
						},
						
						/** looks up the name in the hierarchy */
						lookupName : function(name, target) {
							var innerLookup = function(name, type, allTypes) {

								var res = type[name];
								
								// if we are in Object, then we may have special prefixed names to deal with
								var proto = type.$$proto;
								if (!res && !proto) {
									name = "$_$" + name;					
									res = type[name];
								}
								
								if (res) {
									return res;
								} else {
									if (proto) {
										return innerLookup(name, allTypes[proto], allTypes);
									}
									return null;
								}
							};
							return innerLookup(name, this._allTypes[this.scope(target)], this._allTypes);
						},
						
						createProposals : function(targetType) {
							if (!targetType) {
								targetType = this.scope();
							}
							var prop, propName, proto, res, functionArgs, type = this._allTypes[targetType];
							proto = type.$$proto;
							
							for (prop in type) {
								if (type.hasOwnProperty(prop)) {
									if (prop === "$$proto" || prop === "$$args") {
										continue;
									}
									if (!proto && prop.indexOf("$_$") === 0) {
										// no prototype that means we must decode the property name
										propName = prop.substring(3);
									} else {
										propName = prop;
									}
									if (propName === "this" && this._completionKind === "member") {
										// don't show "this" proposals for non-top-level locations
										// (eg- this.this is wrong)
										continue;
									}
									if (propName.indexOf(this.prefix) === 0) {
										functionArgs = type.$$args[prop];
										if (functionArgs) {
											res = calculateFunctionProposal(propName, 
													functionArgs, this.replaceStart - 1);
											this.proposals.push({ 
												proposal: res.completion, 
												description: res.completion + " (esprima)", 
												positions: res.positions, 
												escapePosition: this.replaceStart + res.completion.length 
											});
										} else {
											this.proposals.push({ 
												proposal: propName,
												description: propName + " (esprima)"
											});
										}
									}
								}
							}
							// walk up the prototype hierarchy
							if (proto) {
								this.createProposals(proto);
							}
						}
					};
					// need to use a copy of types since we make changes to it.
					try {
						visit(root, environment, proposalGenerator, proposalGeneratorPostOp);
					} catch (done) {
						if (done !== "done") {
							// a real error
							throw done;
						}
					}
					environment.proposals.sort(function(l,r) {
						if (l.description < r.description) {
							return -1;
						} else if (r.description < l.description) {
							return 1;
						} else {
							return 0;
						}
					});
					return environment.proposals;
				} else {
					// invalid completion location
					return {};
				}
			} catch (e) {
				if (console && console.log) {
					console.log(e.message);
					console.log(e.stack);
				}
				throw (e);
			}
		}
	};
	return {
		EsprimaJavaScriptContentAssistProvider : EsprimaJavaScriptContentAssistProvider
	};
});