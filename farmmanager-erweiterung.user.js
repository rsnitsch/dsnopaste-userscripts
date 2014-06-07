// ==UserScript==
// @name Farmmanager-Erweiterung
// @description (Version 2.0) Berichte können mit einem Tastendruck in den Farmmanager eingelesen werden
// @author Robert Nitsch (bmaker)
// @namespace files.robertnitsch.de
// @include http://*.die-staemme.de/game.php?*screen=report*
// @include http://*beta.tribalwars.net/game.php?*screen=report*
// ==/UserScript==

/*	KONFIGURATION */

// Hier eine Liste der möglichen Tasten-Codes: http://www.webonweboff.com/tips/js/event_key_codes.aspx
// Für die einfachen Buchstaben-Tasten gilt: A = 65, B = 66, C = 67, ..., Y = 89, Z = 90

// Um einen Hotkey ganz zu deaktivieren einfach -1 eintragen

	// Beschreibung: mit diesem Hotkey wird der Bericht einfach nur eingelesen
	// Standard: 69 (Taste 'e')
	// Gültige Werte: 0 - 255 sowie -1 für Deaktivierung
	var parse_hotkey = 69;

	// Beschreibung: mit diesem Hotkey wird der Bericht eingelesen und bei Erfolg gelöscht
	// Standard: -1
	// Gültige Werte: 0 - 255 sowie -1 für Deaktivierung
	var parse_and_delete_hotkey = -1;

	// Beschreibung: Die "Bericht erfolgreich eingelesen"-Meldung MIT Popup lässt sich hiermit ein- bzw. abschalten
	//				 Davon ist die Meldung OHNE Popup nicht betroffen, diese wird IMMER angezeigt.
	// Standard: false
	// Gültige Werte: true, false
	var show_success_popup = false;

	// Beschreibung: debug-Modus. Sollte man einfach anlassen.
	// Standard: true
	// Gültige Werte: true, false
	var debug = true;

/* /KONFIGURATION */




// ################################
// AB HIER NICHTS MEHR VERÄNDERN!!!





/*
	Changelog:

	Version 2.0 (Juni 2014):
	- kompatibel mit dem Wrapper-Script von der DS Script-Datenbank gemacht
	
	Version 1.1.1 (Januar 2014):
	- umgestellt auf neue Domain np.bmaker.de (ehemals np.bmaker.net)

	Version 1.1.0 (Juni 2013):
	- Konflikte mit anderen Skripts gehören nun der Vergangenheit an (die Farmmanager-Erweiterung
	  muss aber als erstes Skript ausgeführt werden)
	- Abbruch bei Eingabe der Farmmanager ID wird nun korrekt behandelt
	- Skript kann nun auf den Beta-Welten getestet werden

	Version 1.0.3 (29.11.2012):
	- jetzt kompatibel mit DS-Version 8.8 (behebt den Bug, dass erspähte Ressourcen immer auf 0 gesetzt wurden)

	Version 1.0.2 (???):
	- hat einen Escaping-Bug behoben beim Senden des Berichtes

	Version 1.0.1 (03.08.2010):
	- jetzt kompatibel mit DS-Version 7.3
	- man kann jetzt wahlweise den Link bzw. die URL zum Farmmanager *oder* die ID des Farmmanagers angeben

	Version 1.0.0 (26.02.2010):
	- Beginn der Versionierung mit 1.0.0 (bisherige Versionen waren unversioniert)
	- jetzt kompatibel zu Version 6.0 (insbesondere also Welt 55/56)
	- man kann jetzt die Tasten zum Einlesen selbst definieren
	- es gibt jetzt einen zusätzlichen Hotkey, der den Bericht nach erfolgreichem Einlesen automatisch löscht (Tom)
	- es wird jetzt direkt über dem Bericht angezeigt, wenn er erfolgreich eingelesen wurde (ohne Popup)
	- die bisherige Erfolgs-Meldung (mit Popup) ist nun standardmäßig deaktiviert (skydeath)
	- besseres Verhalten bei falsch eingegebener Farmmanager-ID
	- einige kleinere Verbesserungen, zum Beispiel werden jetzt viel mehr Details preisgegeben, wenn etwas schief läuft

*/

var $ = typeof unsafeWindow != 'undefined' ? unsafeWindow.$ : window.$;

/* Reguläre Ausdrücke */
regex_world = /http:\/\/([0-9a-z]+)/i;
regex_id = /=?([0-9a-zA-Z]{10})$/;
regex_delete = /L.{1,2}schen/;

/* Funktionen */

GM_log = function(str) {
	var window = typeof unsafeWindow != 'undefined' ? unsafeWindow : window;
	if (window.console) {
		console.log(str);
	}
}

GM_getValue = function(name, defaultValue) {
	var value = localStorage.getItem(name);
	if (!value){
		return defaultValue;
	}
	var type = value[0];
	value = value.substring(1);
	switch (type) {
		case 'b':
			return value == 'true';
		case 'n':
			return Number(value);
	default:
		return value;
	}
}

GM_setValue = function(name, value) {
	value = (typeof value)[0] + value;
	localStorage.setItem(name, value);
}

// Gibt das Kürzel der Welt zurück, auf der der Benutzer spielt
// Beispiel: de14
function _getWorld() {
	match = document.URL.match(regex_world);
	if(match) {
		return match[1];
	}
	return false;
}

// Gibt die ID des Farmmanagers zurück, die der Benutzer eingestellt hat.
// Wenn der Benutzer die ID noch nicht eingestellt hat, wird er dazu aufgefordert, seine ID
// anzugeben.
function _getFarmmanagerID(world) {
	id = GM_getValue('fm_id_'+world, false);
	if(id === false) {
		id = prompt('Bitte gebe den Link (oder die ID) zu deinem Farmmanager (für Welt '+world+') ein!');
		if (id === null) {
			return -3;
		}
		
		id = id.trim();
		
		GM_log(id);
		match = id.match(regex_id);
		GM_log(match);
		if(match) {
			id = match[1];
		} else {
			return -2;
		}
		
		GM_setValue('fm_id_'+world, id);
	}
	
	if(String(id).match(/^[0-9a-zA-Z]{10}$/))
		return id;
	else
		return -1;
}

// Gibt den _vollständigen_ Textinhalt eines DOM-Elements zurück,
// also auch die Textinhalte aller Subelemente. Die Textinhalte der jeweiligen Elemente
// werden durch delimeter getrennt. (Es bietet sich ein Leerzeichen an.)
function _getNodeTextRecursively(node, delimeter) {
	var result = '';
	if(node.nodeType == 3) {
		if(node.nodeValue && !node.nodeValue.match(/^\s+$/)) {
			result += _trim(node.nodeValue)+delimeter;
		}
	}
	if(node.hasChildNodes()) {
		for(var k=0; k<node.childNodes.length; k++) {
			result += _getNodeTextRecursively(node.childNodes[k], delimeter);
		}
	}
	return result;
}

function _parseReport() {
	var tables = document.getElementsByTagName('table');
	var table = false;
	for(var i=0; i<tables.length; i++) {
		if(tables[i].getAttribute('class') == 'vis' && tables[i].getAttribute('width') == '470') {
			table = tables[i];
			break;
		}
	}

	if(table == false) {
		alert("Konnte den Bericht nicht finden.\n\nWahrscheinlich gibt es ein Problem mit einem anderen installierten Greasemonkey-Skript!");
	}

	var text = _getNodeTextRecursively(table, " ");
	text = text.replace(/([0-9]+)\s\.\s([0-9]+)/g, '$1.$2');
	
	//alert(text);
	
	// herausfinden, welche Ressourcen gespäht wurden
	var wood = 'no';
	var loam = 'no';
	var iron = 'no';
	ths = table.getElementsByTagName('th');
	for(var i=0; i<ths.length; i++) {
		if(!ths[i].firstChild)
			continue;
		if(!ths[i].firstChild.nodeValue)
			continue;
			
		if(ths[i].firstChild.nodeValue.match(/(Ersp.{1,2}hte\s+Rohstoffe:|Resources scouted:)/i)) {
			GM_log('"Erspähte Rohstoffe:" gefunden!');
			imgs = ths[i].nextSibling.getElementsByTagName('img');
			for(var j=0; j<imgs.length; j++) {
				//GM_log("test: "+imgs[j].getAttribute('title'));
				if(imgs[j].getAttribute('title') == 'Holz')
					wood = 'yes';
				else if(imgs[j].getAttribute('title') == 'Lehm')
					loam = 'yes';
				else if(imgs[j].getAttribute('title') == 'Eisen')
					iron = 'yes';
			}
			GM_log("Gespähte Rohstoffe (img-basiert) - Holz: "+wood+" Lehm: "+loam+" Eisen: "+iron);
			
			// Seit DS-Version 8.8 wird <span class='icon header wood'></span> verwendet anstatt img-Tags.
			spans = ths[i].nextSibling.getElementsByTagName("span");
			for(var j=0; j<spans.length; j++) {
				if(spans[j].getAttribute('class').match(/wood/))
					wood = 'yes';
				else if(spans[j].getAttribute('class').match(/stone/))
					loam = 'yes';
				else if(spans[j].getAttribute('class').match(/iron/))
					iron = 'yes';
			}
			GM_log("Gespähte Rohstoffe (span-basiert) - Holz: "+wood+" Lehm: "+loam+" Eisen: "+iron);
			
			break;
		}
	}
	
	var data = {"wood": wood, "loam": loam, "iron": iron, "text": text};
	return data;
}

// Entfernt Whitespaces am Anfang und am Ende eines Strings.
function _trim (str) {
	return str.replace (/^\s+/, '').replace (/\s+$/, '');
}

// Setzt die intern gespeicherte Farmmanager-ID (wegen Ungültigkeit) zurück und setzt
// den Benutzer darüber in Kenntnis, dass er beim nächsten Einlesen die korrekte ID bereit halten soll.
function _invalidID() {
	alert("Die gespeicherte Farmmanager-ID ist ungültig. "+
		  "Wenn du das nächste Mal versuchst einen Bericht einzulesen wirst du aufgefordert die richtige ID einzulesen!\n\n"+
		  "Bitte halte dann die korrekte Farmmanager-ID zu diesem Zweck bereit.");
	GM_setValue('fm_id_'+world, false);
}

// Löscht den aktuell geöffneten Bericht, indem der "Löschen"-Link aufgerufen wird
function _deleteReport() {
	var as = document.getElementsByTagName('a');
	var a = false;
	
	// alle Links auf der Seite durchgehen
	for(var i=0; i<as.length; i++) {
		try {
			if(as[i].firstChild.nodeValue.match(regex_delete)) {
				a = as[i];
				break;
			}
		} catch(e) { /* fu */ };
	}
	
	// der Löschen-Link wurde nicht gefunden
	if(a === false) {
		alert("Kann diesen Bericht nicht löschen!");
		return -1;
	}
	
	// dem Löschen-Link folgen
	var delLink = a.getAttribute("href");
	location.href = delLink;
}

function _showHTMLSuccessMessage() {
	// Normale Methode
	try {
		document.getElementById("content_value").firstChild.firstChild.nodeValue = 
			"Bericht erfolgreich eingelesen!";
		GM_log("Normaler HTML-Hinweis mit document.getElementById(\"content_value\") hat funktioniert.");
		
		return;
	}
	catch(e) {
		GM_log("HTML-Hinweis mit document.getElementById(\"content_value\") hat nicht funktioniert");
	}
	
	// 1. Backup
	try {
		var h2s = document.getElementsByTagName("h2");
		h2s[0].firstChild.nodeValue = "Bericht erfolgreich eingelesen!";
		GM_log("1. Backup-HTML-Hinweis mit document.getElementsByTagName(\"h2\")[0] hat funktioniert");
		
		return;
	}
	catch(e) {
		GM_log("1. Backup-HTML-Hinweis mit document.getElementsByTagName(\"h2\")[0] hat ebenfalls nicht funktioniert.");
	}
	
	GM_log("Konnte HTML-Hinweis nicht anzeigen.");
	
	// Ausweich-Methode ist der (ehemalige) Standardhinweis, aber nur, wenn dieser abgeschaltet ist
	// (sonst wird ja schon anderswo angezeigt)
	if(!show_success_popup)
		alert("Bericht erfolgreich eingelesen!\n\n(Der Hinweis OHNE Popup konnte nicht angezeigt werden.)");
}

/* Hauptskript */
function handle_hotkey() {
	world = _getWorld();
	id = _getFarmmanagerID(world);
	
	if(id == -2) {
		alert("Du hast eine ungültige Farmmanager-ID angegeben! Probiere es nochmal!");
		return;
	}
	else if(id == -1) {
		_invalidID();
		return;
	}
	else if (id == -3) {
		// Abbruch
		return;
	}
	
	if (report === null) {
		alert("Der Bericht konnte nicht eingelesen werden.");
	}
	
	// den Bericht abschicken bzw. einlesen
	
	$.ajax({
		type: 'GET',
		crossDomain: true,
		dataType: 'jsonp',
		url: 'http://np.bmaker.de/tools/farmmanager.php',
		global: false,
		traditional: false,
		jsonpCallback: "nopasteCallback",
		data: encodeURI('id='+id+'&ajax=3&report='+escape(report.text)+'&wood='+report.wood+'&loam='+report.loam+'&iron='+report.iron+'&note=&parse=1'),
		success: function(data, textStatus, jqXHR) {
			try {
				data = _trim(unescape(data));
				
				var success = data.match(/erfolgreich eingelesen/i);
				
				// das "Bericht wurde erfolgreich eingelesen"-Popup soll nur angezeigt werden,
				// wenn der Benutzer das so in der Konfiguration festgelegt hat.
				// Fehlermeldungen werden nach wie vor IMMER in dem Popup angezeigt.
				if(!success || show_success_popup) {
					alert(data);
				}
				
				// Bei Erfolg soll eine Erfolgsmeldung in der Seite erscheinen.
				if(success && !parsed) {
					parsed = true;
					_showHTMLSuccessMessage();
				}
				
				// Hat Nopaste gemeldet, dass es diesen Farmmanager gar nicht gibt?
				// => Zurücksetzen der ID
				if(data.match(/Farmmanager nicht gefunden/i)) {
					_invalidID();
				}
				
				// Hat Nopaste einen Fehler gleich welcher Art gemeldet?
				// => Dann jetzt abbrechen, denn ein paar Zeilen später kommt das automatische Löschen
				//	  und das wäre ungünstig im Falle eines Fehlers (weil der Bericht dann unwiderruflich verloren ist).
				if(data.match(/Fehler/i))
					return;
			} catch(e) {
				alert("Der Bericht wurde abgeschickt, aber die Antwort von NoPaste konnte nicht vollständig ausgewertet werden.\n\n"+
					  "Die genaue Fehlermeldung lautet: \n"+e+
					  "\n\nDie genaue Antwort von NoPaste lautet: \n"+data);
				return;
			}
			
			// Automatisches Löschen des Berichts?
			if(delete_after_parsing)
				_deleteReport();
		}
	});
	
	return 0;
}

// globale Variablen
var delete_after_parsing = false;
var parsed = false;
var report;

function main() {
	try {
		report = _parseReport();
		console.log(report);
	} catch(err) {
		report = null;
	}

	// Hotkeys...
	document.addEventListener("keydown", function(evt) {
		// wurde einer der beiden Hotkeys gedrückt?
		if(evt.keyCode == parse_hotkey) {
			delete_after_parsing = false;
		}
		else if(evt.keyCode == parse_and_delete_hotkey) {
			delete_after_parsing = true;
		}
		else {
			return;
		}
		
		// sollen alle Fehlermeldungen gemeldet werden?
		if(debug) {
			try { handle_hotkey() } catch(e) { alert("Fehler: " + e); }
		}
		else {
			handle_hotkey();
		}
	}, false);
}

if (document.URL.match(/\?.*view=[0-9]+/)) {
	main();
}
