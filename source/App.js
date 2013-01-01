enyo.kind({
	name: "App",
	fit: true,
	components: [
		{kind:"Panels", index:1, name:"topViews", classes:"enyo-fit", components: [
			{kind:"LoginView", onLoggedIn:"loggedIn", onLoggedOut:"loggedOut"},
			{kind:"MainView", onRequestLogout:"requestLogout"}
		]}
	],
	create: function() {
		this.inherited(arguments);
		// Phonegap setup
        if (isPhoneGapContext()) {
            enyo.log("Context: PhoneGap");
            document.addEventListener("deviceready", enyo.bind(this, function() {
                enyo.Signals.send("ondeviceready");
            }), false);
        } else {
            enyo.log("Context: Browser (non-PhoneGap)");
        }
	},
	loggedIn: function(inSender, inEvent) {
		this.$.mainView.setUser(inEvent.user);
		this.$.topViews.setIndex(1);
	},
	loggedOut: function() {
		this.$.topViews.setIndex(0);
	},
	requestLogout: function() {
		this.$.loginView.logout();
		this.$.topViews.setIndex(0);
	}
});

enyo.kind({
	name:"MainView",
	kind:"Panels",
	arrangerKind:"HouseArranger",
	index:1,
	narrowFit:false,
	published: {
		user:""
	},
	components: [
		{kind:"UserMenu", onRequestLogout:"toggleBasement"},
		{kind:"FittableRows", classes:"panel-main", components: [
			{kind:"onyx.Toolbar", classes:"onyx-menu-toolbar", layoutKind:"FittableColumnsLayout", noStretch:true, components: [
				{kind:"onyx.Button", ontap:"toggleBasement", components: [
					{kind:"onyx.Icon", src:"assets/icons/log.png"}
				]},
				{classes:"main-iconbar onyx-menu-toolbar", fit:true, components: [
					{kind:"onyx.MenuDecorator", components: [
						{kind:"onyx.IconButton", classes:"icon-wide", src:"assets/icons/buddies.png"},
						{kind:"onyx.ContextualPopup", name:"friendsPopup", components: [
							{content:"test"}
						]}
					]},
					{kind:"onyx.IconButton", classes:"icon-wide", src:"assets/icons/conversation.png"},
					{kind:"onyx.IconButton", classes:"icon-wide", src:"assets/icons/day.png"}
				]},
				{kind:"onyx.Button", components: [
					{kind:"onyx.Icon", ontap:"toggleAttick", src:"assets/icons/log.png"}
				]}
			]},
			{kind:"AroundList", name:"postList", rowsPerPage:25, classes:"post-list", onSetupItem:"setupPost", fit:true, aboveComponents: [
				{classes:"profile", name:"profile", showing:false, components: [
					{kind:"Image", name:"cover", onload:"resizeHandler", classes:"profile-banner"},
					{classes:"profile-header", components: [
						{kind:"Image", name:"avatar", classes:"profile-thumbnail"},
						{name:"profileName", classes:"profile-name"}
					]},
					{classes:"profile-info", name:"profileInfo"}
				]}
			], components: [
				{kind: "Post", name:"post", onPreloadImage:"preloadImage"}
			]}
		]},
		{kind:"ChatMenu"}
	],
	create: function() {
		this.inherited(arguments);
	},
	resizeHandler: function() {
		this.inherited(arguments);
		this.$.postList.invalidateMetrics();
		this.$.postList.refresh();
		this.listBounds = this.$.postList.getBounds();
		this.$.post.setParentWidth(this.listBounds.width);
		this.$.friendsPopup.setBounds({width:this.listBounds.width-30, height: this.listBounds.width-30});
	},
	toggleBasement: function() {
		this.setIndex(this.getIndex() === 0 ? 1 : 0);
	},
	toggleAttick: function() {
		this.setIndex(this.getIndex() == 2 ? 1 : 2);
	},
	updateNewsFeed: function(data) {
		this.loadingNews = false;
		this.news = this.news ? this.news.concat(data.data) : data.data;
		this.nextNews = data.paging && data.paging.next;
		this.$.postList.setCount(this.news.length);
		this.$.postList.refresh();
	},
	userChanged: function() {
		this.$.profile.setShowing(true);
		this.$.profileInfo.destroyClientControls();
		this.$.profileName.setContent(this.user.name);
		this.$.avatar.setSrc("https://graph.facebook.com/" + this.user.id +"/picture?type=large");
		this.$.cover.setSrc(this.user.cover.source);
		if (this.user.work) {
			this.user.work.sort(function(a,b) {
				return a.start_date - b.start_date;
			});
			var work = this.user.work[0];
			this.$.profileInfo.createComponent({
				content: work.position.name + " at " + work.employer.name
			}).render();
		}
		if (this.user.education) {
			this.user.education.sort(function(a,b) {
				return a.year.name - b.year.name;
			});
			var education = this.user.education[0];
			this.$.profileInfo.createComponent({
				content: "Studied at " + education.school.name
			}).render();
		}
		if (this.user.location) {
			this.$.profileInfo.createComponent({
				content: "Lives in " + this.user.location.name
			}).render();
		}
		FB.api('/me/home', enyo.bind(this, "updateNewsFeed"));
	},
	setupPost: function(inSender, inEvent) {
		this.news[inEvent.index]._index = inEvent.index;
		this.$.post.setData(this.news[inEvent.index]);
		if ((inEvent.index > this.news.length - 15) && !this.loadingNews && this.nextNews) {
			this.loadingNews = true;
			FB.api(this.nextNews, enyo.bind(this, "updateNewsFeed"));
		}
	},
	preloadImage: function(inSender, inEvent) {
		var post = inEvent.post;
		post._pictureLoaded = false;
		FB.api("/" + post.object_id, enyo.bind(this, function(object) {
			var img = new Image();
			if (!object.images || object.images.length === 0) {
				return;
			}
			for (var i=0; i<object.images; i++) {
				if (object.images[i].width < this.listBounds.width) {
					i = Math.max(i-1, 0);
					break;
				}
			}
			post.picture = object.images[i].source;
			img.src = post.picture;
			img.onload = enyo.bind(this, function() {
				post._pictureLoaded = true;
				this.$.postList.renderRow(post._index);
			});
		}));
	}
});

enyo.kind({
	name:"UserMenu",
	kind:"Scroller",
	classes:"panel-basement",
	events: {
		onRequestLogout:""
	},
	components: [
		{kind:"onyx.Toolbar", classes:"basement-header", components: [
			{kind:"onyx.InputDecorator", style:"width:100%", layoutKind:"FittableColumnsLayout", noStretch:true, components: [
				{kind:"onyx.Input", fit:true},
				{kind:"onyx.IconButton", src:"assets/icons/search.png"}
			]}
		]},
		{classes:"basement-row", components: [
			{kind:"Image", classes:"menu-icon"},
			{content:"Kevin Schaaf"}
		]},
		{kind:"onyx.Toolbar", content:"FAVORITES"},
		{classes:"basement-row", components: [
			{kind:"Image", classes:"menu-icon"},
			{content:"News Feed"}
		]},
		{classes:"basement-row", components: [
			{kind:"Image", classes:"menu-icon"},
			{content:"Messages"}
		]},
		{classes:"basement-row", components: [
			{kind:"Image", classes:"menu-icon"},
			{content:"Nearby"}
		]},
		{classes:"basement-row", components: [
			{kind:"Image", classes:"menu-icon"},
			{content:"Events"}
		]},
		{classes:"basement-row", components: [
			{kind:"Image", classes:"menu-icon"},
			{content:"Friends"}
		]},
		{kind:"onyx.Toolbar", content:"PAGES"},
		{classes:"basement-row", components: [
			{kind:"Image", classes:"menu-icon"},
			{content:"Page Sample"}
		]},
		{kind:"onyx.Toolbar", content:"GROUPS"},
		{classes:"basement-row", components: [
			{kind:"Image", classes:"menu-icon"},
			{content:"Group Sample"}
		]},
		{kind:"onyx.Toolbar", content:"APPS"},
		{classes:"basement-row", components: [
			{kind:"Image", classes:"menu-icon"},
			{content:"App Sample"}
		]},
		{kind:"onyx.Toolbar", content:"FRIENDS"},
		{classes:"basement-row", components: [
			{kind:"Image", classes:"menu-icon"},
			{content:"Friend Sample"}
		]},
		{kind:"onyx.Toolbar", content:"OTHER"},
		{classes:"basement-row", ontap:"doRequestLogout", components: [
			{kind:"Image", classes:"menu-icon"},
			{content:"Logout"}
		]}
	]
});

enyo.kind({
	name:"ChatMenu",
	kind:"Scroller",
	classes:"panel-basement",
	components: [
		{kind:"onyx.Toolbar", classes:"basement-header", components: [
			{kind:"onyx.InputDecorator", style:"width:100%", layoutKind:"FittableColumnsLayout", noStretch:true, components: [
				{kind:"onyx.Input", fit:true},
				{kind:"onyx.IconButton", src:"assets/icons/search.png"}
			]}
		]},
		{kind:"onyx.Toolbar", content:"FAVORITES"},
		{classes:"basement-row", components: [
			{kind:"Image", classes:"post-avatar"},
			{content:"Kevin Schaaf"}
		]},
		{classes:"basement-row", components: [
			{kind:"Image", classes:"post-avatar"},
			{content:"Kevin Schaaf"}
		]},
		{classes:"basement-row", components: [
			{kind:"Image", classes:"post-avatar"},
			{content:"Kevin Schaaf"}
		]}
	]
});

enyo.kind({
	name: "Post",
	classes: "post",
	published: {
		data:"",
		parentWidth:""
	},
	events: {
		onPreloadImage:""
	},
	components: [
		{classes:"post-container", components: [
			{classes:"post-header", components: [
				{kind:"Image", classes:"post-avatar", name:"avatar"},
				{components: [
					{name:"name", classes:"post-name"},
					{name:"date", classes:"post-date"}
				]}
			]},
			{name:"message", classes:"post-message"},
			{kind:"Image", classes:"post-image", canGenerate:false}
		]},
		{classes:"post-footer", components: [
			{content:"Like - Comment"}
		]}
	],
	parentWidthChanged: function() {
		this.$.image.applyStyle("width", this.parentWidth-12 + "px");
	},
	dataChanged: function() {
		this.$.name.setContent(this.data.from.name);
		this.$.date.setContent(this.data.created_time);
		this.$.message.setContent(this.data.message);
		this.$.avatar.setSrc("https://graph.facebook.com/" + this.data.from.id +"/picture");
		if (this.data.picture && this.data._pictureLoaded === undefined) {
			this.$.image.canGenerate = false;
			this.doPreloadImage({post:this.data});
		} else if (this.data._pictureLoaded === true) {
			this.$.image.canGenerate = true;
			this.$.image.setSrc(this.data.picture);
		} else {
			this.$.image.canGenerate = false;
		}
	}
});

enyo.kind({
	name:"LoginView",
	kind:"FittableRows",
    events: {
        onLoggedIn:"",
        onLoggedOut:""
    },
	components: [
		{kind:"FacebookSDK", appId:"121143804719903", onInit:"facebookInit"},
		{kind:"onyx.Toolbar", style:"text-align:center", content:"Login"},
		{classes:"nice-padding", components: [
			{kind:"FacebookLoginButton", perms:"read_stream,friends_online_presence,publish_checkins,publish_stream,user_photos,user_location,user_videos,user_status,user_education_history,user_work_history"}
		]}
	],
    facebookInit: function() {
        FB.Event.subscribe('auth.login', enyo.bind(this, function () {
            this.updateLoginStatus(true);
        }));
        enyo.log(">> facebookInit");
        this.updateLoginStatus();
    },
    rendered: function() {
        this.inherited(arguments);
        this.$.facebookSDK.notifyAppRendered();
        this.reflow();
    },
    updateLoginStatus: function() {
        enyo.log(">> updateLoginStatus");
        FB.getLoginStatus(enyo.bind(this, function(loginStatus) {
            enyo.log(">> loginStatus: " + JSON.stringify(loginStatus));
            if ((loginStatus.status == 'connected') && (loginStatus.authResponse)) {
                FB.api('/me?fields=cover,name,work,location,education', enyo.bind(this, function(me) {
                    if (me.error) {
                        var e = "Error: " + JSON.stringify(me.error);
                        enyo.error(e);
                        this.doLoggedOut();
                    } else {
                        this.doLoggedIn({user:me});
                    }
                }));
            }
            else {
                this.doLoggedOut();
            }
        }));
    },
    logout: function() {
        FB.logout(enyo.bind(this, function() {
            this.updateLoginStatus();
        }));
    }
});

enyo.kind({
	name: "HouseArranger",
	kind: "CarouselArranger",
	peekWidth: 75,
	arrange: function(inC, inIndex) {
		var c$ = this.container.getPanels();
		var pw = this.container.peekWidth || this.peekWidth;
		switch (inIndex) {
			case 0:
				this.arrangeControl(c$[1], {left: c$[1].width - pw});
				break;
			case 1:
				this.arrangeControl(c$[1], {left: 0});
				break;
			case 2:
				this.arrangeControl(c$[1], {left: pw - c$[1].width});
				break;
		}
		this.arrangeControl(c$[0], {left: 0});
		this.arrangeControl(c$[2], {left: pw});
	},
	start: function() {
		var c$ = this.container.getPanels();
		var pw = this.container.peekWidth || this.peekWidth;
		var w  = c$[1].width - pw;
		this.inherited(arguments);
		c$[0].setBounds({width: w});
		c$[1].setBounds({width:"100%"});
		c$[2].setBounds({width: w});
		c$[1].applyStyle("z-index", 2);
		if (this.container.toIndex === 0) {
			c$[0].applyStyle("z-index", 1);
			c$[2].applyStyle("z-index", 0);
		} else if (this.container.toIndex == 2) {
			c$[0].applyStyle("z-index", 0);
			c$[2].applyStyle("z-index", 1);
		}
	},
	calcArrangementDifference: function(inI0, inA0, inI1, inA1) {
		var c$ = this.container.getPanels();
		var pw = this.container.peekWidth || this.peekWidth;
		return c$[0].width - pw;
	}
});
