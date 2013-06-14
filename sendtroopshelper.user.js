// ==UserScript==
// @name SendTroopsHelper
// @description (Version 1.0.0) Adds GET parameters to the rally point for automatically entering unit numbers into the send troops form.
// @author bmaker (Robert N.)
// @namespace np.bmaker.net
// @include http://*.die-staemme.de/game.php?*screen=place*
// ==/UserScript==

function getParams() {
	var GET = {};
	
	var url = document.URL;
	var queryString = url.substr(url.indexOf("?")+1);
	
	if (queryString.indexOf("#") != -1) {
		queryString = queryString.substring(0, queryString.indexOf("#"));
	}
	
	var pairs = queryString.split("&");
	
	for (var i=0; i < pairs.length; i++) {
		var keyValue = pairs[i].split("=");
		GET[keyValue[0]] = keyValue[1];
		
		GM_log("Parsed parameter " + keyValue[0] + " with value " + keyValue[1]);
	}
	
	return GET;
}

function main() {
	var form = document.forms.namedItem("units");
	
	if (!form) {
		GM_log("ERROR: Form 'units' not found!");
		return;
	}
	
	var fillParams = ["x", "y", "spear", "sword", "axe", "archer", "spy", "light", "marcher", "heavy", "ram", "catapult", "knight", "snob"];
	
	var GET = getParams();
	
	for (var i=0; i < fillParams.length; i++) {
		var param = fillParams[i];
		
		if (!GET[param]) {
			continue;
		}
		
		var element = form.elements.namedItem(param);
		if (!element) {
			GM_log("ERROR: Form element '" + param + "' not found!");
			continue;
		}
		
		element.value = GET[param];
	}
}

main();