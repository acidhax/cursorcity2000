var LongPress = function (options, progressCB, cb) {
	SimplEE.EventEmitter.call(this);
	var args = [].slice.call(arguments);
	if (args.length == 1) {
		if (typeof args[0] == "function") {
			options = {};
			cb = args[0];
		} else {
			cb = function(){};
		}
		progressCB = function(){};
	} else if (args.length == 2) {
		if (typeof args[0] == "function") {
			options = {};
			progressCB = args[0];
			cb = args[1];
		} else {
			options = args[0];
			progressCB = function(){};
			cb = args[1];
		}
	}
	options = options || {};
	this.tolerance = options.tolerance || 15;
	this.scrollTolerance = options.scrollTolerance || 10;
	this.timeout = options.timeout || 3000;
	this.animationFrameCount = 0;
	this.resetAnimationFrameCount = 2;
	this.classStringToIgnore = options.classStringToIgnore || 'NOBODYWILLEVERHAVETHISINTHEIRCLASSSTRINGS';
	this.classStringsToIgnore = options.classStringsToIgnore || [];
	this._el = $('html');

	this._startTime = null;

	this._originX = null;
	this._originY = null;
	this._originScrollTop = null;
	this._originScrollLeft = null;

	this._currentX = null;
	this._currentY = null;
	this._currentScrollTop = null;
	this._currentScrollLeft = null;

	this._requestId = null;

	this._mousemove = this.mousemove.bind(this);
	this._mouseup = this.mouseup.bind(this);
	this._click = this.click.bind(this);
	this._dragstart = this.dragstart.bind(this);
	this._scroll = this.scroll.bind(this);
	this._el.mousedown(this.mousedown.bind(this));
	this._mouseupcomplete = this.mouseupcomplete.bind(this);

	this._done = cb;
	this._progress = progressCB;

	this._calculateScrollbarWidth();
};
LongPress.prototype = Object.create(SimplEE.EventEmitter.prototype);
LongPress.prototype.mousedown = function(ev) {
	// Activate
	var self = this;
	if (ev.which == 1 && !ev.ctrlKey) {
		var target = $(ev.target);
		this.target = target;
		var windowWidth = $(window).width();
		var windowHeight = $(window).height();
		var pos = windowWidth - ev.clientX;
		var xpos = windowHeight - ev.clientY;
		hasClassStringInTarget = false;
		// This is an SVG fix.
		for (var i = 0; i < this.classStringsToIgnore.length && !hasClassStringInTarget; i++) {
			hasClassStringInTarget = target.prop('class').indexOf(this.classStringsToIgnore[i]) > -1;
		}
		if (!hasClassStringInTarget && typeof target.prop('class') == "string") {
			hasClassStringInTarget = target.prop('class').indexOf(this.classStringToIgnore) > -1;
		}
		var isSelectElement = target[0].tagName === 'SELECT';
		var isFlashElement = target[0].tagName === 'EMBED';
		var doIt = function () {
			self._originX = self._currentX = ev.clientX;
			self._originY = self._currentY = ev.clientY;
			self._originScrollTop = self._currentScrollTop = $(window).scrollTop();
			self._originScrollLeft = self._currentScrollLeft = $(window).scrollLeft();

			self._startTime = Date.now();

			self._el.mousemove(self._mousemove);
			self.target.mousemove(self._mousemove);
			self._el.mouseup(self._mouseup);
			self._el.on('click', self._click);
			self.target.mouseup(self._mouseup)
				.parent().mouseup(self._mouseup);

			self._el.on('dragstart', self._dragstart);
			$(window).on('scroll', self._scroll);

			self.registerNextFrame();
		}

		if (!isFlashElement && pos >= this.scrollbarWidth && xpos >= this.scrollbarWidth && hasClassStringInTarget === false && isSelectElement === false) {
			var scrollypollyolly = false;
			var isScrollableX = ev.target.scrollHeight > $(ev.target).outerHeight();
			var isScrollableY = ev.target.scrollWidth > $(ev.target).outerWidth();
			if (isScrollableX) {
				var one = $(ev.target).offset().left + $(ev.target).outerWidth() - this.scrollbarWidth;
				var two = $(ev.target).offset().left + $(ev.target).outerWidth();
				if (one <= ev.pageX && two >= ev.pageX) {
					scrollypollyolly = true;
				}
			}
			if (!scrollypollyolly && isScrollableY) {
				var three = $(ev.target).offset().top + $(ev.target).outerHeight() - this.scrollbarWidth;
				var four = $(ev.target).offset().top + $(ev.target).outerHeight();
				if (three <= ev.pageY && four >= ev.pageY) {
					scrollypollyolly = true;
				}
			}
			if (scrollypollyolly) {
				// console.log("On Scrollbar");
			} else {
				doIt();
			}
		}
	} else if (this._requestId && ev.which != 1) {
		// Not left click.
		this.cancel();
	}
};
LongPress.prototype.mousemove = function(ev) {
	// Measure.
	this._currentX = ev.clientX;
	this._currentY = ev.clientY;
};
LongPress.prototype.mouseup = function(ev) {
	// Deactivate
	this.cancel("mouseup");
};
LongPress.prototype.click = function(ev) {
	this.cancel("click");
};
LongPress.prototype.mouseupcomplete = function(ev) {
	window.getSelection().removeAllRanges(); // No text selected, yo.
	this._el.unbind('mouseup', this._mouseupcomplete);
	this.target.unbind('mouseup', this._mouseupcomplete)
		.parent().unbind('mouseup', this._mouseupcomplete);
};
LongPress.prototype.dragstart = function(ev) {
	this.cancel("dragstart");
};
LongPress.prototype.scroll = function(ev) {
	//this.cancel("dragstart");
	this._currentScrollTop = $(window).scrollTop();
	this._currentScrollLeft = $(window).scrollLeft();
};
LongPress.prototype.cancel = function(err) {
	this.animationFrameCount = 0;

	window.cancelAnimationFrame(this._requestId);
	this._el.unbind('mousemove', this._mousemove);
	this.target.unbind('mousemove', this._mousemove);
	this._el.unbind('mouseup', this._mouseup);
	this._el.unbind('dragstart', this._dragstart);
	this._el.unbind('click', this._click);
	this.target.unbind('mouseup', this._mouseup)
		.parent().unbind('mouseup', this._mouseup);
	$(window).unbind('scroll', this._scroll);
	this._done && this._done(err || "cancelled");
	this.emit("error", err || "cancelled");
	if (this._oldTolerance) {
		this.tolerance = this._oldTolerance;
		this._oldTolerance = null;
	}
	this._requestId = null;
};
LongPress.prototype.isOutsideTolerance = function() {
	var deltaX = Math.abs(this._currentX - this._originX);
	var deltaY = Math.abs(this._currentY - this._originY);
	var distance = Math.abs(Math.sqrt((deltaX * deltaX) + (deltaY * deltaY)));
	return distance > this.tolerance;
};
LongPress.prototype.isOutsideScrollTolerance = function() {
	var deltaScrollTop = Math.abs(this._currentScrollTop - this._originScrollTop);
	var deltaScrollLeft = Math.abs(this._currentScrollLeft - this._originScrollLeft);
	var distance = Math.abs(Math.sqrt((deltaScrollTop * deltaScrollTop) + (deltaScrollLeft * deltaScrollLeft)));
	return distance > this.scrollTolerance;
};
LongPress.prototype.timeElapsed = function() {
	return (Date.now() - this._startTime);
};
LongPress.prototype.hasTimeElapsed = function() {
	return this.timeElapsed() < this.timeout;
};
LongPress.prototype.nextFrame = function() {
	// Figure it out.
	this.animationFrameCount++;
	if (!this.target.parent() || this.target.parent().length == 0) {
		this.cancel("Element removed");
	} else if (this.isOutsideTolerance()) {
		// Womp womp womp.
		this.cancel("tolerance");
	} else if (this.isOutsideScrollTolerance()) {
		// Womp womp womp,
		this.cancel("scrollTolerance")
	} else if (this.hasTimeElapsed()) {
		var percentDone = Math.abs(this.timeElapsed() / this.timeout);
		this.emit("progress", percentDone, this._currentX, this._currentY);
		this._progress && this._progress(percentDone);
		this.registerNextFrame();
	} else {
		if (this.animationFrameCount < this.resetAnimationFrameCount) {
			this._startTime = Date.now();
			this.registerNextFrame();
		} else {
			// We good, yo!
			this.cancel();
			window.getSelection().removeAllRanges(); // No text selected, yo.
			this._el.mouseup(this._mouseupcomplete);
			this.target.mouseup(this._mouseupcomplete)
				.parent().mouseup(this._mouseupcomplete);;
			this.emit("complete", this._currentX, this._currentY);
			this._longPressComplete = true;
			this._done && this._done();
		}
	}
};
LongPress.prototype.registerNextFrame = function() {
	this._requestId = window.requestAnimationFrame(this.nextFrame.bind(this));
};
LongPress.prototype._calculateScrollbarWidth = function() {
  var inner = document.createElement('p');
  inner.style.width = "100%";
  inner.style.height = "200px";

  var outer = document.createElement('div');
  outer.style.position = "absolute";
  outer.style.top = "0px";
  outer.style.left = "0px";
  outer.style.visibility = "hidden";
  outer.style.width = "200px";
  outer.style.height = "150px";
  outer.style.overflow = "hidden";
  outer.appendChild (inner);

  document.documentElement.appendChild(outer);
  var w1 = inner.offsetWidth;
  outer.style.overflow = 'scroll';
  var w2 = inner.offsetWidth;
  if (w1 == w2) w2 = outer.clientWidth;
  document.documentElement.removeChild (outer);

  this.scrollbarWidth = w1 - w2;
  if (this.scrollbarWidth < 10) {
  	this.scrollbarWidth = 10;
  }
  return this.scrollbarWidth;
};