/******************************************************************************
 * @module isomagic-pager
 *
 * IsoMagic extension that adds simple app capabilities, including CSS class based transitions
 * 		Currently active page has the activeClass, gets inactiveClass added when it becomes the "previous" page
 *		After the timeout has elapsed, add the activeClass to the new page, and remove both activeClass and inactiveClass from the previous page.
 *		
 * REQUIRES 
 *		isomagic-template
 *		
 * @param {string} bodySelector default:"body"
 *		a jQuery selector for the element to add body content to.  Defaults to 'body'
 * @param {int} timeout default:500
 * 		the timeout(ms) after the inactiveClass is applied to apply the activeClass
 * @param {string} activeClass default:"active"
 *		the class added to a page to make it transition in
 * @param {string} inactiveClass default:"inactive"
 *		the class added to the page to make it transition out
 * 
 * tlc:
 *		none added.
 * 
 * middleware:
 *		checkpage - checks the current page that the app is on, and if it is identical to the req.originalUrl, halts the middleware chain, otherwise, proceeds.
 *		[builder] usetemplate - {"templateid":"sometemplate"} attaches this templateid to the res
 *		[builder] setdata - {"data":{...}} attaches this data object to the res
 *		showpage - if the res has an attached templateid (data object optional), renders that template using the data into the bodySelector on the page, and sets res.handled to true
 *
 *****************************************************************************/

(function(){
	var extname = "pager";
	
	var extension = function(_app, config){
		config.bodySelector = config.bodySelector || 'body';
		config.timeout = config.timeout || 500;
		config.activeClass = config.activeClass || 'active';
		config.inactiveClass = config.inactiveClass || 'inactive';
		var r = {
			u : {
				refresh : function(){
					var $activeView = _app.ext.pager.u.activeView();
					var activeUri = $activeView.attr('data-app-uri');
					if(typeof uri == 'undefined'){
						uri = activeUri;
						}
					$(config.bodySelector+' [data-app-uri="'+uri+'"]').remove();
					if(uri == activeUri){
						console.log(uri);
						_app.navigate(activeUri,{'skipPush':true, 'pagerRefreshing':true});
						}
					},
				clearInactive : function(){
					// console.log('clearinactive');
					var $inactive = $(config.bodySelector+' [data-app-uri]:not(.active), '+config.bodySelector+' [data-app-uri].inactive');
					$inactive.remove();
					},
				activeView : function(){
					return $(config.bodySelector+' [data-app-uri].'+config.activeClass+':not(.'+config.inactiveClass+')');
					},
				handleTransition : function($prev, $next){
					$prev.addClass(config.inactiveClass);
					$next.show();
					setTimeout(function(){
						$next.addClass(config.activeClass);
						$prev.hide().removeClass(config.activeClass+' '+config.inactiveClass);
						},config.timeout);
					}
				},
			tlc : {
				},
			middleware : {
				showpage : function(req,res,next){
					if(res.templateid){
						console.log('showpage');
						res.data = res.data || {};
						var $view;
						var viewhtml = '<div data-app-uri="'+req.originalUrl+'" data-tlc="bind $var \'.\'; template#translate --templateid=\''+res.templateid+'\' --data=$var --forcesuccess; apply --append;"></div>';
						if(_app.server()){
							var cheerio = require('cheerio');
							$view = cheerio.load(viewhtml)('[data-app-uri]');
							res.tlc.run($view, res.data,{$:res.$});
							$view.addClass(config.activeClass);
							res.$(config.bodySelector).append(res.$.html($view));
							res.$view = $view;
							}
						else{
							$view = $(viewhtml);
							res.tlc.run($view, res.data);
							res.$(config.bodySelector).append($view);
							var $prev = _app.ext.pager.u.activeView();
							_app.ext.pager.u.handleTransition($prev, $view);
							res.$view = $view;
							}
						
						// console.log('setting handled true');
						res.handled = true;
						}
					next();
					},
				checkpage : function(req,res,next){
					// console.log('checkpage');
					if(!_app.server()){
						var $currentPage = _app.ext.pager.u.activeView();
						// console.log($currentPage);
						if($currentPage.length && $currentPage.attr('data-app-uri') == req.originalUrl){
							console.log('we are already here');
							//halt the middleware chain.  We're already on this page.
							}
						else if(!$currentPage.length && !res.pagerRefreshing){
							console.log('in the middle of a page transition');
							console.log(res);
							//This means that we're in the middle of a page transition- 
							//let's just hold off for now by halting the middleware chain.
							}
						else if(res.$('[data-app-uri="'+req.originalUrl+'"]:not(.'+config.activeClass+')').length){
							console.log('page is already on the DOM, show it');
							_app.ext.pager.u.handleTransition(
								_app.ext.pager.u.activeView(),
								res.$('[data-app-uri="'+req.originalUrl+'"]')
								);
							_app.triggerClientRouter(req,res);
							}
						else {
							// console.log('next');
							next();
							}
						}
					else {
						// console.log('next');
						next();
						}
					}
				},
			middlewareBuilders : {
				setdata : function(opts){
					return function(req,res,next){
						res.data = opts.data;
						next();
						};
					},
				usetemplate : function(opts){
					var mwkey = ''
					if(opts.templateid){
						mwkey = "template_"+opts.templateid;
						if(!mwcache[mwkey]){
							mwcache[mwkey] = function(t){
								return function(req,res,next){
									// console.log('template '+t);
									res.templateid = t; 
									next();}
								}(opts.templateid)
							}
						}
					return mwcache[mwkey] || null;
					}
				}
			}
		var mwcache = {};
		return r;
		}
	// Only Node.JS has a process variable that is of [[Class]] process 
	var isNode = false;
	try {isNode = Object.prototype.toString.call(global.process) === '[object process]';} catch(e) {}
	if(isNode){	root = {};}
	else {root = window;}
	
	if(isNode){
		module.exports = extension;
		}
	else {
		window[extname] = extension;
		}
	
	})()