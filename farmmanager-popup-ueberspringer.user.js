// ==UserScript==
// @name Farmmanager Popup Überspringer
// @description (Version 1.0.0) Betätigt automatisch den Button im Popup beim Truppensenden.
// @author bmaker (Robert N.)
// @namespace np.bmaker.net
// @include http://*np.bmaker.net/tools/sendtroops.php*
// @include http://*np.bmaker.de/tools/sendtroops.php*
// ==/UserScript==

var form = document.forms.namedItem("sendtroops");

if (!form) {
	console.log("ERROR: Form 'sendtroops' not found!");
	return;
}

form.submit();
