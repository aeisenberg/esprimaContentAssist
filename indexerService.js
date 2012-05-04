/*******************************************************************************
 * @license
 * Copyright (c) 2012 Contributors
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     Andrew Eisenberg (vmware) - implemented visitor pattern
 *******************************************************************************/

/*global define require console localStorage FileReader window XMLHttpRequest ActiveXObject */

/**
 * this module defines the indexing service
 * and provides two operations:
 *   retrieveSummaries(file)  grabs the summaries for files that depend on the file file passed in
 *   performIndex(file)   calculates the dependencies of the file and updates the summaries of all of these dependencies
 */
define("indexerService", ["esprimaJsContentAssist"], function(mEsprimaContentAssist) {
	// for each file, there are 4 things put in local storage:
	// <file-name>-deps : dependency list for file
	// <file-name>-deps-ts : timestamp for dependency list  (not sure if this is necessary)
	// <file-name>-summary : summary for file
	// <file-name>-summary-ts : timestamp for summary

	function generateTimeStamp() {
		return new Date().getTime();
	}

	function getDependencies(fileName, callback) {
		// ask server for dependencies, but for now, just hard code
		// dependency = { path : { path to file }, name { module name }, kind : { global, AMD } }
		callback( [ 
//			{
//				path : "http://localhost:8080/file/d/footest.js",
//				name : "footest",
//				kind : "global",
//				timestamp : generateTimeStamp()
//			},
			{
				path : "http://localhost:8080/file/d/amd_test.js",
				name : "amd_test",
				kind : "AMD",
				timestamp : generateTimeStamp()
			}
		]);
	}	

	/**
	 * gets the text of the given file, parses it and stores the file summary in local storage
	 * @param file a url of the file to summarize
	 */
	function createSummary(dependency) {
		var file = dependency.path;
		
		// for now, just use static text and update it each time
		var xhr;
		if (window.XMLHttpRequest) {
			xhr = new XMLHttpRequest();
		} else if (window.ActiveXObject) {
			xhr = new ActiveXObject("Microsoft.XMLHTTP");
		}
		
		xhr.onreadystatechange = function() { 
			if (xhr.readyState === 4) {
				if(xhr.status  === 200) {
					// create a content assistant, but don't pass in an indexer since we don't want recursive indexing to happen
					var esprimaContentAssistant = new mEsprimaContentAssist.EsprimaJavaScriptContentAssistProvider({});
					var structure = esprimaContentAssistant.computeSummary(xhr.responseText, file);
					console.log("Storing summary of " + file + " in local storage.");
					localStorage[file + "-summary"] = JSON.stringify(structure);
					localStorage[file + "-summary-ts"] = generateTimeStamp();
				} else {
					console.log("Error code: " + xhr.status + " when getting " + file);
				}
			}
		};
		
		xhr.open("GET", file,  true); 
		xhr.send(null); 
	}
	
	/**
	 * caches the dependency list for a single file
	 */
	function cacheDeps(fileName, deps) {
		localStorage[fileName + "-deps"] = JSON.stringify(deps);
		localStorage[fileName + "-deps-ts"] = generateTimeStamp();
	}
	
	/**
	 * checks the dependency list to see which summaries need updating.
	 * FIXADE : this is currently a stub method and always assumes that everything needs updating
	 */
	function checkCache(deps) {
		var needsUpdating = [];
		for (var i = 0; i < deps.length; i++) {
			var tsCache = localStorage[deps[i].path + "-summary-ts"];
			var tsDep = deps[i].timestamp;
			// only update the local cache if it 
			// older than what the server has
			if (!tsCache || !tsDep || tsCache < tsDep) {
				needsUpdating.push(deps[i]);
			}
		} 
		return needsUpdating;
	}
	
	function Indexer() {
		// private instance variable
		var indexTargetFile;
		
		/**
		 * retrieves the summaries for all dependencies in the global scope
		 */
		this.retrieveGlobalSummaries = function() {
			if (!indexTargetFile) {
				return { };
			}
			// check local storage for file
			var deps = localStorage[indexTargetFile + "-deps"];
			if (!deps) {
				return { };
			}
			deps = JSON.parse(deps);
			
			// for each dependency that is global, extract the summary
			var summaries = [ ];
			for (var i = 0; i < deps.length; i++) {
				var dep = deps[i];
				if (dep.kind === "global") {
					var depPath = dep.path;
					var summary = localStorage[depPath + "-summary"];
					if (summary) {
						// also add the extra dependency information
						summary = JSON.parse(summary);
						summary.name = dep.name;
						summary.kind = dep.kind;
						summaries.push(summary);
					}
				}
			}
			return summaries;
		};
		
		/**
		 * retrieves the summary with the given name if it exists, or null if it doesn't
		 */
		this.retrieveSummary = function(name) {
			if (!indexTargetFile) {
				return null;
			}
			// check local storage for file
			var deps = localStorage[indexTargetFile + "-deps"];
			if (!deps) {
				return null;
			}
			deps = JSON.parse(deps);
			
			// look through the dependencies until the name is found
			for (var i = 0; i < deps.length; i++) {
				var dep = deps[i];
				if (dep.name === name) {
					var summary = localStorage[dep.path + "-summary"];
					if (summary) {
						// also add the extra dependency information
						summary = JSON.parse(summary);
						summary.name = dep.name;
						summary.kind = dep.kind;
						return summary;
					}
				}
			}
			return null;
		};
	
		/**
		 * Two kinds of objects are worked with here:
		 *    dependency = { path : { path to file }, name { module name }, kind : { global, AMD }, timestamp : long }
		 *    summary = { provided : { name -> typeName }, types : { typeName -> { name -> typeName }, timestamp : long }
		 * 
		 * Performs the index asynchronously
		 */
		this.performIndex = function(fileName, contents) {
			indexTargetFile = fileName;
			
			// asynchronously ask server for dependencies of fileName
			getDependencies(fileName, function(deps) { 
				// cache these dependencies
				cacheDeps(fileName, deps);
		
				// for each dependency, check local storage to see if still valid
				var needsUpdating = checkCache(deps);
				
				// ask server for contents of each stale dependency
				for (var i = 0; i < needsUpdating.length; i++) {
					createSummary(needsUpdating[i]);
				}
			});
			
			// since this function is being used as a syntax checker, must return an empty array
			return [];
		};
	}
	
	return {
		Indexer : Indexer
	};
});