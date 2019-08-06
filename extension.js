const St = imports.gi.St;
const Main = imports.ui.main;
const Soup = imports.gi.Soup;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;
const PanelMenu = imports.ui.panelMenu;

const BG_URL = "https://xxxx.herokuapp.com/api/v1/entries/current.json";

const MIN_WAIT_TIME = 10;

let _httpSession;
const BGIndicator = new Lang.Class({
	Name : 'BGIndicator',
	Extends : PanelMenu.Button,

	_init : function() {
		this.parent(0.0, "Glucose Indicator", false);
		this.buttonText = new St.Label({
			text : _("Loading..."),
			y_align : Clutter.ActorAlign.CENTER
		});
		this.actor.add_actor(this.buttonText);
		this.bg = null;
		this._refresh();
	},

	_refresh : function() {
		this._removeTimeout();
		if(this.bg == null || this._readingAge() > 300) {
			// First reading or older than 5 minutes, reload
			this._loadData();
		} else {
			// Update age and refresh on next full minute
			this._refreshUI();
			this._setRefreshTimeout(Math.ceil(this._readingAge() % 60));
		}
		return true;
	},

	_setRefreshTimeout: function(seconds) {
		this._timeout = Mainloop.timeout_add_seconds(seconds, Lang.bind(this,
			this._refresh));
	},

	_loadData : function() {
		let params = {};
		if (_httpSession !== undefined)
			_httpSession.abort();
		_httpSession = new Soup.Session();
		let message = Soup.form_request_new_from_hash('GET', BG_URL, params);
		_httpSession.queue_message(message, Lang.bind(this, function(
			_httpSession, message) {
			if (message.status_code == 200) {
				let json = JSON.parse(message.response_body.data);
				this._parseData(json);
			} else {
				global.log("Nightscout returned status " + message.status_code);
				this.bg = null;
			}
			this._refreshUI();
			this._setRefreshTimeout(10);
		}));
	},

	_parseData : function(data) {
		// Convert to mmol/l and round
		let entry = data[0];
		let value = Math.round(entry.sgv / 18 * 10) / 10;

		let date = new Date(entry.dateString);

		this.bg = {
			value: value,
			date: date
		};
	},

	_refreshUI : function() {
		if(this.bg == null) {
			this.buttonText.set_text("--");
		} else {
			this.buttonText.set_text(this.bg.value.toString() + " | " + this._ageString());
		}
	},

	_readingAge : function() {
		if(this.bg == null) {
			return -1;
		}
		return (new Date() - this.bg.date) / 1000;
	},

	_ageString : function() {
		let minutes = Math.floor(this._readingAge() / 60);
		if(minutes == 0) {
			return "now";
		} else {
			return minutes + " min";
		}
	},

	_removeTimeout : function() {
		if (this._timeout) {
			Mainloop.source_remove(this._timeout);
			this._timeout = null;
		}
	},

	stop : function() {
		if (_httpSession !== undefined)
			_httpSession.abort();
		_httpSession = undefined;

		if (this._timeout)
			Mainloop.source_remove(this._timeout);
		this._timeout = undefined;

		this.menu.removeAll();
	}
});

let bgMenu;

function init() {
}

function enable() {
	bgMenu = new BGIndicator;
	Main.panel.addToStatusArea('bg-indicator', bgMenu);
}

function disable() {
	bgMenu.stop();
	bgMenu.destroy();
}
