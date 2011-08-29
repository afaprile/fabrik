var fabrikCalendar = new Class({
	Implements:[Options],
	options:{
		days:  ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
		shortDays: ['Sun', 'Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat'],
		months: ['January', 'Feburary', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
		shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
		viewType: 'month',
		calendarId: 1,
		tmpl:'default',
		'Itemid':0,
		colors:{'bg':'#F7F7F7','highlight':'#FFFFDF','headingBg':'#C3D9FF',
		'today':'#dddddd','headingColor':'#135CAE','entryColor':'#eeffff'},
		 eventLists:[],
		 'listid':0,
		 'popwiny':0,
		 urlfilters:[],
		 url:{
		 	'add':'index.php?option=com_fabrik&controller=visualization.calendar&view=visualization&task=getEvents&format=raw',
		 	'del':'index.php?option=com_fabrik&controller=visualization.calendar&view=visualization&task=deleteEvent&format=raw'
		 },
		 monthday:{'width':90,'height':80}
	},
	
	initialize: function(el){
		this.el  = $(el);
		this.SECOND = 1000; // the number of milliseconds in a second
		this.MINUTE = this.SECOND * 60; // the number of milliseconds in a minute
		this.HOUR = this.MINUTE * 60; // the number of milliseconds in an hour
		this.DAY = this.HOUR * 24; // the number of milliseconds in a day
		this.WEEK = this.DAY * 7; // the number of milliseconds in a week
		this.date = new Date();//date used to display currenlty viewed page of calendar
		this.selectedDate = new Date(); //date used to highlight appropriate parts of calendar (doesnt change when you navigate around the calendar)
		this.entries = $H();
		//this.listenTo = $A([]);
		this.droppables = {'month':[],'week':[],'day':[]};
		this.fx = {};
		this.ajax = {};
		this.fx.showMsg = new Fx.Morph(this.el.getElement('.calendar-message'), {'duration':700});
		this.fx.showMsg.set({'opacity':0});
		this.colwidth = [];
		this.windowopts = {
			'id': 'addeventwin',
			title: 'add/edit event',
			contentType: 'xhr',
			loadMethod:'xhr',
			minimizable:false,
			evalScripts:true,
			width: 380,
			height: 320,
			evalScripts:true,
			onContentLoaded: function(win){
				win.fitToContent();
			}.bind(this)
		};
		window.addEvent('fabrik.form.submitted', function(form, json){
			//Fabrik.Windows['chooseeventwin'].close();
			//this.addEvForm(json);
			this.ajax.updateEvents.send();
			Fabrik.Windows['addeventwin'].close();
		}.bind(this));
	},
/*
 * @TODO should all be handled via window.fireEvent/addEvent
 
	addListenTo: function(blockId){
		this.listenTo.push(blockId);
	},
	
	receiveMessage: function(senderBlock, task, taskStatus, json ){
		if(this.listenTo.indexOf(senderBlock) != -1 ){
			if(task == 'updateRows'){
				var formId = senderBlock.replace("form_", "");
				this.removeFormEvents(formId);
				this.ajax.updateEvents.send();
				Fabrik.Windows['addeventwin'].close();
				this.showMessage('Event added');
			}
			if(task == 'addEvForm'){
				Fabrik.Windows['chooseeventwin'].close();
				this.addEvForm(json);
			}
		}		
		this.showView();
	},
	*/
	removeFormEvents: function(formId){
		this.entries.each(function(entry, k){
			if(typeof(entry) != 'undefined' && entry.formid == formId) {
				this.entries.dispose(k);
			}
		}.bind(this));
		/*for(var j=this.entries.length-1;j>=0;j--) {
			// $$$ hugh - UNTESTED defensive coding as per:
			// http://fabrikar.com/forums/showthread.php?t=8263
			// ... although should probably work out why this.entries[j] is sometimes undefined in the first place
			if(typeof this.entries[j] != 'undefined' && this.entries[j].formid == formId){
				this.entries.dispose(this.entries[j]);
			}
		}*/
	},
	
	_makeEventRelDiv: function(entry, opts, aDate)
	{
		var label = entry.label;
		opts.left == opts.left ? opts.left : 0;
		opts['margin-left'] == opts['margin-left'] ? opts['margin-left'] : 0;
		opts.height = opts.height ? opts.height : 1;
		var bg = (entry.colour != '') ? entry.colour : this.options.entryColor;

		if (opts.startMin == 0) {
			opts.startMin = opts.startMin + '0';
		}
		if (opts.endMin == 0) {
			opts.endMin = opts.endMin + '0';
		}
		
		var v = opts.view ? opts.view : 'dayView';
		
		var style = {
				'background-color':this._getColor(bg, aDate),
				'width':opts.width,
				'cursor':'pointer',
				'margin-left':opts['margin-left'],
				'height':opts.height+'px',
				'top': opts.top+'px',
				'left': opts.left +'px',
				'position':'absolute',
				'border':'1px solid #666666',
				'overflow':'auto',
				'opacity':0.6
			};
			
			var id = 'fabrikEvent_' + entry._listid + '_' + entry.id; 
		var eventCont = new Element('div', {
			'class':'fabrikEvent',
			'id': id,
			'styles':style
		});
		eventCont.addEvent('mouseenter', this.doPopupEvent.bindWithEvent(this, [entry, label]));		
		
		if(entry.link != ''){
			var x = new Element('a', {'href':entry.link, 'class':'fabrikEditEvent','events':{
				'click':function(e) {
						e = new Event(e).stop();
						var o = {};
						var i = $(e.target).findClassUp('fabrikEvent').id.replace('fabrikEvent_', '').split('_');
						o.rowid = i[1];
						o.listid = i[0];
						this.addEvForm(o);					
				}.bind(this)
			}}).appendText(label);
		}else{
			var x = new Element('span').appendText(label);
		}
		eventCont.adopt(x);
		return eventCont;
	},
	
	doPopupEvent: function(e, entry, label){
		var event = new Event(e);
		var oldactive = this.activeHoverEvent;
		this.activeHoverEvent = $(event.target).findClassUp('fabrikEvent');
		if(entry._canDelete == 0){
			this.popWin.getElement('.popupDelete').setStyle('display', 'none');
		}else{
			this.popWin.getElement('.popupDelete').setStyle('display', '');
		}
		if(entry._canEdit == 0){
			this.popWin.getElement('.popupEdit').setStyle('display', 'none');
			this.popWin.getElement('.popupView').setStyle('display', '');
		}else{
			this.popWin.getElement('.popupEdit').setStyle('display', '');
			this.popWin.getElement('.popupView').setStyle('display', 'none');
		}
		
		var loc = this.activeHoverEvent.getCoordinates();
		
		// Barbara : added label in pop-up 
		var popLabelElt = this.popup.getElement('div[class=popLabel]');
		popLabelElt.empty();
		
		popLabelElt.appendText(label);
		this.activeDay = $(event.target).getParent();
		var newtop = loc.top - this.popWin.getSize().y;
		var fxopts = {
		    'opacity':[0, 1],
		    'top':[loc.top + 50, loc.top - 10]
		};
		this.inFadeOut = false;
		this.popWin.setStyles({'left':loc.left + 20,'top':loc.top});
		this.fx.showEventActions.cancel().set({'opacity':0}).start.delay(500, this.fx.showEventActions, fxopts);
	},
	
	_getFirstDayInMonthCalendar: function(firstDate)
	{
		var origDate = new Date();
		origDate.setTime(firstDate.valueOf());
		if(firstDate.getDay() != this.options.first_week_day){
			var backwardsDaysDelta = firstDate.getDay() - this.options.first_week_day;
			if (backwardsDaysDelta < 0) {
				backwardsDaysDelta = 7 + backwardsDaysDelta;
			}
			//first day of week
			firstDate.setTime(firstDate.valueOf() - (backwardsDaysDelta * 24 * 60 * 60 * 1000));
		}
		if(origDate.getMonth() == firstDate.getMonth()){
			var weekLength = 7 * 24 * 60 * 60 * 1000;
			//go back a day at a time till we get to the first week of this month view
			//while(firstDate.getUTCDate() > 1){
			while(firstDate.getDate() > 1){			
				firstDate.setTime(firstDate.valueOf() - this.DAY);
			}
		}
		return firstDate;
	},
	
	showMonth: function(){
		//set the date to the first day of the month
		var firstDate = new Date();
		firstDate.setTime(this.date.valueOf());
		firstDate.setDate(1);
		var firstDate = this._getFirstDayInMonthCalendar(firstDate);
		var trs = this.el.getElements('.monthView tr');
		var c = 0; // counter
		for(i=1;i<trs.length;i++){
			var tds = trs[i].getElements('td');
			var colcounter = 0;
			tds.each(function(td){
				td.setProperties({'class':''});
				td.addClass(firstDate.getTime());
				
				//no need to unset as this is done in setProperties above
				if(firstDate.getMonth() != this.date.getMonth()){
					td.addClass('otherMonth');
				}
				
				if(this.selectedDate.isSameDay(firstDate)){ 
					td.addClass('selectedDay');
				}
				td.empty();
				// Barbara : added greyscaled week-ends color option
				td.adopt(
					new Element('div', {'class':'date','styles':{'background-color':this._getColor('#E8EEF7', firstDate)}}).appendText(firstDate.getDate())
				);
				
				var j = 0;
				this.entries.each(function(entry){
					// between (end date present) or same (no end date)
					if((entry.enddate != '' && firstDate.isDateBetween(entry.startdate, entry.enddate)) 
					|| (entry.enddate == '' && entry.startdate.isSameDay(firstDate))) {
						var existingEvents = td.getElements('.fabrikEvent').length;
						var height = 20;
						var top = (td.getSize().y * (i-1)) + this.el.getElement('.monthView .dayHeading').getSize().y + td.getElement('.date').getSize().y;
						this.colwidth['.monthView'] = this.colwidth['.monthView'] ? this.colwidth['.monthView'] : td.getSize().x;
						var width = td.getSize().x;
						
						var width = this.colwidth['.monthView'];
						
						top = top + (existingEvents * height);
						var left = width * colcounter;
						var opts = {'width':width, 'height':height, 'view':'monthView'};
						opts.top = top;
						if(window.ie){
							opts.left = left;							
						}
					opts.startHour = entry.startdate.getHours();
					opts.endHour = entry.enddate.getHours();
					opts.startMin = entry.startdate.getMinutes();
					opts.endMin = entry.enddate.getMinutes();
					opts['margin-left'] = 0;
						td.adopt(this._makeEventRelDiv(entry, opts, firstDate));
					}
					j ++;
				}.bind(this));
				firstDate.setTime(firstDate.getTime() + this.DAY);
				colcounter ++;
			}.bind(this));
		}
		
		//watch the mouse to see if it leaves the activeArea - if it does hide the event popup
		document.addEvent('mousemove', function(e){
			var el = $(e.target);
			var event = new Event(e);
			var x = event.client.x;
			var y = event.client.y;
			var z = this.activeArea;
			if(typeOf(z) !== 'null' && typeOf(this.activeDay) !== 'null'){
				if((x <= z.left || x >= z.right) || (y <= z.top || y >= z.bottom)){
					//var loc = $('popWin').getCoordinates();
					if(!this.inFadeOut){
						var loc = this.activeHoverEvent.getCoordinates();
								var fxopts = {
						    'opacity':[1, 0],
						    'top':[loc.top - 10, loc.top + 50]
						};
						this.fx.showEventActions.cancel().start.delay(500, this.fx.showEventActions, fxopts);
					}
					this.activeDay = null;
				}
			}
		}.bind(this));
		
		this.entries.each(function(entry){
			var item = this.el.getElement('.fabrikEvent_' + entry._listid + '_' + entry.id);
			if(item){
				//this.makeDragMonthEntry(item);
			}
		}.bind(this));
		this._highLightToday();
		this.el.getElement('.monthDisplay').innerHTML = this.options.months[this.date.getMonth()] + " " + this.date.getFullYear();
	},
	
	_makePopUpWin: function(){
		if(typeOf(this.popup) == 'null'){
			//var popLabel = new Element('div', {'id' : 'popLabel'});
			var popLabel = new Element('div', {'class' : 'popLabel'});
			var del = new Element('div', {'class' : 'popupDelete'}).adopt(
			new Element('a',{
				'href':'#',
				'events':{
					'mouseenter': function(){
						//@todo
					},
					'mouseleave':  function(){
						//@too
					},
					'click':function(e){
						e.stop();
						this.deleteEntry(e);
					}.bind(this)
				}}).adopt(
				new Element('img', {
					'src':Fabrik.liveSite + 'plugins/fabrik_visualization/calendar/views/calendar/tmpl/' + this.options.tmpl + '/images/del.png', 'alt':'del',
				'class':'fabrikDeleteEvent'
				})).appendText(Joomla.JText._('PLG_VISUALIZATION_CALENDAR_DELETE'))
			);
			
			var edit = new Element('div').adopt(
				new Element('a', {
					'href':'#',
					'events':{
					'mouseenter': function(){
						//@todo
					},
					'mouseleave':  function(){
						//@too
					},
					'click':function(e){
						//@todo
						this.editEntry(e);
					}.bind(this)
					}
				}).adopt([
				new Element('span', {'class':'popupEdit'}).adopt(
				new Element('img', {
				'src':Fabrik.liveSite + 'plugins/fabrik_visualization/calendar/views/calendar/tmpl/' + this.options.tmpl + '/images/edit.png',
				'alt':Joomla.JText._('PLG_VISUALIZATION_CALENDAR_EDIT'),
				'class':'fabrikEditEvent'
				})).appendText(Joomla.JText._('PLG_VISUALIZATION_CALENDAR_EDIT')),
				new Element('span', {'class':'popupView'}).adopt(
				new Element('img', {
				'src':Fabrik.liveSite + 'media/com_fabrik/images/view.png',
				'alt':Joomla.JText._('PLG_VISUALIZATION_CALENDAR_VIEW'),
				'class':'fabrikViewEvent'
				})).appendText(Joomla.JText._('PLG_VISUALIZATION_CALENDAR_VIEW'))			
				])
			);
			del.addEvent('mousewithin', function(){
				//@todo
			});
			this.popup = new Element('div', {'class':'popWin', 'styles':{ 'position':'absolute'}}).adopt([popLabel,del,edit]);
			this.popup.inject(document.body);
			/********** FX EVETNT *************/
			this.activeArea = null;
			this.fx.showEventActions = new Fx.Morph(this.popup, {
				duration: 500, transition: Fx.Transitions.Quad.easeInOut,
				'onCancel':function(){
					
				}.bind(this),
				'onComplete':function(e){
					if(this.activeHoverEvent){
						var x = this.popup.getCoordinates();
						var y = this.activeHoverEvent.getCoordinates();
						var scrolltop = window.getScrollTop();
						var z = {};
						z.left = (x.left < y.left) ? x.left : y.left;
						z.top = (x.top < y.top) ? x.top : y.top;
						z.top = z.top - scrolltop;
						z.right = (x.right > y.right) ? x.right : y.right;
						z.bottom = (x.bottom > y.bottom) ? x.bottom : y.bottom;
						z.bottom = z.bottom - scrolltop;
						this.activeArea = z;
						this.inFadeOut  = false; 
					}
				}.bind(this)}
			);
		}
		return this.popup;
	},
	
	makeDragMonthEntry: function(item){
		//@TODO need to implement this correctly for 2.0RC1
		return;
		var drops = this.el.getElements('.monthView .day');
		var highLightColor = this.options.colors.highlight;
		var todayColor = this.options.colors.today;
		var bgColor = this.options.colors.bg;
		var visid = this.options.calendarId;
		var dropFx = drops.effect('background-color', {wait: false}); 
		item.addEvent('mousedown', function(e) {
			e = new Event(e).stop();
			var clone = this.clone()
			.setStyles(this.getCoordinates()) // this returns an object with left/top/bottom/right, so its perfect
			.setStyles({'opacity': 0.7, 'position': 'absolute'})
			.addEvent('emptydrop', function() {
				drops.removeEvents();
				this.dispose();
			}).inject(document.body);
 				
			drops.addEvents({
			'drop': function(dragEl) {
				drops.removeEvents(); 
				
				item.inject(this);
				item.setStyles({'opacity': 1, 'position': ''});
				if(clone.parentNode){
					clone.dispose();
				}
				this.setStyle('background-color', highLightColor);
				var newDate = this.className.replace("day ", "").replace(" otherMonth", "").toInt();
				var i = dragEl.id.replace('fabrikEvent_', '').split('_')[1];
				var d = new Date(newDate);
				var m = d.getMonth() + 1;
				dd = d.getFullYear() + '-' + m + '-' + d.getDate()  + ' ' + d.getHours() +':'+d.getMinutes() + ':' + d.getSeconds();
				var url = 'index.php?option=com_fabrik&format=raw&view=visualization&visualizationid=' + visid + '&plugintask=updateevent&id='+i;
				new Request({url:url, 'data':{
					'start_date':dd
				}}).send();
			},
			'over': function() {
				this.setStyle('background-color', highLightColor);
			},
			'leave': function() {
				this.set('morph', {duration: 500, transition: Fx.Transitions.Sine.easeInOut});
				var toCol= (this.hasClass('today')) ? todayColor : bgColor;
				this.morph({'background-color': [highLightColor, toCol]});
			}
			});
			var drag = clone.makeDraggable({
				droppables: $('monthView').getElements('.day')
			}); // this returns the dragged element
	 
			drag.start(e); // start the event manual
		});
	},

	showWeek: function()
	{
		var wday = this.date.getDay();
		// Barbara : offset
		wday = wday - this.options.first_week_day.toInt();
		
		var firstDate = new Date();
		firstDate.setTime(this.date.getTime() - (wday * this.DAY));
		
		var counterDate = new Date();
		counterDate.setTime(this.date.getTime() - (wday * this.DAY));
		
		var lastDate = new Date();
		lastDate.setTime(this.date.getTime()  +  ((6 - wday) * this.DAY));
		
		this.el.getElement('.monthDisplay').innerHTML = (firstDate.getDate()) + "  " + this.options.months[firstDate.getMonth()] + " " + firstDate.getFullYear()+ " - ";	
		this.el.getElement('.monthDisplay').innerHTML += (lastDate.getDate()) + "  " + this.options.months[lastDate.getMonth()] + " " + lastDate.getFullYear();
		
		var trs = this.el.getElements('.weekView tr');
		//put dates in top row
		var ths = trs[0].getElements('th');
		for(i=1;i<trs.length;i++){//clear out old data
			firstDate.setHours(i-1, 0, 0);
			if(i != 1){
				firstDate.setTime(firstDate.getTime() -  (6 * this.DAY));
			}
			var tds = trs[i].getElements('td');
			for(j=1;j<tds.length;j++){
				if(j != 1){
					firstDate.setTime(firstDate.getTime() + this.DAY);
				}
				var td = tds[j];
				td.empty();
				td.className = '';
				td.addClass('day');
				td.addClass(firstDate.getTime() - this.HOUR);
				if(this.selectedDate.isSameWeek(firstDate) && this.selectedDate.isSameDay(firstDate)){
					td.addClass('selectedDay');
				}else{
					td.removeClass('selectedDay');
				}
			}
		}
		
		var counterDate = new Date();
		counterDate.setTime(this.date.getTime() - (wday * this.DAY));
		for(i=0;i<ths.length;i++){
			ths[i].className = 'dayHeading';
			ths[i].addClass(counterDate.getTime());
			ths[i].innerHTML = this.options.shortDays[counterDate.getDay()] + ' ' + counterDate.getDate() + '/' + this.options.shortMonths[counterDate.getMonth()];
		
			//check events
			var j = 0;
			this.entries.each(function(entry){
				// between (end date present) or same (no end date)
				if((entry.enddate != '' && counterDate.isDateBetween(entry.startdate, entry.enddate)) 
				|| (entry.enddate == '' && entry.startdate.isSameDay(counterDate))) {
					var opts = this._buildEventOpts({entry:entry, curdate:counterDate, divclass:'.weekView', 'tdOffset':i});
					td.adopt(this._makeEventRelDiv(entry, opts));
					j ++;
				}
			}.bind(this));
			counterDate.setTime(counterDate.getTime() + this.DAY);			
		}
	},

	_buildEventOpts:function(opts)
	{
		var counterDate = opts.curdate;
		var entry = new CloneObject(opts.entry, true, ['enddate', 'startdate']);//for day view to avoid dups when scrolling through days //dont clone the date objs for ie
		var trs = this.el.getElements(opts.divclass+' tr');
		var hour = (entry.startdate.isSameDay(counterDate)) ? entry.startdate.getHours() : 0;
		var i = opts.tdOffset;
		
		entry.label = entry.label ? entry.label : '';
		var td = trs[hour+1].getElements('td')[i+1];
		var orighours = entry.startdate.getHours();
	
		var rowheight = td.getSize().y;
		//as we buildevent opts twice the sencod parse in IE gives a dif witdth! so store once and always use that value
		this.colwidth[opts.divclass] = this.colwidth[opts.divclass] ? this.colwidth[opts.divclass] : td.getSize().x;
		var top = this.el.getElement(opts.divclass).getElement('tr').getSize().y;
		
		colwidth = this.colwidth[opts.divclass];
		
		var left = (colwidth * i);
  	left += this.el.getElement(opts.divclass).getElement('td').getSize().x;
		var duration = Math.ceil( entry.enddate.getHours() - entry.startdate.getHours());
		if(duration === 0){ duration = 1;}
		
		if (entry.startdate.getDay() !== entry.enddate.getDay()) {
			duration = 24;
			if (entry.startdate.isSameDay(counterDate)) {
				duration = 24 - entry.startdate.getHours();
			}else{
				entry.startdate.setHours(0);
				if (entry.enddate.isSameDay(counterDate)) {
					duration = entry.enddate.getHours();
				}
			}
		}

		top = top + (rowheight * hour);
		var height = (rowheight * duration);
		
		if (entry.enddate.isSameDay(counterDate)) {
			 height += (entry.enddate.getMinutes() / 60 * rowheight);
		}
		if (entry.startdate.isSameDay(counterDate)){
			top += (entry.startdate.getMinutes()/60 * rowheight);
			height -= (entry.startdate.getMinutes() / 60 * rowheight);
		} 
		
		var existing = td.getElements('.fabrikEvent');
		var width = colwidth / (existing.length + 1);
		var marginleft = width * existing.length;
		existing.setStyle('width', width + 'px');
		var v = opts.divclass.substr(1, opts.divclass.length);
		width -= td.getStyle('border-left-width').toInt() + td.getStyle('border-right-width').toInt(); 
		var opts = {'margin-left':marginleft+'px', 'width':width+'px', 'height':height, 'view':'weekView', 'background-color': this._getColor(this.options.colors.headingBg)};
		
		opts.left = left;
		opts.top = top;
		opts.color = this._getColor(this.options.colors.headingColor, entry.startdate);
		opts.startHour = entry.startdate.getHours();
		opts.endHour = opts.startHour + duration;
		opts.startMin = entry.startdate.getMinutes();
		opts.endMin = entry.enddate.getMinutes();
		entry.startdate.setHours(orighours);
		return opts;
	},
	
	
	showDay: function(){
		var startmin;
		var firstDate = new Date();
		firstDate.setTime(this.date.valueOf());
		firstDate.setHours(0, 0);
		var trs = this.el.getElements('.dayView tr');
		//put date in top row
		trs[0].childNodes[1].innerHTML = this.options.days[this.date.getDay()];
		//clear out old data
		for(var i=1;i<trs.length;i++){
			firstDate.setHours(i-1, 0);
			var td = trs[i].getElements('td')[1];
			if (typeOf(td) !== 'null') {
				td.empty();
				td.className = '';
				td.addClass('day');
				td.addClass(firstDate.getTime() - this.HOUR);
			}
		}

		//check events
		this.entries.each(function(entry){
			// between (end date present) or same (no end date)
			if((entry.enddate != '' && this.date.isDateBetween(entry.startdate, entry.enddate)) 
				|| (entry.enddate == '' && entry.startdate.isSameDay(firstDate))) {
				var opts = this._buildEventOpts({entry:entry, curdate:this.date, divclass:'.dayView', 'tdOffset':0});
				td.adopt(this._makeEventRelDiv(entry,opts));
			}
		}.bind(this));
		this.el.getElement('.monthDisplay').innerHTML = (this.date.getDate()) + "  " + this.options.months[this.date.getMonth()] + " " + this.date.getFullYear();
	},
	
	renderMonthView: function(){
		this.popWin.setStyle('opacity',0);
		var firstDate = this._getFirstDayInMonthCalendar(new Date());
		
		// Barbara : reorganize days labels according to first day of week
		var days_labels = this.options.days.slice(this.options.first_week_day).concat(this.options.days.slice(0,this.options.first_week_day));
		
		// Barbara : set a tmpDate that has the same shift regarding the beginning of the week
		var tmpDate = new Date();
		tmpDate.setTime(firstDate.valueOf());
		if(firstDate.getDay() != this.options.first_week_day){
			var backwardsDaysDelta = firstDate.getDay() - this.options.first_week_day;
			//first day of week
			tmpDate.setTime(firstDate.valueOf() - (backwardsDaysDelta * 24 * 60 * 60 * 1000));
		}
		
		
		this.options.viewType = 'monthView';
		if(!this.mothView){
			tbody = new Element('tbody', {'class':'viewContainerTBody'});
			var tr = new Element('tr');
			// Barbara : added greyscaled week-ends color option
			for(d=0;d<7;d++){
				tr.adopt(new Element('th', {'class':'dayHeading',
				'styles':{
				'width':'80px','height':'20px','text-align':'center',	'color':this._getColor(this.options.colors.headingColor, tmpDate),'background-color':this._getColor(this.options.colors.headingBg, tmpDate)
				}
				}).appendText(days_labels[d]));
				// Barbara : added use of tmpDate
				tmpDate.setTime(tmpDate.getTime() + this.DAY);
			}
			tbody.appendChild(tr);
			
			var highLightColor = this.options.colors.highlight;
			var bgColor = this.options.colors.bg;
			var todayColor = this.options.colors.today;
			// Barbara : 6 lines are needed in some cases, when a month starts the day before the week first day.
			for(var i=0;i<6;i++){
				var tr = new Element('tr');
				var parent = this;
				for(d=0;d<7;d++){
				
					//'display': 'table-cell', doesnt work in IE7
					var bgCol = this.options.colors.bg;
					var extraClass = (this.selectedDate.isSameDay(firstDate)) ? 'selectedDay' : '';
					tr.adopt(new Element('td', {'class':'day ' + (firstDate.getTime()) + extraClass,
					'styles':{
						'width':this.options.monthday.width + 'px',
						'height':this.options.monthday.height + 'px',
						'background-color':bgCol,
						'vertical-align':'top',
						'padding':0,
						'border':'1px solid #cccccc'
					},
					
					'events':{
						'mouseenter':function(){
							this.setStyles({'background-color':highLightColor});
						},
						'mouseleave':function(){
							this.set('morph', {duration: 500, transition: Fx.Transitions.Sine.easeInOut});
							var toCol = (this.hasClass('today')) ? todayColor : bgColor;
							this.morph({'background-color': [highLightColor, toCol]});
						},
						'click':function(e){
							parent.selectedDate.setTime(this.className.split(" ")[1]);
							parent.date.setTime(parent._getTimeFromClassName(this.className));
							parent.el.getElements('td').each(function(td){
								td.removeClass('selectedDay');
								if(td != this){
									td.setStyles({'background-color':'#F7F7F7'});
								}
							}.bind(this));
							this.addClass('selectedDay');
						},
						'dblclick':function(e){
								this.openAddEvent(e);
						}.bind(this)
					}
					}));
					firstDate.setTime(firstDate.getTime() + this.DAY);
				}
				tbody.appendChild(tr);
			}
			this.mothView = new Element('div', {'class':'monthView', 'styles': {
	  	'position': 'relative'
	  }}).adopt(
			new Element('table', {
			'styles':{'border-collapse':'collapse'}
			}).adopt(
				tbody
			)
			);
			this.el.getElement('.viewContainer').appendChild(this.mothView);
		}
		this.showView('monthView');
	},
	
	_getTimeFromClassName: function(n){
		return n.replace("today", "").replace("selectedDay", "").replace("day", "").replace("otherMonth", "").trim();
	},
	
	openAddEvent: function(event)
	{
		if (this.options.canAdd == 0){
			return;
		}
		e = new Event(event);
		e.stop();
		if(e.target.className == 'addEventButton'){
			var now = new Date();
			var rawd = now.getTime();
		}else{
			var rawd = this._getTimeFromClassName(e.target.className);
		}
		this.date.setTime(rawd);
		d = 0;
		if(!isNaN(rawd) && rawd != '') {
			var thisDay = new Date();
			thisDay.setTime(rawd);
			var m = thisDay.getMonth()+1;
			m = (m < 10 )? "0" + m : m;
			var day = thisDay.getDate();
			day = (day <  10 )? "0" + day : day;
			var hour = thisDay.getHours();
			hour = (hour <  10 )? "0" + hour : hour;
			var min = thisDay.getMinutes();
			min = (min <  10 )? "0" + min : min;
			this.doubleclickdate = thisDay.getFullYear() + "-" + m + "-" + day + ' ' + hour +':'+min+':00';
			d = '&jos_fabrik_calendar_events___start_date=' + this.doubleclickdate;
		}
		
		if(this.options.eventLists.length > 1){
			this.openChooseEventTypeForm(this.doubleclickdate, rawd);
		}else{
			var o = {};
			o.rowid = 0;
			//if(onlyOneCustomTable){
				o.id = '';
				d = '&'+this.options.eventLists[0].startdate_element + '=' + this.doubleclickdate;
				o.listid = this.options.eventLists[0].value;
			//}else{
			//	o.id = this.options.formid;
			//	o.listid = this.options.listid;
			//}
			o.d = d;
			this.addEvForm(o);
		}
	},
	
	openChooseEventTypeForm: function(d, rawd)
	{
	//rowid is the record to load if editing 
		var url = 'index.php?option=com_fabrik&tmpl=component&view=visualization&controller=visualization.calendar&task=chooseaddevent&id=' + this.options.calendarId + '&d=' + d + '&rawd=' + rawd;
		this.windowopts.contentURL = url;
		this.windowopts.id = 'chooseeventwin';
		this.windowopts.onContentLoaded = function()
		{
			var myfx = new Fx.Scroll(window).toElement('chooseeventwin');
		};
		//this.windowopts.type = 'modal';
		Fabrik.getWindow(this.windowopts);
	},
	
	addEvForm: function(o)
	{
		var url = 'index.php?option=com_fabrik&controller=visualization.calendar&view=visualization&task=addEvForm&format=raw&Itemid='+this.options.Itemid+'&listid='+o.listid+'&rowid='+o.rowid;
		url += '&jos_fabrik_calendar_events___visualization_id=' + this.options.calendarId;
		url += '&visualizationid='+this.options.calendarId;
		if (typeof(this.doubleclickdate) != 'undefined') {
			url += '&start_date=' + this.doubleclickdate;
		}
				
		this.windowopts.type = 'window';
		this.windowopts.contentURL = url;
		this.windowopts.id = 'addeventwin';
		var f = this.options.filters;
		this.windowopts.onContentLoaded = function(win)
		{
			var myfx = new Fx.Scroll(window).toElement('addeventwin');
			f.each(function(o){
				if($(o.key)){
					switch($(o.key).get('tag')){
					 case 'select':
					 	$(o.key).selectedIndex = o.val;
					 	break;
					 case 'input':
						 $(o.key).value = o.val;
						 break;
					}
				}
			});
			win.fitToContent();
		}.bind(this);
		Fabrik.getWindow(this.windowopts);
	},
	
	_highLightToday: function(){
		var today = new Date();
		this.el.getElements('.viewContainerTBody td').each(
			function(td){
				var newDate = new Date(this._getTimeFromClassName(td.className).toInt());
				if(today.equalsTo(newDate)){
					 td.addClass('today');
				}else{
					td.removeClass('today');
				}
			}.bind(this)
		);
	},
	
	centerOnToday: function(){
		this.date = new Date();
		this.showView();
	},

	renderDayView: function(){
		this.popWin.setStyle('opacity',0);
		this.options.viewType = 'dayView';
		
		if(!this.dayView){
			tbody = new Element('tbody');
			var tr = new Element('tr');
			for(d=0;d<2;d++){
				if(d == 0){
					tr.adopt(new Element('td', {'class':'day'}));
				}else{
					tr.adopt(new Element('th', {'class':'dayHeading',
					'styles':{
					'width':'80px','height':'20px','text-align':'center',	'color':this.options.headingColor,'background-color':this.options.colors.headingBg
					}
					}).appendText(this.options.days[this.date.getDay()]));	
				}
			}
			tbody.appendChild(tr);
			
			for(var i=0;i<24;i++){
				var tr = new Element('tr');
				for(d=0;d<2;d++){
					if(d == 0){
						var hour = (i.length == 1)? i + '0:00' : i + ':00';
						tr.adopt(new Element('td', {'class':'day'}).appendText(hour));
					}else{
						//'display': 'table-cell',
						tr.adopt(new Element('td', {'class':'day',
						'styles':{
						'width':'100%',
						'height':'10px',
						'background-color':'#F7F7F7',
						'vertical-align':'top',
						'padding':0,
						'border':'1px solid #cccccc'
						},
						'events':{
							'mouseenter':function(e){
								this.setStyles({
									'background-color':'#FFFFDF'	
								});
							},
							'mouseleave':function(e){
								this.setStyles({
									'background-color':'#F7F7F7'	
								});
							},
						'dblclick':function(e){
									this.openAddEvent(e);
						}.bind(this)
						}
						}));
					}
				}
				tbody.appendChild(tr);
			}
			this.dayView = new Element('div', {
	  	'class': 'dayView',
	  	'styles': {
	  		'position': 'relative'
	  	}
	  }).adopt(
			new Element('table', {'class':'',
			'styles':{'border-collapse':'collapse'}
			}).adopt(
				tbody
			)
			);
			
			this.el.getElement('.viewContainer').appendChild(this.dayView);
		}
		this.showDay();
		this.showView('dayView');
	},
	
	showView: function (view){
		if(this.el.getElement('.dayView')){this.el.getElement('.dayView').style.display = 'none';}
		if(this.el.getElement('.weekView')){this.el.getElement('.weekView').style.display = 'none';}
		if(this.el.getElement('.monthView')){this.el.getElement('.monthView').style.display = 'none';}
		
		this.el.getElement('.'+this.options.viewType).style.display = 'block';
		switch(this.options.viewType){
			case 'dayView':
				this.showDay();
				break;
			case 'weekView':
				this.showWeek();
				break;
			default:
			case 'monthView':
				this.showMonth();
				break;
		}
		Cookie.write("fabrik.viz.calendar.view", this.options.viewType);
	},
	
	renderWeekView: function(){
		this.popWin.setStyle('opacity',0);
		this.options.viewType = 'weekView';
		if(!this.weekView){
			
			var tbody = new Element('tbody');
			var tr = new Element('tr');
			for(d=0;d<8;d++){
				if(d == 0){
					tr.adopt(new Element('td', {'class':'day'}));
				}else{
					tr.adopt(new Element('th', {'class':'dayHeading',
					'styles':{
					'width':'80px','height':'20px','text-align':'center',	'color':this.options.headingColor,'background-color':this.options.colors.headingBg
					},
					'events':{
						'click':function(e){
							e = new Event(e).stop();
							this.selectedDate.setTime($(e.target).className.replace('dayHeading ', '').toInt());
							var tmpdate = new Date();
							$(e.target).getParent().getParent().getElements('td').each(function(td){
							 	var t = td.className.replace('day ', '').replace(' selectedDay').toInt();
								tmpdate.setTime(t);
								if(tmpdate.getDayOfYear() == this.selectedDate.getDayOfYear()){
									td.addClass('selectedDay');
								}else{
									td.removeClass('selectedDay');
								}
							}.bind(this));
							
						}.bind(this)
					}
					}).appendText(this.options.days[d-1]));	
				}
			}
			tbody.appendChild(tr);
			
			for(var i=0;i<24;i++){
				var tr = new Element('tr');
				for(d=0;d<8;d++){
					if(d == 0){
						var hour = (i.length == 1)? i + '0:00' : i + ':00';
						tr.adopt(new Element('td', {'class':'day'}).appendText(hour));
					}else{
						//'display': 'table-cell',
						tr.adopt(new Element('td', {'class':'day',
						'styles':{
						'width':'90px',
						'height':'10px',
						'background-color':'#F7F7F7',
						
						'vertical-align':'top',
						'padding':0,
						'border':'1px solid #cccccc'
						},
						'events':{
							'mouseenter':function(e){
								if(!this.hasClass('selectedDay')){
								this.setStyles({
									'background-color':'#FFFFDF'	
								});
								}
							},
							'mouseleave':function(e){
								if(!this.hasClass('selectedDay')){
									this.setStyles({
										'background-color':'#F7F7F7'	
									});
								}
							},
						'dblclick':function(e){
								this.openAddEvent(e);
						}.bind(this)	
						}
						}));
					}
				}
				tbody.appendChild(tr);
			}
			this.weekView = new Element('div', {'class':'weekView', 'styles': {
	  	'position': 'relative'
	  }}).adopt(
			new Element('table', {
			'styles':{'border-collapse':'collapse'}
			}).adopt(
				tbody
			)
			);
			
			this.el.getElement('.viewContainer').appendChild(this.weekView);
		}
		this.showWeek();
		this.showView('weekView');
	},
	
	render: function(options){
		this.setOptions(options);
		this.windowopts.title = Joomla.JText._('PLG_VISUALIZATION_CALENDAR_ADD_EDIT_EVENT');
		this.windowopts.y = this.options.popwiny;
		this.popWin = this._makePopUpWin();
		var d =this.options.urlfilters;
		d.visualizationid = this.options.calendarId;
		
		this.ajax.updateEvents = new Request({url:this.options.url.add,
		'data':d,
		'evalScripts':true,
		'onComplete':function(r){
			var text = r.stripScripts(true);
			var json = JSON.decode(text);
			//this.entries = $H();
			this.addEntries(json);
		}.bind(this)
		});
		
		this.ajax.deleteEvent = new Request({url:this.options.url.del,
		'data':{'visualizationid':this.options.calendarId},
		'onComplete':function(r){
			r = r.stripScripts(true);
			var json = JSON.decode(r);
			this.entries = $H();
			this.addEntries(json);
		}.bind(this)
		});
	
		if(typeOf(this.el.getElement('.addEventButton')) !== 'null'){
			this.el.getElement('.addEventButton').addEvent('click', this.openAddEvent.bindWithEvent(this));
		}
		var bs = [];
		bs.push(new Element('li', {'class':'centerOnToday'}).appendText(Joomla.JText._('PLG_VISUALIZATION_CALENDAR_TODAY')));
		if(this.options.show_day != 0){
			bs.push(new Element('li', {'class':'dayViewLink'}).appendText(Joomla.JText._('PLG_VISUALIZATION_CALENDAR_DAY')));
		}
		if(this.options.show_week != 0){
			bs.push(new Element('li', {'class':'weekViewLink'}).appendText(Joomla.JText._('PLG_VISUALIZATION_CALENDAR_WEEK')));
		}
		bs.push(new Element('li', {'class':'monthViewLink'}).appendText(Joomla.JText._('PLG_VISUALIZATION_CALENDAR_MONTH')));
		
		var nav = new Element('div', {'class':'calendarNav'}).adopt( 
		new Element('input', {
			'class':'previousPage',
			'type':'button',
			'value':Joomla.JText._('PLG_VISUALIZATION_CALENDAR_PREVIOUS')
		}),
		new Element('input', {
			'class':'nextPage',
			'type':'button',
			'value':Joomla.JText._('PLG_VISUALIZATION_CALENDAR_NEXT')
		}),
		new Element('div', {
			'class':'monthDisplay'
		}),

		new Element('ul', {'class':'viewMode'}).adopt(bs));
		
		this.el.appendChild(nav);
		//position relative messes up the drag of events
		this.el.appendChild(new Element('div', {'class':'viewContainer', styles:{'background-color':'#EFEFEF','padding':'5px'}}));
		
		if ($type(Cookie.read('fabrik.viz.calendar.date')) !== false) {
			this.date = new Date(Cookie.read('fabrik.viz.calendar.date'));
		}
		var startview = typeOf(Cookie.read("fabrik.viz.calendar.view")) === 'null' ? this.options.viewType : Cookie.read("fabrik.viz.calendar.view");
		switch(startview){
			case 'dayView':
				this.renderDayView();
				break;
			case 'weekView':
				this.renderWeekView();
				break;
			default:
				case 'monthView':
				this.renderMonthView();
				break;
		}
		
		this.showView();
	
		this.el.getElement('.nextPage').addEvent('click',  this.nextPage.bindWithEvent(this));
		this.el.getElement('.previousPage').addEvent('click',  this.previousPage.bindWithEvent(this));
		if(this.options.show_day != 0){
			this.el.getElement('.dayViewLink').addEvent('click', this.renderDayView.bindWithEvent(this));
		}
		if(this.options.show_week != 0){
			this.el.getElement('.weekViewLink').addEvent('click', this.renderWeekView.bindWithEvent(this));
		}
		this.el.getElement('.monthViewLink').addEvent('click', this.renderMonthView.bindWithEvent(this));
		this.el.getElement('.centerOnToday').addEvent('click', this.centerOnToday.bindWithEvent(this));
		this.showMonth();
		this.watchFilters();
		//clear filter list
		
		this.ajax.updateEvents.send();
	},
	
	watchFilters:function(){
		var c = this.el.getElement('.clearFilters');
		if(c){
			c.addEvent('click', function(e){
				new Event(e).stop();
				c.findUp('form').getElements('.fabrik_filter').each(function(f){
					if(f.get('tag') == 'select'){
						f.selectedIndex = 0;
					}else{
						f.value = '';
					}
				});
				c.findUp('form').submit();
			}.bind(this));
		}
	},
	
	showMessage: function(m){
		this.el.getElement('.calendar-message').set('html',m);
		this.fx.showMsg.start({
		'opacity':[0, 1]
		}).chain(
			function(){
				this.start.delay(2000, this, {'opacity': [1,0]});
			}
		);
	},
	
	addEntry: function(key, o){
		//test if time was passed as well
		if(o.startdate){
			var d = o.startdate.split(' ');
			d = d[0];
			if(d.trim() == ""){
				return;
			}
			var time = o.startdate.split(' ');
			time = time[1];
			time = time.split(":");
			var d = d.split('-');
			var d2 = new Date();
			var m = (d[1]).toInt()-1;
			if(window.ie7){
				//setFullYear produced a stack overflow in ie7 go figure?
				d2.setYear(d[0]);
			}else{
				d2.setFullYear(d[0]);
			}
			d2.setMonth(m, d[2]);
			d2.setDate(d[2]);	
			d2.setHours(time[0].toInt());
			d2.setMinutes(time[1].toInt());
			d2.setSeconds(time[2].toInt());
			o.startdate = d2;
			this.entries.set(key, o);
			
			if(o.enddate) {
				var d = o.enddate.split(' ');
				d = d[0];
				if(d.trim() == ""){
					return;
				}
				if(d == '0000-00-00'){
					o.enddate = o.startdate;
					return;
				}
				var time = o.enddate.split(' ');
				time = time[1];
				time = time.split(":");
			
				var d = d.split('-');
				var d2 = new Date();
				var m = (d[1]).toInt()-1;
				if(window.ie7){
					//setFullYear produced a stack overflow in ie7 go figure?
					d2.setYear(d[0]);
				}else{
					d2.setFullYear(d[0]);
				}
				d2.setMonth(m, d[2]);
				d2.setDate(d[2]);
				d2.setHours(time[0].toInt());
				d2.setMinutes(time[1].toInt());
				d2.setSeconds(time[2].toInt());
				o.enddate = d2;
			}
		}

	},
	
	deleteEntry: function(e){
		if(confirm(Joomla.JText._('PLG_VISUALIZATION_CALENDAR_CONF_DELETE'))){
			var key = this.activeHoverEvent.id.replace('fabrikEvent_', '');
			var i = key.split('_');
			this.ajax.deleteEvent.options.data = {'id':i[1],'listid':i[0]};
			this.ajax.deleteEvent.send();
			//$(this.activeHoverEvent).effect('opacity', {duration: 500, transition: Fx.Transitions.linear}).start(1,0);
			document.id(this.activeHoverEvent).fade('out');
			this.fx.showEventActions.start({'opacity':[1, 0]});
			this.removeEntry(key);
			this.activeDay = null;
		}
	},
	
	editEntry: function(e)
	{
		var o = {};
		o.d = d;
		o.id = this.options.formid;
		var i = this.activeHoverEvent.id.replace('fabrikEvent_', '').split('_');
		o.rowid = i[1];
		o.listid = i[0];
		this.addEvForm(o);
	},
	
	addEntries: function(a){
		a = $H(a);
		a.each( function(obj, key){
			this.addEntry(key, obj);
		}.bind(this));
		this.showView();
	},
	
	removeEntry: function(eventId){
		this.entries.dispose(eventId);
		this.showView();
	},
	
	nextPage: function(){
		this.popWin.setStyle('opacity',0);
		switch(this.options.viewType){
			case 'dayView':
				this.date.setTime(this.date.getTime() + this.DAY);
				this.showDay();
				break;
			case 'weekView':
				this.date.setTime(this.date.getTime() + this.WEEK);
				this.showWeek();
				break;
			break;
			case 'monthView':
				this.date.setDate(1);
				this.date.setMonth(this.date.getMonth() + 1);
				this.showMonth();
				break;
		}
		Cookie.write('fabrik.viz.calendar.date', this.date);
	},
	
	previousPage: function(){
		this.popWin.setStyle('opacity',0);
		switch(this.options.viewType){
			case 'dayView':
				this.date.setTime(this.date.getTime() - this.DAY);
				this.showDay();
				break;
			case 'weekView':
				this.date.setTime(this.date.getTime() - this.WEEK);
				this.showWeek();
				break;
			break;
			case 'monthView':
				this.date.setMonth(this.date.getMonth() - 1);
				this.showMonth();
				break;
		}
	},
	
	addLegend: function(a){
		var ul = new Element('ul');
		a.each(function(l){
			var li = new Element('li');
			li.adopt(new Element('div', {'styles':
			{'background-color':l.colour}}),
			new Element('span').appendText(l.label)
			);
			ul.appendChild(li);
		}.bind(this));
		new Element('div', {'class':'legend'}).adopt([
		new Element('h3').appendText(Joomla.JText._('PLG_VISUALIZATION_CALENDAR_KEY')),
		ul
		]).inject(this.el, 'after');
	},
	
	/**
 * Barbara : commonly used RGB to greyscale formula.
 * Param : #RRGGBB string.
 * Returns : #RRGGBB string.
 */
    _getGreyscaleFromRgb: function(rgbHexa) {
        // convert to decimal
        var r = parseInt(rgbHexa.substring(1, 3), 16);
        var g = parseInt(rgbHexa.substring(3, 5), 16);
        var b = parseInt(rgbHexa.substring(5), 16);
        var greyVal = parseInt(0.3 * r + 0.59 * g + 0.11 * b, 10);
        return '#' + greyVal.toString(16) + greyVal.toString(16) + greyVal.toString(16);
    },

    /**
     * Barbara : returns greyscaled color of param color if :
     * - greyscaledweekend option is set
     * - and param date is not null (i.e. we are in month view) and corresponds to a Saturday or Sunday.
     * Params : #RRGGBB color string, optional date
     * Returns : #RRGGBB param or greyscale converted color string.
     */
    _getColor: function (aColor, aDate) {
        if(this.options.greyscaledweekend == 0) {
            return aColor;
        }
        var c = new Color(aColor);
        if(aDate != null && (aDate.getDay() == 0 || aDate.getDay() == 6)) {
            return this._getGreyscaleFromRgb(aColor);
        } else {
            return aColor;
        }
    }
	
});

// BEGIN: DATE OBJECT PATCHES

/** Adds the number of days array to the Date object. */
Date._MD = new Array(31,28,31,30,31,30,31,31,30,31,30,31);

/** Constants used for time computations */
/* milliseconds */
Date.SECOND = 1000;
Date.MINUTE = 60 * Date.SECOND;
Date.HOUR   = 60 * Date.MINUTE;
Date.DAY    = 24 * Date.HOUR;
Date.WEEK   =  7 * Date.DAY;

/** Returns the number of days in the current month */
Date.prototype.getMonthDays = function(month) {
	var year = this.getFullYear();
	if (typeof month == "undefined") {
		month = this.getMonth();
	}
	if (((0 == (year%4)) && ( (0 != (year%100)) || (0 == (year%400)))) && month == 1) {
		return 29;
	} else {
		return Date._MD[month];
	}
};

Date.prototype.isSameWeek = function(date) {
	return ((this.getFullYear() == date.getFullYear()) &&
		(this.getMonth() == date.getMonth()) &&
		(this.getWeekNumber() == date.getWeekNumber()));
};

Date.prototype.isSameDay = function(date) {
	return ((this.getFullYear() == date.getFullYear()) &&
		(this.getMonth() == date.getMonth()) &&
		(this.getDate() == date.getDate()));
};

Date.prototype.isSameHour = function(date) {
	return ((this.getFullYear() == date.getFullYear()) &&
		(this.getMonth() == date.getMonth()) &&
		(this.getDate() == date.getDate()) &&
		(this.getHours() == date.getHours()));
};

/* Barbara : checks that the date is between two dates (ignores time) */
Date.prototype.isDateBetween = function(startdate, enddate) {
	var strStartDate = startdate.getFullYear() * 10000 + (startdate.getMonth()+1) * 100 + startdate.getDate();
	var strEndDate = enddate.getFullYear() * 10000 + (enddate.getMonth()+1) * 100 + enddate.getDate();
	var strCurrentDate = this.getFullYear() * 10000 + (this.getMonth()+1) * 100 + this.getDate();
	return strStartDate <= strCurrentDate && strCurrentDate <= strEndDate;
};