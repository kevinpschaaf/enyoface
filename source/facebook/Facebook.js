enyo.kind({
	name: "FacebookSDK",
	kind: "enyo.Component",
	events: {
		onInit:""
	},
	published: {
		appId: "",
		status:true,
		cookie:true,
		xfbml: true,
		oauth: true
	},
	appRendered: false,
	components: [
		{ kind:"enyo.Signals", onFbAsyncInit:"notifySDKLoaded", ondeviceready:"notifyPGReady" }
	],
	notifyAppRendered: function() {
		enyo.log(">> notifyAppRendered");
		this.appRendered = true;
		if (FacebookSDK.loaded && (this.phoneGapReady || !isPhoneGapContext())) {
			this.initSDK();
		}
	},
	notifySDKLoaded: function() {
		enyo.log(">> notifySDKLoaded");
		if (this.appRendered && (this.phoneGapReady || !isPhoneGapContext())) {
			this.initSDK();
		}
	},
	notifyPGReady: function() {
		enyo.log(">> notifyPGReady");
		this.phoneGapReady = true;
		if (FacebookSDK.loaded && this.appRendered) {
			this.initSDK();
		}
	},
	initSDK: function() {
		enyo.log(">> initSDK");
		this.inherited(arguments);
		FB.init({
			appId  : this.appId,
			status : this.status,
			cookie : this.cookie,
			xfbml  : this.xfbml,
			oauth  : this.oauth,
			nativeInterface: (typeof CDV != "undefined") ? CDV.FB : null
		});
		enyo.Signals.send("onFacebookInit");
		this.doInit();
	}
});

(function(d,w){
	var js, id = 'facebook-jssdk';
	if (d.getElementById(id)) {
		return;
	}
	js = d.createElement('script');
	js.id = id;
	js.async = true;
	if (isPhoneGapContext()) {
		js.src = "assets/facebook/facebook_js_sdk.js";
	} else {
		js.src = "//connect.facebook.net/en_US/all.js";
	}
	if (!d.getElementById('fb-root')) {
		var div = d.createElement('div');
		div.id = 'fb-root';
		d.getElementsByTagName('head')[0].appendChild(div);
	}
	d.getElementsByTagName('head')[0].appendChild(js);
	w.fbAsyncInit = function() {
		FacebookSDK.loaded = true;
		enyo.Signals.send("onFbAsyncInit");
	};
}(document, window));


enyo.kind({
	name:"FacebookLoginButton",
	published: {
		showFaces: false,
		perms: "read_stream",
		width:200,
		label: "Login using Facebook",
		simple: false
	},
	events: {
		onFacebookLogin:""
	},
	create: function() {
		this.inherited(arguments);
		if (this.simple || ((typeof CDV != "undefined") && CDV.FB)) {
			this.createComponent({kind:"onyx.Button", name:"loginButton", ontap:"loginTapped"});
		} else {
			this.createComponent({name:"loginButton", classes: "fb-login-button"});
		}
		this.showFacesChanged();
		this.permsChanged();
		this.widthChanged();
		this.labelChanged();
	},
	showFacesChanged: function() {
		if (this.showFaces) {
			this.$.loginButton.attributes['show-faces'] = this.showFaces;
		}
	},
	permsChanged: function() {
		if (this.perms) {
			this.$.loginButton.attributes['data-perms'] = this.perms;
		}
	},
	widthChanged: function() {
		if (this.widthChanged) {
			this.$.loginButton.attributes['data-width'] = this.width;
		}
	},
	labelChanged: function() {
		if (this.labelChanged) {
			this.$.loginButton.setContent(this.label);
		}
	},
	loginTapped: function() {
		FB.login(enyo.bind(this, function(response) {
			this.doFacebookLogin(response);
		}), {scope: this.perms});
	}
});
